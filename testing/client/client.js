var sys = require('sys');
var socket = require('socket.io-client')('http://localhost:8587');

var room;
var player;

var stdin = process.openStdin();

stdin.addListener('data', function (data) {
  var line = data.toString().substring(0, data.length - 1);
  var splitted = line.split(' ');
  switch (splitted[0]) {
    case 'r':
      socket.emit('ready');
      break;
    case 'ur':
      socket.emit('unready');
      break;
    case 's':
      socket.emit('start');
      break;
    case 'f':
      socket.emit('flip', splitted[1]);
      break;
    case 'n':
      socket.emit('next');
      break;
  }
  console.log(room);
  displayCommands();
});

function displayCommands() {
  console.log('Commands: r ur s f n');
}

function outputShit() {
  console.log(room);
  displayCommands();
}


// Event listeners
socket.on('room', function (data) {
  room = data;
  outputShit();
});
socket.on('new player', function (p) {
  room.players.push(p);

  if (!player) {
    player = p;
  }
  outputShit();

});
socket.on('start', function (data) {
  room.players = data.players;
  room.turn = data.turn;
  room.gameOn = true;

  for (var i = 0; i < room.players; ++i) {
    var p = room.players[i];

    if(p.id == player.id) {
      player = p;
      break;
    }
  }

  outputShit();
});
socket.on('ready', function (id) {
  for (var i = 0; i < room.players.length; ++i) {
    var player = room.players[i];

    if (player.id == id) {
      player.ready = true;
      break;
    }
  }
  outputShit();
});
socket.on('unready', function (id) {
  for (var i = 0; i < room.players.length; ++i) {
    var player = room.players[i];

    if (player.id == id) {
      player.ready = false;
      break;
    }
  }
  outputShit();
});
socket.on('flip', function (position) {
  room.board[position].flipped = true;
  outputShit();
});
socket.on('card mismatch', function (data) {
  while (!room.players[++room.turn % room.players.length].ready);

  for (var i = 0; i < data.positions.length; ++i) {
    var position = data.positions[i];
    room.board[position].flipped = false;
  }
  outputShit();
});
socket.on('card match', function (data) {
  room.players[room.turn % room.players.length].score += 5;
  ++room.matchCount;

  for (var i = 0; i < data.positions.length; ++i) {
    var position = data.positions[i];
    room.board[position].removed = true;
  }
  outputShit();
});
socket.on('next', function (board) {
  room.gameOn = false;
  room.turn = 0;
  room.board = board;

  for (var i = 0; i < room.players.length; ++i) {
    var player = room.players[i];
    player.score = 0;
    player.ready = true; // TODO change to false
  }
  outputShit();
});
