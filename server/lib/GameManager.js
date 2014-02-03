var colors = require('colors');

var Player = require('./Player.js'),
    GameSlot = require('./GameSlot.js');

/**********************************************************************************************************************/

module.exports = GameManager;

/**
 * Object 'GameManager'.
 *
 * @constructor
 */
function GameManager() {
	this._gameSlots     = [];
	this._gameCounter   = 0;
	this._playerCounter = 0;

	// Server tick
	var self = this;
	function tick() {
		for (var i=0; i<self._gameSlots.length; i++) {
			self._gameSlots[i].tick();
		}

		setTimeout(tick, GLOBAL.serverTick * 1000);
	};
	setTimeout(tick, GLOBAL.serverTick * 1000);
};


/**
 * @param {Player} player
 * @param {bool} forceNewSlot
 * @return {GameSlot}
 */
GameManager.prototype.getSlotForPlayer = function(player, forceNewSlot) {
	if (!forceNewSlot) {
		for (var i=0; i<this._gameSlots.length; i++) {
			if (!this._gameSlots[i].isFull()) {
				console.log('  > GameManager:'.bold, colors.yellow(player.getSocket().id).bold + ':', 'Add player to existing slot', colors.cyan(this._gameSlots[i].getId()));
				this._gameSlots[i].addPlayer(player);
				return this._gameSlots[i];
			}
		}
	}

	var newGameSlot = new GameSlot('game_' + (++this._gameCounter));
	console.log('  > GameManager:'.bold, colors.yellow(player.getSocket().id).bold + ':', 'Add player to new slot', colors.cyan(newGameSlot.getId()));

	newGameSlot.on('gameFinished', function(data) {
		this._removeGameSlot(newGameSlot);
	}.bind(this));

	newGameSlot.addPlayer(player);
	this._gameSlots.push(newGameSlot);

	return newGameSlot;
};

/**
 * @return {Player}
 */
GameManager.prototype.createNewPlayer = function(socket) {
	return new Player('player_' + (++this._playerCounter), socket);
};

/**
 * @param {GameSlot}
 */
GameManager.prototype.killGameSlot = function(gameSlot, reason) {
	console.log('  > GameManager:'.bold, 'kill game slot with id', gameSlot.getId().cyan)
	if (gameSlot.isRunning()) {
		gameSlot.terminate(reason);
	}

	this._removeGameSlot(gameSlot);
};

/**
 *
 * @param {GameSlot} gameSlot
 * @private
 */
GameManager.prototype._removeGameSlot = function(gameSlot) {
	console.log('  > GameManager:'.bold, 'Remove game slot', colors.cyan(gameSlot.getId()));

	for (var i=0; i<this._gameSlots.length; i++) {
		if (this._gameSlots[i].getId() === gameSlot.getId()) {
			this._gameSlots.splice(i, 1);
		}
	}
};
