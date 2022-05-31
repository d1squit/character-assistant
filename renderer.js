const { ipcRenderer } = require('electron');
const character_image = document.querySelector('img.character-img');

let character = {
	speed: 0.2,
	currentAnimation: null,
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


function playAnimation (animation) {
	playAnimation.currentFrame = playAnimation.currentFrame ?? 0;
	character_image.src = animation.frames[playAnimation.currentFrame];
	playAnimation.currentFrame != animation.frames.length - 1 ? playAnimation.currentFrame++ : playAnimation.currentFrame = 0;
	character.currentAnimation = setTimeout(playAnimation, animation.timeout, animation);
}

function stopAnimation () {
	clearTimeout(character.currentAnimation);
	character.currentAnimation = null;
}


function startMove (pos, speed) {
	return new Promise ((resolve, reject) => {
		character.moveTarget = pos;

		stopAnimation();
		playAnimation(character.animations.run_anim);
		ipcRenderer.send('window-move-start', pos, speed);

		ipcRenderer.on('window-move-end', (event) => {
			character.moveTarget = {x: null, y: null};

			stopAnimation();
			playAnimation(character.animations.idle_anim);
			resolve();
		});
	});
}

function stopMove () { ipcRenderer.send('window-move-force-end'); }


ipcRenderer.on('character-flip-left', () => { character_image.style.webkitTransform = 'scaleX(-1)'; character_image.style.transform = 'scaleX(-1)'; });
ipcRenderer.on('character-flip-right', () => { character_image.style.webkitTransform = ''; character_image.style.transform = ''; });


ipcRenderer.on('window-mouse-down', (event) => {
	if (event.button) return;
	stopMove();
});

ipcRenderer.on('window-mouse-up', (event) => {
	if (event.button) return;
	ipcRenderer.send('window-move-force-start')
	if (character.moveTarget.x !== null && character.moveTarget.y !== null) startMove(character.moveTarget, character.speed);
});

playAnimation(character.animations.idle_anim);
setTimeout(() => startMove({x: 600, y: 540}, character.speed));