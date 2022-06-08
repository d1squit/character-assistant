ipcRenderer.mouse.on.globalMouseMove = (event, mouse_event) => {
	if (mouse_event.deltaPosition.x > 1 || mouse_event.deltaPosition.y > 1)
		ipcRenderer.move.start(mouse_event.currentPosition, character.speed);
};


ipcRenderer.mouse.on.mouseInactiveStart = () => {
	ipcRenderer.mouse.get.position().then(position => {
		character.startMove(position, character.speed, () => character.cancelMove('mouse-inactive-end')).then(() => {
			ipcRenderer.move.set.pinMouse(true);
			character.startMove({x: 1800, y: 1060}, character.speed, () => character.cancelMove('mouse-inactive-end')).then(() => {
				ipcRenderer.move.set.pinMouse(false);
				ipcRenderer.mouse.click('left');
			}, () => ipcRenderer.move.set.pinMouse(false));
		});
	});
};