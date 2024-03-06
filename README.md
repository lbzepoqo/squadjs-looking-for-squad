# SquadJS Looking For Squad Plugin

**Overview**

This plugin simplifies the process for players to find and join squads in your game. It provides a command for players to signal squad leaders when they're looking to join the action.

**Features**

* **Customizable command:** Set the command players use to signal their interest in joining a squad (default: `!lfs`).
* **Targeted requests:** Players can optionally specify a squad number to direct their request.
* **Rate limiting:** Prevents command spamming with a configurable cooldown period.
* **Locked squad focus:** Option to prioritize notifications to leaders of locked squads.

**Example Usage**

* **General request:** `!lfs` (Pings all squad leaders on your team)
* **Specific request:** `!lfs 3` (Pings the leader of squad 3 on your team)

**Configuration**
```json
{
    "plugin": "LookingForSquad",
    "enabled": true,
    "commands": ["!lfs", "!look", "!invite"],
    "rateLimit": 15,
    "warnLockedOnly": false
}
```
  
**Explanation of Options**

* **plugin**: The name of the plugin file.
* **enabled**: Controls whether the plugin is active.
* **commands**: An array of usable commands to trigger the plugin.
* **rateLimit**: Minimum time (in seconds) between command uses by the same player.
* **warnLockedOnly**: Determines if all squad leaders or only locked squad leaders are notified.

**Installation**

1. Download the `looking-for-squad.js` file.
2. Place the file in your SquadJS' plugin directory (`../squad-server/plugins`).
3. Add the configuration block (shown above) to your SquadJS' `config.json` file in the main directory.
4. Restart your game server to apply changes.
