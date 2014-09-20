var io = require('socket.io')(8587);

var gameState = {
  started: false,
};

console.log('Server started');
io.on('connection', function (socket) {
  // new connection
  console.log('Incoming connection');

  socket.on('game state', function () {
    var state = {
      started: false,
    };
    socket.emit('game state', gameState);
  });
});
