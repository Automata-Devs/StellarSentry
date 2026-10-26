/**
 * Extended Discord.js Client with cache limits and sweepers
 * Optimized for memory efficiency on Bot-Hosting.net
 */
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { env } from '../config/env.js';
import { LIMITS, CACHE_TTL } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import { eventBus } from './eventBus.js';

/**
 * Custom client class extending discord.js Client
 */
export class StellarSentryClient extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
      ],
      partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.GuildScheduledEvent,
        Partials.Message,
        Partials.Reaction,
        Partials.ThreadMember,
        Partials.User,
      ],
      // Cache settings for memory efficiency
      makeCache: {
        // Don't cache everything - only what we need
        GuildMember: (member) => member.guild.memberCount < 1000, // Only cache members in small guilds
        Message: (msg) => msg.guild && msg.guild.id === env.DISCORD_DEV_GUILD_ID, // Only cache in dev guild
        Reaction: (reaction) => reaction.message.guild && reaction.message.guild.id === env.DISCORD_DEV_GUILD_ID,
        Presence: () => false, // Don't cache presences
        VoiceState: (state) => state.guild && state.guild.id === env.DISCORD_DEV_GUILD_ID,
        ThreadMember: () => false,
        StageInstance: () => false,
        GuildScheduledEvent: () => false,
        AutoModerationRule: () => false,
      },
      sweepers: {
        // Aggressive sweeping to keep memory low
        messages: {
          interval: 600, // 10 minutes
          lifetime: 3600, // 1 hour
          filter: (msg) => !msg.pinned && msg.guild?.memberCount > 500,
        },
        guildMembers: {
          interval: 300, // 5 minutes
          lifetime: 1800, // 30 minutes
          filter: (member) => member.guild.memberCount > 1000,
        },
        reactions: {
          interval: 300,
          lifetime: 1800,
          filter: (reaction) => reaction.message.guild?.memberCount > 500,
        },
        presences: {
          interval: 60,
          lifetime: 300,
        },
        voiceStates: {
          interval: 300,
          lifetime: 1800,
          filter: (state) => state.guild?.memberCount > 500,
        },
        threads: {
          interval: 600,
          lifetime: 3600,
        },
      },
      // Rest settings
      rest: {
        timeout: 30000,
        retries: 3,
      },
      // Fail on missing permissions
      failIfNotExists: false,
    });

    // Custom properties
    this.commands = new Collection();
    this.cooldowns = new Collection();
    this.buttons = new Collection();
    this.selectMenus = new Collection();
    this.modals = new Collection();
    this.contextMenus = new Collection();
    this.autocompleteHandlers = new Collection();

    // Services (initialized later)
    this.services = {};
    this.repositories = {};

    // State
    this.startTime = Date.now();
    this.isShuttingDown = false;
  }

  /**
   * Register a command
   * @param {Object} command
   */
  registerCommand(command) {
    if (!command.data || !command.execute) {
      logger.warn({ command: command.data?.name }, 'Invalid command structure');
      return;
    }
    this.commands.set(command.data.name, command);
    logger.debug({ command: command.data.name }, 'Command registered');
  }

  /**
   * Register a button handler
   * @param {string} customId
   * @param {Function} handler
   */
  registerButton(customId, handler) {
    this.buttons.set(customId, handler);
  }

  /**
   * Register a select menu handler
   * @param {string} customId
   * @param {Function} handler
   */
  registerSelectMenu(customId, handler) {
    this.selectMenus.set(customId, handler);
  }

  /**
   * Register a modal handler
   * @param {string} customId
   * @param {Function} handler
   */
  registerModal(customId, handler) {
    this.modals.set(customId, handler);
  }

  /**
   * Register a context menu
   * @param {Object} contextMenu
   */
  registerContextMenu(contextMenu) {
    if (!contextMenu.data || !contextMenu.execute) {
      logger.warn({ contextMenu: contextMenu.data?.name }, 'Invalid context menu structure');
      return;
    }
    this.contextMenus.set(contextMenu.data.name, contextMenu);
  }

  /**
   * Register autocomplete handler
   * @param {string} commandName
   * @param {Function} handler
   */
  registerAutocomplete(commandName, handler) {
    this.autocompleteHandlers.set(commandName, handler);
  }

  /**
   * Get uptime in milliseconds
   * @returns {number}
   */
  getUptime() {
    return Date.now() - this.startTime;
  }

  /**
   * Get formatted uptime
   * @returns {string}
   */
  getFormattedUptime() {
    const ms = this.getUptime();
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getCacheStats() {
    return {
      guilds: this.guilds.cache.size,
      users: this.users.cache.size,
      channels: this.channels.cache.size,
      messages: this.guilds.cache.reduce((acc, g) => acc + (g.messages?.cache?.size || 0), 0),
      members: this.guilds.cache.reduce((acc, g) => acc + (g.members?.cache?.size || 0), 0),
      presences: this.guilds.cache.reduce((acc, g) => acc + (g.presences?.cache?.size || 0), 0),
      voiceStates: this.guilds.cache.reduce((acc, g) => acc + (g.voiceStates?.cache?.size || 0), 0),
      commands: this.commands.size,
      buttons: this.buttons.size,
      selectMenus: this.selectMenus.size,
      modals: this.modals.size,
      contextMenus: this.contextMenus.size,
    };
  }

  /**
   * Sweep caches manually
   */
  sweepCaches() {
    for (const guild of this.guilds.cache.values()) {
      guild.messages?.sweep?.();
      guild.members?.sweep?.();
      guild.presences?.sweep?.();
      guild.voiceStates?.sweep?.();
      guild.threads?.sweep?.();
    }
    logger.info('Manual cache sweep completed');
  }

  /**
   * Get guild or fetch if not cached
   * @param {string} guildId
   * @returns {Promise<Guild|null>}
   */
  async getGuild(guildId) {
    let guild = this.guilds.cache.get(guildId);
    if (!guild) {
      try {
        guild = await this.guilds.fetch(guildId);
      } catch (error) {
        logger.warn({ guildId, err: error }, 'Failed to fetch guild');
        return null;
      }
    }
    return guild;
  }

  /**
   * Get member or fetch if not cached
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<GuildMember|null>}
   */
  async getMember(guildId, userId) {
    const guild = await this.getGuild(guildId);
    if (!guild) return null;

    let member = guild.members.cache.get(userId);
    if (!member) {
      try {
        member = await guild.members.fetch(userId);
      } catch (error) {
        logger.debug({ guildId, userId, err: error }, 'Member not found');
        return null;
      }
    }
    return member;
  }

  /**
   * Get channel or fetch if not cached
   * @param {string} channelId
   * @returns {Promise<Channel|null>}
   */
  async getChannel(channelId) {
    let channel = this.channels.cache.get(channelId);
    if (!channel) {
      try {
        channel = await this.channels.fetch(channelId);
      } catch (error) {
        logger.debug({ channelId, err: error }, 'Channel not found');
        return null;
      }
    }
    return channel;
  }
}

// Export singleton instance
export const client = new StellarSentryClient();
export default client;