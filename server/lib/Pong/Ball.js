var Utils = require('../Utils.js'),
	Pong = {
		Helper: require('./Helper.js')
	};

/**********************************************************************************************************************/

module.exports = Ball;

/**
 * Object 'Ball'.
 *
 * @constructor
 */
function Ball() {
	this._x = null;
	this._y = null;

	this._left   = null;
	this._top    = null;
	this._right  = null;
	this._bottom = null;

	this._radius = GLOBAL.gameConfiguration.ball.radius;
	this.minX    = this._radius;
	this.maxX    = GLOBAL.gameConfiguration.width - this._radius;
	this.minY    = GLOBAL.gameConfiguration.wallWidth + this._radius;
	this.maxY    = GLOBAL.gameConfiguration.height - GLOBAL.gameConfiguration.wallWidth - this._radius;
	this.speed   = (this.maxX - this.minX) / GLOBAL.gameConfiguration.ball.speed;
	this.accel   = GLOBAL.gameConfiguration.ball.accel;
	this.dx      = null;
	this.dy      = null;
};

/**
 *
 * @param {number} playerNumber
 */
Ball.prototype.reset = function(playerNumber) {
	this.setPosition(
		(playerNumber == 1) ? this.maxX : this.minX,
		Utils.random(this.minY, this.maxY)
	);

	this.setDirection(
		(playerNumber == 1 ? (this.speed * -1) : this.speed),
		this.speed
	);
}

/**
 *
 */
Ball.prototype.hide = function() {
	this._x = null;
	this._y = null;

	this._left   = null;
	this._top    = null;
	this._right  = null;
	this._bottom = null;
};

/**
 *
 * @param {number} x
 * @param {number} y
 */
Ball.prototype.setPosition = function(x, y) {
	this._x = x;
	this._y = y;

	this._left   = x - this._radius;
	this._top    = y - this._radius;
	this._right  = x + this._radius;
	this._bottom = y + this._radius;
};

/**
 *
 * @param {number} dx
 * @param {number} dy
 */
Ball.prototype.setDirection = function(dx, dy) {
	this.dx = dx;
	this.dy = dy;
};

/**
 *
 * @param {Player} playerOne
 * @param {Player} playerTwo
 */
Ball.prototype.updatePosition = function(playerOne, playerTwo) {
	var pos = Pong.Helper.accelerate(this._x, this._y, this.dx, this.dy, this.accel, GLOBAL.serverTick);

	if ((pos.dy > 0) && (pos.y > this.maxY)) {
		pos.y  = this.maxY;
		pos.dy = -pos.dy;
	}
	else if ((pos.dy < 0) && (pos.y < this.minY)) {
		pos.y  = this.minY;
		pos.dy = -pos.dy;
	}

	var player = (pos.dx < 0) ? playerOne : playerTwo;
	var pt     = Pong.Helper.ballIntercept(this, player.getPaddlePosition(), pos.nx, pos.ny);

	if (pt) {
		switch(pt.d) {
			case 'left':
			case 'right':
				pos.x = pt.x;
				pos.dx = -pos.dx;
				break;
			case 'top':
			case 'bottom':
				pos.y = pt.y;
				pos.dy = -pos.dy;
				break;
		}

		// add/remove spin based on paddle direction
		if (player.isMovingUp()) {
			pos.dy = pos.dy * (pos.dy < 0 ? 0.5 : 1.5);
		} else if (player.isMovingDown()) {
			pos.dy = pos.dy * (pos.dy > 0 ? 0.5 : 1.5);
		}
	}

	this.setPosition(pos.x,  pos.y);
	this.setDirection(pos.dx, pos.dy);
};

/**
 * @returns {Array}
 */
Ball.prototype.getCoordinates = function() {
	if (this._y == null)
		return null;

	return [ this._x, this._y ];
};
