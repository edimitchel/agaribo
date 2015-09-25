(function (context) {

  var Application = {
    requestAnimationFrame: window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || function (func) {
      setTimeout(func, 50);
    },
    running: false,
    server: null,
    socket: null,
    canvas: null,
    mousePosition: {
      Y: 0,
      X: 0
    },
    game: {
      dots: [],
      players: {},
      currentPlayer: null,
      moveCP: function (X, Y) {
        if (this.currentPlayer !== null && (X != 0 || Y != 0)) {
          // Calculer la puissance et l'angle avec X et Y
          var power = Math.min(Math.sqrt(Math.pow(X, 2) + Math.pow(Y, 2)), this.currentPlayer.getSpeed());
          var angle = Math.atan2(Y, X);

          var deltaX = Math.cos(angle) * power;
          var deltaY = Math.sin(angle) * power;

          this.currentPlayer.delta = {
            X: deltaX,
            Y: deltaY
          };
        }
      }
    },
    defaultsConfig: {
      view: {
        listingPlayersSelector: null
      },
      server: {
        ip: null,
        port: 8888
      },
      dot: {
        defaultSize: 15,
        max: 5,
        areaMax: 50000, // La valeur de max est applicable pour l'espace spécifié par areaMax (px^2)
        figure: 'circle'
      },
      player: {
        speedReference: 50, // pixel/second
        minScore: 15,
        minSpeed: 1,
        scoreLossRatio: 100, // Perte de point par seconde : score / scoreLossRatio
        figure: 'circle',
        border: {
          color: 'white',
          size: 3
        }
      }
    },
    config: null,

    init: function (canvasSelector, config) {
      this.config = this.defaultsConfig;
      $.extend(true, this.config, config);

      var canvas = document.querySelector(canvasSelector);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      if (canvas == null)
        throw new Error('Le canevas est introuvable.');

      this.canvas = canvas;
      this.context = canvas.getContext('2d');

      if (this.config.server.ip == null)
        throw new Error('L\'adresse ip du serveur doit être définie.');

      this.socket = io('http://' + this.config.server.ip + (this.config.server.port != '80' ? ':' + this.config.server.port : ''), {
        multiplex: false
      });

      return this;
    },
    start: function (data, delay) {
      if (this.context == null || this.socket == null)
        throw new Error('L\'application ne peut démarrée : problème de canevas ou de web socket.');

      if (data.player) {
        var player = data.player;
        this.emit('new_player', player.name, player.position.X, player.position.Y, player.color, player.size);

        this.on('rtn_new_player', function (data) {
          player.setId(data.id);
          Application.game.currentPlayer = player;
          for (var iP in data.players) {
            if (!data.players.hasOwnProperty(iP)) {
              continue;
            }
            var p = data.players[iP];
            if (p.id == player.id)
              continue;

            var yetPlayer = new Application.models.player(p.pseudo, p.color, {
              X: p.x,
              Y: p.y
            });
            yetPlayer.setId(p.id);
            onPlayerChange(yetPlayer);
          }

          this.on('move', function (data) {
            if (!Application.game.players[data.id] || data.id == player.id)
              return;

            Application.game.players[data.id].position = {
              X: data.x,
              Y: data.y
            };
            Application.game.players[data.id].size = data.size;
          });
        });

        Application.mousePosition.X = player.position.X;
        Application.mousePosition.Y = player.position.Y;
      }

      window.onmousemove = function (evt) {
        Application.mousePosition.X = evt.pageX - Application.canvas.offsetLeft;
        Application.mousePosition.Y = evt.pageY - Application.canvas.offsetTop;
      };

      function onPlayerChange(player, id) {
        if (player == null) {
          // Supprimer user
          if (Application.config.view.listingPlayersSelector != null) {
            var list = document.querySelector(Application.config.view.listingPlayersSelector);
            list.removeChild(list.querySelector('[data-id="' + id + '"]'));
          }
        } else {

          if (Application.config.view.listingPlayersSelector != null) {
            var list = document.querySelector(Application.config.view.listingPlayersSelector);
            if (null !== list) {
              var itemEl = document.createElement('li');
              itemEl.innerHTML = player.name;
              itemEl.setAttribute('data-id', player.id);
              itemEl.style.color = player.color;
              list.appendChild(itemEl);
            }
          }
          if (player.id != Application.game.currentPlayer.id) {
            Application.game.players[player.id] = player;
          }
        }
      }

      this.on('player_join', function (player) {
        var nPlayer = new Application.models.player(player.pseudo, player.color, {
          X: player.x,
          Y: player.y
        });
        nPlayer.setId(player.id);
        onPlayerChange(nPlayer);
      });

      this.on('player_left', function (id) {
        if (Application.game.players.hasOwnProperty(id)) {
          delete Application.game.players[id];
          onPlayerChange(null, id);
        }
      });

      this.running = true;
      setTimeout(function () {
        Application.paint();

        // Générer les points
        (function generateDots() {
          var area = Application.canvas.width * Application.canvas.height;
          var count = Application.config.dot.max * (area / Application.config.dot.areaMax) - Application.game.dots.length;
          count = count < 0 ? 0 : count;
          for (var i = 0; i < count; i++)
            Application.game.dots.push(new Application.models.dot());
          setTimeout(generateDots, 1000);
        })();
      }, delay);
    },
    paint: function () {
      var that = Application,
          timestamp = new Date().getTime(),
          diffTime = timestamp - (this.lastTimeStamp ? this.lastTimeStamp : 0);

      this.lastTimeStamp = timestamp;

      that.context.fillStyle = 'white';
      that.context.fillRect(0, 0, that.canvas.width, that.canvas.height);

      if (that.game.currentPlayer !== null) {
        // Mouse tracking
        var diffX = that.mousePosition.X - that.game.currentPlayer.position.X,
            diffY = that.mousePosition.Y - that.game.currentPlayer.position.Y;

        that.game.moveCP(diffX, diffY);
      }

      // PAINT Dots

      for (var idots = 0; idots < that.game.dots.length; idots++) {
        var dot = that.game.dots[idots];

        // Compute collision with dots and currentPlayer
        if (that.models.utils.getDistance(dot.position, that.game.currentPlayer.position) < (that.game.currentPlayer.size / 2)) {
          that.game.currentPlayer.size += dot.size / 6;
          that.game.dots.splice(idots, 1);
          idots--;
          continue;
        }

        that.models.figure(dot.figure, dot.position.X, dot.position.Y, dot.size, dot.color);
      }

      // PAINT Players

      for (var idP in that.game.players) {
        var p = that.game.players[idP];
        if (p.id != that.game.currentPlayer.id)
          that.models.figure(that.config.player.figure, p.position.X, p.position.Y, p.size, p.color, {
            border: that.config.player.border
          });
      }

      // PAINT CURRENT PLAYER

      if (that.game.currentPlayer !== null) {
        var ratio = diffTime / 1000;
        that.game.currentPlayer.move(ratio);
        that.emit('move', that.game.currentPlayer.id, that.game.currentPlayer.position, that.game.currentPlayer.size, that.game.currentPlayer.getSpeed());

        that.models.figure(that.config.player.figure,
            that.game.currentPlayer.position.X,
            that.game.currentPlayer.position.Y,
            that.game.currentPlayer.size,
            that.game.currentPlayer.color, {
              border: that.config.player.border
            }
        );
      }

      if (that.running)
        requestAnimationFrame(Application.paint);
    },
    stop: function () {
      this.running = false;
    },
    on: function (name, callback) {
      return this.socket.on(name, callback);
    },
    emit: function () {
      return this.socket.emit.apply(this.socket, arguments);
    }
  };

  context.agaribo = Application;

})(window);
