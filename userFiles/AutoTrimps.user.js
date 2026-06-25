// ==UserScript==
// @name		AutoTrimps-sonercirit
// @version		1.2-sonercirit
// @namespace	https://sonercirit.github.io/AutoTrimps
// @description	Automate all the trimps!
// @author		zininzinin, spindrjr, Ishkaru, genBTC, Zeker0, SadAugust, sonercirit
// @match		*://trimps.github.io/*
// @match		*://kongregate.com/games/GreenSatellite/trimps/*
// @match		*://trimpstest510.netlify.app/*
// @connect		cdn.jsdelivr.net
// @connect		api.github.com
// @connect		trimps.github.io
// @connect		self
// @grant		GM_xmlhttpRequest
// @updateURL	https://github.com/sonercirit/AutoTrimps/raw/main/userFiles/AutoTrimps.user.js
// @downloadURL	https://github.com/sonercirit/AutoTrimps/raw/main/userFiles/AutoTrimps.user.js
// ==/UserScript==

const autoTrimpsRepo = 'sonercirit/AutoTrimps';
const autoTrimpsBranch = 'main';
const autoTrimpsScriptId = 'AutoTrimps-sonercirit';

function loadScript(id, src) {
	const script = document.createElement('script');
	script.id = id;
	script.src = `${src}`;
	script.setAttribute('crossorigin', 'anonymous');
	document.head.appendChild(script);
}

function loadAutoTrimpsFromJsDelivr(version = autoTrimpsBranch) {
	loadScript(autoTrimpsScriptId, `https://cdn.jsdelivr.net/gh/${autoTrimpsRepo}@${version}/AutoTrimps2.js`);
}

function loadLatestAutoTrimps() {
	if (typeof GM_xmlhttpRequest !== 'function') {
		loadAutoTrimpsFromJsDelivr();
		return;
	}

	GM_xmlhttpRequest({
		method: 'GET',
		url: `https://api.github.com/repos/${autoTrimpsRepo}/commits/${autoTrimpsBranch}`,
		timeout: 10000,
		onload(response) {
			try {
				const commit = JSON.parse(response.responseText);
				if (response.status >= 200 && response.status < 300 && commit.sha) {
					loadAutoTrimpsFromJsDelivr(commit.sha);
					return;
				}
			} catch (error) {
				console.warn('Unable to determine latest AutoTrimps commit.', error);
			}

			loadAutoTrimpsFromJsDelivr();
		},
		onerror() {
			loadAutoTrimpsFromJsDelivr();
		},
		ontimeout() {
			loadAutoTrimpsFromJsDelivr();
		}
	});
}

offlineTimeSpeed = game.global.timeWarpLimit;
game.global.timeWarpLimit = 0;
loadLatestAutoTrimps();
