(function () {
  try {
    var app = agaribo.init('#myCanvas', {
      view: {
        listingPlayersSelector: '#list-people'
      },
      dot: {
        figure: null
      },
      player: {
        border: {
          color: '#DDD',
          size: 5
        }
      },
      server: {
        ip: 'localhost',
        port: '8080'
      }
    });

    app.start(function(cb){
      // Nouvel utilisateur
      var pseudo = prompt("Votre pseudo ?");
      // TODO Améliorer la modale
      if (pseudo === null || !pseudo)
        throw new Error('Le pseudo doit être renseigné.');

      cb(pseudo);
    }, 500);
  } catch (e) {
    alert('Erreur: ' + e.message);
  }
})();
