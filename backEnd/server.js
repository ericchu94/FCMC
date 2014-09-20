var io = require('socket.io')(8587);
var https = require('https');

var sets = {};

var s = '';

https.get({
  host: 'api.Cram.com',
  path: '/v2/sets/1661835?client_id=2b8b14b461a5cbf2aa508639abe8b115',
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

    initializeRoom();
  });
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
    turn: 0, // represents which index of player is to perform the next action
    workingCard: null, // represents the position of card that is flipped
  };

  setupCards();
}

function setupCards() {
  var set = sets[room.setId];

  room.cards = shuffle(set.cards.slice(0));

  extractBoard();
}

function extractBoard() {
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
    room.board.push(card);
  }

  shuffle(room.board);
}

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
  room.players.push(player);

  // send initial state
  var state = {
    gameOn: room.gameOn,
    players: room.players,
    boardSize: room.boardSize,
    turn: 0,
    board: [],
    matchCount: 0,
  };
  for (var i = 0; i < room.board.length; ++i) {
    var card = room.board[i];

    state.board.push({
      flipped: card.flipped,
      text: card.flipped ? card.text : '',
      removed: card.removed,
    });
  }
  socket.emit('room', state);

  socket.on('start', function () {
    console.log('start');

    // check if valid
    if (room.gameOn) {
      return;
    }
    for (var i = 0; i < room.players.length; ++i) {
      var player = room.players[i];

      if (!player.ready) {
        return;
      }
    }

    room.gameOn = true;
    io.emit('start');
  });
  socket.on('flip', function (position) {
    position = parseInt(position);
    console.log('Flipping: ' + position);
    function combineObjects(obj1, obj2) {
      for (var prop in obj2) { 
        obj1[prop] = obj2[prop];
      }
    }
    if (position < 0 || position >= room.boardSize) {
      return;
    }

    // if (room.players[room.turn % room.players.length] != player) {
    //   return;
    // }

    var card = room.board[position];
    // BROKEN
    // io.emit('flip', {
    //   position: position,
    //   text: card.text,
    // });

    // WORKING
    combineObjects(card, {'position': position});
    // if (card.flipped) {
    //   return;
    // }

    card.flipped = true;
    // io.emit('flip', {
    //   position: position,
    //   back: card.back
    // });

    io.emit('flip', card);
    var wCard = room.board[room.workingCard];

    if (room.workingCard) {
      // second flip
      if (wCard.id == card.id) {
        // matched flip
        // remove, add score
        ++room.matchCount;
        wCard.removed = true;
        card.removed = true;

        player.score += 5;

        io.emit('card match', {
          positions: [ position, room.workingCard ],
        });

        if (room.matchCount == room.boardSize / 2) {
          // end game
          io.emit('end');
        }

        // end game
      } else {
        // unmatched flip
        // flip back, next turn
        wCard.flipped = false;
        card.flipped = false;

        ++room.turn;

        io.emit('card mismatch', {
          positions: [ position, room.workingCard ],
        });
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

    room.gameOn = false;
    room.turn = 0;

    if (room.cards.length >= room.boardSize / 2) {
      extractBoard();
    } else {
      setupCards();
    }

    for (var i = 0; i < room.players.length; ++i) {
      var player = room.players[i];
      player.score = 0;
      player.ready = true;// TODO change to false
    }

  });

  socket.on('ready', function () {
    if (room.gameOn || player.ready) {
      return;
    }

    player.ready = true;
    io.emit('ready', player.id);
  });

  socket.on('unready', function () {
    if (room.gameOn || !player.ready) {
      return;
    }

    player.ready = false;
    io.emit('unready', player.id);
  });
});
