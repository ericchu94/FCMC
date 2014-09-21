app.controller('GameCtrl', function($scope, socket, $timeout, $location, $modal, $route) {
	$scope.gameended = false;
	socket.emit('start');

	$scope.ok = function() {
		console.log('k');
		$location.path('/start');
		$route.reload();
	}

	socket.emit('room');
	socket.on('room', function (data) {
	  console.log(data);
	  $scope.gameinfo = data;
	  window.a = $scope.gameinfo;
	});

	socket.on('flip', function (data){
		combineObjects($scope.gameinfo.board[data.position], data);
		console.log(data);
	});

	socket.on('card match', function(data) {
		console.log('matched');
		console.log(data.positions);
		if(data.positions instanceof Array) {
			data.positions.forEach(function(index) {
				$scope.gameinfo.board[index].removed = true;
			});
		}
	});

	socket.on('card mismatch', function(data) {
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

	socket.on('end', function() {
		console.log('Game over!');
		$scope.gameended = true;
	});

	socket.on('next', function() {
		console.log('Moving on to next game');
		$location.path('/start');
	});

	$scope.revealCard = function(index) {
		socket.emit('flip', index);
	}

	$scope.nextGame = function() {
		socket.emit('next');
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
});