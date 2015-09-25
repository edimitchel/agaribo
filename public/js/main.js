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

    // Nouvel utilisateur
    var pseudo = prompt("Votre pseudo ?");
    // TODO Améliorer la modale
    if (pseudo === null || !pseudo)
      throw new Error('Le pseudo doit être renseigné.');
    var player = new app.models.player(pseudo);

    app.start({
      player: player
    }, 500);
  } catch (e) {
    alert('Erreur: ' + e.message);
  }
})();
