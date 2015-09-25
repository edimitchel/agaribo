(function (app) {
  app.models = {
    player: function (name, color, position) {
      this.name = name;
      this.position = position ? {
        X: position.X,
        Y: position.Y
      } : {
        X: new app.models.canvas().getCenter().X,
        Y: new app.models.canvas().getCenter().Y
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

        this.position.X = app.models.utils.inBounds(this.position.X + this.delta.X * ratio, app.canvas.width);
        this.position.Y = app.models.utils.inBounds(this.position.Y + this.delta.Y * ratio, app.canvas.height);
      };

      this.getSpeed = function () {
        return Math.max(app.config.player.minSpeed,
            app.config.player.speedReference - (5 * (this.size / app.config.player.minScore)));
      }
    },
    dot: function (posX, posY) {
      if (!posX || !poxY) {
        posX = new app.models.canvas().getRandom().X;
        posY = new app.models.canvas().getRandom().Y;
      }
      this.position = {
        X: posX,
        Y: posY
      };
      this.color = app.models.randomColor();
      this.size = app.config.dot.defaultSize;
      this.figure = app.config.dot.figure == null ? ('circle rect'.split(' '))[(Math.floor(Math.random() * 100)) % 2] : app.config.dot.figure;
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
        return Math.sqrt(Math.pow(pos1.X - pos2.X, 2) + Math.pow(pos1.Y - pos2.Y, 2));
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
