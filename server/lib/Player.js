var colors = require('colors');

/**********************************************************************************************************************/

module.exports = Player;

/**
 * Object 'Player'.
 *
 * @param {string} id
 * @param {object} socket
 * @constructor
 */
function Player(id, socket) {
	console.log('  > Player:'.bold, colors.yellow(socket.id).bold + ':', 'Create new player with id', id.cyan);

	this._playerNumber = null;

	// Paddle
	this._paddle = {
		minY:          GLOBAL.gameConfiguration.wallWidth,
		maxY:          GLOBAL.gameConfiguration.height - GLOBAL.gameConfiguration.wallWidth - GLOBAL.gameConfiguration.paddleHeight,
		speed:         null,
		moveDirection: 0
	};
	this._paddle.speed = (this._paddle.maxY - this._paddle.minY) / GLOBAL.gameConfiguration.paddleSpeed;

	this._paddlePosition = {
		x:      null,
		y:      (this._paddle.minY + (this._paddle.maxY - this._paddle.minY) / 2),
		left:   null,
		right:  null,
		top:    null,
		bottom: null
	};

	this._socket = socket;
	this._id = id;

	var self = this;
	this._socket.on('moveUp',     function() { self._paddle.moveDirection = -1; });
	this._socket.on('moveDown',   function() { self._paddle.moveDirection = 1;  });
	this._socket.on('stopMoving', function() { self._paddle.moveDirection = 0;  });
};

/**
 *
 * @return {{x: (number), y: (number), left: (number), right: (number), top: (number), bottom: (number)}}
 */
Player.prototype.getPaddlePosition = function() {
	this._paddlePosition.left = this._paddlePosition.x;
	this._paddlePosition.right = this._paddlePosition.left + GLOBAL.gameConfiguration.wallWidth;
	this._paddlePosition.top = this._paddlePosition.y;
	this._paddlePosition.bottom = this._paddlePosition.y + GLOBAL.gameConfiguration.paddleHeight;

	return this._paddlePosition;
}

/**
 *
 * @return {string}
 */
Player.prototype.getId = function() {
	return this._id;
};

/**
 * @return {Object}
 */
Player.prototype.getSocket = function() {
	return this._socket;
};

/**
 *
 */
Player.prototype.reset = function() {
	this._playerNumber = null;
};

/**
 *
 * @param {number} playerNumber
 */
Player.prototype.setPlayerNumber = function(playerNumber) {
	this._playerNumber = playerNumber;
	if (playerNumber == 1) {
		this._paddlePosition.x = 0;
	} else {
		this._paddlePosition.x = GLOBAL.gameConfiguration.width - GLOBAL.gameConfiguration.wallWidth;
	}
};

/**
 *
 * @returns {null|number}
 */
Player.prototype.getPlayerNumber = function() {
	return this._playerNumber;
};

/**
 *
 * @returns {boolean}
 */
Player.prototype.isMovingUp = function() {
	return this._paddle.moveDirection === -1;
};

/**
 *
 * @returns {boolean}
 */
Player.prototype.isMovingDown = function() {
	return this._paddle.moveDirection === 1;
};

/**
 * Berechnet die Position des Paddles.
 *
 * @return {number}
 */
Player.prototype.updatePaddlePosition = function() {
	if (this._paddle.moveDirection != 0) {
		var y = this._paddlePosition.y + (this._paddle.moveDirection * GLOBAL.serverTick * this._paddle.speed);

		if (y < this._paddle.minY) {
			this._paddlePosition.y = this._paddle.minY;
		} else if (y > this._paddle.maxY) {
			this._paddlePosition.y = this._paddle.maxY;
		} else {
			this._paddlePosition.y = y;
		}
	}

	return this._paddlePosition.y;
};
