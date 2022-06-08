const { ipcRenderer } = require('electron');

ipcRenderer.log = (...args) => ipcRenderer.send('log', args);
ipcRenderer.on('log', (event, message) => console.log(message));

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
	toogle: (down, button) => ipcRenderer.send('mouse-toogle', down, button),

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
	},

	on: {
		windowMouseDown: (event, mouse_event) => {},
		windowMouseMove: (event, mouse_event) => {},
		windowMouseUp: (event, mouse_event) => {},

		globalMouseDown: (event, mouse_event) => {},
		globalMouseMove: (event, mouse_event) => {},
		globalMouseUp: (event, mouse_event) => {},

		mouseInactiveStart: (event) => {},
		mouseInactiveEnd: (event) => {}
	}
}

ipcRenderer.on('window-mouse-down', (event, mouse_event) => {
	if (mouse_event.button == 1) {
		ipcRenderer.move.pause();
		document.body.style.setProperty('-webkit-app-region', 'drag');
	}

	ipcRenderer.mouse.on.windowMouseDown(event, mouse_event);
});

ipcRenderer.on('window-mouse-move', (event, mouse_event) => {
	ipcRenderer.mouse.on.windowMouseMove(event, mouse_event);
});

ipcRenderer.on('window-mouse-up', (event, mouse_event) => {
	ipcRenderer.mouse.on.windowMouseUp(event, mouse_event);
});

ipcRenderer.on('global-mouse-down', (event, mouse_event) => {
	ipcRenderer.mouse.on.globalMouseDown(event, mouse_event);
});

ipcRenderer.on('global-mouse-move', (event, mouse_event) => {
	ipcRenderer.mouse.on.globalMouseMove(event, mouse_event);
});

ipcRenderer.on('global-mouse-up', (event, mouse_event) => {
	if (mouse_event.button == 1) {
		ipcRenderer.move.resume();
		document.body.style.setProperty('-webkit-app-region', 'no-drag');
	}

	ipcRenderer.mouse.on.globalMouseUp(event, mouse_event);
});

ipcRenderer.on('mouse-inactive-start', (event) => ipcRenderer.mouse.on.mouseInactiveStart(event));
ipcRenderer.on('mouse-inactive-end', (event) => ipcRenderer.mouse.on.mouseInactiveEnd(event));