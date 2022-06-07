const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

let normalPath = '';
if (!fs.existsSync('resources/app/.devmode'))
	if (!fs.existsSync('.devmode'))
		normalPath = 'resources/app/';

childProcess.exec(`cd ${normalPath} & update-win.exe`, error => {
	if (error) throw error;
	if (normalPath && fs.existsSync('resources/app/.devmode')) fs.rmSync(normalPath + '.devmode');
	if (normalPath && fs.existsSync('resources/app/temp')) fs.rmdirSync(normalPath + 'temp');

	const { app, BrowserWindow, ipcMain, Menu } = require('electron');
	const mouseEvents = require('global-mouse-events');
	const robot = require('robotjs');

	let settings = JSON.parse(fs.readFileSync(normalPath + 'character.json'));

	function createWindow() {
		const mainWindow = new BrowserWindow({
			width: settings.size.width,
			height: settings.size.height,
			frame: false,
			resizable: false,
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

		const menu = Menu.buildFromTemplate([
			{
				label: 'Close',
				role: 'quit'
			},
			{
				label: 'Settings',
				click: () => {
					require('child_process').exec(`start "" "${__dirname}/character.json"`);
				}
			}
		]);

		mainWindow.setAlwaysOnTop(true, "floating");
		mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
		mainWindow.hookWindowMessage(0x0116, () => { mainWindow.setEnabled(false); mainWindow.setEnabled(true); menu.popup(); });

		// Idle Timer

		const minTimer = 2;
		idleTimer.timer = 0;

		function idleTimer() {
			if (idleTimer.timer === minTimer) mainWindow.webContents.send('mouse-inactive-start');

			idleTimer.timer++;
			setTimeout(idleTimer, 1000);
		}

		idleTimer();

		// Mouse Events

		function isInWindow(checkPosition) {
			return checkPosition.x > mainWindow.getPosition()[0] && checkPosition.y > mainWindow.getPosition()[1] &&
				checkPosition.x < mainWindow.getPosition()[0] + mainWindow.getSize()[0] && checkPosition.y < mainWindow.getPosition()[1] + mainWindow.getSize()[1];
		}

		mouseEvents.lastPosition = robot.getMousePos();

		mouseEvents.on('mousedown', event => {
			if (idleTimer.timer >= minTimer) mainWindow.webContents.send('mouse-inactive-end', event);
			if (idleTimer.timer !== 0) idleTimer.timer = 0;

			if (isInWindow(robot.getMousePos())) mainWindow.webContents.send('window-mouse-down', event);
			mainWindow.webContents.send('global-mouse-down', event);

			mainWindow.moveTop();
		});

		mouseEvents.on('mousemove', event => {
			if (mainWindow.move.pinMouse && Math.abs(event.x - mouseEvents.lastPosition.x) <= mainWindow.move.speed * 1.5 && Math.abs(event.y - mouseEvents.lastPosition.y) <= mainWindow.move.speed * 1.5) {
				mouseEvents.lastPosition = event;
				mainWindow.moveTop();
				return;
			}

			if (idleTimer.timer >= minTimer) mainWindow.webContents.send('mouse-inactive-end', event);
			if (idleTimer.timer !== 0) idleTimer.timer = 0;

			let sendEvent = {
				currentPosition: { x: event.x, y: event.y },
				lastPosition: mouseEvents.lastPosition,
				deltaPosition: { x: Math.abs(event.x - mouseEvents.lastPosition.x), y: Math.abs(event.y - mouseEvents.lastPosition.y) }
			};

			if (isInWindow(robot.getMousePos())) mainWindow.webContents.send('window-mouse-move', sendEvent);
			mainWindow.webContents.send('global-mouse-move', sendEvent);

			mainWindow.moveTop();
			mouseEvents.lastPosition = event;
		});

		mouseEvents.on('mouseup', event => {
			if (idleTimer.timer >= minTimer) mainWindow.webContents.send('mouse-inactive-end', event);
			if (idleTimer.timer !== 0) idleTimer.timer = 0;

			if (isInWindow(robot.getMousePos())) mainWindow.webContents.send('window-mouse-up', event);
			mainWindow.webContents.send('global-mouse-up', event);

			mainWindow.moveTop();
		});


		ipcMain.on('get-mouse-position', event => event.sender.send('response-mouse-position', robot.getMousePos()));
		ipcMain.on('set-mouse-position', (event, position) => robot.moveMouse(position.x, position.y));

		ipcMain.on('mouse-click', (event, button) => {
			mainWindow.setIgnoreMouseEvents(true);
			robot.mouseClick(button);
			mainWindow.setIgnoreMouseEvents(false);
		});

		// Window Move

		function WindowMove(target = { x: null, y: null }, speed = 0, pinMouse = false) {
			this.initializeMove = () => {
				if (Math.abs(Date.now() - this.lastInit) < this.tickTime) return;
				this.position = { x: mainWindow.getPosition()[0], y: mainWindow.getPosition()[1] };

				if (!this._target.x && !this._target.y) return;
				if (this.position.x == this._target.x && this.position.y == this._target.y) { mainWindow.webContents.send('window-move-end'); return; }

				this.distance = { x: Math.abs(this.position.x - this._target.x), y: Math.abs(this.position.y - this._target.y) };

				if (this.distance.x > this.distance.y) this.axisSpeed = { x: this.speed, y: this.speed * this.distance.y / this.distance.x };
				else this.axisSpeed = { x: this.speed * this.distance.x / this.distance.y, y: this.speed };

				mainWindow.webContents.send('window-move-start');
				this.moveTick.complete = { x: false, y: false };

				if (this.position.x < this._target.x) mainWindow.webContents.send('character-flip-right');
				else if (this.position.x > this._target.x) mainWindow.webContents.send('character-flip-left');

				this.accessMove = true;
				this.lastInit = Date.now();

				clearTimeout(this.moveTick.id);
				this.moveTick();
			};

			Object.defineProperty(this, 'target', {
				get() { return this._target; },

				set(target) {
					if (this.accessMove) {
						this._target = target;
						initializeMove();
					}
				},

				configurable: true
			});


			this.tickTime = 16;
			this.lastInit = 0;

			this.accessMove = false;

			this.speed = speed;
			this._target = target;
			this.pinMouse = pinMouse;

			this.pause = () => {
				this.accessMove = false;
				this.pinMouse = false;
				mainWindow.webContents.send('window-move-pause');
			};

			this.resume = () => {
				if (!this.accessMove) {
					this.accessMove = true;
					this.initializeMove();
				}
			};

			this.stop = () => {
				this._target = { x: null, y: null };
				this.initializeMove();
			}

			this.moveTick = () => {
				if (!this.accessMove) return;

				if (this.position.x + this.axisSpeed.x < this._target.x) this.position.x += this.axisSpeed.x;
				else if (this.position.x - this.axisSpeed.x > this._target.x) this.position.x -= this.axisSpeed.x;
				else if (Math.round(this.position.x) != Math.round(this._target.x)) this.position.x = this._target.x;
				else this.moveTick.complete.x = true;

				if (this.position.y + this.axisSpeed.y < this._target.y) this.position.y += this.axisSpeed.y;
				else if (this.position.y - this.axisSpeed.y > this._target.y) this.position.y -= this.axisSpeed.y;
				else if (Math.round(this.position.y) != Math.round(this._target.y)) this.position.y = this._target.y;
				else this.moveTick.complete.y = true;

				if (Math.round(this.position.x) && Math.round(this.position.y)) mainWindow.setPosition(Math.round(this.position.x), Math.round(this.position.y));
				if (this.pinMouse) robot.moveMouse(this.position.x + mainWindow.getSize()[0] / 2, this.position.y + mainWindow.getSize()[1] / 2);
				if (this._target.x && this._target.y) this.moveTick.id = setTimeout(this.moveTick, this.tickTime);
				if (this.moveTick.complete.x && this.moveTick.complete.y) mainWindow.webContents.send('window-move-end');
			}

			return this;
		};

		mainWindow.move = WindowMove();


		ipcMain.on('get-window-move-target', (event) => event.sender.send('response-window-move-target', mainWindow.move.target));
		ipcMain.on('get-window-move-speed', (event) => event.sender.send('response-window-move-target', mainWindow.move.speed));
		ipcMain.on('get-window-move-pinmouse', (event) => event.sender.send('response-window-move-target', mainWindow.move.pinMouse));


		ipcMain.on('set-window-move-target', (event, target) => {
			mainWindow.move.target = { x: target.x - mainWindow.getSize()[0] / 2, y: target.y - mainWindow.getSize()[1] / 2 };
		});

		ipcMain.on('set-window-move-speed', (event, speed) => {
			mainWindow.move.speed = speed;
		});

		ipcMain.on('set-window-move-pinmouse', (event, pinMouse) => {
			mainWindow.move.pinMouse = pinMouse;
			mainWindow.moveTop();
		});

		ipcMain.on('window-move-pause', event => mainWindow.move.pause());
		ipcMain.on('window-move-resume', event => mainWindow.move.resume());
		ipcMain.on('window-move-end', event => mainWindow.move.stop());

		ipcMain.on('window-move-start', (event, target, speed) => {
			if (!target.x && !target.y) return;

			mainWindow.move.accessMove = true;
			mainWindow.move.speed = speed;
			mainWindow.move.target = { x: target.x - mainWindow.getSize()[0] / 2, y: target.y - mainWindow.getSize()[1] / 2 };
		});


		ipcMain.on('log', (event, message) => console.log('log:', message));

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
});