var io = require('socket.io')(8587);
var https = require('https');

var sets = {};

var s = '';

https.get({
  host: 'api.Cram.com',
  path: '/v2/sets/145?client_id=2b8b14b461a5cbf2aa508639abe8b115',
}, function (res) {
  console.log('cram');
  res.on('data', function (chunk) {
    s += chunk.toString();
  });
  res.on('end', function () {
    var data = JSON.parse(s);
    console.log(data);
  });
});

var playerIdCounter = 1;

var gameState = {
  started: false,
  players: [],
  board: [],
};

console.log('Server started');
io.on('connection', function (socket) {
  // new connection
  console.log('Incoming connection');

  // Add player
  var player = {
    score: 0,
    ready: true,
    id: playerIdCounter++,
  };
  gameState.players.push(player);

  socket.on('game state', function () {
    console.log('Game state');
    var state = {
      started: false,
    };
    socket.emit('game state', gameState);
  });
  socket.on('start', function () {
    console.log('start');

    // check if valid
    if (gameState.started) {
      return;
    }
    for (var i = 0; i < gameState.players.length; ++i) {
      var player = gameState.players[i];

      if (!player.ready) {
        return;
      }
    }

    gameState.started = true;
    io.emit('start');
  });
});
