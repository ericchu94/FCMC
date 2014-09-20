var socket = require('socket.io-client')('http://localhost:8587');

var room;

// Event listeners
socket.on('room', function (data) {
  console.log(data);
  room = data;
});
socket.on('start', function () {
  console.log('Starting');
  room.gameOn = true;
});

// Actual code
setTimeout(function () {
socket.emit('start');
}, 2000);

