const { ipcRenderer } = require('electron');

ipcRenderer.log = (...args) => ipcRenderer.send('log', args);

ipcRenderer.move = {
	pause: () => ipcRenderer.send('window-move-pause'),
	resume: () => ipcRenderer.send('window-move-resume'),
    start: (target={x: null, y: null}, speed=null) => ipcRenderer.send('window-move-start', target, speed),
    stop: () => ipcRenderer.send('window-move-end'),

	get: {
		target: () => {
			return new Promise ((resolve, reject) => {
				let handler = (event, target) => {
					ipcRenderer.removeAllListeners('response-window-move-target');
					resolve(target);
				};

				ipcRenderer.send('get-window-move-target');
				ipcRenderer.on('response-window-move-target', handler);
			});
		},

		speed: () => {
			return new Promise ((resolve, reject) => {
				let handler = (event, speed) => {
					ipcRenderer.removeAllListeners('response-window-move-speed');
					resolve(speed);
				};

				ipcRenderer.send('get-window-move-speed');
				ipcRenderer.on('response-window-move-speed', handler);
			});
		},

		pinMouse: () => {
			return new Promise ((resolve, reject) => {
				let handler = (event, pinMouse) => {
					ipcRenderer.removeAllListeners('response-window-move-pinmouse');
					resolve(pinMouse);
				};

				ipcRenderer.send('get-window-move-pinmouse');
				ipcRenderer.on('response-window-move-pinmouse', handler);
			});
		},
	},

	set: {
		target: (newTarget) => ipcRenderer.send('set-window-move-target', newTarget),
		speed: (newSpeed) => ipcRenderer.send('set-window-move-speed', newSpeed),
		pinMouse: (newPinMouse) => ipcRenderer.send('set-window-move-pinmouse', newPinMouse),
	}
}

ipcRenderer.mouse = {
	click: (button) => ipcRenderer.send('mouse-click', button),

	get: {
		position: () => {
			return new Promise ((resolve, reject) => {
				let handler = (event, position) => {
					ipcRenderer.removeAllListeners('response-mouse-position');
					resolve(position);
				};
				
				ipcRenderer.send('get-mouse-position');
				ipcRenderer.on('response-mouse-position', handler);
			});
		}
	},

	set: {
		position: (position) => ipcRenderer.send('set-mouse-position', position)
	}
}
