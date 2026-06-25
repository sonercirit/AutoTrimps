// ==UserScript==
// @name		AutoTrimps-sonercirit
// @version		1.0-sonercirit
// @namespace	https://sonercirit.github.io/AutoTrimps
// @description	Automate all the trimps!
// @author		zininzinin, spindrjr, Ishkaru, genBTC, Zeker0, SadAugust, sonercirit
// @match		*://trimps.github.io/*
// @match		*://kongregate.com/games/GreenSatellite/trimps/*
// @match		*://trimpstest510.netlify.app/*
// @connect		*://sonercirit.github.io/AutoTrimps/*
// @connect		*://trimps.github.io/*
// @connect		self
// @grant		GM_xmlhttpRequest
// ==/UserScript==

function loadScript(id, src) {
	const script = document.createElement('script');
	script.id = id;
	script.src = `${src}`;
	script.setAttribute('crossorigin', 'anonymous');
	document.head.appendChild(script);
}

offlineTimeSpeed = game.global.timeWarpLimit;
game.global.timeWarpLimit = 0;
loadScript('AutoTrimps-sonercirit', 'https://sonercirit.github.io/AutoTrimps/AutoTrimps2.js');
