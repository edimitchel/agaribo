(function (app) {
  app.models = {
    player: function (name, color, position) {
      this.name = name;
      this.position = {};
      this.setPosition = function (x, y) {
        if (x == undefined || y == undefined) {
          this.position.X = new app.models.canvas().getCenter().X;
          this.position.Y = new app.models.canvas().getCenter().Y;
        } else {
          this.position.X = x;
          this.position.Y = y;
        }
      };

      this.getPosition = function () {
        return {
          x: Number(Number(this.position.X).toFixed(2)),
          y: Number(Number(this.position.Y).toFixed(2))
        }
      };
      this.delta = {
        X: 0,
        Y: 0
      };
      this.color = color ? color : app.models.randomColor();
      this.size = app.models.appAccess.config().player.minScore;

      this.setId = function (id) {
        this.id = id;
      };

      this.move = function (ratio) {
        if (!ratio)
          ratio = 1;

        this.setPosition(app.models.utils.inBounds(this.getPosition().x + this.delta.X * ratio, app.canvas.width),
            app.models.utils.inBounds(this.getPosition().y + this.delta.Y * ratio, app.canvas.height));
      };

      this.getSpeed = function () {
        // TODO Améliorer la vitesse
        return Math.max(app.config.player.minSpeed,
            app.config.player.speedReference - (5 * (this.size / app.config.player.minScore)));
      };

      if(position)
        this.setPosition(position.x, position.Y);
      else
        this.setPosition();
    },
    dot: function (posX, posY) {
      this.position = {};
      this.setPosition = function (x, y) {
        if (x == undefined && y == undefined) {
          this.position.X = new app.models.canvas().getRandom().X;
          this.position.Y = new app.models.canvas().getRandom().Y;
        } else {
          this.position.X = x;
          this.position.Y = y;
        }
      };

      this.getPosition = function () {
        return {
          x: this.position.X,
          y: this.position.Y
        }
      };
      this.color = app.models.randomColor();
      this.size = app.config.dot.defaultSize;
      this.figure = app.config.dot.figure == null ? ('circle rect'.split(' '))[(Math.floor(Math.random() * 100)) % 2] : app.config.dot.figure;

      this.setPosition(posX, posY);
    },
    canvas: function (width, height) {
      if (!width && !height) {
        width = app.canvas.width;
        height = app.canvas.height;
      }

      this.getRandom = function () {
        return {
          X: Math.random() * width,
          Y: Math.random() * height
        }
      };

      this.getCenter = function () {
        return {
          X: width / 2,
          Y: height / 2
        }
      }
    },
    figure: function (type, x, y, size, color, options) {
      if (!options)
        options = {};
      if (!color)
        color = this.randomColor();
      switch (type) {
        case 'circle':
          this.appAccess.ctx().beginPath();
          this.appAccess.ctx().fillStyle = color;
          this.appAccess.ctx().arc(x, y, size / 2, 0, 2 * Math.PI);
          this.appAccess.ctx().fill();
          if (options.border) {
            this.appAccess.ctx().lineWidth = options.border.size;
            this.appAccess.ctx().strokeStyle = options.border.color;
            this.appAccess.ctx().stroke();
          }
          break;
        case 'rect':
          this.appAccess.ctx().fillStyle = color;
          this.appAccess.ctx().fillRect(x - size / 2, y - size / 2, size, size);
          if (options.border) {
            this.appAccess.ctx().lineWidth = options.border.size;
            this.appAccess.ctx().strokeStyle = options.border.color;
            this.appAccess.ctx().strokeRect(x - size / 2, y - size / 2, size, size);
          }
          break;
      }
    },
    randomColor: function () {
      var s = '#',
          i = 6,
          abc = "ABCDEF".split('');
      while (i--) {
        var c = Math.ceil(Math.random() * 15);
        if (c > 9)
          c = abc[c - 10];
        s += c;
      }
      return s;
    },
    utils: {
      getDistance: function (pos1, pos2) {
        return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
      },
      inBounds: function (value, min, max) {
        if (!max) {
          max = min;
          min = 0;
        }

        return Math.min(max, Math.max(value, min));
      }
    },

    appAccess: {
      ctx: function () {
        return app.context;
      },
      config: function () {
        return app.config;
      }
    }
  };

})(window.agaribo);
