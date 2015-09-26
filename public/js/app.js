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
      isCrtPlr: function (player) {
        if(this.currentPlayer == null)
          return false;

        if (typeof player != 'object')
          player = {id: player};
        return this.currentPlayer.id == player.id;
      },
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
    start: function (functionCreation, delay) {
      if (!functionCreation) {
        if (!this.createGameFunction)
          throw new Error('La fonction de création doit être implémentée.');
        else
          functionCreation = this.createGameFunction;
      }

      var that = this;
      if (this.context == null || this.socket == null)
        throw new Error('L\'application ne peut démarrée : problème de canevas ou de web socket.');

      if (!that.createGameFunction)
        that.createGameFunction = functionCreation;

      that.game.currentPlayer = null;
      functionCreation(function (pseudo) {
        var player = new Application.models.player(pseudo);
        that.emit('connect_player', player.name, player.getPosition().x, player.getPosition().y, player.color, player.size);

        that.on('rtn_connect_player', function (data) {
          player.setId(data.id);
          Application.game.currentPlayer = player;
          onPlayerChange(player);

          for (var iP in data.players) {
            var p = data.players[iP];
            if (!p || Application.game.isCrtPlr(p)) {
              continue;
            }
            var yetPlayer = new Application.models.player(p.pseudo, p.color, {
              X: p.x,
              Y: p.y
            });
            yetPlayer.setId(p.id);
            yetPlayer.size = p.size;
            onPlayerChange(yetPlayer);
            Application.game.players[yetPlayer.id] = yetPlayer;
          }

          that.on('move', function (data) {
            if (!Application.game.players[data.id] || data.id == player.id)
              return;

            Application.game.players[data.id].setPosition(data.x, data.y);
            Application.game.players[data.id].size = data.size;
          });
        });

        Application.mousePosition.X = player.getPosition().x;
        Application.mousePosition.Y = player.getPosition().y;

        window.onmousemove = function (evt) {
          Application.mousePosition.X = evt.pageX - Application.canvas.offsetLeft;
          Application.mousePosition.Y = evt.pageY - Application.canvas.offsetTop;
        };

        function onPlayerChange(player, id) {
          var list;
          if (player == null) {
            // Supprimer user
            if (Application.config.view.listingPlayersSelector != null) {
              list = document.querySelector(Application.config.view.listingPlayersSelector);
              if (null !== list) {
                list.removeChild(list.querySelector('[data-id="' + id + '"]'));
              } else {
                throw new Error('La liste des joueurs est introuvable.');
              }
            }
          } else {
            if (Application.config.view.listingPlayersSelector != null) {
              list = document.querySelector(Application.config.view.listingPlayersSelector);
              if (null !== list) {
                var itemEl = document.createElement('li');
                itemEl.innerHTML = player.name;
                itemEl.setAttribute('data-id', player.id);
                itemEl.style.color = player.color;
                list.appendChild(itemEl);
              } else {
                throw new Error('La liste des joueurs est introuvable.');
              }
            }
          }
        }

        that.on('player_join', function (p) {
          if (Application.game.isCrtPlr(p))
            return;

          var nPlayer = new Application.models.player(p.pseudo, p.color, {
            x: p.x,
            y: p.y
          });
          nPlayer.setId(p.id);
          nPlayer.size = p.size;
          Application.game.players[nPlayer.id] = nPlayer;
          onPlayerChange(nPlayer);
        });

        that.on('benefice_after_collision', function (size) {
          that.game.currentPlayer.size = size;
        });

        that.on('player_fail', deletePlayer);
        that.on('player_left', deletePlayer);

        function deletePlayer(id) {
          if (Application.game.isCrtPlr(id)) {
            alert('Vous avez été mangé.');
            that.start();
          }

          if (Application.game.players.hasOwnProperty(id)) {
            delete Application.game.players[id];
            onPlayerChange(null, id);
          }
        }

        that.running = true;
        setTimeout(function () {
          Application.paint();

          // Générer les points
          (function generateDots() {
            var area = Application.canvas.width * Application.canvas.height;
            var count = Application.config.dot.max * (area / Application.config.dot.areaMax) - Application.game.dots.length;
            count = count < 0 ? 0 : count;
            for (var i = 0; i < count; i++) {
              setTimeout(function () {
                Application.game.dots.push(new Application.models.dot());
              }, 1000 * Math.random());
            }
            setTimeout(generateDots, 1000);
          })();
        }, delay);
      });
    },
    paint: function () {
      var that = Application,
          timestamp = new Date().getTime(),
          diffTime = timestamp - (this.lastTimeStamp ? this.lastTimeStamp : timestamp);

      this.lastTimeStamp = timestamp;
      this.sumDiff = (this.sumDiff ? this.sumDiff : 0 ) + diffTime;

      that.context.fillStyle = 'white';
      that.context.fillRect(0, 0, that.canvas.width, that.canvas.height);

      if (that.game.currentPlayer !== null) {
        // Mouse tracking
        var diffX = that.mousePosition.X - that.game.currentPlayer.getPosition().x,
            diffY = that.mousePosition.Y - that.game.currentPlayer.getPosition().y;

        that.game.moveCP(diffX, diffY);
      }

      // PAINT Dots

      for (var idots = 0; idots < that.game.dots.length; idots++) {
        var dot = that.game.dots[idots];

        // Calculer les collisions entre le joueur courant et les points.
        if (that.game.currentPlayer != null && that.models.utils.getDistance(dot.getPosition(), that.game.currentPlayer.getPosition()) < (that.game.currentPlayer.size / 2)) {
          that.game.currentPlayer.size += dot.size / 6;
          that.game.dots.splice(idots, 1);
          idots--;
          continue;
        }

        that.models.figure(dot.figure, dot.getPosition().x, dot.getPosition().y, dot.size, dot.color);
      }

      // PAINT Players

      var collision;

      for (var idP in that.game.players) {
        var p = that.game.players[idP];
        if (that.game.currentPlayer == null || !that.game.isCrtPlr(p)) {

          // Calculer les collisions entre joueurs
          if (that.game.currentPlayer != null) {
            var biggerSize = Math.max(that.game.currentPlayer.size / 2, p.size / 2),
                distance = that.models.utils.getDistance(p.getPosition(), that.game.currentPlayer.getPosition());
            if (distance < biggerSize) {
              collision = p.id;
            }
          }

          that.models.figure(that.config.player.figure, p.getPosition().x, p.getPosition().y, p.size, p.color, {
            border: that.config.player.border
          });
        }
      }

      // PAINT CURRENT PLAYER

      if (that.game.currentPlayer !== null) {
        var ratio = diffTime / 1000;
        that.game.currentPlayer.move(ratio);

        // Émettre toutes les 50ms
        if (this.sumDiff > 50) {
          that.emit('move', that.game.currentPlayer.id, that.game.currentPlayer.getPosition(), that.game.currentPlayer.size, that.game.currentPlayer.getSpeed(), collision);
          this.sumDiff = 0;
        }

        that.models.figure(that.config.player.figure,
            that.game.currentPlayer.getPosition().x,
            that.game.currentPlayer.getPosition().y,
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
