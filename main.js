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

io.sockets.on('connection', function (socket, pseudo) {

  socket.on('new_player', function (pseudo, x, y, color, size) {

    var player = {
      pseudo: pseudo,
      x: x,
      y: y,
      color: color,
      old_x: x,
      old_y: y,
      size: size,
      id: generateUniqId(pseudo)
    };

    socket.pseudo = player.pseudo;
    socket.x = player.x;
    socket.y = player.y;
    socket.color = player.color;
    socket.size = player.size;
    socket.id = player.id;

    console.log(colors.verbose("Nouveau joueur : " + pseudo + " (id : " + socket.id + ")"));
    players[player.id] = player;

    // On retourne l'identifiant du nouveau joueur et les joueurs déjà et encore connectés
    socket.emit('rtn_new_player', {
      id: player.id,
      players: players
    });

    // On signale aux autres clients qu'il y a un nouveau joueur
    socket.broadcast.emit('player_join', {
      id: socket.id,
      pseudo: socket.pseudo,
      color: socket.color,
      x: socket.x,
      y: socket.y
    });
  });


  socket.on('move', function (id, position, size, speed) {
    // TODO Vérifier que `speed` est juste

    socket.broadcast.emit('move', {
      id: id,
      x: position.X,
      y: position.Y,
      size: size
    });
  });

  socket.on('disconnect', function () {
    console.log(colors.verbose(socket.pseudo + ' se déconnecte.'));
    socket.broadcast.emit('player_left', socket.id);
    delete players[socket.id];
  });
});

server.listen(8080);

console.log(colors.prompt('Lancement du serveur agaribo ..'));

function generateUniqId(pseudo) {
  return md5(pseudo + new Date().getTime()).substr(0, 10);
}
