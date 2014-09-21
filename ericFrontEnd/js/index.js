var socket = io('http://localhost:8587');
var room;
var player;

$(function () {
  $(document).on('click', '.card-frame', function () {
    socket.emit('flip', $(this).parent().data('position'));
  });
  $('.ready').on('click', function () {
    if ($(this).hasClass('btn-success')) {
      socket.emit('unready');
    } else {
      socket.emit('ready');
    }
  });
  $('.start').on('click', function () {
    socket.emit('start');
  });
  $('.next').on('click', function () {
    socket.emit('next');
  });
});

function updatePlayers() {
  $('.players').html('');
  for (var i = 0; i < room.players.length; ++i) {
    var p = room.players[i];
    var $p = $($('#template-player').html());
    if (player && p.id == player.id) {
      $p.find('.player-name').text('Me');

      if (p.ready) {
        $('.ready').removeClass('btn-default');
        $('.ready').addClass('btn-success');
      } else {
        $('.ready').addClass('btn-default');
        $('.ready').removeClass('btn-success');
      }
    } else {
      $p.find('.player-number').text(i + 1);
    }
    $p.find('.player-score').text(p.score);
    $p.data('id', p.id);
    $p.toggleClass('player-ready', p.ready);
    $p.toggleClass('player-disconnected', p.disconnected);
    $p.toggleClass('player-active', room.turn % room.players.length == i);
    $('.players').append($p);
  }  
}

function updateCards() {
  $('.board').html('');
  var $row;
  for (var i = 0; i < room.board.length; ++i) {
    if (i % 6 == 0) {
      if ($row) {
        $('.board').append($row);
      }

      $row = $($('#template-card-row').html());
    }
    var card = room.board[i];
    var $card = $($('#template-card').html());
    $card.find('.card-text').text(card.text);
    $card.find('.card-frame').toggleClass('flipped', card.flipped);
    $card.data('position', i);
    $card.toggleClass('matched', card.removed);
    $row.append($card);
  }
  $('.board').append($row);
}

function updateBoard() {
  $('.board').toggleClass('disabled', !room.gameOn);
  if (room.gameOn) {
    $('.ready, .start').attr('disabled', 'disabled');
  } else {
    $('.ready, .start').removeAttr('disabled');
  }

  updateCards();
}

function updateWinner() {
  if (room.matchCount * 2 >= room.board.length) {
    // winner!!
    // show modal
    var p = room.players[room.turn % room.players.length];
    $('#winner-modal').toggleClass('defeat', !player || p.id != player.id);
    $('#winner-modal').find('.winner-position').text(room.turn % room.players.length + 1);
    $('#winner-modal').find('.winner-score').text(p.score);
    $('#winner-modal').modal();
  } else {
    $('#winner-modal').modal('hide');
  }
}

function updateState() {
  updatePlayers();
  updateBoard();
  updateWinner();
}

function outputShit() {
  console.log(room);
}

socket.on('room', function (data) {
  room = data;
  updateState();
});
socket.on('new player', function (p) {
  room.players.push(p);

  if (!player) {
    player = p;
  }
  outputShit();
  updatePlayers();
});
socket.on('start', function (data) {
  room.players = data.players;
  room.turn = data.turn;
  room.gameOn = true;

  for (var i = 0; i < room.players; ++i) {
    var p = room.players[i];

    if (p.id == player.id) {
      player = p;
      break;
    }
  }

  updatePlayers();
  updateBoard();
  outputShit();
});
socket.on('ready', function (id) {
  if (id == player.id) {
    $('.ready').toggleClass('btn-default btn-success');
  }

  for (var i = 0; i < room.players.length; ++i) {
    var p = room.players[i];

    if (p.id == id) {
      p.ready = true;
      break;
    }
  }

  updatePlayers();
});
socket.on('unready', function (id) {
  if (id == player.id) {
    $('.ready').toggleClass('btn-default btn-success');
  }
  for (var i = 0; i < room.players.length; ++i) {
    var p = room.players[i];

    if (p.id == id) {
      p.ready = false;
      break;
    }
  }

  updatePlayers();
});
socket.on('flip', function (position) {
  room.board[position].flipped = true;
  
  $('.card').filter(function () {
    return $(this).data('position') == position;
  }).addClass('flipped');
  $(this).children().toggleClass('flipped');
});
socket.on('card mismatch', function (data) {
  while (!room.players[++room.turn % room.players.length].ready);

  var $pair = $();
  for (var i = 0; i < data.positions.length; ++i) {
    var position = data.positions[i];
    room.board[position].flipped = false;
    $pair = $pair.add($('.card').filter(function () {
      return $(this).data('position') == position;
    }));
  }

  setTimeout(function () {
    $pair.removeClass('flipped');
    updatePlayers();
  }, 1000);
});
socket.on('card match', function (data) {
  var p = room.players[room.turn % room.players.length];
  p.score += 5;
  ++room.matchCount;

  var $pair = $();
  for (var i = 0; i < data.positions.length; ++i) {
    var position = data.positions[i];
    room.board[position].removed = true;
    $pair = $pair.add($('.card').filter(function () {
      return $(this).data('position') == position;
    }));
  }

  setTimeout(function () {
    updatePlayers();
    $pair.addClass('matched');
    updateWinner();

  }, 1000);
});
socket.on('next', function (board) {
  room.gameOn = false;
  room.turn = 0;
  room.board = board;
  room.matchCount = 0;

  for (var i = 0; i < room.players.length; ++i) {
    var player = room.players[i];

    if (player.disconnected) {
      room.players.splice(i, 1);
      --i;
    }

    player.score = 0;
    player.ready = false;
  }
  updateState();
});
socket.on('discon', function (id) {
  for (var i = 0; i < room.players.length; ++i) {
    var player = room.players[i];

    if (player.id == id) {
      if (!room.gameOn) {
        room.players.splice(i, 1);
      } else {
        player.disconnected = true;
        player.ready = false;
      }
      break;
    }
  }
  updatePlayers();
});
