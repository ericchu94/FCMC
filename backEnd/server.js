var io = require('socket.io')(8587);
var https = require('https');
var async = require('async');

var sets = {};

var publics = [ 1661835, 701816 ];

var gets = [];

for (var i = 0; i < publics.length; ++i) {
  var setId = publics[i];
  gets.push(function (id) {
    return function (callback) {
      var s = '';
      https.get({
        host: 'api.Cram.com',
        path: '/v2/sets/' + id + '?client_id=2b8b14b461a5cbf2aa508639abe8b115',
      }, function (res) {
        console.log('cram');
        res.on('data', function (chunk) {
          s += chunk.toString();
        });
        res.on('end', function () {
          var data = JSON.parse(s);
          for (var i = 0; i < data.length; ++i) {
            var set = data[i];
            sets[set.set_id] = set;
          }

          callback(null, set);
        });
      });
    };
  } (setId));
}

async.parallel(gets, function () {
  initializeRoom();
});

var playerIdCounter = 1;
var room;

function shuffle(array) {
  var counter = array.length, temp, index;

  // While there are elements in the array
  while (counter > 0) {
      // Pick a random index
    index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter--;

    // And swap the last element with it
    temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
}

function initializeRoom() {
  room = {
    gameOn: false,
    players: [],
    board: [],
    cards: null,
    setId: 1661835,
    boardSize: 24,
    turn: -1, // represents which index of player is to perform the next action
    workingCard: null, // represents the position of card that is flipped
    matchCount: 0,
    sets: getSetsState(),
  };
}

function getSetsState() {
  var s = [];
  for (var id in sets) {
    var set = sets[id];
    s.push({
      id: id,
      name: set.title,
    });
  }
  return s;
}

function setupCards() {
  var set = sets[room.setId];

  room.cards = shuffle(set.cards.slice(0));
}

function extractBoard() {
  if (!room.cards || room.cards.length < room.boardSize / 2) {
    setupCards();
  }

  room.board = [];
  var cards = room.cards.splice(room.cards.length - room.boardSize / 2);
  for (var i = 0; i < cards.length; ++i) {
    var card = cards[i];
    var front = {
      text: card.front,
      flipped: false,
      id: card.card_id,
      removed: false,
    };
    var back = {
      text: card.back,
      flipped: false,
      id: card.card_id,
      removed: false,
    };
    room.board.push(front);
    room.board.push(back);
  }

  shuffle(room.board);
}

function getBoardState() {
  var board = [];

  for (var i = 0; i < room.board.length; ++i) {
    var card = room.board[i];

    board.push({
      flipped: card.flipped,
      text: card.text,
      removed: card.removed,
    });
  }

  return board;
}

function nextPlayer() {
  while (!room.players[++room.turn % room.players.length].ready);
  room.turn = room.turn % room.players.length;
}

function getState() {
  return {
    gameOn: room.gameOn,
    players: room.players,
    turn: room.turn,
    board: getBoardState(),
    matchCount: room.matchCount,
    sets: getSetsState(),
    setId: room.setId,
  };
}

function nextGame() {
  room.gameOn = false;
  room.turn = -1;
  room.matchCount = 0;
  room.board = [];

  for (var i = 0; i < room.players.length; ++i) {
    var player = room.players[i];
    if (player.disconnected) {
        room.players.splice(i,1);
        --i; // decrese, for increases, same index for next run
    }
    player.score = 0;
    player.ready = false;
  }
}

console.log('Server started');
io.on('connection', function (socket) {
  // new connection
  console.log('Incoming connection');

  // Add player
  var player = {
    score: 0,
    ready: false,
    disconnected: false,
    id: playerIdCounter++,
  };

  // send initial state
  socket.emit('new', getState());
  console.log('Emit: new');

  room.players.push(player);

  io.emit('new player', player);
  console.log('Emit: new player');

  socket.on('set', function (id) {
    if (room.gameOn) {
      return;
    }

    if (!sets[id]) {
      return;
    }

    if (id == room.setId) {
      return;
    }

    room.setId = id;
    setupCards();

    io.emit('set', id);
    console.log('Emit: set');
  });

  socket.on('start', function () {
    console.log('start');

    // check if valid
    if (room.gameOn) {
      return;
    }

    var canStart = false;

    for (var i = 0; i < room.players.length; ++i) {
      var player = room.players[i];

      if (player.ready) {
        canStart = true;
        break;
      }
    }

    if (!canStart) {
      return;
    }

    shuffle(room.players);
    nextPlayer();

    extractBoard();

    room.gameOn = true;
    io.emit('start', {
      players: room.players,
      turn: room.turn,
      board: getBoardState(),
    });
    console.log('Emit: start');
  });
  socket.on('flip', function (position) {
    position = parseInt(position);
    console.log('Flipping: ' + position);

    if (!room.gameOn) {
      return;
    }

    if (position < 0 || position >= room.boardSize) {
      return;
    }

    if (room.players[room.turn % room.players.length] != player) {
      return;
    }

    var card = room.board[position];

    if (card.flipped) {
      return;
    }

    io.emit('flip', position);
    console.log('Emit: flip');

    card.flipped = true;

    if (room.workingCard != null) {
      var wCard = room.board[room.workingCard];
      // second flip
      if (wCard.id == card.id) {
        // matched flip
        // remove, add score
        ++room.matchCount;
        wCard.removed = true;
        card.removed = true;

        player.score += 5;

        io.emit('card match', {
          score: player.score,
          positions: [ position, room.workingCard ],
        });
        console.log('Emit: card match');
      } else {
        // unmatched flip
        // flip back, next turn
        wCard.flipped = false;
        card.flipped = false;

        nextPlayer();

        io.emit('card mismatch', {
          turn: room.turn,
          positions: [ position, room.workingCard ],
        });
        console.log('Emit: card mismatch');
      }


      room.workingCard = null;
    } else {
      // first flip
      room.workingCard = position;
    }
  });

  socket.on('next', function () {
    // derive next state from current
    // reset player ready status
    // reset player score
    // grab new board
    // extract cards again
    // reset turn
    // gameoff

    if (room.matchCount != room.boardSize / 2) {
      return;
    }

    nextGame();

    io.emit('room', getState());
    console.log('Emit: room');
  });

  socket.on('ready', function () {
    if (room.gameOn || player.ready) {
      return;
    }

    player.ready = true;
    io.emit('ready', player.id);
    console.log('Emit: ready');
  });

  socket.on('unready', function () {
    if (room.gameOn || !player.ready) {
      return;
    }

    player.ready = false;
    io.emit('unready', player.id);
    console.log('Emit: unready');
  });

  socket.on('disconnect', function () {
    var index;

    player.disconnected = true;
    player.ready = false;

    // check abandoned status
    var abandoned = true;
    for (var i = 0; i < room.players.length; ++i) {
      var p = room.players[i];
      if (p.ready) {
        abandoned = false;
      }
      if (p == player) {
        index = i;
      }
    }
    if (abandoned) {
      // TODO delete room
      nextGame();
      io.emit('room', getState());
      console.log('Emit: room');
      return;
    }

    if (!room.gameOn) {
      // remove player from array
      room.players.splice(index, 1);
    } else {
      if (room.players[room.turn] == player) {
        console.log('active player abandoned');
        nextPlayer();
      }
    }

    io.emit('discon', {
      players: room.players,
      turn: room.turn,
    });
    console.log('Emit: discon');
  });
});
