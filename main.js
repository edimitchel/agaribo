var http = require('http');
var fs = require('fs');
var path = require('path');
var colors = require('colors');
var md5 = require('md5');

colors.setTheme({
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

var players = {};

function getFile(filePath, res, page404) {
  fs.exists(filePath, function (exists) {
    if (exists) {
      fs.readFile(filePath, function (err, contents) {
        if (!err) res.end(contents);
        else console.dir(err);
      });
    } else {
      fs.readFile(page404, function (err, contents) {
        if (!err) {
          res.writeHead(404, {
            'Content-Type': 'text/html'
          });
          res.end(contents);
        } else console.dir(err);
      });
    }

  });
}

var server = http.createServer(function (req, res) {
  var fileName = path.basename(req.url) || 'index.html',
      folderName = path.dirname(req.url) || '',
      localFolder = __dirname + '/public/',
      page404 = localFolder + '404.html';
  getFile((localFolder + folderName + '/' + fileName), res, page404);
});

var io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {

  socket.on('connect_player', function (pseudo, x, y, color, size) {

    var player = {
      pseudo: pseudo,
      x: x,
      y: y,
      color: color,
      size: size,
      id: generateUniqId(pseudo)
    };

    console.log(colors.verbose("Nouveau joueur : " + player.pseudo + " (id : " + player.id + ")"));
    socket.cp = player;
    player.socket_id = socket.id;
    players[player.id] = player;
    onPlayerChange();

    // On retourne l'identifiant du nouveau joueur et les joueurs déjà et encore connectés
    socket.emit('rtn_connect_player', {
      id: player.id,
      players: players
    });

    // On signale aux autres joueurs qu'il y a un nouveau joueur
    socket.broadcast.emit('player_join', {
      id: player.id,
      pseudo: player.pseudo,
      color: player.color,
      x: player.x,
      y: player.y,
      size : player.size
    });
  });


  socket.on('move', function (id, position, size, speed, idPlayerInCollision) {
    if (players[id]) {
      // TODO Vérifier que `speed` est juste par rapport à la taille

      players[id].x = position.x;
      players[id].y = position.y;
      players[id].size = size;

      socket.broadcast.emit('move', {
        id: id,
        x: position.x,
        y: position.y,
        size: size
      });

      if (idPlayerInCollision) {
        collision(idPlayerInCollision);
      }
    }
  });

  socket.on('disconnect', function () {
    if (socket.cp) {
      console.log(colors.verbose(socket.cp.pseudo + ' se déconnecte.'));
      socket.broadcast.emit('player_left', socket.cp.id);
      delete players[socket.cp.id];
      onPlayerChange();
    }
  });

  function collision(idPlayer) {
    var p1 = players[socket.cp.id],
        p2 = players[idPlayer],
        winner,
        loser;

    if (p2 == undefined)
      return;

    if (p1.size == p2.size) {
      winner = null;
      loser = null;
    } else if (p1.size > p2.size) {
      winner = p1;
      loser = p2;
    }
    else if (p1.size < p2.size) {
      winner = p2;
      loser = p1;
    }

    if (winner !== null) {
      var winSize = p1.size + p2.size;

      if (winner.id == socket.cp.id) {
        players[winner.id].size = winSize;
        socket.emit('benefice_after_collision', {
          newsize: winSize
        });
        console.log(colors.verbose(winner.pseudo + " mange " + loser.pseudo + "."));
        io.emit('player_fail', loser.id);
        delete players[loser.id];
      }
    }
  }

  function onPlayerChange() {
    var nbPlayers = Object.keys(players).length;
    console.log(colors.prompt(nbPlayers + " joueur" + (nbPlayers > 1 ? 's' : '') + " en ligne."));
  }
});

server.listen(8080);

console.log(colors.prompt('Lancement du serveur agaribo ..'));

function generateUniqId(pseudo) {
  return md5(pseudo + new Date().getTime()).substr(0, 10);
}
