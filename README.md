# SquadJS Looking For Squad Plugin
This plugin can be used to warn squad leaders of the same team that a player is looking for a squad.

### Options
#### commands
###### Description
Command to trigger the plugin.
###### Default
```
["!lfs", "!look", "!invite"]
```
#### rateLimit
###### Description
Number of seconds that must pass before the same user can trigger the command again.
###### Default
```
60
```
#### warnLockedOnly
###### Description
Whether to warn locked squads only or both locked and unlocked squads.
###### Default
```
true
```

### Example configuration
```json
{
    "plugin": "LookingForSquad",
    "enabled": true,
    "commands": ["!lfs", "!look", "!invite"],
    "rateLimit": 15,
    "warnLockedOnly": false
}
```
