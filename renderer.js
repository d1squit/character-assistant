const characterContainer = document.querySelector('.character-container');
const characterImage = document.querySelector('img.character-img');

let character = {};

(function loadUserSettings (file, callback) {
	var rawFile = new XMLHttpRequest();
	rawFile.overrideMimeType("application/json");
	rawFile.open("GET", file, true);
	rawFile.onreadystatechange = () => { if (rawFile.readyState === 4 && rawFile.status == "200") callback(rawFile.responseText); };
	rawFile.send(null);
})('character.json', function (text) {
	const settings = JSON.parse(text);

	character = {
		speed: settings.speed,
		animations: settings.animations,
		currentAnimation: {animation: null, id: null}	
	};

	characterContainer.style.width = settings.size.width + 'px';
	characterContainer.style.height = settings.size.height + settings.size.height * 60 / 200 + 'px';
	document.body.style.height = settings.size.height + settings.size.height * 60 / 200 + 'px';
	characterImage.style.width = settings.size.width + 'px';
	characterImage.style.marginTop = -settings.size.height * 34 / 50 + 'px';

	playAnimation(character.animations.idle_animation);
});

ipcRenderer.on('log', (event, message) => console.log(message));






function playAnimation (animation, isNew=true) {
	if (character.currentAnimation.animation == animation && isNew) return;
	stopAnimation();
	playAnimation.currentFrame = playAnimation.currentFrame ?? 0;
	characterImage.src = animation.frames[playAnimation.currentFrame];
	playAnimation.currentFrame != animation.frames.length - 1 ? playAnimation.currentFrame++ : playAnimation.currentFrame = 0;
	character.currentAnimation = {animation, id: setTimeout(playAnimation, animation.timeout, animation, false)};
}

function stopAnimation () {
	clearTimeout(character.currentAnimation.id);
	character.currentAnimation = {animation: null, id: null};
}

ipcRenderer.on('window-move-start', () => {
	playAnimation(character.animations.run_animation);
});

ipcRenderer.on('window-move-pause', () => {
	playAnimation(character.animations.idle_animation);
});

ipcRenderer.on('character-flip-left', () => { characterImage.style.webkitTransform = 'scaleX(-1)'; characterImage.style.transform = 'scaleX(-1)'; });
ipcRenderer.on('character-flip-right', () => { characterImage.style.webkitTransform = ''; characterImage.style.transform = ''; });

// --------------------------------------------------------------------------------------------------------------------------------------- //


function cancelMove (event) {
	return new Promise ((resolve, reject) => {
		let handler = () => {
			ipcRenderer.removeAllListeners(event);
			resolve();
		};

		ipcRenderer.on(event, handler);
	});
}



function startMove (pos, speed, cancelListener=null) {
	return new Promise ((resolve, reject) => {
		ipcRenderer.move.start(pos, speed);

		let handler = (event) => {
			playAnimation(character.animations.idle_animation);
			resolve('window-move-end');
		}
		
		ipcRenderer.on('window-move-end', handler);

		if (cancelListener) cancelListener().then(() => {
			playAnimation(character.animations.idle_animation);
			ipcRenderer.move.stop();
			reject('window-move-cancel');
		});
	});
}


ipcRenderer.on('window-mouse-down', (event, mouse_event) => {
	if (mouse_event.button !== 1) return;
	ipcRenderer.move.pause();

	document.body.style.setProperty('-webkit-app-region', 'drag');
});

// ipcRenderer.on('global-mouse-move', (event, mouse_event) => {
	// if (mouse_event.deltaPosition.x > 1 || mouse_event.deltaPosition.y > 1)
	// 	ipcRenderer.move.start(mouse_event.currentPosition, character.speed);
// });

ipcRenderer.on('global-mouse-up', (event, mouse_event) => {
	if (mouse_event.button !== 1) return;
	ipcRenderer.move.resume();

	document.body.style.setProperty('-webkit-app-region', 'no-drag');
});


ipcRenderer.on('mouse-inactive-start', () => {
	ipcRenderer.mouse.get.position().then(position => {
		startMove(position, character.speed, () => cancelMove('mouse-inactive-end')).then(() => {
			ipcRenderer.move.set.pinMouse(true);
			startMove({x: 1800, y: 1060}, character.speed, () => cancelMove('mouse-inactive-end')).then(() => {
				ipcRenderer.move.set.pinMouse(false);
				ipcRenderer.send('mouse-click', 'left');
			}, () => ipcRenderer.move.set.pinMouse(false));
		});
	});
});