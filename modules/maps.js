//Helium

MODULES.maps = {};
MODULES.maps.NomfarmingCutoff = 10;
MODULES.maps.NomFarmStacksCutoff = [7,30,100];
MODULES.maps.MapTierZone = [72,47,16];
MODULES.maps.MapTier0Sliders = [9,9,9,"Mountain"];
MODULES.maps.MapTier1Sliders = [9,9,9,"Depths"];
MODULES.maps.MapTier2Sliders = [9,9,9,"Random"];
MODULES.maps.MapTier3Sliders = [9,9,9,"Random"];
MODULES.maps.preferGardens = !getPageSetting("PreferMetal");
MODULES.maps.SpireFarm199Maps = true;
MODULES.maps.shouldFarmCell = 80;
MODULES.maps.SkipNumUnboughtPrestiges = 2;
MODULES.maps.UnearnedPrestigesRequired = 2;

//Psycho
MODULES.maps.numHitsSurvived = 7.5; //Recommended: 5, or 7.5 if you have a certain 45 stacks thing
MODULES.maps.farmOnLowHealth = true; //Will force farming for health
MODULES.maps.shouldFarmHigherZone = true; //Allows farming on a map level above your current zone if you can overkill in it
MODULES.maps.forceModifier = true; //Will make elaborate attempts at keeping you at maps with the right modifier (good when farming spire or pushing)
MODULES.maps.scryerHDMult = 4; //This is a divisor to your "mapCutOff" and "farming H:D", and only works if Scry on Corrupted is ON (Domination ignores this)
MODULES.maps.scryerHitsMult = 8; //This is a multiplier to your "numHitsSurvived", and only works if Scry on Corrupted is ON (Domination ignores this)
MODULES.maps.voidHDMult = 1; //This is a multiplier to your "mapCutOff and farming H:D", and only works at your void map zones
MODULES.maps.voidHitsMult = 2; //This is a multiplier to your "numHitsSurvived", and only works at your void map zones
MODULES.maps.spireHD = 4; //4 is actually 1 hit in D stance
MODULES.maps.spireHitsSurvived = 0.25; //1 is actually 8 hits+ using Heap. Set to something low to save nurseries past magma
MODULES.maps.magmaHitsSurvived = 2; //Your geneticists are frequently lagging 1-2 zones behind when speeding through magma, which is why this is important

var enoughDamage = true;
var enoughHealth = true;
var isFarming = false;
var doVoids = false;
var needToVoid = false;
var preVoidCheck = false;
var needPrestige = false;
var skippedPrestige = false;
var scryerStuck = false;
var shouldDoMaps = false;
var shouldFarmDamage = false;
var mapTimeEstimate = 0;
var lastMapWeWereIn = null;
var preSpireFarming = false;
var spireMapBonusFarming = false;
var spireTime = 0;
var doMaxMapBonus = false;
var vanillaMapatZone = false;
var fragmentsNeeded = 0;
var additionalCritMulti = 2 < getPlayerCritChance() ? 25 : 5;

function updateAutoMapsStatus(get) {
    var status;
    var minSp = getPageSetting('MinutestoFarmBeforeSpire');
    var wantedHealth = getMapHealthCutOff() / calcHealthRatio(false, true);
    var wantedDamage = calcHDRatio() / getMapCutOff();
    var wantedFarmDmg = calcHDRatio() / getFarmCutOff();

    //Running MAZ
    if (vanillaMapatZone) status = "Running&nbspVanilla MAZ";

    //Raiding
    else if (game.global.mapsActive && autoTrimpSettings["AutoMaps"].value == 0 && getCurrentMapObject().level > game.global.world && getCurrentMapObject().location != "Void" && getCurrentMapObject().location != "Bionic") status = 'Prestige Raiding';
    else if (game.global.mapsActive && autoTrimpSettings["AutoMaps"].value == 0 && getCurrentMapObject().level > game.global.world && getCurrentMapObject().location == "Bionic") status = 'BW Raiding';

    //Fail Safes
    else if (getPageSetting('AutoMaps') == 0) status = 'Off';
    else if (game.global.challengeActive == "Mapology" && game.challenges.Mapology.credits < 1) status = 'Out of Map Credits';

    //Spire
    else if (preSpireFarming) {
        var secs = Math.floor(60 - (spireTime * 60) % 60).toFixed(0);
        var mins = Math.floor(minSp - spireTime).toFixed(0);
        var hours = ((minSp - spireTime) / 60).toFixed(2);
        var spiretimeStr = (minSp - spireTime >= 60) ?
            (hours + 'h') : (mins + 'm:' + (secs >= 10 ? secs : ('0' + secs)) + 's');
        status = 'Farming for Spire ' + spiretimeStr + ' left';
    }

    else if (spireMapBonusFarming) status = 'Getting Spire Map Bonus';
    else if (getPageSetting('SkipSpires') == 1 && ((game.global.challengeActive != 'Daily' && isActiveSpireAT()) || (game.global.challengeActive == 'Daily' && disActiveSpireAT()))) status = 'Skipping Spire';
    else if (doMaxMapBonus) status = 'Max Map Bonus After Zone';
    //else if (!game.global.mapsUnlocked) status = '&nbsp;';
    else if (needPrestige && !doVoids) status = 'Prestige';
    else if (doVoids) {
        var stackedMaps = Fluffy.isRewardActive('void') ? countStackedVoidMaps() : 0;
        status = 'Void Maps: ' + game.global.totalVoidMaps + ((stackedMaps) ? " (" + stackedMaps + " stacked)" : "") + ' remaining';
    }
    else if (shouldFarm && !enoughHealth && shouldFarmDamage) status = 'Farm ' + wantedHealth.toFixed(2) + 'x&nbspHealth & ' + wantedFarmDmg.toFixed(2) + 'x&nbspDamage';
    else if (shouldFarm && !enoughHealth) status = 'Farm ' + wantedHealth.toFixed(2) + 'x&nbspmore Health ';
    else if (shouldFarm) status = 'Farm ' + wantedFarmDmg.toFixed(2) + 'x&nbsp+Dmg';
    else if (!enoughHealth && !enoughDamage) status = 'Want ' + wantedHealth.toFixed(2) + 'x&nbspHealth & ' + wantedDamage.toFixed(2)  + 'x&nbspDamage';
    else if (!enoughDamage) status = 'Want ' + wantedDamage.toFixed(2) + 'x&nbsp+Dmg';
    else if (!enoughHealth) status = 'Want ' + wantedHealth.toFixed(2) + 'x&nbsp+Hp';
    else if (enoughHealth && enoughDamage) status = 'Advancing';

    if (skippedPrestige)
        status += '<br><b style="font-size:.8em;color:pink;margin-top:0.2vw">Prestige Skipped</b>';

    //hider he/hr% status
    var getPercent = (game.stats.heliumHour.value() / (game.global.totalHeliumEarned - (game.global.heliumLeftover + game.resources.helium.owned))) * 100;
    var lifetime = (game.resources.helium.owned / (game.global.totalHeliumEarned - game.resources.helium.owned)) * 100;
    var hiderStatus = 'He/hr: ' + getPercent.toFixed(3) + '%<br>&nbsp;&nbsp;&nbsp;He: ' + lifetime.toFixed(3) + '%';

    if (get) {
        return [status, getPercent, lifetime];
    } else {
        document.getElementById('autoMapStatus').innerHTML = status;
        document.getElementById('hiderStatus').innerHTML = hiderStatus;
    }
}

MODULES["maps"].advSpecialMapMod_numZones = 3;
var advExtraMapLevels = 0;
function testMapSpecialModController(noLog) {
    var success = true;
    var a = [];
    if (Object.keys(mapSpecialModifierConfig).forEach(function(o) {
        var p = mapSpecialModifierConfig[o];
        game.global.highestLevelCleared + 1 >= p.unlocksAt && a.push(p.abv.toLowerCase());
    }), !(1 > a.length)) {
        var c = document.getElementById("advSpecialSelect");
        if (c) {
            if (game.global.highestLevelCleared >= 59) {
                //Select Map Modifier
                if (shouldFarm || shouldFarmDamage || !enoughHealth || preSpireFarming || (preVoidCheck && !enoughDamage)) {
                    c.value = a.includes("lmc") ? "lmc" : a.includes("hc") ? "hc" : a.includes("smc") ? "smc" : "lc";
                } else if (needPrestige && enoughDamage && a.includes("p")) {
                    c.value = "p";
                } else c.value = "fa";

                //Check if we can afford it
                for (var d = updateMapCost(!0), e = game.resources.fragments.owned, f = 100 * (d / e); 0 < c.selectedIndex && d > e;) {
                    c.selectedIndex -= 1;
                    "0" != c.value && !noLog && console.log("Could not afford " + mapSpecialModifierConfig[c.value].name);
                    fragmentsNeeded = Math.max(fragmentsNeeded, d);
                    success = false;
                }

                var d = updateMapCost(!0), e = game.resources.fragments.owned;
                "0" != c.value && !noLog && debug("Set the map special modifier to: " + mapSpecialModifierConfig[c.value].name + ". Cost: " + (100 * (d / e)).toFixed(2) + "% of your fragments.");
            }

            //Check what Modifiers should be available to us
            var g = getSpecialModifierSetting(),
                h = 109 <= game.global.highestLevelCleared,
                i = checkPerfectChecked(),
                j = document.getElementById("advPerfectCheckbox"),
                k = getPageSetting("AdvMapSpecialModifier") ? getExtraMapLevels() : 0,
                l = 209 <= game.global.highestLevelCleared;

            //Extra Map levels
            if (l) {
                var m = document.getElementById("advExtraMapLevelselect");
                if (!m) return success;
                var n = document.getElementById("mapLevelInput").value;
                for (m.selectedIndex = n == game.global.world ? MODULES.maps.advSpecialMapMod_numZones : 0; 0 < m.selectedIndex && updateMapCost(!0) > game.resources.fragments.owned;)
                    m.selectedIndex -= 1;
            }
        }
    }

    return success;
}

function getMapHealthCutOff(pure) {
    //Base and Spire cutOffs
    var cut = MODULES.maps.numHitsSurvived;
    if (pure) return cut;

    //Spire
    if (game.global.spireActive) return MODULES.maps.spireHitsSurvived;

    //Magma
    if (mutations.Magma.active()) cut *= MODULES.maps.magmaHitsSurvived;

    //Void Map cut off - will ALSO scale with scryer, if scrying on void maps
    if (preVoidCheck) {
        if (getPageSetting("scryvoidmaps")) cut *= MODULES.maps.scryerHitsMult;
        return cut * MODULES.maps.voidHitsMult;
    }

    //Scryer Multiplier (only if scrying on corrupted)
    if (scryingCorruption() && game.global.challengeActive != "Domination") return cut * MODULES.maps.scryerHitsMult;

    return cut;
}

function getMapCutOff(pure) {
    //Init
    let cut = getPageSetting("mapcuntoff");
    // divide map cut off by 4 if dominance is not available
    if (!game.upgrades.Dominance.done) cut /= 4;
    var mapology = game.global.challengeActive == "Mapology";
    var daily = game.global.challengeActive == "Daily";
    var c2 = game.global.runningChallengeSquared;

    //Unaltered mapCutOff
    if (pure) return cut;

    //Spire
    if (game.global.spireActive) return MODULES.maps.spireHD;

    //Mapology
    if (getPageSetting("mapc2hd") > 0 && mapology) cut = getPageSetting("mapc2hd");

    //Windstacking
    var wind = getEmpowerment() == 'Wind';
    var autoStance, windMin, windCut
    if (daily) {
        autoStance = getPageSetting("AutoStance") == 3 || getPageSetting("use3daily") == true;
        windMin = getPageSetting("dWindStackingMin") > 0 && game.global.world >= getPageSetting("dWindStackingMin");
        windCut = getPageSetting("dwindcutoffmap") > 0;
    }
    else {
        autoStance = getPageSetting("AutoStance") == 3;
        windMin = getPageSetting("WindStackingMin") > 0 && game.global.world >= getPageSetting("WindStackingMin")
        windCut = getPageSetting("windcutoffmap") > 0
    }

    //Windstack
    if (wind && !c2 && autoStance && windMin && windCut) cut = getPageSetting("windcutoffmap");

    //Void and Scry cut off
    if (preVoidCheck) return cut * MODULES.maps.voidHDMult;
    if (scryingCorruption() && game.global.challengeActive != "Domination") return cut / MODULES.maps.scryerHDMult;

    return cut;
}

function getFarmCutOff() {
    //Int
    var cut = getPageSetting("DisableFarm");

    //Spire
    if (game.global.spireActive) return MODULES.maps.spireHD;

    //Void and Scry
    if (preVoidCheck) return cut * MODULES.maps.voidHDMult;
    if (scryingCorruption() && game.global.challengeActive != "Domination") return cut / MODULES.maps.scryerHDMult;

    return cut;
}

function getMapRatio(map, customLevel, customDiff) {
    var mapDmg = calcHDRatio((customLevel ? customLevel : map.level), "map") / getMapCutOff(true);
    var mapHp = getMapHealthCutOff(true) / calcHealthRatio(false, true, "map", (customLevel ? customLevel : map.level));
    return (customDiff ? customDiff : map.difficulty) * Math.max(mapDmg, mapHp);
}

function autoMap() {
    //Failsafes
    if (!game.global.mapsUnlocked || calcOurDmg() <= 0) {
        vanillaMapatZone = false;
        enoughDamage = true;
        enoughHealth = true;
        shouldFarm = false;
        updateAutoMapsStatus();
        return;
    }

    //No Mapology Credits HUD Update
    if (game.global.challengeActive == "Mapology" && game.challenges.Mapology.credits < 1) {
        vanillaMapatZone = false;
        updateAutoMapsStatus();
        return;
    }

    //MAZ
    vanillaMapatZone = false;
    if (game.options.menu.mapAtZone.enabled && game.global.canMapAtZone) {
        for (var x = 0; x < game.options.menu.mapAtZone.setZone.length; x++) {
            var option = game.options.menu.mapAtZone.setZone[x];
            var world = game.global.world;
            var validRange = world >= option.world && world <= option.through;
            var mazZone = validRange && (world == option.world && option.times == -1 || (world - option.world) % option.times == 0);
            if (mazZone && option.cell == game.global.lastClearedCell+2) vanillaMapatZone = true;
        }
        if (vanillaMapatZone) {
            updateAutoMapsStatus();
            return;
        }
    }

    //Vars
    var customVars = MODULES["maps"];
    var prestige = autoTrimpSettings.Prestige.selected;
    var challSQ = game.global.runningChallengeSquared;
    var extraMapLevels = 0;

    //Reset to defaults
    if (prestige != "Off" && game.options.menu.mapLoot.enabled != 1) toggleSetting('mapLoot');
    if ((game.options.menu.repeatUntil.enabled == 1 || game.options.menu.repeatUntil.enabled == 2 || game.options.menu.repeatUntil.enabled == 3) && !game.global.mapsActive && !game.global.preMapsActive) toggleSetting('repeatUntil');
    if (game.options.menu.exitTo.enabled != 0) toggleSetting('exitTo');
    if (game.options.menu.repeatVoids.enabled != 0) toggleSetting('repeatVoids');

    //Reset to defaults when on world grid
    if (!game.global.mapsActive && !game.global.preMapsActive) {
        if (game.global.repeatMap == true) repeatClicked();
        if (game.global.selectedMapPreset >= 4) game.global.selectedMapPreset = 1;
        if (document.getElementById('advExtraLevelSelect').value > 0)
            document.getElementById('advExtraLevelSelect').value = "0";
    }

    //Void Vars
    var minVoidZone = 0;
    var maxVoidZone = 0;
    var voidCell = 0;

    //Regular Run Voids
    if (game.global.challengeActive != "Daily") {
        //What cell to run Voids at
        voidCell = ((getPageSetting('voidscell') > 0) ? getPageSetting('voidscell') : 70);

        //What Zone Range to run Voids at
        var poisonOK = !getPageSetting('runnewvoidspoison') || getEmpowerment() == 'Poison';
        if (getPageSetting('VoidMaps') > 0) minVoidZone = getPageSetting('VoidMaps');
        if (getPageSetting('RunNewVoidsUntilNew') > 0 && poisonOK) maxVoidZone = getPageSetting('RunNewVoidsUntilNew');
    }

    //Daily Voids
    else {
        //What cell to run Daily Voids at
        voidCell = ((getPageSetting('dvoidscell') > 0) ? getPageSetting('dvoidscell') : 70);

        //What Zone Range to run Voids at
        var poisonOK = !getPageSetting('drunnewvoidspoison') || getEmpowerment() == 'Poison';
        if (getPageSetting('DailyVoidMod') > 0) minVoidZone = getPageSetting('DailyVoidMod');
        if (getPageSetting('dRunNewVoidsUntilNew') > 0 && poisonOK) maxVoidZone = getPageSetting('dRunNewVoidsUntilNew');
    }

    //Convert maxZone from an modificer (+1, +2...) to an fixed zone value (65, 66...)
    maxVoidZone += minVoidZone;

    //Checks if it's on the right zone range and with voids available
    var preVoidCell = Math.floor((voidCell-1)/10)*10;
    preVoidCheck = minVoidZone > 0 && game.global.totalVoidMaps > 0 && game.global.world >= minVoidZone && game.global.world <= maxVoidZone;
    preVoidCheck &= game.global.lastClearedCell + 1 >= preVoidCell;
    needToVoid = preVoidCheck && game.global.lastClearedCell + 1 >= voidCell;

    var voidArrayDoneS = [];
    if (game.global.challengeActive != "Daily" && getPageSetting('onlystackedvoids') == true) {
        for (var mapz in game.global.mapsOwnedArray) {
            var theMapz = game.global.mapsOwnedArray[mapz];
            if (theMapz.location == 'Void' && theMapz.stacked > 0) {
                voidArrayDoneS.push(theMapz);
            }
        }
    }

    if (
        (game.global.totalVoidMaps <= 0) ||
        (!needToVoid) ||
        (getPageSetting('novmsc2') == true && game.global.runningChallengeSquared) ||
        (game.global.challengeActive != "Daily" && game.global.totalVoidMaps > 0 && getPageSetting('onlystackedvoids') == true && voidArrayDoneS.length < 1)
    ) {
        doVoids = false;
    }

    //Prestige
    if ((getPageSetting('ForcePresZ') >= 0) && ((game.global.world + extraMapLevels) >= getPageSetting('ForcePresZ'))) {
        const prestigeList = ['Supershield', 'Dagadder', 'Megamace', 'Polierarm', 'Axeidic', 'Greatersword', 'Harmbalest', 'Bootboost', 'Hellishmet', 'Pantastic', 'Smoldershoulder', 'Bestplate', 'GambesOP'];
        needPrestige = prestigeList.some(prestige => game.mapUnlocks[prestige].last <= (game.global.world + extraMapLevels) - 5);
        //needPrestige = (offlineProgress.countMapItems(game.global.world) !== 0); TODO - Test this!
    } else
        needPrestige = prestige != "Off" && game.mapUnlocks[prestige] && game.mapUnlocks[prestige].last <= (game.global.world + extraMapLevels) - 5 && game.global.challengeActive != "Frugal";

    //Prestige Skip 1
    skippedPrestige = false;
    if (needPrestige && getPsString("gems", true) > 0 && (getPageSetting('PrestigeSkip1_2') == 1 || getPageSetting('PrestigeSkip1_2') == 2)) {
        var prestigeList = ['Dagadder', 'Megamace', 'Polierarm', 'Axeidic', 'Greatersword', 'Harmbalest', 'Bootboost', 'Hellishmet', 'Pantastic', 'Smoldershoulder', 'Bestplate', 'GambesOP'];
        var numUnbought = 0;
        for (var i in prestigeList) {
            var p = prestigeList[i];
            if (game.upgrades[p].allowed - game.upgrades[p].done > 0)
                numUnbought++;
        }
        if (numUnbought >= customVars.SkipNumUnboughtPrestiges) {
            needPrestige = false;
            skippedPrestige = true;
        }
    }

    //Prestige Skip 2
    if ((needPrestige || skippedPrestige) && (getPageSetting('PrestigeSkip1_2') == 1 || getPageSetting('PrestigeSkip1_2') == 3)) {
        const prestigeList = ['Dagadder', 'Megamace', 'Polierarm', 'Axeidic', 'Greatersword', 'Harmbalest'];
        const numLeft = prestigeList.filter(prestige => game.mapUnlocks[prestige].last <= (game.global.world + extraMapLevels) - 5);
        const shouldSkip = numLeft <= customVars.UnearnedPrestigesRequired;
        if (shouldSkip != skippedPrestige) {
            needPrestige = !needPrestige;
            skippedPrestige = !skippedPrestige;
        }
    }

    //H:D Calc
    var ourBaseDamage = calcOurDmg("avg", "X");

    //Shield Calc
    highDamageShield();
    if (getPageSetting('loomswap') > 0 && game.global.challengeActive != "Daily" && game.global.ShieldEquipped.name != getPageSetting('highdmg'))
        ourBaseDamage *= trimpAA;
    if (getPageSetting('dloomswap') > 0 && game.global.challengeActive == "Daily" && game.global.ShieldEquipped.name != getPageSetting('dhighdmg'))
        ourBaseDamage *= trimpAA;

    //Check for Health & Damage
    enoughHealth = calcHealthRatio(false, true) > getMapHealthCutOff();
    enoughDamage = calcHDRatio() < getMapCutOff();
    updateAutoMapsStatus();

    //Farming
    var selectedMap = "world";
    var shouldFarmLowerZone = false;

    //Farm Flags
    shouldFarm = false;
    shouldFarmDamage = calcHDRatio() >= getFarmCutOff() && !weaponCapped();

    //Only actually trigger farming after doing map bonuses
    if (getPageSetting('DisableFarm') > 0 && (game.global.mapBonus >= getPageSetting('MaxMapBonuslimit') || enoughDamage && game.global.mapBonus >= getPageSetting('MaxMapBonusHealth'))) {
        //Farm on Low Health
        shouldFarm = shouldFarmDamage || (MODULES.maps.farmOnLowHealth && !enoughHealth && game.global.mapBonus >= getPageSetting('MaxMapBonushealth'));

        //Toggle "Repeat Until"
        if (game.options.menu.repeatUntil.enabled == 1 && shouldFarm) toggleSetting('repeatUntil');
    }

    isFarming = shouldFarm;
    shouldDoMaps = false;
    if (ourBaseDamage > 0) {
        shouldDoMaps = (!enoughDamage || shouldFarm || scryerStuck);
    }
    var shouldDoHealthMaps = false;
    if (game.global.mapBonus >= getPageSetting('MaxMapBonuslimit') && !shouldFarm)
        shouldDoMaps = false;
    else if (game.global.mapBonus >= getPageSetting('MaxMapBonuslimit') && shouldFarm)
        shouldFarmLowerZone = getPageSetting('LowerFarmingZone');
    else if (game.global.mapBonus < getPageSetting('MaxMapBonushealth') && !enoughHealth && !shouldDoMaps && !needPrestige) {
        shouldDoMaps = true;
        shouldDoHealthMaps = true;
    }
    var restartVoidMap = false;
    if (game.global.challengeActive == 'Nom' && getPageSetting('FarmWhenNomStacks7')) {
        if (game.global.gridArray[99].nomStacks > customVars.NomFarmStacksCutoff[0]) {
            if (game.global.mapBonus != getPageSetting('MaxMapBonuslimit'))
                shouldDoMaps = true;
        }
        if (game.global.gridArray[99].nomStacks == customVars.NomFarmStacksCutoff[1]) {
            shouldFarm = (calcHDRatio() > customVars.NomfarmingCutoff);
            shouldDoMaps = true;
        }
        if (!game.global.mapsActive && game.global.gridArray[game.global.lastClearedCell + 1].nomStacks >= customVars.NomFarmStacksCutoff[2]) {
            shouldFarm = (calcHDRatio() > customVars.NomfarmingCutoff);
            shouldDoMaps = true;
        }
        if (game.global.mapsActive && game.global.mapGridArray[game.global.lastClearedMapCell + 1].nomStacks >= customVars.NomFarmStacksCutoff[2]) {
            shouldFarm = (calcHDRatio() > customVars.NomfarmingCutoff);
            shouldDoMaps = true;
            restartVoidMap = true;
        }
    }

    //Prestige
    if (shouldFarm && !needPrestige && weaponCapped()) {
        shouldFarm = false;
        if (game.global.mapBonus >= getPageSetting('MaxMapBonuslimit'))
            shouldDoMaps = false;
    }

    //Spire
    var shouldDoSpireMaps = false;
    preSpireFarming = (isActiveSpireAT() || disActiveSpireAT()) && (spireTime = (new Date().getTime() - game.global.zoneStarted) / 1000 / 60) < getPageSetting('MinutestoFarmBeforeSpire');
    spireMapBonusFarming = getPageSetting('MaxStacksForSpire') && (isActiveSpireAT() || disActiveSpireAT()) && game.global.mapBonus < 10;
    if (preSpireFarming || spireMapBonusFarming) {
        shouldDoMaps = true;
        shouldDoSpireMaps = true;
    }

    //Map Bonus
    var maxMapBonusZ = getPageSetting('MaxMapBonusAfterZone');
    doMaxMapBonus = (maxMapBonusZ >= 0 && game.global.mapBonus < getPageSetting("MaxMapBonuslimit") && game.global.world >= maxMapBonusZ);
    if (doMaxMapBonus)
        shouldDoMaps = true;

    //Calculates Siphonology and Extra Map Levels
    var minLvl = game.global.world - (shouldFarmLowerZone ? 11 : game.portal.Siphonology.level);
    var maxLvl = game.global.world - (game.talents.mapLoot.purchased ? 1 : 0);
    var siphLvl = maxLvl;

    let ratio;
    //If enabled, then
    if (getPageSetting('DynamicSiphonology') || shouldFarmLowerZone) {
        //For each Map Level we can go below our current zone...
        for (siphLvl; siphLvl > minLvl; siphLvl--) {
            //Calc our Damage on this map
            ratio = calcHDRatio(siphLvl, "map");
            // if (game.unlocks.imps.Titimp) ratio /= 2;

            //Farms on Scryer if available, or Dominance, or just X
            if (game.global.world >= 60 && getHighestLevelCleared() >= 180) ratio *= 2;
            else if (game.upgrades.Dominance.done) ratio /= 4;

            //Stop increasing map level once we get to the right ratio. We use 1.2 here because created maps are usually shorter and easier
            if (ratio <= 1.2) break;
        }

        //Keep increasing map level while we can overkill in that map
        if (MODULES.maps.shouldFarmHigherZone && shouldFarmLowerZone && game.global.highestLevelCleared >= 209 && siphLvl == maxLvl) {
            for (siphLvl; oneShotZone("S", "map", siphLvl+1) == maxOneShotPower(); siphLvl++);
            if (game.talents.mapLoot.purchased && siphLvl == maxLvl+1) siphLvl--;
        }
    }

    //Farms on "Oneshoot level" + 1, except on magma
    var extraConditions = (shouldFarm || shouldFarmDamage || !enoughHealth || preSpireFarming) && ratio <= 1.2;
    if (extraConditions && game.global.challengeActive != "Coordinate" && !mutations.Magma.active() && siphLvl < maxLvl) siphLvl++;

    //Register the level of every regular map we have
    var obj = {};
    var siphonMap = -1, altSiphLevel = -1, altSiphMap = -1;
    var tryBetterMod = false, gotBetterMod = false;
    for (var index in game.global.mapsOwnedArray) {
        if (!game.global.mapsOwnedArray[index].noRecycle) {
            var mapAux = game.global.mapsOwnedArray[index];
            obj[index] = mapAux.level;
            if (mapAux.level == siphLvl) siphonMap = index;

            //Also grabs the highest level within our range that has a modifier on it
            if (mapAux.level >= Math.max(Math.min(siphLvl-2, maxLvl), minLvl, altSiphLevel+1) && mapAux.level <= siphLvl+1) {
                if (!mapAux.hasOwnProperty("bonus") || mapAux.bonus == "p") continue;
                altSiphLevel = mapAux.level;
                altSiphMap = index;
            }
        }
    }

    //Put those levels in ascending order
    var keysSorted = Object.keys(obj).sort(function(a, b) {
        return obj[b] - obj[a];
    });

    //Register the highest and lowest level maps
    var highestMap;
    var lowestMap;
    if (keysSorted[0]) {
        highestMap = keysSorted[0];
        lowestMap = keysSorted[keysSorted.length - 1];
    } else
        selectedMap = "create";

    //Uniques
    var runUniques = (getPageSetting('AutoMaps') == 1);
    if (runUniques) {
        //Init
        var runningC2 = game.global.runningChallengeSquared;
        var challengeRequireMap, challenge = game.global.challengeActive;
        var bionicMaxLevel = 0;
        var bionicPool = [];

        //For each owned map..
        for (var map in game.global.mapsOwnedArray) {
            var theMap = game.global.mapsOwnedArray[map];

            //Check if it's unique
            if (theMap.noRecycle) {
                //The Block (Shieldblock, Challenges or Speed Achievement)
                challengeRequireMap = !runningC2 && (challenge == "Scientist" || challenge == "Trimp");
                var getShieldblock = !game.upgrades.Shieldblock.allowed && getPageSetting('BuyShieldblock');
                if (theMap.name == 'The Block' &&  (challengeRequireMap || getShieldblock || shouldSpeedRun(game.achievements.blockTimed))) {
                    if (game.global.world < 11 || getMapRatio(theMap) > 1) continue;
                    selectedMap = theMap.id;
                    break;
                }

                //The Wall (Bounty or Speed Achievement)
                if (theMap.name == 'The Wall' && (game.upgrades.Bounty.allowed == 0 && !game.talents.bounty.purchased || shouldSpeedRun(game.achievements.wallTimed))) {
                    if (game.global.world < 15 || getMapRatio(theMap) > 1) continue;
                    selectedMap = theMap.id;
                    break;
                }

                //Dimension of Anger (Portal, Challenges or Speed Achievement)
                challengeRequireMap = !runningC2 && (challenge == "Discipline" || challenge == "Metal" || challenge == "Size" || challenge == "Frugal" || challenge == "Coordinate");
                var needToPortal = !game.talents.portal.purchased && document.getElementById("portalBtn").style.display == "none";
                if (theMap.name == 'Dimension of Anger' && (challengeRequireMap || needToPortal || shouldSpeedRun(game.achievements.angerTimed))) {
                    if (game.global.world < 20 || getMapRatio(theMap) > 1) continue;
                    selectedMap = theMap.id;
                    break;
                }

                //Trimple of Doom (Treasure, Challenges or Speed Achievement)
                challengeRequireMap = !runningC2 && (challenge == "Meditate" || challenge == "Trapper");
                var treasure = game.mapUnlocks.AncientTreasure.canRunOnce && Math.abs(getPageSetting('TrimpleZ')) >= 33;
                if (theMap.name == 'Trimple Of Doom' && (challengeRequireMap || treasure || shouldSpeedRun(game.achievements.doomTimed))) {
                    if (game.global.world < Math.abs(getPageSetting('TrimpleZ')) || getMapRatio(theMap) > 1) continue;
                    if (treasure < 0) setPageSetting('TrimpleZ', 0);
                    selectedMap = theMap.id;
                    break;
                }

                //The Prison (Challenges or Speed Achievement)
                challengeRequireMap = !runningC2 && (challenge == "Electricity" || challenge == "Mapocalypse");
                if (theMap.name == 'The Prison' && (challengeRequireMap || shouldSpeedRun(game.achievements.prisonTimed))) {
                    if (game.global.world < 80 || getMapRatio(theMap) > 1) continue;
                    selectedMap = theMap.id;
                    break;
                }

                //Imploding Star (Challenges or Speed Achievement)
                challengeRequireMap = !runningC2 && (challenge == "Devastation");
                if (theMap.name == 'Imploding Star' && (challengeRequireMap || shouldSpeedRun(game.achievements.starTimed))) {
                    if (game.global.world < 170 || getMapRatio(theMap) > 1) continue;
                    selectedMap = theMap.id;
                    break;
                }

                //Bionic Wonderland (Challenges or Speed Achievement)
                challengeRequireMap = !runningC2 && (challenge == "Crushed");
                if (theMap.name == 'Bionic Wonderland' && (challengeRequireMap || shouldSpeedRun(game.achievements.bionicTimed))) {
                    if (game.global.world < 125 || getMapRatio(theMap) > 1) continue;
                    selectedMap = theMap.id;
                }

                //Bionic Wonderland I+ (Unlocks)
                if (theMap.location == "Bionic")
                    bionicPool.push(theMap);
            }
        }

        //Bionic Wonderland I+ (Unlocks, RoboTrimp or Bionic Sniper)
        bionicPool.sort(function (bionicA, bionicB) {return bionicA.level - bionicB.level});
        for (bionicMaxLevel=0; getMapRatio(undefined, 125 + 15 * bionicMaxLevel, 2.6) <= 1; bionicMaxLevel++);
        var tryBionicSniper = !game.achievements.oneOffs.finished[42] && (110 + 15*bionicMaxLevel) >= game.global.world + 45;
        if (bionicPool.length > 0 && (bionicMaxLevel > game.global.roboTrimpLevel || tryBionicSniper)) {
            var bionicLevel = Math.min(bionicPool.length, bionicMaxLevel);
            if (bionicLevel > 0) selectedMap = bionicPool[bionicLevel-1].id;
            //debug("Selected Bionic Level " + bionicLevel + " resulting in map id " + selectedMap);
        }
    }

    //Voids
    if (needToVoid) {
        var voidArray = [];
        var prefixlist = {
            'Deadly': 10,
            'Heinous': 11,
            'Poisonous': 20,
            'Destructive': 30
        };
        var prefixkeys = Object.keys(prefixlist);
        var suffixlist = {
            'Descent': 7.077,
            'Void': 8.822,
            'Nightmare': 9.436,
            'Pit': 10.6
        };
        var suffixkeys = Object.keys(suffixlist);

        if (game.global.challengeActive != "Daily" && getPageSetting('onlystackedvoids') == true) {
            for (var map in game.global.mapsOwnedArray) {
                var theMap = game.global.mapsOwnedArray[map];
                if (theMap.location == 'Void' && theMap.stacked > 0) {
                    for (var pre in prefixkeys) {
                        if (theMap.name.includes(prefixkeys[pre]))
                            theMap.sortByDiff = 1 * prefixlist[prefixkeys[pre]];
                    }
                    for (var suf in suffixkeys) {
                        if (theMap.name.includes(suffixkeys[suf]))
                            theMap.sortByDiff += 1 * suffixlist[suffixkeys[suf]];
                    }
                    voidArray.push(theMap);
                }
            }
        } else {
            for (var map in game.global.mapsOwnedArray) {
                var theMap = game.global.mapsOwnedArray[map];
                if (theMap.location == 'Void') {
                    for (var pre in prefixkeys) {
                        if (theMap.name.includes(prefixkeys[pre]))
                            theMap.sortByDiff = 1 * prefixlist[prefixkeys[pre]];
                    }
                    for (var suf in suffixkeys) {
                        if (theMap.name.includes(suffixkeys[suf]))
                            theMap.sortByDiff += 1 * suffixlist[suffixkeys[suf]];
                    }
                    voidArray.push(theMap);
                }
            }
        }

        var voidArraySorted = voidArray.sort(function(a, b) {
            return a.sortByDiff - b.sortByDiff;
        });
        for (var map in voidArraySorted) {
            var theMap = voidArraySorted[map];
            doVoids = true;
            var eAttack = getEnemyMaxAttack(game.global.world, theMap.size, 'Voidsnimp', theMap.difficulty);
            if (game.global.world >= 181 || (game.global.challengeActive == "Corrupted" && game.global.world >= 60))
                eAttack *= (getCorruptScale("attack") / 2).toFixed(1);
            if (game.global.challengeActive == 'Balance') {
                eAttack *= 2;
            }
            if (game.global.challengeActive == 'Toxicity') {
                eAttack *= 5;
            }
            if (getPageSetting('DisableFarm') <= 0)
                shouldFarm = shouldFarm || false;
            if (!restartVoidMap)
                selectedMap = theMap.id;
            if (game.global.mapsActive && getCurrentMapObject().location == "Void" && game.global.challengeActive == "Nom" && getPageSetting('FarmWhenNomStacks7')) {
                if (game.global.mapGridArray[theMap.size - 1].nomStacks >= customVars.NomFarmStacksCutoff[2]) {
                    mapsClicked(true);
                }
            }
            break;
        }
    }

    //Skip Spires
    if (!preSpireFarming && getPageSetting('SkipSpires') == 1 && ((game.global.challengeActive != 'Daily' && isActiveSpireAT()) || (game.global.challengeActive == 'Daily' && disActiveSpireAT()))) {
        enoughDamage = true;
        enoughHealth = true;
        shouldFarm = false;
        shouldDoMaps = false;
    }

    //Automaps
    if (shouldDoMaps || doVoids || needPrestige) {
        if (selectedMap == "world") {
            if (preSpireFarming) {
                var spiremaplvl = (game.talents.mapLoot.purchased && MODULES["maps"].SpireFarm199Maps) ? game.global.world - 1 : game.global.world;
                selectedMap = "create";
                for (i = 0; i < keysSorted.length; i++) {
                    if (game.global.mapsOwnedArray[keysSorted[i]].level >= spiremaplvl &&
                        game.global.mapsOwnedArray[keysSorted[i]].location == ((customVars.preferGardens && game.global.decayDone) ? 'Plentiful' : 'Mountain')) {
                        selectedMap = game.global.mapsOwnedArray[keysSorted[i]].id;
                        break;
                    }
                }
            } else if (needPrestige) {
                if ((game.global.world + extraMapLevels) <= game.global.mapsOwnedArray[highestMap].level)
                    selectedMap = game.global.mapsOwnedArray[highestMap].id;
                else
                    selectedMap = "create";
            } else if (siphonMap != -1) {
                selectedMap = game.global.mapsOwnedArray[siphonMap].id;
                if (game.global.world >= 59 && MODULES.maps.forceModifier && !game.global.mapsOwnedArray[siphonMap].hasOwnProperty("bonus")) tryBetterMod = true;
            }
            else if (altSiphMap != -1) {
                selectedMap = "create";
                tryBetterMod = game.global.world >= 59 && MODULES.maps.forceModifier;
            }
            else
                selectedMap = "create";
        }
    }
    if ((game.global.challengeActive == 'Lead' && !challSQ) && !doVoids && (game.global.world % 2 == 0 || game.global.lastClearedCell < customVars.shouldFarmCell)) {
        if (game.global.preMapsActive)
            mapsClicked();
        return;
    }
    if (!game.global.preMapsActive && game.global.mapsActive) {
        var doDefaultMapBonus = game.global.mapBonus < getPageSetting('MaxMapBonuslimit') - 1;
        if (selectedMap == game.global.currentMapId && !getCurrentMapObject().noRecycle && (doDefaultMapBonus || vanillaMapatZone || doMaxMapBonus || shouldFarm || needPrestige || shouldDoSpireMaps || mapExiting)) {
            //Start with Repeat on
            console.log("debug0");
            if (!game.global.repeatMap) {
                repeatClicked();
            }

            //End Prestige Init
            var targetPrestige = autoTrimpSettings.Prestige.selected;
            var lastPrestige = (targetPrestige && targetPrestige != "Off") ? game.mapUnlocks[targetPrestige].last : undefined;
            var lastCellPrestige = game.global.mapGridArray[game.global.mapGridArray.length - 1].special;
            var nextToLastCellPrestige = game.global.mapGridArray[game.global.mapGridArray.length - 2].special;
            var endPrestige = lastCellPrestige == targetPrestige || nextToLastCellPrestige == targetPrestige;

            //End Prestige
            if (!shouldDoMaps && endPrestige && (game.global.world + extraMapLevels) <= lastPrestige + (getScientistLevel() >= 4 && lastPrestige%10 < 6 ? 14 : 9)) {
                console.log("debug1");
                repeatClicked();
            }

            //Health Farming
            if (shouldDoHealthMaps && game.global.mapBonus >= getPageSetting('MaxMapBonushealth') - 1) {
                console.log("debug2");
                repeatClicked();
                shouldDoHealthMaps = false;
            }

            //Damage Farming
            if (doMaxMapBonus && game.global.mapBonus >= getPageSetting('MaxMapBonuslimit') - 1) {
                console.log("debug3");
                repeatClicked();
                doMaxMapBonus = false;
            }

            //Want to recreate the map
            if (tryBetterMod && game.resources.fragments.owned >= fragmentsNeeded) {
                console.log("debug4");
                repeatClicked();
            }

            //Want to exit the current map to pRaid
            if (mapExiting) {
                console.log("debug5");
                repeatClicked();
            }
        } else {
            console.log("debugx");
            //Start with Repeat Off
            if (game.global.repeatMap) {
                console.log("debugx1");
                repeatClicked();
            }

            //Turn if back on if it want to recreate a map, but doesn't have the fragments to do it
            if (tryBetterMod && game.resources.fragments.owned < fragmentsNeeded) {
                console.log("debugx2");
                repeatClicked();
            }

            //Force Abandon to restart void maps
            if (restartVoidMap) {
                console.log("debugx3");
                mapsClicked(true);
            }
        }
    } else if (!game.global.preMapsActive && !game.global.mapsActive) {
        if (selectedMap != "world") {
            if (!game.global.switchToMaps) {
                mapsClicked();
            }
            if ((!getPageSetting('PowerSaving') || (getPageSetting('PowerSaving') == 2) && (doVoids || preVoidCheck)) && game.global.switchToMaps &&
                (needPrestige || (doVoids || preVoidCheck) ||
                    ((game.global.challengeActive == 'Lead' && !challSQ) && game.global.world % 2 == 1) ||
                    (!enoughDamage && enoughHealth && game.global.lastClearedCell < 9) ||
                    (shouldFarm && game.global.lastClearedCell >= customVars.shouldFarmCell) ||
                    (scryerStuck)) &&
                (
                    (game.resources.trimps.realMax() <= game.resources.trimps.owned + 1) ||
                    ((game.global.challengeActive == 'Lead' && !challSQ) && game.global.lastClearedCell > 93) ||
                    ((doVoids || preVoidCheck) && game.global.lastClearedCell > 70)
                )
            ) {
                if (scryerStuck) {
                    debug("Got perma-stuck on cell " + (game.global.lastClearedCell + 2) + " during scryer stance. Are your scryer settings correct? Entering map to farm to fix it.");
                }
                mapsClicked();
            }
        }
    } else if (game.global.preMapsActive) {
        if (selectedMap == "world") {
            mapsClicked();
        } else if (selectedMap == "create" || tryBetterMod) {
            var $mapLevelInput = document.getElementById("mapLevelInput");
            $mapLevelInput.value = (needPrestige || siphLvl > game.global.world) ? game.global.world : siphLvl;
            if (preSpireFarming && MODULES["maps"].SpireFarm199Maps)
                $mapLevelInput.value = game.talents.mapLoot.purchased ? game.global.world - 1 : game.global.world;
            var decrement;
            var tier;
            if (game.global.world >= customVars.MapTierZone[0]) {
                tier = customVars.MapTier0Sliders;
                decrement = [];
            } else if (game.global.world >= customVars.MapTierZone[1]) {
                tier = customVars.MapTier1Sliders;
                decrement = ['loot'];
            } else if (game.global.world >= customVars.MapTierZone[2]) {
                tier = customVars.MapTier2Sliders;
                decrement = ['loot'];
            } else {
                tier = customVars.MapTier3Sliders;
                decrement = ['diff', 'loot'];
            }
            sizeAdvMapsRange.value = tier[0];
            adjustMap('size', tier[0]);
            difficultyAdvMapsRange.value = tier[1];
            adjustMap('difficulty', tier[1]);
            lootAdvMapsRange.value = tier[2];
            adjustMap('loot', tier[2]);
            biomeAdvMapsSelect.value = autoTrimpSettings.mapselection.selected == "Gardens" ? "Plentiful" : autoTrimpSettings.mapselection.selected;
            updateMapCost();
            if (shouldFarm || game.global.challengeActive == 'Metal') {
                biomeAdvMapsSelect.value = game.global.decayDone ? "Plentiful" : "Mountain";
                updateMapCost();
            }
            if (updateMapCost(true) > game.resources.fragments.owned) {
                if (needPrestige && !enoughDamage) decrement.push('diff');
                if (shouldFarm) decrement.push('size');
            }
            while (decrement.indexOf('loot') > -1 && lootAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                lootAdvMapsRange.value -= 1;
            }
            while (decrement.indexOf('diff') > -1 && difficultyAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                difficultyAdvMapsRange.value -= 1;
            }
            while (decrement.indexOf('size') > -1 && sizeAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                sizeAdvMapsRange.value -= 1;
            }
            while (lootAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                lootAdvMapsRange.value -= 1;
            }
            while (difficultyAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                difficultyAdvMapsRange.value -= 1;
            }
            while (sizeAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                sizeAdvMapsRange.value -= 1;
            }
            if (getPageSetting('AdvMapSpecialModifier')) {
                if (siphLvl > maxLvl) {
                    //TODO -- Buggy when we don't have fragments to create any map with modifiers
                    //Finds the highest map level we can buy modifiers for, plus one
                    while (game.global.world + getExtraMapLevels() <= siphLvl && testMapSpecialModController(true))
                        document.getElementById('advExtraLevelSelect').value++;

                    //Since we can't create a map for zone X + 1, target zone X
                    if (getExtraMapLevels() > 0) document.getElementById('advExtraLevelSelect').value--;

                    //Reduce our map zone to world - 1 if we can't create a map for world + 1
                    if (game.talents.mapLoot.purchased && getExtraMapLevels() == 0) $mapLevelInput.value--;

                    //Update our control flags
                    extraMapLevels = getExtraMapLevels();
                    gotBetterMod = parseInt($mapLevelInput.value) + getExtraMapLevels() > altSiphLevel && testMapSpecialModController(true);
                }
                else gotBetterMod = testMapSpecialModController(tryBetterMod);
            }
            var mapLvlPicked = parseInt($mapLevelInput.value) + (getPageSetting('AdvMapSpecialModifier') ? getExtraMapLevels() : 0);

            //Sorry for the mess, this whole thing needs a rework
            if (tryBetterMod) {
                if (gotBetterMod && game.resources.fragments.owned >= updateMapCost(true)) {
                    fragmentsNeeded = 0;
                    if (siphonMap != -1) {
                        debug("Recreating map level #" + mapLvlPicked + " to include a modifier", "maps", '*happy2');
                        recycleMap(siphonMap);
                    }
                }
                else if (altSiphMap != -1) {
                    selectedMap = game.global.mapsOwnedArray[altSiphMap].id;
                    selectMap(selectedMap);
                    var mapObject = game.global.mapsOwnedArray[getMapIndex(selectedMap)];
                    var lvlText = " Level: " + mapObject.level;
                    runMap();
                    if (lastMapWeWereIn != getCurrentMapObject()) debug("Running alternative map " + selectedMap + lvlText + " Name: " + mapObject.name, "maps", 'th-large');
                    lastMapWeWereIn = getCurrentMapObject();
                    return;
                }
                else if (siphonMap != -1) {
                    selectMap(selectedMap);
                    var themapobj = game.global.mapsOwnedArray[getMapIndex(selectedMap)];
                    var levelText = " Level: " + themapobj.level;
                    var voidorLevelText = themapobj.location == "Void" ? " Void: " : levelText;
                    runMap();
                    debug("Running selected " + selectedMap + voidorLevelText + " Name: " + themapobj.name, "maps", 'th-large');
                    lastMapWeWereIn = getCurrentMapObject();
                    return;
                }
            }

            //No fragments to create a map
            if (updateMapCost(true) > game.resources.fragments.owned) {
                selectMap(game.global.mapsOwnedArray[highestMap].id);
                debug("Can't afford the map we designed, #" + mapLvlPicked, "maps", '*crying2');
                debug("...selected our highest map instead # " + game.global.mapsOwnedArray[highestMap].id + " Level: " + game.global.mapsOwnedArray[highestMap].level, "maps", '*happy2');
                runMap();
                lastMapWeWereIn = getCurrentMapObject();
            } else {
                debug("Buying a Map, level: #" + mapLvlPicked + " for " + updateMapCost(true).toExponential(2) + " fragments", "maps", 'th-large');
                var result = buyMap();
                if (result == -2) {
                    debug("Too many maps, recycling now: ", "maps", 'th-large');
                    recycleBelow(true);
                    debug("Retrying, Buying a Map, level: #" + mapLvlPicked, "maps", 'th-large');
                    result = buyMap();
                    if (result == -2) {
                        recycleMap(lowestMap);
                        result = buyMap();
                        if (result == -2)
                            debug("AutoMaps unable to recycle to buy map!");
                        else
                            debug("Retrying map buy after recycling lowest level map");
                    }
                }
            }
        } else {
            selectMap(selectedMap);
            var themapobj = game.global.mapsOwnedArray[getMapIndex(selectedMap)];
            var levelText = " Level: " + themapobj.level;
            var voidorLevelText = themapobj.location == "Void" ? " Void: " : levelText;
            runMap();
            debug("Running selected " + selectedMap + voidorLevelText + " Name: " + themapobj.name, "maps", 'th-large');
            lastMapWeWereIn = getCurrentMapObject();
            fragmentsNeeded = 0;
        }
    }
}

//Radon

MODULES.maps.RMapTierZone = [72, 47, 16];
MODULES.maps.RMapTier0Sliders = [9, 9, 9, "Mountain"];
MODULES.maps.RMapTier1Sliders = [9, 9, 9, "Depths"];
MODULES.maps.RMapTier2Sliders = [9, 9, 9, "Random"];
MODULES.maps.RMapTier3Sliders = [9, 9, 9, "Random"];
MODULES.maps.RshouldFarmCell = 59;
MODULES.maps.RSkipNumUnboughtPrestiges = 2;
MODULES.maps.RUnearnedPrestigesRequired = 2;

var RdoVoids = !1;
var RneedToVoid = !1;
var RneedPrestige = !1;
var RskippedPrestige = !1;
var RscryerStuck = !1;
var RshouldDoMaps = !1;
var RmapTimeEstimate = 0;
var RlastMapWeWereIn = null;
var RdoMaxMapBonus = !1;
var RvanillaMapatZone = !1;
var Rtimefarm = !1;
var RadditionalCritMulti = 2 < getPlayerCritChance() ? 25 : 5;
var Rshouldtimefarm = !1;
var Rshouldtimefarmbogs = !1;
var Rshoulddobogs = false;
var Rshoulddopraid = false;
var Rshoulddoquest = false;
var Rquestequalityscale = false;
var Rquestshieldzone = 0;
var RAMPpMap1 = undefined;
var RAMPpMap2 = undefined;
var RAMPpMap3 = undefined;
var RAMPpMap4 = undefined;
var RAMPpMap5 = undefined;
var RAMPfragmappy = undefined;
var RAMPrepMap1 = undefined;
var RAMPrepMap2 = undefined;
var RAMPrepMap3 = undefined;
var RAMPrepMap4 = undefined;
var RAMPrepMap5 = undefined;
var RAMPprefragmappy = undefined;
var RAMPmapbought1 = false;
var RAMPmapbought2 = false;
var RAMPmapbought3 = false;
var RAMPmapbought4 = false;
var RAMPmapbought5 = false;
var RAMPfragmappybought = false;
var RAMPdone = false;
var RAMPfragfarming = false;
var Rshouldmayhem = 0;
var Rmayhemextraglobal = -1;
var Rinsanityfarm = !1;
var Rshouldinsanityfarm = !1;
var Rinsanityfragfarming = false;
var insanityfragmappy = undefined;
var insanityprefragmappy = undefined;
var insanityfragmappybought = false;
var Rstormfarm = !1;
var Rshouldstormfarm = !1;
var Requipfarm = !1;
var Rshouldequipfarm = !1;
var Requipminusglobal = -1;
var Rshipfarm = !1;
var Rshouldshipfarm = !1;
var Rshipfragfarming = false;
var shipfragmappy = undefined;
var shipprefragmappy = undefined;
var shipfragmappybought = false;


function RupdateAutoMapsStatus(get) {

    var status;

    //Fail Safes
    if (getPageSetting('RAutoMaps') == 0) status = 'Off';

    else if (Rshouldshipfarm) status = 'Ship Farming';
    else if (Rshouldequipfarm) status = 'Equip Farming to ' + equipfarmdynamicHD().toFixed(2) + " and " + estimateEquipsForZone()[2] + " Equality";
    else if (Rshouldstormfarm) status = 'Storm Farming to ' + stormdynamicHD().toFixed(2);
    else if (Rshouldinsanityfarm) status = 'Insanity Farming';
    else if (Rshouldmayhem == 1) status = 'Mayhem Attack';
    else if (Rshouldmayhem == 2) status = 'Mayhem Health';
    else if (Rshoulddopraid) status = 'Praiding';
    else if (Rshoulddoquest) status = 'Questing';
    else if (Rshouldtimefarm) status = 'Time Farming';
    else if (Rshouldtimefarmbogs) status = 'Time Farming Bogs';
    else if (Rshoulddobogs) status = 'Black Bogs';
    else if (RdoMaxMapBonus) status = 'Max Map Bonus After Zone';
    else if (!game.global.mapsUnlocked) status = '&nbsp;';
    else if (RneedPrestige && !RdoVoids) status = 'Prestige';
    else if (RdoVoids) {
	    var stackedMaps = Fluffy.isRewardActive('void') ? countStackedVoidMaps() : 0;
	    status = 'Void Maps: ' + game.global.totalVoidMaps + ((stackedMaps) ? " (" + stackedMaps + " stacked)" : "") + ' remaining';
    }
    else if (RshouldFarm && !RdoVoids) status = 'Farming: ' + RcalcHDratio().toFixed(4) + 'x';
    else if (!RenoughHealth && !RenoughDamage) status = 'Want Health & Damage';
    else if (!RenoughDamage) status = 'Want ' + RcalcHDratio().toFixed(4) + 'x &nbspmore damage';
    else if (!RenoughHealth) status = 'Want more health';
    else if (RenoughHealth && RenoughDamage) status = 'Advancing';

    if (RskippedPrestige)
        status += '<br><b style="font-size:.8em;color:pink;margin-top:0.2vw">Prestige Skipped</b>';

    var getPercent = (game.stats.heliumHour.value() / (game.global.totalRadonEarned - (game.global.radonLeftover + game.resources.radon.owned))) * 100;
    var lifetime = (game.resources.radon.owned / (game.global.totalRadonEarned - game.resources.radon.owned)) * 100;
    var hiderStatus = 'Rn/hr: ' + getPercent.toFixed(3) + '%<br>&nbsp;&nbsp;&nbsp;Rn: ' + lifetime.toFixed(3) + '%';

    if (get) {
        return [status, getPercent, lifetime];
    } else {
        document.getElementById('autoMapStatus').innerHTML = status;
        document.getElementById('hiderStatus').innerHTML = hiderStatus;
    }
}



function RautoMap() {

    //Quest
    var Rquestfarming = false;
    Rshoulddoquest = false;
    Rquestfarming = (game.global.world > 5 && game.global.challengeActive == "Quest" && questcheck() > 0);

    if (Rquestfarming) {
        if (questcheck() == 3) Rshoulddoquest = 3;
        else if (questcheck() == 4 && RcalcHDratio() > 0.95 && (((new Date().getTime() - game.global.zoneStarted) / 1000 / 60) < 121)) Rshoulddoquest = 4;
        else if (questcheck() == 6) Rshoulddoquest = 6;
        else if (questcheck() == 7 && !canAffordBuilding('Smithy')) Rshoulddoquest = 7;
        else if (questcheck() == 10 || questcheck() == 20) Rshoulddoquest = 10;
        else if (questcheck() == 11 || questcheck() == 21) Rshoulddoquest = 11;
        else if (questcheck() == 12 || questcheck() == 22) Rshoulddoquest = 12;
        else if (questcheck() == 13 || questcheck() == 23) Rshoulddoquest = 13;
        else if (questcheck() == 14 || questcheck() == 24) Rshoulddoquest = 14;
    }

    //Failsafes
    if (!game.global.mapsUnlocked || RcalcOurDmg("avg", false, true) <= 0 || Rshoulddoquest == 6) {
        RenoughDamage = true;
        RenoughHealth = true;
        RshouldFarm = false;
        RupdateAutoMapsStatus();
        return;
    }

    //Vars
    var mapenoughdamagecutoff = getPageSetting("Rmapcuntoff");
    var customVars = MODULES["maps"];
    if (game.global.repeatMap == true && !game.global.mapsActive && !game.global.preMapsActive) repeatClicked();
    if ((game.options.menu.repeatUntil.enabled == 1 || game.options.menu.repeatUntil.enabled == 2 || game.options.menu.repeatUntil.enabled == 3) && !game.global.mapsActive && !game.global.preMapsActive) toggleSetting('repeatUntil');
    if (game.options.menu.exitTo.enabled != 0) toggleSetting('exitTo');
    if (game.options.menu.repeatVoids.enabled != 0) toggleSetting('repeatVoids');
    var extraMapLevels = 0;
    var hitsSurvived = 10;
    if (getPageSetting("Rhitssurvived") > 0) hitsSurvived = getPageSetting("Rhitssurvived");

    //Void Vars
    var voidMapLevelSetting = 0;
    var voidMapLevelSettingCell = ((getPageSetting('Rvoidscell') > 0) ? getPageSetting('Rvoidscell') : 70);
    var voidMapLevelPlus = 0;
    if (game.global.challengeActive != "Daily" && getPageSetting('RVoidMaps') > 0) {
        voidMapLevelSetting = getPageSetting('RVoidMaps');
    }
    if (game.global.challengeActive == "Daily" && getPageSetting('RDailyVoidMod') >= 1) {
        voidMapLevelSetting = getPageSetting('RDailyVoidMod');
    }
    if (getPageSetting('RRunNewVoidsUntilNew') != 0 && game.global.challengeActive != "Daily") {
        voidMapLevelPlus = getPageSetting('RRunNewVoidsUntilNew');
    }
    if (getPageSetting('RdRunNewVoidsUntilNew') != 0 && game.global.challengeActive == "Daily") {
        voidMapLevelPlus = getPageSetting('RdRunNewVoidsUntilNew');
    }

    RneedToVoid = (voidMapLevelSetting > 0 && game.global.totalVoidMaps > 0 && game.global.lastClearedCell + 1 >= voidMapLevelSettingCell &&
        (
            (game.global.world == voidMapLevelSetting) ||
            (voidMapLevelPlus < 0 && game.global.world >= voidMapLevelSetting) ||
            (voidMapLevelPlus > 0 && game.global.world >= voidMapLevelSetting && game.global.world <= (voidMapLevelSetting + voidMapLevelPlus))
        )
    );

    var voidArrayDoneS = [];
    if (game.global.challengeActive != "Daily" && getPageSetting('Ronlystackedvoids') == true) {
        for (var mapz in game.global.mapsOwnedArray) {
            var theMapz = game.global.mapsOwnedArray[mapz];
            if (theMapz.location == 'Void' && theMapz.stacked > 0) {
                voidArrayDoneS.push(theMapz);
            }
        }
    }

    if (
        (game.global.totalVoidMaps <= 0) ||
        (!RneedToVoid) ||
        (getPageSetting('Rnovmsc2') == true && game.global.runningChallengeSquared) ||
        (game.global.challengeActive != "Daily" && game.global.totalVoidMaps > 0 && getPageSetting('Ronlystackedvoids') == true && voidArrayDoneS.length < 1)
    ) {
        RdoVoids = false;
    }

    //Calc
    var ourBaseDamage = RcalcOurDmg("avg", false, true);
    var enemyDamage = RcalcBadGuyDmg(null, RgetEnemyMaxAttack(game.global.world, 50, 'Snimp', 1.0));
    var enemyHealth = RcalcEnemyHealth(game.global.world);

    if (getPageSetting('RDisableFarm') > 0) {
        RshouldFarm = (RcalcHDratio() >= getPageSetting('RDisableFarm'));
        if (game.options.menu.repeatUntil.enabled == 1 && RshouldFarm)
            toggleSetting('repeatUntil');
    }
    RenoughHealth = (RcalcOurHealth() > (hitsSurvived * enemyDamage));
    RenoughDamage = (RcalcHDratio() <= mapenoughdamagecutoff);
    RupdateAutoMapsStatus();

    //Quest Shield
    if (game.global.world < 6 && (Rquestshieldzone != 0 || Rquestequalityscale != false)) {
        Rquestshieldzone = 0;
        Rquestequalityscale = false;
    }
    if (Rquestfarming && questcheck() == 5 && ((game.global.soldierEnergyShieldMax / enemyDamage) < RcalcHDratio()) && game.portal.Equality.scalingActive && !game.global.mapsActive) {
        toggleEqualityScale();
        Rquestshieldzone = game.global.world;
        Rquestequalityscale = true;
    }
    if (game.global.world > 5 && game.global.challengeActive == "Quest" && Rquestshieldzone > 0 && !game.portal.Equality.scalingActive && game.global.world > Rquestshieldzone && Rquestequalityscale) {
        toggleEqualityScale();
        Rquestequalityscale = false;
    }

    //Farming
    var selectedMap = "world";
    RshouldDoMaps = false;
    Rshouldtimefarm = false;
    Rshouldtimefarmbogs = false;
    Rshouldinsanityfarm = false;
    Rshouldstormfarm = false;
    Rshouldequipfarm = false;
    Rshouldshipfarm = false;
    if (ourBaseDamage > 0) {
        RshouldDoMaps = (!RenoughDamage || RshouldFarm || RscryerStuck);
    }
    var shouldDoHealthMaps = false;
    if (game.global.mapBonus >= getPageSetting('RMaxMapBonuslimit') && !RshouldFarm)
        RshouldDoMaps = false;
    else if (game.global.mapBonus < getPageSetting('RMaxMapBonushealth') && !RenoughHealth && !RshouldDoMaps) {
        RshouldDoMaps = true;
        shouldDoHealthMaps = true;
    }
    var restartVoidMap = false;

    //Map Bonus
    var maxMapBonusZ = getPageSetting('RMaxMapBonusAfterZone');
    RdoMaxMapBonus = (maxMapBonusZ >= 0 && game.global.mapBonus < getPageSetting("RMaxMapBonuslimit") && game.global.world >= maxMapBonusZ);
    if (RdoMaxMapBonus) {
        RshouldDoMaps = true;
    }

    //Maps
    RvanillaMapatZone = (game.options.menu.mapAtZone.enabled && game.global.canMapAtZone);
    if (RvanillaMapatZone) {
        for (var x = 0; x < game.options.menu.mapAtZone.setZoneU2.length; x++) {
            if (game.global.world == game.options.menu.mapAtZone.setZoneU2[x].world)
                RshouldDoMaps = true;
        }
    }

    //Time Farm
	if (getPageSetting('Rtimefarm') == true) {
		var timefarmcell;
		timefarmcell = ((getPageSetting('Rtimefarmcell') > 0) ? getPageSetting('Rtimefarmcell') : 1);
		Rtimefarm = (getPageSetting('Rtimefarm') == true && ((timefarmcell <= 1) || (timefarmcell > 1 && (game.global.lastClearedCell + 1) >= timefarmcell)) && game.global.world > 5 && (game.global.challengeActive != "Daily" && getPageSetting('Rtimefarmzone')[0] > 0 && getPageSetting('Rtimefarmtime')[0] > 0));
		if (Rtimefarm) {
			var timefarmzone;
			var timefarmtime;
			var time = ((new Date().getTime() - game.global.zoneStarted) / 1000 / 60);

			timefarmzone = getPageSetting('Rtimefarmzone');
			timefarmtime = getPageSetting('Rtimefarmtime');

			var timefarmindex = timefarmzone.indexOf(game.global.world);
			var timezones = timefarmtime[timefarmindex];

			if (getPageSetting('Rtimefarmtribute') == true) {
				time = game.buildings.Tribute.owned
			}

			if (game.global.challengeActive == "Quagmire" && getPageSetting('Rtimefarmbog') == true && timefarmzone.includes(70) && game.global.world == 70 && timezones > time) {
				Rshouldtimefarmbogs = true;
			} else if (timefarmzone.includes(game.global.world) && timezones > time) {
				Rshouldtimefarm = true;
			}

			if (game.global.challengeActive == "Quagmire" && getPageSetting('Rtimefarmbog') == true && timefarmzone.includes(70) && game.global.world == 70 && game.global.mapsActive && game.global.mapsOwnedArray[getMapIndex(game.global.currentMapId)].name == "The Black Bog" && (Rshouldtimefarmbogs && game.global.lastClearedMapCell >= 140 || timezones <= time)) {
				mapsClicked(true);
			}
		}
	}

    //Bogs
	if (game.global.challengeActive == "Quagmire") {
		var Rdobogs = false;
		Rshoulddobogs = false;
		Rdobogs = (game.global.world > 5 && (game.global.challengeActive == "Quagmire" && getPageSetting('Rblackbog') == true && getPageSetting('Rblackbogzone')[0] > 0 && getPageSetting('Rblackbogamount')[0] > 0));
		if (Rdobogs) {
			var bogzone = getPageSetting('Rblackbogzone');
			var bogamount = getPageSetting('Rblackbogamount');
			var bogindex = bogzone.indexOf(game.global.world);
			var stacks = 100;
			var stacksum = 0;

			for (var i = 0; i < (bogindex + 1); i++) {
				stacksum += parseInt(bogamount[i]);
			}

			var totalstacks = stacks - stacksum;

			if (bogzone.includes(game.global.world) && game.challenges.Quagmire.motivatedStacks > totalstacks) {
				Rshoulddobogs = true;
			}
		}
	}

    //Praid
    var Rdopraid = false;
    Rshoulddopraid = false;
    Rdopraid = (game.global.world > 5 && (getPageSetting('RAMPraid') == true && getPageSetting('RAMPraidzone')[0] > 0 && getPageSetting('RAMPraidraid')[0] > 0));
    if (Rdopraid) {
        var praidzone = getPageSetting('RAMPraidzone');
        var raidzone = getPageSetting('RAMPraidraid');

        var praidindex = praidzone.indexOf(game.global.world);
        var raidzones = raidzone[praidindex];

        var cell;
        cell = ((getPageSetting('RAMPraidcell') > 0) ? getPageSetting('RPraidingcell') : 1);

        if (praidzone.includes(game.global.world) && ((cell <= 1) || (cell > 1 && (game.global.lastClearedCell + 1) >= cell)) && Rgetequips(raidzones, false) > 0) {
            Rshoulddopraid = true;
        }
    }
	if (!Rshoulddopraid && (RAMPrepMap1 != undefined || RAMPrepMap2 != undefined || RAMPrepMap3 != undefined || RAMPrepMap4 != undefined || RAMPrepMap5 != undefined)) {

		RAMPpMap1 = undefined;
		RAMPpMap2 = undefined;
		RAMPpMap3 = undefined;
		RAMPpMap4 = undefined;
		RAMPpMap5 = undefined;
		RAMPfragmappy = undefined;
		RAMPprefragmappy = undefined;
		RAMPmapbought1 = false;
		RAMPmapbought2 = false;
		RAMPmapbought3 = false;
		RAMPmapbought4 = false;
		RAMPmapbought5 = false;
		RAMPfragmappybought = false;

		if (RAMPrepMap1 != undefined) {
			if (getPageSetting('RAMPraidrecycle') == true) {
				recycleMap(getMapIndex(RAMPrepMap1));
			}
			RAMPrepMap1 = undefined;
		}
		if (RAMPrepMap2 != undefined) {
			if (getPageSetting('RAMPraidrecycle') == true) {
				recycleMap(getMapIndex(RAMPrepMap2));
			}
			RAMPrepMap2 = undefined;
		}
		if (RAMPrepMap3 != undefined) {
			if (getPageSetting('RAMPraidrecycle') == true) {
				recycleMap(getMapIndex(RAMPrepMap3));
			}
			RAMPrepMap3 = undefined;
		}
		if (RAMPrepMap4 != undefined) {
			if (getPageSetting('RAMPraidrecycle') == true) {
				recycleMap(getMapIndex(RAMPrepMap4));
			}
			RAMPrepMap4 = undefined;
		}
		if (RAMPrepMap5 != undefined) {
			if (getPageSetting('RAMPraidrecycle') == true) {
				recycleMap(getMapIndex(RAMPrepMap5));
			}
			RAMPrepMap5 = undefined;
		}
    }

    //Mayhem
	if (game.global.challengeActive == "Mayhem") {
		var Rdomayhem = false;
		Rshouldmayhem = 0;
		Rdomayhem = (game.global.world > 5 && game.global.challengeActive == "Mayhem" && getPageSetting('Rmayhemon') == true && (getPageSetting('Rmayhemhealth') == true || getPageSetting('Rmayhemattack') == true));
		if (Rdomayhem) {
			var hits = (getPageSetting('Rmayhemacut') > 0) ? getPageSetting('Rmayhemabcut') : 100;
			var hitssurv = (getPageSetting('Rmayhemhcut') > 0) ? getPageSetting('Rmayhemhcut') : 1;
			if (game.challenges.Mayhem.stacks > 0 && getPageSetting('Rmayhemattack') == true && (RcalcHDratio() > hits)) {
				Rshouldmayhem = 1;
			}
			if (game.challenges.Mayhem.stacks > 0 && getPageSetting('Rmayhemhealth') == true && (RcalcOurHealth() < (hitssurv * enemyDamage))) {
				Rshouldmayhem = 2;
			}
		}

		var mayhemextra = 0;
		if (Rshouldmayhem > 0 && getPageSetting('Rmayhemmap') == 2) {
			mayhemextra = 0;
			var hitsmap = (getPageSetting('Rmayhemamcut') > 0) ? getPageSetting('Rmayhemamcut') : 100;
			var hitssurv = (getPageSetting('Rmayhemhcut') > 0) ? getPageSetting('Rmayhemhcut') : 1;
			var mlevels = 6;
			var go = false;
			if (
				(((RcalcEnemyHealth(game.global.world + mlevels) / game.challenges.Mayhem.getBossMult())) <= (RcalcOurDmg("avg", false, true) * (hitsmap * (mlevels + 1)))) &&
				((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) / game.challenges.Mayhem.getBossMult() * 1.3) * (hitssurv)) <= (RcalcOurHealth() * 2))
			) {
				mayhemextra = mlevels;
				go = true;
			} if (!go) {
				mlevels = 5;
				if (
					(((RcalcEnemyHealth(game.global.world + mlevels) / game.challenges.Mayhem.getBossMult())) <= (RcalcOurDmg("avg", false, true) * (hitsmap * (mlevels + 1)))) &&
					((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) / game.challenges.Mayhem.getBossMult() * 1.3) * (hitssurv)) <= (RcalcOurHealth() * 2))
				) {
					mayhemextra = mlevels;
					go = true;
				}
			} if (!go) {
				mlevels = 4;
				if (
					(((RcalcEnemyHealth(game.global.world + mlevels) / game.challenges.Mayhem.getBossMult())) <= (RcalcOurDmg("avg", false, true) * (hitsmap * (mlevels + 1)))) &&
					((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) / game.challenges.Mayhem.getBossMult() * 1.3) * (hitssurv)) <= (RcalcOurHealth() * 2))
				) {
					mayhemextra = mlevels;
					go = true;
				}
			} if (!go) {
				mlevels = 3;
				if (
					(((RcalcEnemyHealth(game.global.world + mlevels) / game.challenges.Mayhem.getBossMult())) <= (RcalcOurDmg("avg", false, true) * (hitsmap * (mlevels + 1)))) &&
					((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) / game.challenges.Mayhem.getBossMult() * 1.3) * (hitssurv)) <= (RcalcOurHealth() * 2))
				) {
					mayhemextra = mlevels;
					go = true;
				}
			} if (!go) {
				mlevels = 2;
				if (
					(((RcalcEnemyHealth(game.global.world + mlevels) / game.challenges.Mayhem.getBossMult())) <= (RcalcOurDmg("avg", false, true) * (hitsmap * (mlevels + 1)))) &&
					((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) / game.challenges.Mayhem.getBossMult() * 1.3) * (hitssurv)) <= (RcalcOurHealth() * 2))
				) {
					mayhemextra = mlevels;
					go = true;
				}
			} if (!go) {
				mlevels = 1;
				if (
					(((RcalcEnemyHealth(game.global.world + mlevels) / game.challenges.Mayhem.getBossMult())) <= (RcalcOurDmg("avg", false, true) * (hitsmap * (mlevels + 1)))) &&
					((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) / game.challenges.Mayhem.getBossMult() * 1.3) * (hitssurv)) <= (RcalcOurHealth() * 2))
				) {
					mayhemextra = mlevels;
					go = true;
				}
			} if (!go) {
				mayhemextra = 0;
				go = true;
			}
		}
	}

	//Insanity Farm
	if (game.global.challengeActive == "Insanity") {
		var insanityfarmcell;
		insanityfarmcell = ((getPageSetting('Rinsanityfarmcell') > 0) ? getPageSetting('Rinsanityfarmcell') : 1);
		Rinsanityfarm = (getPageSetting('Rinsanityon') == true && ((insanityfarmcell <= 1) || (insanityfarmcell > 1 && (game.global.lastClearedCell + 1) >= insanityfarmcell)) && game.global.world > 5 && (game.global.challengeActive == "Insanity" && getPageSetting('Rinsanityfarmzone')[0] > 0 && getPageSetting('Rinsanityfarmstack')[0] > 0));
		if (Rinsanityfarm) {
			var insanityfarmzone;
			var insanityfarmstacks;
			var insanitystacks = game.challenges.Insanity.insanity;
			var maxinsanity = game.challenges.Insanity.maxInsanity;

			insanityfarmzone = getPageSetting('Rinsanityfarmzone');
			insanityfarmstacks = getPageSetting('Rinsanityfarmstack');

			var insanitystacksfarmindex = insanityfarmzone.indexOf(game.global.world);
			var insanitystackszones = insanityfarmstacks[insanitystacksfarmindex];
			if (insanitystackszones > maxinsanity) {
				insanitystackszones = maxinsanity;
			}

			if (insanityfarmzone.includes(game.global.world) && insanitystackszones != insanitystacks) {
				Rshouldinsanityfarm = true;
			}
		}

		if (!Rshouldinsanityfarm) {
			insanityfragmappy = undefined;
			insanityprefragmappy = undefined;
			insanityfragmappybought = false;
		}
	}

	//Storm
	if (game.global.challengeActive == "Storm") {
		Rstormfarm = (getPageSetting('Rstormon') == true && game.global.world > 5 && (game.global.challengeActive == "Storm" && getPageSetting('Rstormzone') > 0 && getPageSetting('RstormHD') > 0 && getPageSetting('Rstormmult') > 0));
		if (Rstormfarm) {
			var stormzone = getPageSetting('Rstormzone');
			var stormHD = getPageSetting('RstormHD');
			var stormmult = getPageSetting('Rstormmult');
			var stormHDzone = (game.global.world - stormzone);
			var stormHDmult = (stormHDzone == 0) ? stormHD : Math.pow(stormmult, stormHDzone) * stormHD;

			if (game.global.world >= stormzone && RcalcHDratio() > stormHDmult) {
				Rshouldstormfarm = true;
			}
		}
	}

    //Ship Farm
	if (game.jobs.Worshipper.locked == 0) {
		var shipfarmcell;
		shipfarmcell = ((getPageSetting('Rshipfarmcell') > 0) ? getPageSetting('Rshipfarmcell') : 1);
		Rshipfarm = (game.jobs.Worshipper.locked == 0 && getPageSetting('Rshipfarmon') == true && ((shipfarmcell <= 1) || (shipfarmcell > 1 && (game.global.lastClearedCell + 1) >= shipfarmcell)) && game.global.world > 5 && (getPageSetting('Rshipfarmzone')[0] > 0 && getPageSetting('Rshipfarmamount')[0] > 0));
		if (Rshipfarm) {
			var shipfarmzone;
			var shipfarmamount;
			var ships = game.jobs.Worshipper.owned

			shipfarmzone = getPageSetting('Rshipfarmzone');
			shipfarmamount = getPageSetting('Rshipfarmamount');

			var shipamountfarmindex = shipfarmzone.indexOf(game.global.world);
			var shipamountzones = shipfarmamount[shipamountfarmindex];

			if (shipfarmzone.includes(game.global.world) && shipamountzones > ships) {
				Rshouldshipfarm = true;
			}
		}

		if (!Rshouldshipfarm) {
			shipfragmappy = undefined;
			shipprefragmappy = undefined;
			shipfragmappybought = false;
		}
	}

    //Equip Farming
    Requipfarm = (getPageSetting('Requipfarmon') == true && game.global.world > 5 && (getPageSetting('Requipfarmzone') > 0 && getPageSetting('RequipfarmHD') > 0 && getPageSetting('Requipfarmmult') > 0));
    if (Requipfarm) {
	var equipfarmzone = getPageSetting('Requipfarmzone');
	var metal = game.resources.metal.owned
        var metalneeded = estimateEquipsForZone()[0];

        if (game.global.world >= equipfarmzone && metal < metalneeded) {
            Rshouldequipfarm = true;
        }
    }

    var equipminus = 0;
    if (Rshouldequipfarm) {
        equipminus = 0;
        var hits = (getPageSetting('Requipfarmhits') > 0) ? getPageSetting('Requipfarmhits') : 10;
        var hitssurv = (getPageSetting('Rhitssurvived') > 0) ? getPageSetting('Rhitssurvived') : 1;
        var mlevels = 0;
        var go = false;
        if (
            ((RcalcEnemyHealth(game.global.world + mlevels)) <= (RcalcOurDmg("avg", false, true) * hits)) &&
            ((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) * 0.8) * (hitssurv)) <= (RcalcOurHealth() * 2))
        ) {
            equipminus = mlevels;
            go = true;
        } if (!go) {
            mlevels = -1;
            if (
                ((RcalcEnemyHealth(game.global.world + mlevels)) <= (RcalcOurDmg("avg", false, true) * hits)) &&
                ((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) * 0.8) * (hitssurv)) <= (RcalcOurHealth() * 2))
            ) {
                equipminus = mlevels;
                go = true;
            }
        } if (!go) {
            mlevels = -2;
            if (
                ((RcalcEnemyHealth(game.global.world + mlevels)) <= (RcalcOurDmg("avg", false, true) * hits)) &&
                ((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) * 0.8) * (hitssurv)) <= (RcalcOurHealth() * 2))
            ) {
                equipminus = mlevels;
                go = true;
            }
        } if (!go) {
            mlevels = -3;
            if (
                ((RcalcEnemyHealth(game.global.world + mlevels)) <= (RcalcOurDmg("avg", false, true) * hits)) &&
                ((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) * 0.8) * (hitssurv)) <= (RcalcOurHealth() * 2))
            ) {
                equipminus = mlevels;
                go = true;
            }
        } if (!go) {
            mlevels = -4;
            if (
                ((RcalcEnemyHealth(game.global.world + mlevels)) <= (RcalcOurDmg("avg", false, true) * hits)) &&
                ((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) * 0.8) * (hitssurv)) <= (RcalcOurHealth() * 2))
            ) {
                equipminus = mlevels;
                go = true;
            }
        } if (!go) {
            mlevels = -5;
            if (
                ((RcalcEnemyHealth(game.global.world + mlevels)) <= (RcalcOurDmg("avg", false, true) * hits)) &&
                ((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) * 0.8) * (hitssurv)) <= (RcalcOurHealth() * 2))
            ) {
                equipminus = mlevels;
                go = true;
            }
        } if (!go) {
            equipminus = -6;
            go = true;
        }
    }

    //Map Selection
    var obj = {};
    for (var map in game.global.mapsOwnedArray) {
        if (!game.global.mapsOwnedArray[map].noRecycle) {
            obj[map] = game.global.mapsOwnedArray[map].level;
        }
    }
    var keysSorted = Object.keys(obj).sort(function(a, b) {
        return obj[b] - obj[a];
    });
    var highestMap;
    var lowestMap;
    if (keysSorted[0]) {
        highestMap = keysSorted[0];
        lowestMap = keysSorted[keysSorted.length - 1];
    } else
        selectedMap = "create";

    //Uniques
    var runUniques = (getPageSetting('RAutoMaps') == 1);
    if (runUniques || Rshoulddobogs || Rshouldtimefarmbogs) {
        for (var map in game.global.mapsOwnedArray) {
            var theMap = game.global.mapsOwnedArray[map];
            if ((Rshoulddobogs || Rshouldtimefarmbogs) && theMap.name == 'The Black Bog') {
                selectedMap = theMap.id;
                break;
            } else if (runUniques && theMap.noRecycle) {
                if (theMap.name == 'Big Wall' && !game.upgrades.Bounty.allowed && !game.upgrades.Bounty.done) {
                    if (game.global.world < 8 && RcalcHDratio() > 4) continue;
                    selectedMap = theMap.id;
                    break;
                }
                if (theMap.name == 'Dimension of Rage' && document.getElementById("portalBtn").style.display == "none" && game.upgrades.Rage.done == 1) {
                    if (game.global.challenge != "Unlucky" && (game.global.world < 16 || RcalcHDratio() < 2)) continue;
                    selectedMap = theMap.id;
                    break;
                }
                if (getPageSetting('Rprispalace') == true && theMap.name == 'Prismatic Palace' && game.mapUnlocks.Prismalicious.canRunOnce) {
                    if (game.global.world < 21 || RcalcHDratio() > 25) continue;
                    selectedMap = theMap.id;
                    break;
                }
                var meltingpoint = [10000, 10000];
                if (getPageSetting('Rmeltpoint')[0] > 0 && getPageSetting('Rmeltpoint')[1] >= 0) meltingpoint = getPageSetting('Rmeltpoint');
                if (theMap.name == 'Melting Point' && ((game.global.challengeActive == "Trappapalooza" && game.global.world >= meltingpoint[0] && ((game.global.lastClearedCell + 1) >= meltingpoint[1])) || (game.global.challengeActive == "Melt" && game.global.world >= meltingpoint[0] && ((game.global.lastClearedCell + 1) >= meltingpoint[1])) || (getPageSetting('Rmeltsmithy') > 0 && getPageSetting('Rmeltsmithy') <= game.buildings.Smithy.owned && game.mapUnlocks.SmithFree.canRunOnce))) {
                    if (game.global.world < 50 || (game.global.world == 50 && game.global.lastClearedCell < 55)) continue;
                    selectedMap = theMap.id;
                    break;
                }
            }
        }
    }

    //Voids
    if (RneedToVoid) {
        var voidArray = [];
        var prefixlist = {
            'Deadly': 10,
            'Heinous': 11,
            'Poisonous': 20,
            'Destructive': 30
        };
        var prefixkeys = Object.keys(prefixlist);
        var suffixlist = {
            'Descent': 7.077,
            'Void': 8.822,
            'Nightmare': 9.436,
            'Pit': 10.6
        };
        var suffixkeys = Object.keys(suffixlist);

        if (game.global.challengeActive != "Daily" && getPageSetting('Ronlystackedvoids') == true) {
            for (var map in game.global.mapsOwnedArray) {
                var theMap = game.global.mapsOwnedArray[map];
                if (theMap.location == 'Void' && theMap.stacked > 0) {
                    for (var pre in prefixkeys) {
                        if (theMap.name.includes(prefixkeys[pre]))
                            theMap.sortByDiff = 1 * prefixlist[prefixkeys[pre]];
                    }
                    for (var suf in suffixkeys) {
                        if (theMap.name.includes(suffixkeys[suf]))
                            theMap.sortByDiff += 1 * suffixlist[suffixkeys[suf]];
                    }
                    voidArray.push(theMap);
                }
            }
        } else {
            for (var map in game.global.mapsOwnedArray) {
                var theMap = game.global.mapsOwnedArray[map];
                if (theMap.location == 'Void') {
                    for (var pre in prefixkeys) {
                        if (theMap.name.includes(prefixkeys[pre]))
                            theMap.sortByDiff = 1 * prefixlist[prefixkeys[pre]];
                    }
                    for (var suf in suffixkeys) {
                        if (theMap.name.includes(suffixkeys[suf]))
                            theMap.sortByDiff += 1 * suffixlist[suffixkeys[suf]];
                    }
                    voidArray.push(theMap);
                }
            }
        }

        var voidArraySorted = voidArray.sort(function(a, b) {
            return a.sortByDiff - b.sortByDiff;
        });
        for (var map in voidArraySorted) {
            var theMap = voidArraySorted[map];
            RdoVoids = true;
            if (getPageSetting('RDisableFarm') <= 0)
                RshouldFarm = RshouldFarm || false;
            if (!restartVoidMap)
                selectedMap = theMap.id;
            break;
        }
    }

    //Automaps

    //Raiding
    if (Rshoulddopraid) {
        if (selectedMap == "world") {
            selectedMap = "createp";
        }
    }

    //Everything else
    if (!Rshoulddopraid && (RshouldDoMaps || RdoVoids || Rshouldtimefarm || Rshoulddoquest > 0 || Rshouldmayhem > 0 || Rshouldinsanityfarm || Rshouldstormfarm || Rshouldequipfarm || Rshouldshipfarm)) {
        if (selectedMap == "world") {
            if (Rshouldmayhem > 0 && !Rshouldtimefarm && !Rshouldinsanityfarm && !Rshouldequipfarm && !Rshouldshipfarm) {
                if (getPageSetting('Rmayhemmap') == 2) {
                    for (var map in game.global.mapsOwnedArray) {
                        if (!game.global.mapsOwnedArray[map].noRecycle && mayhemextra >= 0 && ((game.global.world + mayhemextra) == game.global.mapsOwnedArray[map].level)) {
                            selectedMap = game.global.mapsOwnedArray[map].id;
			    break;
                        } else {
                            selectedMap = "create";
                        }
                    }
                } else {
                    for (var map in game.global.mapsOwnedArray) {
                        if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                            selectedMap = game.global.mapsOwnedArray[map].id;
			    break;
                        } else {
                            selectedMap = "create";
                        }
                    }
                }
	    } else if (Rshouldinsanityfarm && !Rshouldtimefarm && !Rshouldequipfarm && !Rshouldshipfarm) {
                if (getPageSetting('Rinsanityfarmlevel') == 0) {
                    for (var map in game.global.mapsOwnedArray) {
                        if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                            selectedMap = game.global.mapsOwnedArray[map].id;
			    break;
                        } else {
                            selectedMap = "create";
                        }
                    }
                } else if (getPageSetting('Rinsanityfarmlevel') != 0) {
                    var insanityfarmlevel = getPageSetting('Rinsanityfarmlevel');
                    var insanityfarmlevelindex = insanityfarmzone.indexOf(game.global.world);
                    var insanitylevelzones = insanityfarmlevel[insanityfarmlevelindex];
                    if (insanitylevelzones > 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && ((game.global.world + insanitylevelzones) == game.global.mapsOwnedArray[map].level)) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    } else if (insanitylevelzones == 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    } else if (insanitylevelzones < 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && ((game.global.world + insanitylevelzones) == game.global.mapsOwnedArray[map].level)) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    }
                }
	    } else if (Rshouldshipfarm && !Rshouldtimefarm && !Rshouldequipfarm) {
                if (getPageSetting('Rshipfarmlevel') == 0) {
                    for (var map in game.global.mapsOwnedArray) {
                        if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                            selectedMap = game.global.mapsOwnedArray[map].id;
			    break;
                        } else {
                            selectedMap = "create";
                        }
                    }
                } else if (getPageSetting('Rshipfarmlevel') != 0) {
                    var shipfarmlevel = getPageSetting('Rshipfarmlevel');
                    var shipfarmlevelindex = shipfarmzone.indexOf(game.global.world);
                    var shiplevelzones = shipfarmlevel[shipfarmlevelindex];
                    if (shiplevelzones > 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && ((game.global.world + shiplevelzones) == game.global.mapsOwnedArray[map].level)) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    } else if (shiplevelzones == 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    } else if (shiplevelzones < 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && ((game.global.world + shiplevelzones) == game.global.mapsOwnedArray[map].level)) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    }
                }
            } else if (Rshouldtimefarm && !Rshouldequipfarm) {
                if (getPageSetting('Rtimemaplevel') == 0) {
                    for (var map in game.global.mapsOwnedArray) {
                        if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                            selectedMap = game.global.mapsOwnedArray[map].id;
			    break;
                        } else {
                            selectedMap = "create";
                        }
                    }
                } else if (getPageSetting('Rtimemaplevel') != 0) {
                    var timefarmlevel = getPageSetting('Rtimemaplevel');
                    var timefarmlevelindex = timefarmzone.indexOf(game.global.world);
                    var levelzones = timefarmlevel[timefarmlevelindex];
                    if (levelzones > 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && ((game.global.world + levelzones) == game.global.mapsOwnedArray[map].level)) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    } else if (levelzones == 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    } else if (levelzones < 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && ((game.global.world - 1) == game.global.mapsOwnedArray[map].level)) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    }
                }
	    } else if (Rshouldequipfarm) {
                for (var map in game.global.mapsOwnedArray) {
                    if (!game.global.mapsOwnedArray[map].noRecycle && equipminus <= 0 && ((game.global.world + equipminus) == game.global.mapsOwnedArray[map].level)) {
                        selectedMap = game.global.mapsOwnedArray[map].id;
			break;
                    } else {
                            selectedMap = "create";
                    }
                }
	    } else {
                    for (var map in game.global.mapsOwnedArray) {
                        if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                            selectedMap = game.global.mapsOwnedArray[map].id;
			    break;
                        } else {
                            selectedMap = "create";
                        }
                    }
                }
        }
    }

    //Getting to Map Creation and Repeat
    if (!game.global.preMapsActive && game.global.mapsActive) {
        var doDefaultMapBonus = game.global.mapBonus < getPageSetting('RMaxMapBonuslimit') - 1;
        if ((Rshoulddopraid || (Rshoulddopraid && RAMPfragfarming)) || (Rshouldinsanityfarm || (Rshouldinsanityfarm && Rinsanityfragfarming)) || (selectedMap == game.global.currentMapId && (!getCurrentMapObject().noRecycle && (doDefaultMapBonus || RvanillaMapatZone || RdoMaxMapBonus || RshouldFarm || Rshouldtimefarm || Rshoulddobogs || Rshoulddoquest > 0 || Rshouldmayhem > 0 || Rshouldstormfarm || Rshouldequipfarm || (Rshouldshipfarm || (Rshouldshipfarm && Rshipfragfarming)))))) {
            if (!game.global.repeatMap) {
                repeatClicked();
            }
            if (Rshoulddopraid && !RAMPfragfarming) {
                if (game.options.menu.repeatUntil.enabled != 2) {
                    game.options.menu.repeatUntil.enabled = 2;
                }
            } else if ((Rshoulddopraid && RAMPfragfarming) || (Rshouldinsanityfarm && Rinsanityfragfarming) || (Rshouldshipfarm && Rshipfragfarming)) {
                if (game.options.menu.repeatUntil.enabled != 0) {
                    game.options.menu.repeatUntil.enabled = 0;
                }
            }
            if (!Rshoulddopraid && !RAMPfragfarming && !Rshouldinsanityfarm && !Rinsanityfragfarming && !Rshoulddobogs && !RshouldDoMaps && !Rshouldtimefarm && Rshoulddoquest <= 0 && Rshouldmayhem <= 0 && !Rshouldstormfarm && !Rshouldequipfarm && !Rshouldshipfarm && !Rshipfragfarming) {
                repeatClicked();
            }
            if (shouldDoHealthMaps && game.global.mapBonus >= getPageSetting('RMaxMapBonushealth')) {
                repeatClicked();
                shouldDoHealthMaps = false;
            }
            if (RdoMaxMapBonus && game.global.mapBonus < getPageSetting('RMaxMapBonuslimit')) {
                repeatClicked();
                RdoMaxMapBonus = false;
            }
            if (game.global.repeatMap && Rshoulddoquest == 3 && game.global.mapBonus >= 4) {
                repeatClicked();
            }
            if (game.global.repeatMap && Rshoulddopraid && RAMPfragfarming && RAMPfrag() == true) {
                repeatClicked();
            }
	    if (game.global.repeatMap && Rshouldinsanityfarm && Rinsanityfragfarming && insanityfrag() == true) {
                repeatClicked();
            }
	    if (game.global.repeatMap && Rshouldshipfarm && Rshipfragfarming && shipfrag() == true) {
                repeatClicked();
            }

        } else {
            if (game.global.repeatMap) {
                repeatClicked();
            }
            if (restartVoidMap) {
                mapsClicked(true);
            }
        }
    } else if (!game.global.preMapsActive && !game.global.mapsActive) {
        if (selectedMap != "world") {
            if (!game.global.switchToMaps) {
                mapsClicked();
            }
            if (RdoVoids && game.global.switchToMaps &&
                (RdoVoids ||
                    (!RenoughDamage && RenoughHealth && game.global.lastClearedCell < 9) ||
                    (RshouldFarm && game.global.lastClearedCell >= customVars.RshouldFarmCell) ||
                    (RscryerStuck)) &&
                (
                    (game.resources.trimps.realMax() <= game.resources.trimps.owned + 1) ||
                    (RdoVoids && game.global.lastClearedCell > 70)
                )
            ) {
                if (RscryerStuck) {
                    debug("Got perma-stuck on cell " + (game.global.lastClearedCell + 2) + " during scryer stance. Are your scryer settings correct? Entering map to farm to fix it.");
                }
                mapsClicked();
            }
        }

    //Creating Map
    } else if (game.global.preMapsActive) {
        if (selectedMap == "world") {
            mapsClicked();
        } else if (selectedMap == "createp") {
            RAMPdone = false;
            var RAMPfragcheck = true;
            if (getPageSetting('RAMPraidfrag') > 0) {
                if (RAMPfrag() == true) {
                    RAMPfragcheck = true;
                    RAMPfragfarming = false;
                } else if (RAMPfrag() == false && !RAMPmapbought1 && !RAMPmapbought2 && !RAMPmapbought3 && !RAMPmapbought4 && !RAMPmapbought5 && Rshoulddopraid) {
                    RAMPfragfarming = true;
                    RAMPfragcheck = false;
                    if (!RAMPfragcheck && RAMPfragmappy == undefined && !RAMPfragmappybought && game.global.preMapsActive && Rshoulddopraid) {
                        debug("Check complete for frag map");
                        RAMPfragmap();
                        if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                            buyMap();
                            RAMPfragmappybought = true;
                            if (RAMPfragmappybought) {
                                RAMPfragmappy = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                                debug("frag map bought");
                            }
                        }
                    }
                    if (!RAMPfragcheck && game.global.preMapsActive && !game.global.mapsActive && RAMPfragmappybought && RAMPfragmappy != undefined && Rshoulddopraid) {
                        debug("running frag map");
                        selectedMap = RAMPfragmappy;
                        selectMap(RAMPfragmappy);
                        runMap();
                        RlastMapWeWereIn = getCurrentMapObject();
                        RAMPprefragmappy = RAMPfragmappy;
                        RAMPfragmappy = undefined;
                    }
                    if (!RAMPfragcheck && game.global.mapsActive && RAMPfragmappybought && RAMPprefragmappy != undefined && Rshoulddopraid) {
                        if (RAMPfrag() == false) {
                            if (!game.global.repeatMap) {
                                repeatClicked();
                            }
                        } else if (RAMPfrag() == true) {
                            if (game.global.repeatMap) {
                                repeatClicked();
                                mapsClicked();
                            }
                            if (game.global.preMapsActive && RAMPfragmappybought && RAMPprefragmappy != undefined && Rshoulddopraid) {
                                RAMPfragmappybought = false;
                            }
                            if (RAMPprefragmappy != undefined) {
                                recycleMap(getMapIndex(RAMPprefragmappy));
                                RAMPprefragmappy = undefined;
                            }
                            RAMPfragcheck = true;
                            RAMPfragfarming = false;
                        }
                    }
                } else {
                    RAMPfragcheck = true;
                    RAMPfragfarming = false;
                }
            }
            if (RAMPfragcheck && RAMPpMap5 == undefined && !RAMPmapbought5 && game.global.preMapsActive && Rshoulddopraid && RAMPshouldrunmap(0)) {
                debug("Check complete for 5th map");
                RAMPplusPres(0);
                if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                    buyMap();
                    RAMPmapbought5 = true;
                    if (RAMPmapbought5) {
                        RAMPpMap5 = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                        debug("5th map bought");
                    }
                }
            }
            if (RAMPfragcheck && RAMPpMap4 == undefined && !RAMPmapbought4 && game.global.preMapsActive && Rshoulddopraid && RAMPshouldrunmap(1)) {
                debug("Check complete for 4th map");
                RAMPplusPres(1);
                if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                    buyMap();
                    RAMPmapbought4 = true;
                    if (RAMPmapbought4) {
                        RAMPpMap4 = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                        debug("4th map bought");
                    }
                }
            }
            if (RAMPfragcheck && RAMPpMap3 == undefined && !RAMPmapbought3 && game.global.preMapsActive && Rshoulddopraid && RAMPshouldrunmap(2)) {
                debug("Check complete for 3rd map");
                RAMPplusPres(2);
                if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                    buyMap();
                    RAMPmapbought3 = true;
                    if (RAMPmapbought3) {
                        RAMPpMap3 = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                        debug("3rd map bought");
                    }
                }
            }
            if (RAMPfragcheck && RAMPpMap2 == undefined && !RAMPmapbought2 && game.global.preMapsActive && Rshoulddopraid && RAMPshouldrunmap(3)) {
                debug("Check complete for 2nd map");
                RAMPplusPres(3);
                if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                    buyMap();
                    RAMPmapbought2 = true;
                    if (RAMPmapbought2) {
                        RAMPpMap2 = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                        debug("2nd map bought");
                    }
                }
            }
            if (RAMPfragcheck && RAMPpMap1 == undefined && !RAMPmapbought1 && game.global.preMapsActive && Rshoulddopraid && RAMPshouldrunmap(4)) {
                debug("Check complete for 1st map");
                RAMPplusPres(4);
                if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                    buyMap();
                    RAMPmapbought1 = true;
                    if (RAMPmapbought1) {
                        RAMPpMap1 = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                        debug("1st map bought");
                    }
                }
            }
            if (RAMPfragcheck && !RAMPmapbought1 && !RAMPmapbought2 && !RAMPmapbought3 && !RAMPmapbought4 && !RAMPmapbought5) {
                RAMPpMap1 = undefined;
                RAMPpMap2 = undefined;
                RAMPpMap3 = undefined;
                RAMPpMap4 = undefined;
                RAMPpMap5 = undefined;
                debug("Failed to Prestige Raid. Looks like you can't afford to or have no equips to get!");
                Rshoulddopraid = false;
                autoTrimpSettings["RAutoMaps"].value = 0;
            }
            if (RAMPfragcheck && game.global.preMapsActive && !game.global.mapsActive && RAMPmapbought1 && RAMPpMap1 != undefined && Rshoulddopraid) {
                debug("running map 1");
                selectedMap = RAMPpMap1;
                selectMap(RAMPpMap1);
                runMap();
                RlastMapWeWereIn = getCurrentMapObject();
                RAMPrepMap1 = RAMPpMap1;
                RAMPpMap1 = undefined;
            }
            if (RAMPfragcheck && game.global.preMapsActive && !game.global.mapsActive && RAMPmapbought2 && RAMPpMap2 != undefined && Rshoulddopraid) {
                debug("running map 2");
                selectedMap = RAMPpMap2;
                selectMap(RAMPpMap2);
                runMap();
                RlastMapWeWereIn = getCurrentMapObject();
                RAMPrepMap2 = RAMPpMap2;
                RAMPpMap2 = undefined;
            }
            if (RAMPfragcheck && game.global.preMapsActive && !game.global.mapsActive && RAMPmapbought3 && RAMPpMap3 != undefined && Rshoulddopraid) {
                debug("running map 3");
                selectedMap = RAMPpMap3;
                selectMap(RAMPpMap3);
                runMap();
                RlastMapWeWereIn = getCurrentMapObject();
                RAMPrepMap3 = RAMPpMap3;
                RAMPpMap3 = undefined;
            }
            if (RAMPfragcheck && game.global.preMapsActive && !game.global.mapsActive && RAMPmapbought4 && RAMPpMap4 != undefined && Rshoulddopraid) {
                debug("running map 4");
                selectedMap = RAMPpMap4;
                selectMap(RAMPpMap4);
                runMap();
                RlastMapWeWereIn = getCurrentMapObject();
                RAMPrepMap4 = RAMPpMap4;
                RAMPpMap4 = undefined;
            }
            if (RAMPfragcheck && game.global.preMapsActive && !game.global.mapsActive && RAMPmapbought5 && RAMPpMap5 != undefined && Rshoulddopraid) {
                debug("running map 5");
                selectedMap = RAMPpMap5;
                selectMap(RAMPpMap5);
                runMap();
                RlastMapWeWereIn = getCurrentMapObject();
                RAMPrepMap5 = RAMPpMap5;
                RAMPpMap5 = undefined;
            }
        } else if (selectedMap == "create") {
            document.getElementById("mapLevelInput").value = game.global.world;
            var decrement;
            var tier;
            if (game.global.world >= customVars.RMapTierZone[0]) {
                tier = customVars.RMapTier0Sliders;
                decrement = [];
            } else if (game.global.world >= customVars.RMapTierZone[1]) {
                tier = customVars.RMapTier1Sliders;
                decrement = ['loot'];
            } else if (game.global.world >= customVars.RMapTierZone[2]) {
                tier = customVars.RMapTier2Sliders;
                decrement = ['loot'];
            } else {
                tier = customVars.RMapTier3Sliders;
                decrement = ['diff', 'loot'];
            }
            sizeAdvMapsRange.value = tier[0];
            adjustMap('size', tier[0]);
            difficultyAdvMapsRange.value = tier[1];
            adjustMap('difficulty', tier[1]);
            lootAdvMapsRange.value = tier[2];
            adjustMap('loot', tier[2]);
            biomeAdvMapsSelect.value = autoTrimpSettings.Rmapselection.selected == "Gardens" ? "Plentiful" : autoTrimpSettings.Rmapselection.selected;
            updateMapCost();
            if (RshouldFarm || game.global.challengeActive == 'Transmute') {
                biomeAdvMapsSelect.value = game.global.decayDone ? "Plentiful" : "Forest";
                updateMapCost();
            }
            if (Rshouldinsanityfarm && !Rshouldtimefarm && !Rshoulddoquest && !Rshouldequipfarm && !Rshouldshipfarm) {
		var insanityfragcheck = true;
		if (getPageSetting('Rinsanityfarmfrag') == true) {
                    if (insanityfrag() == true) {
                        insanityfragcheck = true;
                        Rinsanityfragfarming = false;
                    } else if (insanityfrag() == false && Rshouldinsanityfarm) {
                        Rinsanityfragfarming = true;
                        insanityfragcheck = false;
                        if (!insanityfragcheck && insanityfragmappy == undefined && !insanityfragmappybought && game.global.preMapsActive && Rshouldinsanityfarm) {
                            debug("Check complete for insanity frag map");
                            insanityfragmap();
                            if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                                buyMap();
                                insanityfragmappybought = true;
                                if (insanityfragmappybought) {
                                    insanityfragmappy = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                                    debug("insanity frag map bought");
                                }
                            }
                        }
                        if (!insanityfragcheck && game.global.preMapsActive && !game.global.mapsActive && insanityfragmappybought && insanityfragmappy != undefined && Rshouldinsanityfarm) {
                            debug("running insanity frag map");
                            selectedMap = insanityfragmappy;
                            selectMap(insanityfragmappy);
                            runMap();
                            RlastMapWeWereIn = getCurrentMapObject();
                            insanityprefragmappy = insanityfragmappy;
                            insanityfragmappy = undefined;
                        }
                        if (!insanityfragcheck && game.global.mapsActive && insanityfragmappybought && insanityprefragmappy != undefined && Rshouldinsanityfarm) {
                            if (insanityfrag() == false) {
                                if (!game.global.repeatMap) {
                                    repeatClicked();
                                }
                            } else if (insanityfrag() == true) {
                                if (game.global.repeatMap) {
                                    repeatClicked();
                                    mapsClicked();
                                }
                                if (game.global.preMapsActive && insanityfragmappybought && insanityprefragmappy != undefined && Rshouldinsanityfarm) {
                                    insanityfragmappybought = false;
                                }
                                if (insanityprefragmappy != undefined) {
                                    recycleMap(getMapIndex(insanityprefragmappy));
                                    insanityprefragmappy = undefined;
                                }
                                insanityfragcheck = true;
                                Rinsanityfragfarming = false;
                            }
                        }
                    } else {
                        insanityfragcheck = true;
                        Rinsanityfragfarming = false;
                    }
                }
                if (insanityfragcheck && getPageSetting('Rinsanityfarmlevel') != 0) {

                    var insanityfarmlevel = getPageSetting('Rinsanityfarmlevel');

                    var insanityfarmlevelindex = insanityfarmzone.indexOf(game.global.world);
                    var insanitylevelzones = insanityfarmlevel[insanityfarmlevelindex];

                    if (insanityfarmzone.includes(game.global.world)) {
                        if (insanitylevelzones > 0) {
                            document.getElementById("mapLevelInput").value = game.global.world;
                            document.getElementById("advExtraLevelSelect").value = insanitylevelzones;
                        } else if (insanitylevelzones < 0) {
                            document.getElementById("mapLevelInput").value = (game.global.world + insanitylevelzones);
			    document.getElementById("advExtraLevelSelect").value = 0;
                        }
                    }
                }
                updateMapCost();
            }
	    if (Rshouldshipfarm && !Rshouldtimefarm && !Rshoulddoquest && !Rshouldequipfarm) {
		var shipfragcheck = true;
		if (getPageSetting('Rshipfarmfrag') == true) {
                    if (shipfrag() == true) {
                        shipfragcheck = true;
                        Rshipfragfarming = false;
                    } else if (shipfrag() == false && Rshouldshipfarm) {
                        Rshipfragfarming = true;
                        shipfragcheck = false;
                        if (!shipfragcheck && shipfragmappy == undefined && !shipfragmappybought && game.global.preMapsActive && Rshouldshipfarm) {
                            debug("Check complete for ship frag map");
                            shipfragmap();
                            if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                                buyMap();
                                shipfragmappybought = true;
                                if (shipfragmappybought) {
                                    shipfragmappy = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                                    debug("ship frag map bought");
                                }
                            }
                        }
                        if (!shipfragcheck && game.global.preMapsActive && !game.global.mapsActive && shipfragmappybought && shipfragmappy != undefined && Rshouldshipfarm) {
                            debug("running ship frag map");
                            selectedMap = shipfragmappy;
                            selectMap(shipfragmappy);
                            runMap();
                            RlastMapWeWereIn = getCurrentMapObject();
                            shipprefragmappy = shipfragmappy;
                            shipfragmappy = undefined;
                        }
                        if (!shipfragcheck && game.global.mapsActive && shipfragmappybought && shipprefragmappy != undefined && Rshouldshipfarm) {
                            if (shipfrag() == false) {
                                if (!game.global.repeatMap) {
                                    repeatClicked();
                                }
                            } else if (shipfrag() == true) {
                                if (game.global.repeatMap) {
                                    repeatClicked();
                                    mapsClicked();
                                }
                                if (game.global.preMapsActive && shipfragmappybought && shipprefragmappy != undefined && Rshouldshipfarm) {
                                    shipfragmappybought = false;
                                }
                                if (shipprefragmappy != undefined) {
                                    recycleMap(getMapIndex(shipprefragmappy));
                                    shipprefragmappy = undefined;
                                }
                                shipfragcheck = true;
                                Rshipfragfarming = false;
                            }
                        }
                    } else {
                        shipfragcheck = true;
                        Rshipfragfarming = false;
                    }
                }
                if (shipfragcheck && getPageSetting('Rshipfarmlevel') != 0) {

                    var shipfarmlevel = getPageSetting('Rshipfarmlevel');

                    var shipfarmlevelindex = shipfarmzone.indexOf(game.global.world);
                    var shiplevelzones = shipfarmlevel[shipfarmlevelindex];

                    if (shipfarmzone.includes(game.global.world)) {
                        if (shiplevelzones > 0) {
                            document.getElementById("mapLevelInput").value = game.global.world;
                            document.getElementById("advExtraLevelSelect").value = shiplevelzones;
                        } else if (shiplevelzones == 0) {
                            document.getElementById("mapLevelInput").value = game.global.world;
			    document.getElementById("advExtraLevelSelect").value = 0;
			} else if (shiplevelzones < 0) {
                            document.getElementById("mapLevelInput").value = (game.global.world + shiplevelzones);
			    document.getElementById("advExtraLevelSelect").value = 0;
                        }
                    }
                }
                updateMapCost();
            }
            if (Rshouldtimefarm && !Rshoulddoquest) {
                if (getPageSetting('Rtimemaplevel') != 0) {

                    var timefarmlevel = getPageSetting('Rtimemaplevel');

                    var timefarmlevelindex = timefarmzone.indexOf(game.global.world);
                    var levelzones = timefarmlevel[timefarmlevelindex];

                    if (timefarmzone.includes(game.global.world)) {
                        if (levelzones > 0) {
                            document.getElementById("mapLevelInput").value = game.global.world;
                            document.getElementById("advExtraLevelSelect").value = levelzones;
                        } else if (levelzones < 0) {
                            document.getElementById("mapLevelInput").value = (game.global.world - 1);
                        }
                    }
                }
                biomeAdvMapsSelect.value = autoTrimpSettings.Rtimemapselection.selected;
                document.getElementById("advSpecialSelect").value = autoTrimpSettings.Rtimespecialselection.selected;
                updateMapCost();
            }
            if (Rshoulddoquest) {
                biomeAdvMapsSelect.value = "Plentiful";
                if (Rshoulddoquest == 4) {
                    document.getElementById("advSpecialSelect").value = "hc";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = "fa";
                        updateMapCost();
                        if (updateMapCost(true) > game.resources.fragments.owned) {
                            document.getElementById("advSpecialSelect").value = 0;
                            updateMapCost();
                        }
                    }
                }
                if (Rshoulddoquest == 7) {
                    document.getElementById("advSpecialSelect").value = "hc";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = "lc";
                        updateMapCost();
                        if (updateMapCost(true) > game.resources.fragments.owned) {
                            document.getElementById("advSpecialSelect").value = "fa";
                            updateMapCost();
                            if (updateMapCost(true) > game.resources.fragments.owned) {
                                document.getElementById("advSpecialSelect").value = 0;
                                updateMapCost();
                            }
                        }
                    }
                }
                if (Rshoulddoquest == 10) {
                    document.getElementById("advSpecialSelect").value = "lsc";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = "ssc";
                        updateMapCost();
                        if (updateMapCost(true) > game.resources.fragments.owned) {
                            document.getElementById("advSpecialSelect").value = "fa";
                            updateMapCost();
                            if (updateMapCost(true) > game.resources.fragments.owned) {
                                document.getElementById("advSpecialSelect").value = 0;
                                updateMapCost();
                            }
                        }
                    }
                }
                if (Rshoulddoquest == 11) {
                    document.getElementById("advSpecialSelect").value = "lwc";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = "swc";
                        updateMapCost();
                        if (updateMapCost(true) > game.resources.fragments.owned) {
                            document.getElementById("advSpecialSelect").value = "fa";
                            updateMapCost();
                            if (updateMapCost(true) > game.resources.fragments.owned) {
                                document.getElementById("advSpecialSelect").value = 0;
                                updateMapCost();
                            }
                        }
                    }
                }
                if (Rshoulddoquest == 12) {
                    document.getElementById("advSpecialSelect").value = "lmc";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = "smc";
                        updateMapCost();
                        if (updateMapCost(true) > game.resources.fragments.owned) {
                            document.getElementById("advSpecialSelect").value = "fa";
                            updateMapCost();
                            if (updateMapCost(true) > game.resources.fragments.owned) {
                                document.getElementById("advSpecialSelect").value = 0;
                                updateMapCost();
                            }
                        }
                    }
                }
                if (Rshoulddoquest == 13) {
                    document.getElementById("advSpecialSelect").value = "fa";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = 0;
                        updateMapCost();
                    }
                }
                if (Rshoulddoquest == 14) {
                    document.getElementById("advSpecialSelect").value = "fa";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = 0;
                        updateMapCost();
                    }
                }
                if (updateMapCost(true) > game.resources.fragments.owned) {
                    biomeAdvMapsSelect.value = "Random";
                    updateMapCost();
                }
            }
            if (Rshouldmayhem > 0 && getPageSetting('Rmayhemmap') == 2 && !Rshouldtimefarm) {
                mapLevelInput.value = game.global.world;
                biomeAdvMapsSelect.value = "Random";
                document.getElementById("advSpecialSelect").value = "fa";
                document.getElementById("advExtraLevelSelect").value = mayhemextra;
                updateMapCost();
		if (updateMapCost(true) > game.resources.fragments.owned) {
		console.log("cant afford this shit dumbass btw mayhemextra is " + mayhemextra);
		}
            }
	    if (Rshouldequipfarm) {
                mapLevelInput.value = game.global.world + equipminus;
                biomeAdvMapsSelect.value = "Plentiful";
                document.getElementById("advSpecialSelect").value = "lmc";
                document.getElementById("advExtraLevelSelect").value = 0;
                updateMapCost();
            }
            if (updateMapCost(true) > game.resources.fragments.owned) {
                if (!RenoughDamage) decrement.push('diff');
                if (RshouldFarm) decrement.push('size');
            }
            while (decrement.indexOf('loot') > -1 && lootAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                lootAdvMapsRange.value -= 1;
            }
            while (decrement.indexOf('diff') > -1 && difficultyAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                difficultyAdvMapsRange.value -= 1;
            }
            while (decrement.indexOf('size') > -1 && sizeAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                sizeAdvMapsRange.value -= 1;
            }
            while (lootAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                lootAdvMapsRange.value -= 1;
            }
            while (difficultyAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                difficultyAdvMapsRange.value -= 1;
            }
            while (sizeAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                sizeAdvMapsRange.value -= 1;
            }
            var maplvlpicked = parseInt(document.getElementById("mapLevelInput").value);
            if (updateMapCost(true) > game.resources.fragments.owned) {
                selectMap(game.global.mapsOwnedArray[highestMap].id);
                debug("Can't afford the map we designed, #" + maplvlpicked, "maps", '*crying2');
                debug("...selected our highest map instead # " + game.global.mapsOwnedArray[highestMap].id + " Level: " + game.global.mapsOwnedArray[highestMap].level, "maps", '*happy2');
                runMap();
                RlastMapWeWereIn = getCurrentMapObject();
            } else {
                debug("Buying a Map, level: #" + maplvlpicked, "maps", 'th-large');
                var result = buyMap();
                if (result == -2) {
                    debug("Too many maps, recycling now: ", "maps", 'th-large');
                    recycleBelow(true);
                    debug("Retrying, Buying a Map, level: #" + maplvlpicked, "maps", 'th-large');
                    result = buyMap();
                    if (result == -2) {
                        recycleMap(lowestMap);
                        result = buyMap();
                        if (result == -2)
                            debug("AutoMaps unable to recycle to buy map!");
                        else
                            debug("Retrying map buy after recycling lowest level map");
                    }
                }
            }
        } else {
            selectMap(selectedMap);
            var themapobj = game.global.mapsOwnedArray[getMapIndex(selectedMap)];
            var levelText;
            if (themapobj.level > 0) {
                levelText = " Level: " + themapobj.level;
            } else {
                levelText = " Level: " + game.global.world;
            }
            var voidorLevelText = themapobj.location == "Void" ? " Void: " : levelText;
            debug("Running selected " + selectedMap + voidorLevelText + " Name: " + themapobj.name, "maps", 'th-large');
            runMap();
            RlastMapWeWereIn = getCurrentMapObject();
        }
    }
}
