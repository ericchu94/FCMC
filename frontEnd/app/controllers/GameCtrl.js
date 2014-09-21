app.controller('GameCtrl', function($scope, socket, $timeout, $location, $modal, $route) {
	$scope.gamestarted = false;
	$scope.gameended = false;
	socket.emit('start');

	$scope.ok = function() {
		$location.path('/start');
		// $route.reload();
	}

	socket.emit('room');
	socket.on('room', function (data) {
	  console.log(data);
	  $scope.gameinfo = data;
	  window.a = $scope.gameinfo;
	});

	socket.on('start', function(data) {
		$scope.gamestarted = true;
		console.log(data);
	});

	socket.on('flip', function (data){
		combineObjects($scope.gameinfo.board[data.position], data);
		console.log(data);
	});

	socket.on('new player', function (data) {
		if(!$scope.gameinfo.currentplayer)
		  	$scope.gameinfo.currentplayer = data;
		$scope.gameinfo.players.push(data);
	});

	socket.on('card match', function(data) {
		console.log('matched');
		console.log(data.positions);
		if(data.positions instanceof Array) {
			data.positions.forEach(function(index) {
				$scope.gameinfo.board[index].removed = true;
			});
		}

  		$scope.gameinfo.players[$scope.gameinfo.turn % $scope.gameinfo.players.length].score += 5;
		++$scope.gameinfo.matchCount;

		// Handle game over scenario
		if($scope.gameinfo.board.length/2 == $scope.gameinfo.matchCount) {
			$scope.gameended = true;
			console.log('game over');
			var modalInstance = $modal.open({
			  templateUrl: 'views/partials/playagain.html',
			  scope: $scope
			});
		}
	});

	socket.on('card mismatch', function(data) {
		// Failed, switch to next player
  		while (!$scope.gameinfo.players[++$scope.gameinfo.turn % $scope.gameinfo.players.length].ready);

		console.log('mismatch');
		console.log(data.positions);
		if(data.positions instanceof Array) {
			$timeout(function() {
				data.positions.forEach(function(index) {
					$scope.gameinfo.board[index].flipped = false;
				});
			}, 1000);
		}
	});

	// socket.on('end', function() {
	// 	console.log('Game over!');
	// 	$scope.gameended = true;
	// });

	socket.on('next', function() {
		console.log('Moving on to next game');
		$location.path('/start');
	});

	$scope.revealCard = function(index) {
		if(isPlayerTurn())
			socket.emit('flip', index);
	}

	$scope.nextGame = function() {
		socket.emit('next');
	}

	$scope.setReady = function() {
		$scope.gameinfo.players.forEach(function(player) {
			if(player.id === $scope.gameinfo.currentplayer.id)
				player.ready = true;
		});
	}

	function combineObjects(obj1, obj2) {
	  for (var prop in obj2) { 
	    obj1[prop] = obj2[prop];
	  }
	}

	function clearArray(arr) {
		while(arr.length > 0) {
		    arr.pop();
		}
	}

	function isPlayerTurn() {
		console.log($scope.gameinfo.players[$scope.gameinfo.turn % $scope.gameinfo.players.length].id);
		console.log($scope.gameinfo.currentplayer.id);
		return $scope.gameinfo.players[$scope.gameinfo.turn % $scope.gameinfo.players.length].id === $scope.gameinfo.currentplayer.id;
	}
});