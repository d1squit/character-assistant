const { ipcRenderer } = require('electron');
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

function startMove (pos, speed) {
	pos = {x: pos.x - 32, y: pos.y - 50};
	return new Promise ((resolve, reject) => {
		ipcRenderer.send('window-move-start', pos, speed);
		ipcRenderer.on('window-move-end', () => {
			playAnimation(character.animations.idle_anim);
			resolve();
		});
	});
}

function getMousePosition () {
	return new Promise ((resolve, reject) => {
		ipcRenderer.send('get-mouse-position');
		ipcRenderer.on('response-mouse-position', (event, position) => resolve(position));
	});
}

ipcRenderer.on('character-flip-left', () => { character_image.style.webkitTransform = 'scaleX(-1)'; character_image.style.transform = 'scaleX(-1)'; });
ipcRenderer.on('character-flip-right', () => { character_image.style.webkitTransform = ''; character_image.style.transform = ''; });

ipcRenderer.on('window-mouse-down', (event, mouse_event) => {
	if (mouse_event.button !== 1) return;
	ipcRenderer.send('window-move-pause');
});

ipcRenderer.on('global-mouse-up', (event, mouse_event) => {
	if (mouse_event.button !== 1) return;
	ipcRenderer.send('window-move-resume');
});

ipcRenderer.on('mouse-inactive', () => {
	getMousePosition().then(position => {
		startMove(position, character.speed).then(() => {
			ipcRenderer.send('set-window-move-mouse', true);
			setTimeout(() => startMove({x: 1000, y: 500}, character.speed), 1000);
		});
	});
});

ipcRenderer.on('window-move-start', () => {
	playAnimation(character.animations.run_anim);
});

ipcRenderer.on('window-move-resume', () => {
	playAnimation(character.animations.run_anim);
});

ipcRenderer.on('window-move-pause', () => {
	playAnimation(character.animations.idle_anim);
});

playAnimation(character.animations.idle_anim);