const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const mouseEvents = require('global-mouse-events');
const robot = require('robotjs');
const path = require('path');
const { urlToHttpOptions } = require('url');

function createWindow () {
	const mainWindow = new BrowserWindow({
		width: 64,
		height: 100,
		x: 960,
		y: 540,
		frame: false,
		// resizable: false,
		alwaysOnTop: true,
		transparent: true,
		acceptFirstMouse: true,
		minimizable: false,
		skipTaskbar: true,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: true,
			contextIsolation: false
		}
	});

	mainWindow.accessMouse = false;
	mainWindow.setAlwaysOnTop(true, 'screen-saver')
	mainWindow.setVisibleOnAllWorkspaces(true);
	mainWindow.hookWindowMessage(0x0116, () => { mainWindow.setEnabled(false); mainWindow.setEnabled(true); });

	// Idle Timer

	const minTimer = 5;
	idleTimer.timer = 0;

	function idleTimer () {
		if (idleTimer.timer === minTimer) {
			mainWindow.accessMouse = true;
			mainWindow.webContents.send('mouse-inactive');
		}

		idleTimer.timer++;
		setTimeout(idleTimer, 1000);
	}

	idleTimer();

	// Mouse Events

	mouseEvents.on('mousedown', event => {
		if (robot.getMousePos().x > mainWindow.getPosition()[0] && robot.getMousePos().y > mainWindow.getPosition()[1] &&
			robot.getMousePos().x < mainWindow.getPosition()[0] + mainWindow.getSize()[0] && robot.getMousePos().y < mainWindow.getPosition()[1] + mainWindow.getSize()[1]) {
			mainWindow.webContents.send('window-mouse-down', event);
		}

		mainWindow.webContents.send('global-mouse-down', event);
	});

	mouseEvents.on('mousemove', event => {
		idleTimer.timer = 0;
		mainWindow.accessMouse = false;

		mainWindow.webContents.send('global-mouse-move', event);

		if (robot.getMousePos().x > mainWindow.getPosition()[0] && robot.getMousePos().y > mainWindow.getPosition()[1] &&
			robot.getMousePos().x < mainWindow.getPosition()[0] + mainWindow.getSize()[0] && robot.getMousePos().y < mainWindow.getPosition()[1] + mainWindow.getSize()[1]) {
			mainWindow.webContents.send('window-mouse-move', event);
		}
	});

	mouseEvents.on('mouseup', event => {
		if (robot.getMousePos().x > mainWindow.getPosition()[0] && robot.getMousePos().y > mainWindow.getPosition()[1] &&
			robot.getMousePos().x < mainWindow.getPosition()[0] + mainWindow.getSize()[0] && robot.getMousePos().y < mainWindow.getPosition()[1] + mainWindow.getSize()[1]) {
			mainWindow.webContents.send('window-mouse-up', event);
		}

		mainWindow.webContents.send('global-mouse-up', event);
	});


	ipcMain.on('get-mouse-position', event => event.sender.send('response-mouse-position', robot.getMousePos()));
	ipcMain.on('set-mouse-position', (event, position) => robot.moveMouse(position.x, position.y));

	// Window Moving

	mainWindow.accessMove = true;

	function WindowMove (target={x: null, y: null}, speed=null, moveMouse=false) {
		this.initializeMove = () => {
			if (Math.abs(Date.now() - this.lastInit) < this.tickTime) return;

			this.required_moves = [];
			this.completed_moves = [];

			this.position = {x: mainWindow.getPosition()[0], y: mainWindow.getPosition()[1]};

			if (!this._target.x && !this._target.y) return;

			mainWindow.webContents.send('window-move-start');

			if (this.position.x < this._target.x) {
				mainWindow.webContents.send('character-flip-right');
				this.required_moves.push('right');
			} else if (this.position.x > this._target.x) {
				mainWindow.webContents.send('character-flip-left');
				this.required_moves.push('left');
			}
		
			if (this.position.y < this._target.y) this.required_moves.push('down');
			else if (this.position.y > this._target.y) this.required_moves.push('up');

			this.accessMove = true;
			this.lastInit = Date.now();

			clearTimeout(this.moveLeftTick.id);
			clearTimeout(this.moveRightTick.id);
			clearTimeout(this.moveUpTick.id);
			clearTimeout(this.moveDownTick.id);

			this.moveRightTick(this._target.x, speed);
			this.moveLeftTick(this._target.x, speed);
			this.moveDownTick(this._target.y, speed);
			this.moveUpTick(this._target.y, speed);

			console.log(this.moveMouse)
		};

		Object.defineProperty(this, 'target', {
			get () { return this._target; },
		  
			set (target) {
				if (this.accessMove) {
					this._target = target;
					initializeMove();
				}
			},

			configurable: true
		});

		this.moveMouse = moveMouse;

		this.tickTime = 16;
		this.lastInit = 0;
		this._target = target;
		this.speed = speed;
		this.accessMove = true;

		this.pause = () => { this.accessMove = false; };

		this.resume = () => {
			if (!this.accessMove) {
				this.accessMove = true;
				this.initializeMove();
			}
		};

		this.endMoveTick = (tick) => {
			if (!this.completed_moves.includes(tick)) this.completed_moves.push(tick);
			if (this.completed_moves.length == this.required_moves.length && this.completed_moves.every(elem => this.required_moves.includes(elem))) mainWindow.webContents.send('window-move-end');
		};

		this.moveRightTick = () => {
			if (!this.accessMove || !this.required_moves.includes('right')) return;

			if (this.position.x - this.speed < this._target.x) {
				this.position.x += this.speed;
				if (Math.round(this.position.x) && Math.round(this.position.y)) mainWindow.setPosition(Math.round(this.position.x), Math.round(this.position.y));
				if (this.moveMouse) robot.moveMouse(this.position.x + mainWindow.getSize()[0] / 2, this.position.y + mainWindow.getSize()[1] / 2);
				moveRightTick.id = setTimeout(moveRightTick, this.tickTime, this._target.x, this.speed);
			} else if (Math.round(this.position.x) != this._target.x) {
				mainWindow.setPosition(this._target.x, Math.round(this.position.y));
				this.position.x = this._target.x;
				this.endMoveTick('right');
			} else this.endMoveTick('right');
		};

		this.moveLeftTick = () => {
			if (!this.accessMove || !this.required_moves.includes('left')) return;

			if (this.position.x - this.speed > this._target.x) {
				this.position.x -= this.speed;
				if (Math.round(this.position.x) && Math.round(this.position.y)) mainWindow.setPosition(Math.round(this.position.x), Math.round(this.position.y));
				if (this.moveMouse) robot.moveMouse(this.position.x + mainWindow.getSize()[0] / 2, this.position.y + mainWindow.getSize()[1] / 2);
				moveLeftTick.id = setTimeout(moveLeftTick, this.tickTime, this._target.x, this.speed);
			} else if (Math.round(this.position.x) != this._target.x) {
				mainWindow.setPosition(this._target.x, Math.round(this.position.y));
				this.position.x = this._target.x;
				this.endMoveTick('left');
			} else this.endMoveTick('left');
		};

		this.moveDownTick = () => {
			if (!this.accessMove || !this.required_moves.includes('down')) return;

			if (this.position.y - this.speed < this._target.y) {
				this.position.y += this.speed;
				if (Math.round(this.position.x) && Math.round(this.position.y)) mainWindow.setPosition(Math.round(this.position.x), Math.round(this.position.y));
				if (this.moveMouse) robot.moveMouse(this.position.x + mainWindow.getSize()[0] / 2, this.position.y + mainWindow.getSize()[1] / 2);
				moveDownTick.id = setTimeout(moveDownTick, this.tickTime, this._target.y, this.speed);
			} else if (Math.round(this.position.y) != this._target.y) {
				mainWindow.setPosition(Math.round(this.position.x), this._target.y);
				this.position.y = this._target.y;
				this.endMoveTick('down');
			} else this.endMoveTick('down');
		};

		this.moveUpTick = () => {
			if (!this.accessMove || !this.required_moves.includes('up')) return;

			if (this.position.y - this.speed > this._target.y) {
				this.position.y -= this.speed;
				if (Math.round(this.position.x) && Math.round(this.position.y)) mainWindow.setPosition(Math.round(this.position.x), Math.round(this.position.y));
				if (this.moveMouse) robot.moveMouse(this.position.x + mainWindow.getSize()[0] / 2, this.position.y + mainWindow.getSize()[1] / 2);
				moveUpTick.id = setTimeout(moveUpTick, this.tickTime, this._target.y, this.speed);
			} else if (Math.round(this.position.y) != this._target.y) {
				mainWindow.setPosition(Math.round(this.position.x), this._target.y);
				this.position.y = this._target.y;
				this.endMoveTick('up');
			} else this.endMoveTick('up')
		};

		return this;
	};

	mainWindow.move = WindowMove();

	ipcMain.on('set-window-move-target', (event, target) => {
		mainWindow.move.target = target;
	});

	ipcMain.on('set-window-move-speed', (event, speed) => {
		mainWindow.move.speed = speed;
	});

	ipcMain.on('set-window-move-mouse', (event, moveMouse) => {
		console.log(moveMouse)
		mainWindow.move.moveMouse = moveMouse;
	});

	ipcMain.on('window-move-pause', event => {
		mainWindow.move.pause();
		mainWindow.webContents.send('window-move-pause');
	});

	ipcMain.on('window-move-resume', event => {
		mainWindow.move.resume();
		mainWindow.webContents.send('window-move-resume');
	});

	ipcMain.on('window-move-start', (event, target, speed) => {
		mainWindow.move.target = target;
		mainWindow.move.speed = speed;
		initializeMove();
	});


	ipcMain.on('log', (event, message) => console.log('log:', message))

	mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
	createWindow();

	app.on('activate', function () {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') app.quit();
});