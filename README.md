# This Fork

This fork contains personal AutoTrimps changes on top of the SadAugust AutoTrimps fork.

## Fork Changelog

### Unreleased

#### World HS/HD Cell Interval

-   Added configurable world HS/HD cell interval setting: **World HS/HD Cell Interval**.
-   World HD Ratio now checks the worst remaining enemy health from the current world cell through the next configured interval cell.
-   World Hits Survived now checks the worst remaining enemy attack from the current world cell through the next configured interval cell.
-   Default interval is `10`, so checks end at cells `10, 20, 30, ...`.
-   Liquified zones still use cell `1`; Spires still use **Exit After Cell**.
-   Updated Auto Maps Status tooltip to show the world cell interval endpoint being used.

#### Wormhole Auto Structure Settings

-   Added **Max Zone** and **Max Cell** settings to stop buying Wormholes once that world cell is reached.
-   Added **Coord Only** buying to buy Wormholes only when needed for Coordination.

---

# AutoTrimps - SadAugust Fork

SadAugust AutoTrimps Fork.

-   Currently up-to-date with patch 5.10.1.
-   All changes made by SadAugust were using Zorn192/GenBTC as base.

# Installation Guides

## AutoTrimps Installation

Web browser install instructions can be found at <a href="https://github.com/SadAugust/AutoTrimps/blob/main/Installation%20Guides/AutoTrimps%20Browser.md">this link</a>.

Steam client install instructions can be found at <a href="https://github.com/SadAugust/AutoTrimps/blob/main/Installation%20Guides/AutoTrimps%20Steam.md">this link</a>.

## Standalone Mods Installation

The following mods are included in AutoTrimps but are also available as standalone versions:

-   Farm Calculator (zfarm)
-   Heirloom Calculator
-   Auto Perks (Perky+Surky)
-   SpireTD Import (U1 Z200+)
-   Mutator Presets (U2 Z201+)

The preferred way to load these is through another mod called ModLoader which allows you to select mods (including ones not listed above) you would like to load and it'll load them all when you launch the game. Instructions for that can be found <a href="https://github.com/GodNooNoo/TrimpsModLoader/blob/main/README.md">here</a> at GodNooNoo's ModLoader repository.

Alternatively you can load these mods seperately by following the instructions in the links below.

Web browser install instructions can be found at <a href="https://github.com/SadAugust/AutoTrimps/blob/main/Installation%20Guides/Standalone%20Mods%20Browser.md">this link</a>.

Steam client install instructions can be found at <a href="https://github.com/SadAugust/AutoTrimps/blob/main/Installation%20Guides/Standalone%20Mods%20Steam.md">this link</a>.

# Donate

If you'd like to donate to AutoTrimps development, you can do so with <a href="https://www.buymeacoffee.com/augustAutoTrimps">Buy me a coffee.</a>
