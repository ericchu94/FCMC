app.controller('HomeCtrl', function($scope, socket) {
	console.log('hi');
	socket.emit('game state');
	socket.on('game state', function (data) {
	  console.log(data);
	});
});