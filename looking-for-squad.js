import BasePlugin from './base-plugin.js';

export default class LookingForSquad extends BasePlugin {
    static get description() {
        return "The <code>LookingForSquad</code> plugin can be used to warn squad leaders of the same team that a player is looking for a squad.";
    }

    static get defaultEnabled() {
        return false;
    }

    static get optionsSpecification() {
        return {
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
            }
        };
    }

    constructor(server, options, connectors) {
        super(server, options, connectors);

        this.onChatMessage = this.onChatMessage.bind(this);
        this.warn = (steamid, msg) => this.server.rcon.warn(steamid, msg);
        this.lastUsed = new Map(); // Store last used time for rate limiting
    }

    async mount() {
        this.verbose(1, 'Mounted.');
        this.server.on("CHAT_MESSAGE", this.onChatMessage);
    }

    async unmount() {
        this.server.removeEventListener("CHAT_MESSAGE", this.onChatMessage);
    }

    async handleInvCommand(event, squadId) {
        const { steamID } = event;

        // Rate limit check
        if (this.shouldRateLimit(steamID)) {
            this.warn(steamID, `You must wait ${this.options.rateLimit} seconds before using the command again.`);
            return;
        }

        try {
            const player = await this.getPlayer(steamID);
            if (!player || player.squadID !== null) {
                this.warn(steamID, 'You must not be in a squad to use this command.');
                return; 
            }

            const relevantSquad = await this.findRelevantSquad(player.teamID, squadId);

            if (relevantSquad) {
                await this.notifySquadLeader(relevantSquad, player);
                this.warn(steamID, `Your request has been sent to the squad leader of squad ${squadId}.`);
            } else {
                this.warn(steamID, `Squad ${squadId} could not be found or is not on your team.`);
            }
        } catch (error) {
            console.error('Error handling invite command:', error);
            this.warn(steamID, 'An error occurred. Please try again later.');
        }
    }

    async handleInvCommandWithoutSquadId(event) {
        const { steamID } = event;

        // Rate limit check
        if (this.shouldRateLimit(steamID)) {
            this.warn(steamID, `You must wait ${this.options.rateLimit} seconds before using the command again.`);
            return;
        }

        try {
            const player = await this.getPlayer(steamID);
            if (!player || player.squadID !== null) {
                this.warn(steamID, 'You must not be in a squad to use this command.');
                return; 
            }

            const relevantSquads = await this.findRelevantSquads(player.teamID);

            if (relevantSquads.length > 0) {
                for (const squad of relevantSquads) {
                    await this.notifySquadLeader(squad, player);
                }

                this.warn(steamID, `Your request has been sent to the squad leaders of your team.`);

            } else {
                const message = this.options.warnLockedOnly 
                    ? 'There are no locked squad leaders in your team.'
                    : 'There are no squad leaders in your team.';
                this.warn(steamID, message); 
            }
        } catch (error) {
            console.error('Error handling command without squad ID:', error);
            this.warn(steamID, 'An error occurred. Please try again later.');
        }
    }

    async onChatMessage(event) {
        const messageParts = event.message.toLowerCase().split(' ');
        const command = messageParts[0];
        const squadIdString = messageParts[1]; 

        if (this.options.commands.includes(command)) {
            if (squadIdString) {
                const squadId = parseInt(squadIdString, 10);
                if (!isNaN(squadId)) {
                    await this.handleInvCommand(event, squadId);
                } else {
                    this.warn(event.steamID, 'Invalid squad ID. Usage: !inv <squad number>');
                }
            } else {
                await this.handleInvCommandWithoutSquadId(event);
            }
        } 
    }

    shouldRateLimit(steamID) {
        const now = Date.now();
        const lastUsed = this.lastUsed.get(steamID) || 0;
        const timeSinceLastUsed = now - lastUsed; 
        const shouldLimit = timeSinceLastUsed < this.options.rateLimit * 1000;

        if (!shouldLimit) {
            this.lastUsed.set(steamID, now); // Update last used time
        }

        return shouldLimit;
    }

    async getPlayer(steamID) {
        const players = await this.server.rcon.getListPlayers();
        return players.find(p => p.steamID === steamID);
    }

    async findRelevantSquad(teamId, squadId) {
        const squads = await this.server.rcon.getSquads();
        return squads.find(s => s.squadID === squadId && s.teamID === teamId && (!this.options.warnLockedOnly || s.locked === 'True'));
    }

    async findRelevantSquads(teamId) {
        const squads = await this.server.rcon.getSquads();
        return squads.filter(s => s.teamID === teamId && (!this.options.warnLockedOnly || s.locked === 'True'));
    }

    async notifySquadLeader(squad, player) {
        const squadLeader = await this.getPlayer(squad.creatorSteamID);
        if (squadLeader) {
            const message = `${player.name} is looking for a squad. Please consider inviting the player.`;
            this.warn(squadLeader.steamID, message);
        } else {
            this.warn(player.steamID, `Squad ${squad.id} has no leader.`)
        }
    }
} 
