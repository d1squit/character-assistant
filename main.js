const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const mouseEvents = require("global-mouse-events");
const robot = require('robotjs');
const path = require('path');

function createWindow () {
	const mainWindow = new BrowserWindow({
		width: 64,
		height: 100,
		x: 960,
		y: 540,
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

	mainWindow.setAlwaysOnTop(true, "screen-saver")
	mainWindow.setVisibleOnAllWorkspaces(true);
	mainWindow.hookWindowMessage(0x0116, () => { mainWindow.setEnabled(false); mainWindow.setEnabled(true); });

	// Mouse Events

	mouseEvents.on("mousedown", event => {
		if (robot.getMousePos().x > mainWindow.getPosition()[0] && robot.getMousePos().y > mainWindow.getPosition()[1] &&
			robot.getMousePos().x < mainWindow.getPosition()[0] + mainWindow.getSize()[0] && robot.getMousePos().y < mainWindow.getPosition()[1] + mainWindow.getSize()[1]) {
			mainWindow.webContents.send('window-mouse-down', event);
		}
	});

	mouseEvents.on("mouseup", event => {
		if (robot.getMousePos().x > mainWindow.getPosition()[0] && robot.getMousePos().y > mainWindow.getPosition()[1] &&
			robot.getMousePos().x < mainWindow.getPosition()[0] + mainWindow.getSize()[0] && robot.getMousePos().y < mainWindow.getPosition()[1] + mainWindow.getSize()[1]) {
			mainWindow.webContents.send('window-mouse-up', event);
		}
	});

	// Window Moving

	mainWindow.accessMove = true;

	ipcMain.on('window-move-force-end', (event) => {
		mainWindow.accessMove = false;
		event.sender.send('window-move-force-end');
	});

	ipcMain.on('window-move-force-start', (event) => {
		mainWindow.accessMove = true;
	});

	ipcMain.on('window-move-start', (event, pos, speed) => {
		mainWindow.currentX = mainWindow.getPosition()[0];
		mainWindow.currentY = mainWindow.getPosition()[1];

		let required_moves = 0;
		let completed_moves = 0;
		
		if (mainWindow.getPosition()[0] < pos.x) {
			moveRightTick(pos.x, speed);
			required_moves++;
			event.sender.send('character-flip-right');
		} else if (mainWindow.getPosition()[0] > pos.x) {
			moveLeftTick(pos.x, speed);
			required_moves++;
			event.sender.send('character-flip-left');
		}

		if (mainWindow.getPosition()[1] < pos.y) {
			moveDownTick(pos.y, speed);
			required_moves++;
		} else if (mainWindow.getPosition()[1] > pos.y) {
			moveUpTick(pos.y, speed);
			required_moves++;
		}

		function moveRightTick (target, speed) {
			if (!mainWindow.accessMove) return false;

			if (mainWindow.getPosition()[0] - speed < target) {				
				mainWindow.setPosition(Math.round(mainWindow.currentX += speed), mainWindow.getPosition()[1]);
				setTimeout(moveRightTick, 1, target, speed);
			} else if (mainWindow.getPosition()[0] != target) {
				mainWindow.setPosition(target, mainWindow.getPosition()[1]);
				mainWindow.currentX = target;

				completed_moves++;
				if (completed_moves == required_moves) event.sender.send('window-move-end');
			} else {
				completed_moves++;
				if (completed_moves == required_moves) event.sender.send('window-move-end');
			}
		}

		function moveLeftTick (target, speed) {
			if (!mainWindow.accessMove) return false;

			if (mainWindow.getPosition()[0] - speed > target) {
				mainWindow.setPosition(Math.round(mainWindow.currentX -= speed), mainWindow.getPosition()[1]);
				setTimeout(moveLeftTick, 1, target, speed);
			} else if (mainWindow.getPosition()[0] != target) {
				mainWindow.setPosition(target, mainWindow.getPosition()[1]);
				mainWindow.currentX = target;

				completed_moves++;
				if (completed_moves == required_moves) event.sender.send('window-move-end');
			} else {
				completed_moves++;
				if (completed_moves == required_moves) event.sender.send('window-move-end');
			}
		}

		function moveDownTick (target, speed) {
			if (!mainWindow.accessMove) return false;

			if (mainWindow.getPosition()[1] - speed < target) {
				mainWindow.setPosition(mainWindow.getPosition()[0], Math.round(mainWindow.currentY += speed));
				setTimeout(moveDownTick, 1, target, speed);
			} else if (mainWindow.getPosition()[1] != target) {
				mainWindow.setPosition(mainWindow.getPosition()[0], target);
				mainWindow.currentY = target;

				completed_moves++;
				if (completed_moves == required_moves) event.sender.send('window-move-end');
			} else {
				completed_moves++;
				if (completed_moves == required_moves) event.sender.send('window-move-end');
			}
		}

		function moveUpTick (target, speed) {
			if (!mainWindow.accessMove) return false;

			if (mainWindow.getPosition()[1] - speed > target) {
				mainWindow.setPosition(mainWindow.getPosition()[0], Math.round(mainWindow.currentY -= speed));
				setTimeout(moveUpTick, 1, target, speed);
			} else if (mainWindow.getPosition()[1] != target) {
				mainWindow.setPosition(mainWindow.getPosition()[0], target);
				mainWindow.currentY = target;
				
				completed_moves++;
				if (completed_moves == required_moves) event.sender.send('window-move-end');
			} else {
				completed_moves++;
				if (completed_moves == required_moves) event.sender.send('window-move-end');
			}
		}
	});

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