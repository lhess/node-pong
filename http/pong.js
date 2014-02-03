//=============================================================================
// PONG
//=============================================================================

Pong = {
	Defaults: {
		width:        640,   // logical canvas width (browser will scale to physical canvas size - which is controlled by @media css queries)
		height:       480,   // logical canvas height (ditto)
		wallWidth:    12,
		paddleWidth:  12,
		paddleHeight: 60,
		ballRadius:   5
	},

	Colors: {
		walls:           'white',
		ball:            'cyan',
		score:           'white'
	},

	Images: [
		"images/winner.png"
	],

	socket:               null,
	socketIsConnected:    false,
	playerId:             null,
	playerNumber:         null,
	playerPaddleIsMoving: false,
	otherPlayerId:        null,
	gameSlotId:           null,
	gameStatus:           null,
	countdownTimer:       0,

	//-----------------------------------------------------------------------------

	initialize: function(runner, cfg) {
		Game.loadImages(Pong.Images, function(images) {
			this.cfg         = cfg;
			this.runner      = runner;
			this.width       = runner.width;
			this.height      = runner.height;
			this.images      = images;
			this.scores      = [0, 0];
			this.UI          = Object.construct(Pong.UI,     this);
			this.court       = Object.construct(Pong.Court,  this);
			this.leftPaddle  = Object.construct(Pong.Paddle, this);
			this.rightPaddle = Object.construct(Pong.Paddle, this, true);
			this.ball        = Object.construct(Pong.Ball,   this);

			this.socket = io.connect('10.10.2.32', { port: 1904 });

			this.socket.on('game_update', function(data) {
				if (data.ball != null) {
					this.ball.setPosition(data.ball[0], data.ball[1]);
				} else {
					this.ball.setPosition(null, null);
				}

				if (data.paddles != null) {
					if (data.paddles[this.playerId] != null) {
						this.leftPaddle.setY(data.paddles[this.playerId]);
					}
					if (data.paddles[this.otherPlayerId] != null) {
						this.rightPaddle.setY(data.paddles[this.otherPlayerId]);
					}
				}

				if (data.scores != null) {
					this.scores = data.scores;
				}
			}.bind(this));

			this.socket.on('game_start', function(data) {
				this.gameStatus = Game.STATUS.BALL_IN_GAME;
			}.bind(this));

			this.socket.on('game_stop', function(data) {
				console.log(this.playerNumber, data);
				if (data.winner != null) {
					this.UI.declareWinner(data.winner);
				}
				this.gameStatus = Game.STATUS.TERMINATED;
			}.bind(this));

			this.socket.on('game_showCountdown', function(data) {
				this.gameStatus = Game.STATUS.COUNTDOWN;
				this.countdownTimer = data.timer;
			}.bind(this));

			this.socket.on('game_waitingForOtherPlayer', function(data) {
				console.log('game_waitingForOtherPlayer', data);

				this.gameStatus = Game.STATUS.WAITING_FOR_PLAYER;
			}.bind(this));

			this.socket.on('game_otherPlayerJoined', function(data) {
				console.log('game_otherPlayerJoined', data);
				this.otherPlayerId = data.otherPlayerId;
			}.bind(this));

			this.socket.on('game_initialized', function(data) {
				console.log('game_initialized', data)

				this.playerId      = data.playerId;
				this.otherPlayerId = data.otherPlayerId;
				this.gameSlotId    = data.gameSlotId;
				this.playerNumber  = data.playerNumber;
				this.runner.start();
			}.bind(this));


			this.socket.on('game_terminated', function(data) {
				this.runner.stop();
				this.gameStatus    = Game.STATUS.TERMINATED;
				this.otherPlayerId = null;
				this.gameSlotId    = null;
				this.winner        = null;
				this.playerNumber  = null;

				window.setTimeout(function() {
					this.gameStatus = Game.STATUS.WAITING_FOR_PLAYER;
					this.socket.emit('game_initialize', { createNewGameSlot: false });
				}.bind(this), 10000);
			}.bind(this));


			this.socket.on('connect', function() {
				this.socketIsConnected = true;

				this.socket.emit('game_initialize', { createNewGameSlot: false });
			}.bind(this));


			this.socket.on('error', function() {
				console.error('ERROR');
				this.socket.disconnect();
				this.socketIsConnected = false;
			}.bind(this))
		}.bind(this));
	},

	start: function() {
		if (!this.playing) {
			this.scores = [0, 0];
			this.playing = true;

			this.ball.reset();
			this.runner.hideCursor();
		}
	},

	stop: function(ask) {
		if (this.playing) {
			if (!ask || this.runner.confirm('Abandon game in progress ?')) {
				this.playing = false;

				this.runner.showCursor();
			}
		}
	},

	draw: function(ctx) {
		if (this.playerNumber == 1) {
			this.court.draw(ctx, this.scores[0], this.scores[1]);
		} else {
			this.court.draw(ctx, this.scores[1], this.scores[0]);
		}

		this.leftPaddle.draw(ctx);
		this.rightPaddle.draw(ctx);

		if (this.gameStatus == Game.STATUS.BALL_IN_GAME) {
			this.ball.draw(ctx);
		}

		this.UI.draw(ctx);
	},

	onkeydown: function(keyCode) {
		if (this.socketIsConnected) {
			switch(keyCode) {
				case Game.KEY.ESC:
					this.stop(true);
				break;

				case Game.KEY.Q:
					if (!this.playerPaddleIsMoving) {
						this.playerPaddleIsMoving = true;
						this.socket.emit('moveUp', { gameSlotId: this.gameSlotId });
					}
				break;

				case Game.KEY.A:
					if (!this.playerPaddleIsMoving) {
						this.playerPaddleIsMoving = true;
						this.socket.emit('moveDown', { gameSlotId: this.gameSlotId });
					}
				break;
			}
		}
	},

	onkeyup: function(keyCode) {
		if (this.socketIsConnected) {
			switch(keyCode) {
				case Game.KEY.Q:
					this.playerPaddleIsMoving = false;
					this.socket.emit('stopMoving', { gameSlotId: this.gameSlotId });
				break;

				case Game.KEY.A:
					this.playerPaddleIsMoving = false;
					this.socket.emit('stopMoving', { gameSlotId: this.gameSlotId });
				break;
			}
		}
	},

	//=============================================================================
	// UI
	//=============================================================================

	UI: {
		initialize: function(pong) {
			this.game = pong;

			var winner = pong.images["images/winner.png"];
			this.winnerLeft = { image: winner, x: (pong.width/2) - winner.width - pong.cfg.wallWidth, y: 6 * pong.cfg.wallWidth };
			this.winnerRight = { image: winner, x: (pong.width/2)                + pong.cfg.wallWidth, y: 6 * pong.cfg.wallWidth };

			this.winner = null;
		},

		declareWinner: function(playerNumber) {
			this.winner = playerNumber;
		},

		draw: function(ctx) {
			if (this.game.playerId) {
				ctx.fillStyle = 'black';
				ctx.font = 'bold 10px sans-serif';
				ctx.textBaseline = 'middle';
				ctx.textAlign = 'left';
				ctx.fillText('You: ' + this.game.playerId, 4, 5);

				var otherPlayerId = 'Other player: ' + (this.game.otherPlayerId || '... waiting');
				var metrics = ctx.measureText(otherPlayerId);
				ctx.fillText(otherPlayerId, this.game.width - metrics.width - 4, 5);
			}

			if (this.game.gameStatus === Game.STATUS.WAITING_FOR_PLAYER) {
				this.drawMessageBox(ctx, 'Waiting for other player...');
			} else if (this.game.gameStatus === Game.STATUS.TERMINATED) {
				if (this.winner != null) {
					if (this.winner == this.game.playerNumber) {
						ctx.drawImage(this.winnerRight.image, this.winnerRight.x, this.winnerRight.y);
					} else {
						ctx.drawImage(this.winnerLeft.image,  this.winnerLeft.x,  this.winnerLeft.y);
					}
				} else {
					this.drawMessageBox(ctx, 'GAME IS TERMINATED');
				}
			} else if (this.game.gameStatus === Game.STATUS.COUNTDOWN) {
				if (this.game.countdownTimer > 0) {
					this.drawMessageBox(ctx, "" + this.game.countdownTimer, 75, 40);
				}
			} else {
				if (this.winner == 0)
					ctx.drawImage(this.winner1.image, this.winner1.x, this.winner1.y);
				else if (this.winner == 1)
					ctx.drawImage(this.winner2.image, this.winner2.x, this.winner2.y);
			}
		},

		drawMessageBox: function(ctx, message, width, fontSize) {
			var padding = 20;
			var maxWidth = this.game.cfg.width;

			var widthWasNull = width == null;
			if (widthWasNull) {
				width = maxWidth - 50;
			}
			if (fontSize == null) {
				fontSize = 12;
			}

			var lineHeight = fontSize + 5;

			var textInfo = this.getTextInfo(ctx, message, width, lineHeight);
			var height = textInfo.numOfLines * lineHeight + (2 * padding);

			if (textInfo.maxWidth < width && widthWasNull) {
				width = textInfo.maxWidth + (2 * padding);
			}

			ctx.fillStyle = 'black';
			ctx.fillRect(
				(this.game.width / 2) - (width / 2),
				(this.game.height / 2) - (height / 2),
				width, height
			);

			ctx.strokeStyle = 'red';
			for (var i=0; i<3; i++) {
				ctx.strokeRect(
					this.game.width / 2 - (width / 2) + i,
					this.game.height / 2 - (height / 2) + i,
					width - (i * 2), height - (i * 2)
				);
			}

			ctx.fillStyle = 'white';
			ctx.font = fontSize + 'px Arial';
			ctx.textBaseline = 'middle';
			ctx.textAlign = 'center';

			this.wrapText(
				ctx, message,
				(this.game.width / 2),
				(this.game.height / 2),
				width,
				lineHeight
			);
		},

		wrapText: function(ctx, text, x, y, maxWidth, lineHeight) {
			var words = text.split(' ');
			var line = '';

			for(var n = 0; n < words.length; n++) {
				var testLine = line + words[n] + ' ';
				var metrics = ctx.measureText(testLine);
				var testWidth = metrics.width;
				if (testWidth > maxWidth && n > 0) {
					ctx.fillText(line, x, y);
					line = words[n] + ' ';
					y += lineHeight;
				}
				else {
					line = testLine;
				}
			}
			ctx.fillText(line, x, y);
		},

		getTextInfo: function(ctx, text, maxWidth, lineHeight) {
			var words = text.split(' ');
			var line = '';
			var result = {
				numOfLines: 1,
				maxWidth: 0
			};

			for (var n = 0; n < words.length; n++) {
				var testLine = line + words[n] + ' ';
				var metrics = ctx.measureText(testLine);
				var testWidth = metrics.width;

				if (testWidth > result.maxWidth) {
					result.maxWidth = testWidth;
				}

				if (testWidth > maxWidth && n > 0) {
					result.numOfLines++;
				} else {
					line = testLine;
				}
			}

			return result;
		}
	},

	//=============================================================================
	// COURT
	//=============================================================================

	Court: {
		initialize: function(pong) {
			var w  = pong.width;
			var h  = pong.height;
			var ww = pong.cfg.wallWidth;

			this.ww    = ww;
			this.walls = [];
			this.walls.push({x: 0, y: 0,      width: w, height: ww});
			this.walls.push({x: 0, y: h - ww, width: w, height: ww});
			var nMax = (h / (ww*2));
			for(var n = 0 ; n < nMax ; n++) { // draw dashed halfway line
				this.walls.push({x: (w / 2) - (ww / 2),
					y: (ww / 2) + (ww * 2 * n),
					width: ww, height: ww});
			}

			var sw = 3*ww;
			var sh = 4*ww;
			this.score1 = {x: 0.5 + (w/2) - 1.5*ww - sw, y: 2*ww, w: sw, h: sh};
			this.score2 = {x: 0.5 + (w/2) + 1.5*ww,      y: 2*ww, w: sw, h: sh};
		},

		draw: function(ctx, scorePlayer1, scorePlayer2) {
			ctx.fillStyle = Pong.Colors.walls;
			for(var n = 0 ; n < this.walls.length ; n++)
				ctx.fillRect(this.walls[n].x, this.walls[n].y, this.walls[n].width, this.walls[n].height);
			this.drawDigit(ctx, scorePlayer1, this.score1.x, this.score1.y, this.score1.w, this.score1.h);
			this.drawDigit(ctx, scorePlayer2, this.score2.x, this.score2.y, this.score2.w, this.score2.h);
		},

		drawDigit: function(ctx, n, x, y, w, h) {
			ctx.fillStyle = Pong.Colors.score;
			var dw = dh = this.ww*4/5;
			var blocks = Pong.Court.DIGITS[n];
			if (blocks[0])
				ctx.fillRect(x, y, w, dh);
			if (blocks[1])
				ctx.fillRect(x, y, dw, h/2);
			if (blocks[2])
				ctx.fillRect(x+w-dw, y, dw, h/2);
			if (blocks[3])
				ctx.fillRect(x, y + h/2 - dh/2, w, dh);
			if (blocks[4])
				ctx.fillRect(x, y + h/2, dw, h/2);
			if (blocks[5])
				ctx.fillRect(x+w-dw, y + h/2, dw, h/2);
			if (blocks[6])
				ctx.fillRect(x, y+h-dh, w, dh);
		},

		DIGITS: [
			[1, 1, 1, 0, 1, 1, 1], // 0
			[0, 0, 1, 0, 0, 1, 0], // 1
			[1, 0, 1, 1, 1, 0, 1], // 2
			[1, 0, 1, 1, 0, 1, 1], // 3
			[0, 1, 1, 1, 0, 1, 0], // 4
			[1, 1, 0, 1, 0, 1, 1], // 5
			[1, 1, 0, 1, 1, 1, 1], // 6
			[1, 0, 1, 0, 0, 1, 0], // 7
			[1, 1, 1, 1, 1, 1, 1], // 8
			[1, 1, 1, 1, 0, 1, 0]  // 9
		]
	},

	//=============================================================================
	// PADDLE
	//=============================================================================

	Paddle: {
		initialize: function(pong, rhs) {
			this.pong   = pong;
			this.width  = pong.cfg.paddleWidth;
			this.height = pong.cfg.paddleHeight;

			this.x = rhs ? pong.width - this.width : 0;
			this.y = null;
		},

		setY: function(y) {
			this.y = y;
		},

		draw: function(ctx) {
			if (this.y !== null) {
				ctx.fillStyle = Pong.Colors.walls;
				ctx.fillRect(this.x, this.y, this.width, this.height);
				if (this.prediction && this.pong.cfg.predictions) {
					ctx.strokeStyle = Pong.Colors.predictionExact;
					ctx.strokeRect(this.prediction.x - this.prediction.radius, this.prediction.exactY - this.prediction.radius, this.prediction.radius*2, this.prediction.radius*2);
					ctx.strokeStyle = Pong.Colors.predictionGuess;
					ctx.strokeRect(this.prediction.x - this.prediction.radius, this.prediction.y - this.prediction.radius, this.prediction.radius*2, this.prediction.radius*2);
				}
			}
		}
	},

	//=============================================================================
	// BALL
	//=============================================================================

	Ball: {
		initialize: function(pong) {
			this._x      = null;
			this._y      = null;
			this._pong   = pong;
			this._radius = pong.cfg.ballRadius;
		},

		setPosition: function(x, y) {
			this._x = x;
			if (this._x != null && this._pong.playerNumber == 2) {
				this._x = Math.abs(this._pong.cfg.width - this._x);
			}
			this._y = y;
		},

		draw: function(ctx) {
			if (this._y !== null) {
				var w = h = this._radius * 2;
				ctx.fillStyle = Pong.Colors.ball;
				ctx.fillRect(
					this._x - this._radius, this._y - this._radius, w, h
				);
			}
		}
	}
}; // Pong
