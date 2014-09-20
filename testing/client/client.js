var socket = require('socket.io-client')('http://localhost:8587');

var gameState;

// Event listeners
socket.on('game state', function (data) {
  console.log(data);
  gameState = data;
});
socket.on('start', function () {
  console.log('Starting');
  gameState.started = true;
});

// Actual code
socket.emit('game state');

setTimeout(function () {
socket.emit('start');
}, 2000);

