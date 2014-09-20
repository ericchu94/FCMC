app.controller('GameCtrl', function($scope, socket, $timeout) {
	$scope.gameended = false;
	// window.b = $scope.flipped = [];
	socket.emit('start');
	// socket.on('start', function (data) {
	//   console.log(data);
	//   $scope.gameinfo = data;
	// });

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
		if(data.positions instanceof Array) {
			data.positions.forEach(function(index) {
				console.log('Modifying ' + index);
				console.log($scope.gameinfo.board[index]);
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

	$scope.revealCard = function(index) {
		socket.emit('flip', index);
		// $scope.gameinfo.board[index].flipped = false;
		// if($scope.flipped.length < 2) {
		// 	$scope.flipped.push(index);
		// } else {
		// 	// Reset flipped cards back to unflipped
		// 	$scope.flipped.forEach(function(index) {
		// 		socket.emit('flip', index);
		// 	});
		// 	clearArray($scope.flipped);
		// }
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