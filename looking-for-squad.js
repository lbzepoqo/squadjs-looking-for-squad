import DiscordBasePlugin from './discord-base-plugin.js';

export default class LookingForSquad extends DiscordBasePlugin {
    static get description() {
        return "The <code>LookingForSquad</code> plugin can be used to warn squad leaders of the same team that a player is looking for a squad.";
    }

    static get defaultEnabled() {
        return false;
    }

    // Define the options for the plugin
    static get optionsSpecification() {
        return {
            ...DiscordBasePlugin.optionsSpecification,
            commands: {
                required: false,
                description: "Command to trigger the plugin.",
                default: ["!lfs"]
            },
            rateLimit: {
                required: false,
                description: "Number of seconds that must pass before the same user can trigger the command again.",
                default: 60
            },
            warnLockedOnly: {
                required: false,
                description: "Whether to warn locked squads only or both locked and unlocked squads.",
                default: true
            },
            logToDiscord: {
                required: false,
                description: "Whether to log the warnings to Discord.",
                default: false
            }
        };
    }
    
    constructor(server, options, connectors) {
        super(server, options, connectors);

        this.onChatMessage = this.onChatMessage.bind(this);

        // Define a warn function
        this.warn = (steamid, msg) => { this.server.rcon.warn(steamid, msg) };

        // Create a map to store the last used time for each user
        this.lastUsed = new Map();
    }
    
    async mount() {
        this.verbose(1, 'Mounted.');
        this.server.on("CHAT_MESSAGE", this.onChatMessage);
    }
    
    async unmount() {
        this.server.removeEventListener("CHAT_MESSAGE", this.onChatMessage);
    }
    
    async onChatMessage(event) {
        if (this.options.commands.includes(event.message.toLowerCase())) {
            const { steamID } = event;
            const players = await this.server.rcon.getListPlayers();
            const player = players.find(p => p.steamID === steamID);
            const now = Date.now();
            const lastUsed = this.lastUsed.get(steamID) || 0;

            // Check if the command was used by the same user within the rate limit
            if (now - lastUsed < this.options.rateLimit * 1000) {
                this.warn(steamID, `You must wait ${this.options.rateLimit} seconds before using the command again.`);
                return;
            }
            // Update the last used time for the user
            this.lastUsed.set(steamID, now);
    
            if (player && player.squadID === null) {
                const squads = await this.server.rcon.getSquads();
                const relevantSquads = squads.filter(s => s.teamID === player.teamID && (!this.options.warnLockedOnly || s.locked === 'True'));
                const squadLeaders = players.filter(p => p.isLeader && relevantSquads.some(s => s.creatorSteamID === p.steamID));

                this.verbose(2, 'Squads', squads);
                this.verbose(2, 'Relevant squads', relevantSquads);
                this.verbose(2, 'Squad Leaders', squadLeaders);

                if (squadLeaders.length > 0) {
                    const message = `${player.name} is looking for a squad. Please consider inviting the player.`;
                    squadLeaders.forEach(squadLeader => {
                        this.warn(squadLeader.steamID, message);
                    });

                    this.warn(steamID, `Your request has been sent to the squad leaders of your team.`);

                    if (this.options.logToDiscord) {
                        await this.sendDiscordMessage({
                            embed: {
                                title: `Player ${player.name} is looking for a squad`,
                                color: 16761867,
                                fields: [
                                    {
                                        name: 'Team ID',
                                        value: player.teamID
                                    },
                                    {
                                        name: 'Squad Leaders',
                                        value: squadLeaders.map(squadLeader => squadLeader.name).join('\n')
                                    }
                                ],
                                timestamp: (new Date()).toISOString()
                            }
                        });
                    }
                } else {
                    const message = this.options.warnLockedOnly 
                        ? `There are no locked squad leaders in your team.` 
                        : `There are no squad leaders in your team.`;
                    this.warn(steamID, message);
                }
            } else {
                this.warn(steamID, `You must not be in a squad to use this command.`);
            }
            this.verbose(1, `Player used the command: ${event.player?.name}`);
        }
    }
}
