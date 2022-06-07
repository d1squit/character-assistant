const XMLHttpRequest = require('xhr2');
const jsdom = require("jsdom");
const fs = require('fs');
const request = require('superagent');
const admZip = require('adm-zip');
const path = require('path');

function sendHttpRequest (url) {
	return new Promise ((resolve, reject) => {
		let xhr = new XMLHttpRequest();

		xhr.onreadystatechange = () => { if (xhr.readyState == 4) if (xhr.status == 200) resolve(xhr.responseText); };
		xhr.open('GET', url, true);
	
		xhr.timeout = 2000;
		xhr.ontimeout = () => { reject('Server is not responding'); xhr.abort(); };
		
		xhr.send();
	});
}

function checkForUpdates () {
	return new Promise((resolve, reject) => {
		sendHttpRequest('https://github.com/d1squit/character-assistant/blob/master/package.json').then(response => {
			let updateInfoString = '';
			new jsdom.JSDOM(response).window.document.querySelectorAll('.blob-code.blob-code-inner').forEach(item => updateInfoString += item.textContent);
			
			const version = JSON.parse(fs.readFileSync('package.json')).version;
			if (JSON.parse(updateInfoString).version != version) resolve(JSON.parse(updateInfoString).version)
		});
	});
}

function copyFileSync(source, target) {
	let targetFile = target;

	if (fs.existsSync(target))
		if (fs.lstatSync(target).isDirectory())
			targetFile = path.join(target, path.basename(source));

	fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync (source, target, isStart=true) {
	let files = [];

	let targetFolder = '';
	if (isStart) targetFolder = path.join(target);
	else targetFolder = path.join(target, path.basename(source));

	if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder);

	if (fs.lstatSync(source).isDirectory()) {
		files = fs.readdirSync(source);
		files.forEach(file => {
			let curSource = path.join(source, file);
			if (fs.lstatSync(curSource).isDirectory()) {
				copyFolderRecursiveSync(curSource, targetFolder, false);
			} else {
				copyFileSync(curSource, targetFolder);
			}
		} );
	}
}

function downloadUpdateFiles () {
	return new Promise((resolve, reject) => {
		if (!fs.existsSync('temp')) fs.mkdirSync('temp');

		request.get('https://github.com/d1squit/character-assistant/archive/refs/heads/master.zip').on('error', error => {})
			.pipe(fs.createWriteStream('temp/master.zip')).on('finish', () => {
				const zip = new admZip('temp/master.zip');
				const zipEntries = zip.getEntries();

				zipEntries.forEach(zipEntry => {
					let path = zipEntry.entryName.replace(/character-assistant-master\//g, '');
					if (path.endsWith('/') || path.endsWith('.gitkeep')) return;

					zip.extractEntryTo(zipEntry, 'temp', true, true);
				});

				copyFolderRecursiveSync('temp/character-assistant-master', '');
				fs.rmdirSync('temp', { recursive: true, force: true });
			});
	});
}

checkForUpdates().then(version => downloadUpdateFiles());