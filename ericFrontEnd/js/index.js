var socket = io('http://localhost:8587');
var room = null;
var playerId = null;
var initialised = false;

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
  $('.sets').on('change', function () {
    socket.emit('set', $(this).val());
  });
});

function updatePlayers() {
  $('.players').html('');
  for (var i = 0; i < room.players.length; ++i) {
    var p = room.players[i];
    var $p = $($('#template-player').html());
    if (p.id == playerId) {
      $p.addClass('player-me');
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
    $p.toggleClass('player-active', room.turn == i);
    $('.players').append($p);
  }  
}

function updateCards() {
  $('.board').html('');
  var $row;
  for (var i = 0; i < room.board.length; ++i) {
    if (i % 4 == 0) {
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
  if (room.gameOn && room.matchCount * 2 >= room.board.length) {
    // winner!!
    // show modal
    var p = room.players[room.turn];
    $('#winner-modal').toggleClass('defeat', p.id != playerId);
    $('#winner-modal').find('.winner-position').text(room.turn + 1);
    $('#winner-modal').find('.winner-score').text(p.score);
    $('#winner-modal').modal();
  } else {
    $('#winner-modal').modal('hide');
  }
}

function updateControls() {
  $('.sets').html('');
  for (var i = 0; i < room.sets.length; ++i) {
    var set = room.sets[i];
    var $set = $($('#template-set').html());
    $set.val(set.id);
    $set.text(set.name);
    if (set.id == room.setId) {
      $set.attr('selected', 'selected');
    }
    $('.sets').append($set);
  }

  if (room.gameOn) {
    if (initialised) {
      $('.controls').slideUp();
    } else {
      $('.controls').css('display', 'none');
    }
  } else {
    if (initialised) {
      $('.controls').slideDown();
    } else {
      $('.controls').css('display', '');
    }
  }
}

function updateState() {
  updatePlayers();
  updateBoard();
  updateWinner();
  updateControls();

  initialised = true;
}

socket.on('new', function (data) {
  room = data;
  playerId = null;
  updateState();
});
socket.on('room', function (data) {
  room = data;
  updateState();
});
socket.on('new player', function (p) {
  room.players.push(p);

  if (!playerId) {
    playerId = p.id;
  }

  updatePlayers();
});
socket.on('start', function (data) {
  room.players = data.players;
  room.turn = data.turn;
  room.board = data.board;
  room.gameOn = true;

  updatePlayers();
  updateBoard();
  updateControls();
});
socket.on('ready', function (id) {
  if (id == playerId) {
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
  if (id == playerId) {
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
  room.turn = data.turn;

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
  var p = room.players[room.turn];
  p.score = data.score;
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
socket.on('next', function (state) {
  room = state;

  updateState();
});
socket.on('discon', function (data) {
  room.players = data.players;
  room.turn = data.turn;

  updatePlayers();
});
socket.on('set', function (id) {
  room.setId = id;

  updateControls();
});
