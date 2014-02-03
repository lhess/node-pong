var colors = require('colors'),
	events = require('events');


var Player = require('./Player.js'),
	Utils  = require('./Utils.js'),
	Pong = {
		Ball: require('./Pong/Ball.js'),
		Helper: require('./Pong/Helper.js')
	};

/**********************************************************************************************************************/

module.exports = GameSlot;

/**
 * Object 'GameSlot'.
 *
 * @param {string} id
 * @constructor
 */
function GameSlot(id) {
	events.EventEmitter.call(this);

	this._id = id;

	this._playerOne = null;
	this._playerTwo = null;

	this._isRunning = false;
	this._isPaused  = false;

	this._scores = [0, 0];

	this._ball = new Pong.Ball();
};

// EventEmitter implementieren
GameSlot.super_ = events.EventEmitter;
GameSlot.prototype = Object.create(events.EventEmitter.prototype, {
	constructor: {
		value:      GameSlot,
		enumerable: false
	}
});

/**
 *
 * @param message
 */
GameSlot.prototype.log = function() {
	var args = [].slice.call(arguments);
	args.unshift('  > GameSlot:'.bold, colors.yellow(this.getId()).bold + ':');
	console.log.apply(console, args);
}

/**
 * @return {string}
 */
GameSlot.prototype.getId = function() {
	return this._id;
};

/**
 * @return {boolean}
 */
GameSlot.prototype.isRunning = function() {
	return this._isRunning;
};

/**
 * @return {boolean}
 */
GameSlot.prototype.isFull = function() {
	return this._playerOne != null && this._playerTwo != null;
};

/**
 * Adds player to this gameSlot.
 *
 * @param {Player}
 */
GameSlot.prototype.addPlayer = function(player) {
	if (this.isFull()) {
		throw { code: 1381782001, message: 'GameSlot "' + this.getId() + '" is full!' };
	}

	player.getSocket().join(this.getId());

	if (this._playerOne === null) {
		this._playerOne = player;
		this._playerOne.setPlayerNumber(1);

		this.log('Add first palyer:', player.getId().cyan);
	} else if (this._playerTwo === null) {
		this._playerTwo = player;
		this._playerTwo.setPlayerNumber(2);
		this.log('Add second palyer:', player.getId().cyan);
	}

	if (this.isFull()) {
		this.log('GameSlot is now full!');
		this.emit('otherPlayerJoined', { gameSlotId: this.getId(), otherPlayerId: player.getId() });
	}
};

/**
 * @param {Player}
 * @return {Player}
 */
GameSlot.prototype.getOtherPlayer = function(player) {
	if (!this.isFull()) {
		throw  { code: 1382054357, message: 'Invalid use of GameSlot::getOtherPlayer, not enough players!' };
	}

	if (player.getId() == this._playerOne.getId()) {
		return this._playerTwo;
	}
	return this._playerOne;
};

/**
 *
 */
GameSlot.prototype.start = function() {
	if (this.isRunning()) {
		return;
	}
	if (!this.isFull()) {
		throw  { code: 1382054357, message: 'Could not start game "' + this.getId() + '", not enough players!' };
	}

	this.log('Preparing game start, continue after countdown...');

	// Start-Countdown
	var countdown = 5,
		countDownFunc = null;
	(countDownFunc = function() {
		this.socketBroadcast('game_showCountdown', { timer: countdown });;
		if (countdown === 0) {
			this.log('Start game!');

			this._isRunning = true;

			this._ball.reset(Utils.random(1, 2));
			this.socketBroadcast('game_start');
		} else {
			countdown--;
			setTimeout(countDownFunc.bind(this), 1000)
		}
	}.bind(this))();
};

/**
 * Tick callback.
 *
 */
GameSlot.prototype.tick = function() {
	var paddles = {};
	if (this._playerOne) {
		paddles[this._playerOne.getId()] = this._playerOne.updatePaddlePosition();
	}
	if (this._playerTwo) {
		paddles[this._playerTwo.getId()] = this._playerTwo.updatePaddlePosition();
	}

	// Data for socket communication
	var data = {
		gameSlotId: this.getId(),
		scores:     this._scores,
		paddles:    paddles,
		ball:       null
	};

	if (this.isRunning() && !this._isPaused) {
		this._ball.updatePosition(this._playerOne, this._playerTwo);
		data.ball = this._ball.getCoordinates();

		if (this._ball._left > GLOBAL.gameConfiguration.width) {
			this._goal(0);
		} else if (this._ball._right < 0) {
			this._goal(1);
		}
	}

	this.socketBroadcast('game_update', data);
};

GameSlot.prototype._goal = function(playerNumber) {
	this._scores[playerNumber]++;

	this._ball.hide();
	this._isPaused = true;

	if (this._scores[playerNumber] == 9) {
		this._isRunning = false;

		var data = {
			winner: playerNumber
		};
		this.socketBroadcast('game_stop', data);
		this.emit('gameFinished', data);
	} else {
		setTimeout(function() {
			this._ball.reset(playerNumber);
			this._isPaused = false;
		}.bind(this), 2000);
	}
}

/**
 *
 * @param {string} reason
 */
GameSlot.prototype.terminate = function(reason) {
	this.socketBroadcast('game_terminated', {
		gameSlotId: this.getId(),
		reason:     reason
	});
};

/**
 *
 * @param {string} event
 * @param {object) data
	 */
GameSlot.prototype.socketBroadcast = function(event, data) {
	GLOBAL.io.sockets
		.in(this.getId())
		.emit(event, data);
};
