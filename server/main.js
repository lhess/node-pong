var localPort = 1904,
    socketIoLogLevel = 1;


/******************************************************************************/

GLOBAL.io = require('socket.io').listen(localPort);
GLOBAL.io.set('log level', socketIoLogLevel);

var _ujs = require('underscore'),
    colors = require('colors');

var GameManager = require('./lib/GameManager.js'),
    GameSlot = require('./lib/GameSlot.js'),
    Player = require('./lib/Player.js'),
    Utils = require('./lib/Utils.js');

GLOBAL.gameConfiguration = {
	width:        640,
	height:       480,
	wallWidth:    12,
	paddleWidth:  12,
	paddleHeight: 60,
	paddleSpeed:  2,
	ball: {
		speed:    4,
		accel:    8,
		radius:   5
	}
};
GLOBAL.serverTick = 0.05;


/******************************************************************************/

var gameManagerInstance = new GameManager();

io.sockets.on('connection', function(socket) {
	console.log(' +'.bold.green, 'New connection:', colors.yellow(socket.id));

	var player      = gameManagerInstance.createNewPlayer(socket);
	var otherPlayer = null;
	var gameSlot    = null;

	socket.player   = player;
	socket.gameSlot = gameSlot;

	socket.on('game_initialize', function(data) {
		console.log('  > Main:'.bold, colors.yellow(socket.id) + ':', 'Event "game_initialize"', data);
		gameSlot = gameManagerInstance.getSlotForPlayer(player, data.createNewGameSlot);

		if (gameSlot.isFull()) {
			otherPlayer = gameSlot.getOtherPlayer(player);

			socket.emit('game_initialized', {
				playerId: player.getId(), playerNumber: player.getPlayerNumber(), otherPlayerId: otherPlayer.getId(),
				gameSlotId: gameSlot.getId()
			});
			gameSlot.start();
		} else {
			gameSlot.on('otherPlayerJoined', function(data) {
				otherPlayer = gameSlot.getOtherPlayer(player);
				socket.emit('game_otherPlayerJoined', { gameSlotId: gameSlot.getId(), otherPlayerId: otherPlayer.getId() });
			});
			socket.emit('game_initialized', {
				playerId: player.getId(), otherPlayerId: null, playerNumber: player.getPlayerNumber(),
				gameSlotId: gameSlot.getId()
			});
			socket.emit('game_waitingForOtherPlayer', { gameSlotId: gameSlot.getId() });
		}
	});

	socket.on('disconnect', function() {
		console.log(' -'.bold.red, 'Connection closed:', colors.yellow(socket.id));
		if (gameSlot !== null) {
			gameManagerInstance.killGameSlot(gameSlot, 'Other player disconnected');
		}
	});
});

console.log(Utils.getFormattedDateTime(true), 'Run server on port:', colors.cyan(localPort));
