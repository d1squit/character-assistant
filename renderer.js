const character_image = document.querySelector('img.character-img');

let character = {
	speed: 2,
	currentAnimation: {animation: null, id: null},
	moveTarget: {x: null, y: null},

	animations: {
		idle_anim: {
			timeout: 150,
			frames: ['tiles/knight_f_idle_anim_f0.png', 'tiles/knight_f_idle_anim_f1.png', 'tiles/knight_f_idle_anim_f2.png', 'tiles/knight_f_idle_anim_f3.png']
		},
		
		run_anim: {
			timeout: 150,
			frames: ['tiles/knight_f_run_anim_f0.png', 'tiles/knight_f_run_anim_f1.png', 'tiles/knight_f_run_anim_f2.png', 'tiles/knight_f_run_anim_f3.png']
		}
	}
}

function playAnimation (animation, isNew=true) {
	if (character.currentAnimation.animation == animation && isNew) return;
	stopAnimation();
	playAnimation.currentFrame = playAnimation.currentFrame ?? 0;
	character_image.src = animation.frames[playAnimation.currentFrame];
	playAnimation.currentFrame != animation.frames.length - 1 ? playAnimation.currentFrame++ : playAnimation.currentFrame = 0;
	character.currentAnimation = {animation, id: setTimeout(playAnimation, animation.timeout, animation, false)};
}

function stopAnimation () {
	clearTimeout(character.currentAnimation.id);
	character.currentAnimation = {animation: null, id: null};
}

ipcRenderer.on('window-move-start', () => {
	playAnimation(character.animations.run_anim);
});

ipcRenderer.on('window-move-pause', () => {
	playAnimation(character.animations.idle_anim);
});

ipcRenderer.on('character-flip-left', () => { character_image.style.webkitTransform = 'scaleX(-1)'; character_image.style.transform = 'scaleX(-1)'; });
ipcRenderer.on('character-flip-right', () => { character_image.style.webkitTransform = ''; character_image.style.transform = ''; });

// --------------------------------------------------------------------------------------------------------------------------------------- //


function cancelMove (event) {
	return new Promise ((resolve, reject) => {
		ipcRenderer.on(event, () => resolve());
	});
}

function startMove (pos, speed, cancelListener=null) {
	return new Promise ((resolve, reject) => {
		ipcRenderer.move.start(pos, speed);

		let handler = (event) => {
			playAnimation(character.animations.idle_anim);
			ipcRenderer.off('window-move-end', handler);
			resolve('window-move-end');
		}

		ipcRenderer.on('window-move-end', handler);

		if (cancelListener) cancelListener().then(() => {
			playAnimation(character.animations.idle_anim);
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

ipcRenderer.on('global-mouse-move', (event, mouse_event) => {
	
});

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
				ipcRenderer.log(1)
			}, () => ipcRenderer.move.set.pinMouse(false));
		});
	});
});


playAnimation(character.animations.idle_anim);