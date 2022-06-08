const characterContainer = document.querySelector('.character-container');
const characterImage = document.querySelector('img.character-img');

function Character () {
	(function loadUserSettings (file, callback) {
		var rawFile = new XMLHttpRequest();
		rawFile.overrideMimeType("application/json");
		rawFile.open("GET", file, true);
		rawFile.onreadystatechange = () => { if (rawFile.readyState === 4 && rawFile.status == "200") callback(rawFile.responseText); };
		rawFile.send(null);
	})('character.json', (text) => {
		const settings = JSON.parse(text);
	
		this.speed = settings.speed;
		this.animations = settings.animations;
		this.currentAnimation = {animation: null, id: null};
	
		characterContainer.style.width = settings.size.width + 'px';
		characterContainer.style.height = settings.size.height + settings.size.height * 60 / 200 + 'px';
		document.body.style.height = settings.size.height + settings.size.height * 60 / 200 + 'px';
		characterImage.style.width = settings.size.width + 'px';
		characterImage.style.marginTop = -settings.size.height * 34 / 50 + 'px';
	
		this.playAnimation(this.animations.idle_animation);
	});

	this.playAnimation = (animation, isNew=true) => {
		if (this.currentAnimation.animation == animation && isNew) return;
		this.stopAnimation();
		this.playAnimation.currentFrame = this.playAnimation.currentFrame ?? 0;
		characterImage.src = animation.frames[this.playAnimation.currentFrame];
		this.playAnimation.currentFrame != animation.frames.length - 1 ? this.playAnimation.currentFrame++ : this.playAnimation.currentFrame = 0;
		this.currentAnimation = {animation, id: setTimeout(this.playAnimation, animation.timeout, animation, false)};
	}
	
	this.stopAnimation = () => {
		clearTimeout(this.currentAnimation.id);
		this.currentAnimation = {animation: null, id: null};
	}

	this.cancelMove = (event) => {
		return new Promise ((resolve, reject) => {
			let handler = () => {
				ipcRenderer.removeAllListeners(event);
				resolve();
			};
	
			ipcRenderer.on(event, handler);
		});
	}
	
	this.startMove = (pos, speed, cancelListener=null) => {
		return new Promise ((resolve, reject) => {
			ipcRenderer.move.start(pos, speed);
	
			let handler = (event) => {
				this.playAnimation(this.animations.idle_animation);
				resolve('window-move-end');
				this.on.windowMoveEnd();
			}
			
			ipcRenderer.on('window-move-end', handler);
	
			if (cancelListener) cancelListener().then(() => {
				this.playAnimation(this.animations.idle_animation);
				ipcRenderer.move.stop();
				reject('window-move-cancel');
			});
		});
	}

	ipcRenderer.on('character-flip-left', () => { characterImage.style.webkitTransform = 'scaleX(-1)'; characterImage.style.transform = 'scaleX(-1)'; });
	ipcRenderer.on('character-flip-right', () => { characterImage.style.webkitTransform = ''; characterImage.style.transform = ''; });

	ipcRenderer.on('window-move-start', (event) => {
		this.playAnimation(this.animations.run_animation);
		this.on.windowMoveStart(event);
	});
	
	ipcRenderer.on('window-move-pause', (event) => {
		this.playAnimation(this.animations.idle_animation);
		this.on.windowMovePause(event);
	});

	ipcRenderer.on('window-move-resume', (event) => {
		this.on.windowMoveResume(event);
	});
	
	this.on = {
		windowMoveStart: (event) => {},
		windowMovePause: (event) => {},
		windowMoveEnd: (event) => {},
		windowMoveResume: (event) => {}
	};

	return this;
}

let character = new Character();