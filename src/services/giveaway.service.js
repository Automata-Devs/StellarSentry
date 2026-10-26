/**
 * Giveaway Service - Business logic for giveaway management
 * Handles creation, ending, rerolling, and scheduling of giveaways
 */
import { giveawayRepository } from '../database/repositories/GiveawayRepository.js';
import { guildRepository } from '../database/repositories/GuildRepository.js';
import { AuditLog } from '../database/models/AuditLog.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { logger } from '../utils/logger.js';
import { randomInt } from '../utils/helpers.js';

class GiveawayService {
  /**
   * Initialize the giveaway service
   * @param {Client} client - Discord.js client
   */
  async initialize(client) {
    this.client = client;

    // Load active giveaways on startup
    await this.loadActiveGiveaways();

    // Load scheduled giveaways
    await this.loadScheduledGiveaways();

    logger.info('Giveaway service initialized');
  }

  /**
   * Load active giveaways and schedule their end
   */
  async loadActiveGiveaways() {
    const giveaways = await giveawayRepository.getActive();

    for (const giveaway of giveaways) {
      this.scheduleGiveawayEnd(giveaway);
    }

    logger.info({ count: giveaways.length }, 'Loaded active giveaways');
  }

  /**
   * Load scheduled giveaways and schedule their start
   */
  async loadScheduledGiveaways() {
    const giveaways = await giveawayRepository.getScheduled();

    for (const giveaway of giveaways) {
      this.scheduleGiveawayStart(giveaway);
    }

    logger.info({ count: giveaways.length }, 'Loaded scheduled giveaways');
  }

  /**
   * Create a new giveaway
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const guild = await guildRepository.getByGuildId(data.guildId);
    const giveawaySettings = guild?.giveaways || {};

    const giveaway = await giveawayRepository.create({
      ...data,
      status: data.startsAt && data.startsAt > new Date() ? 'scheduled' : 'active',
      entries: [],
      entryCount: 0,
      blacklistedRoles: giveawaySettings.blacklistedRoles || [],
    });

    if (giveaway.status === 'scheduled') {
      this.scheduleGiveawayStart(giveaway);
    } else {
      this.scheduleGiveawayEnd(giveaway);
    }

    return giveaway;
  }

  /**
   * Schedule giveaway start
   * @param {Object} giveaway
   */
  scheduleGiveawayStart(giveaway) {
    const delay = giveaway.startsAt.getTime() - Date.now();
    if (delay <= 0) {
      this.startGiveaway(giveaway);
      return;
    }

    setTimeout(async () => {
      await this.startGiveaway(giveaway);
    }, delay);
  }

  /**
   * Start a giveaway
   * @param {Object} giveaway
   */
  async startGiveaway(giveaway) {
    try {
      await giveawayRepository.start(giveaway.messageId);

      // Fetch message and enable buttons
      const channel = await this.client.channels.fetch(giveaway.channelId);
      const message = await channel.messages.fetch(giveaway.messageId);

      // Update message components (enable enter button)
      const components = message.components.map(row => ({
        ...row,
        components: row.components.map(comp => ({
          ...comp,
          disabled: false,
        })),
      }));

      await message.edit({ components });

      logger.info({ giveawayId: giveaway._id }, 'Giveaway started');
    } catch (error) {
      logger.error({ err: error, giveawayId: giveaway._id }, 'Failed to start giveaway');
    }
  }

  /**
   * Schedule giveaway end
   * @param {Object} giveaway
   */
  scheduleGiveawayEnd(giveaway) {
    const delay = giveaway.endsAt.getTime() - Date.now();
    if (delay <= 0) {
      this.endGiveaway(giveaway.messageId);
      return;
    }

    setTimeout(async () => {
      await this.endGiveaway(giveaway.messageId);
    }, delay);
  }

  /**
   * End a giveaway and pick winners
   * @param {string} messageId
   */
  async endGiveaway(messageId) {
    try {
      const giveaway = await giveawayRepository.getByMessageId(messageId);
      if (!giveaway || giveaway.status !== 'active') return;

      const channel = await this.client.channels.fetch(giveaway.channelId);
      const message = await channel.messages.fetch(messageId);

      const entries = giveaway.entries || [];

      let winners = [];
      if (entries.length > 0) {
        const shuffled = [...entries].sort(() => Math.random() - 0.5);
        winners = shuffled.slice(0, giveaway.winners).map(e => e.userId);
      }

      await giveawayRepository.end(messageId, winners);

      // Update message
      const winnerMentions = winners.length > 0
        ? winners.map(w => `<@${w}>`).join(', ')
        : 'No valid entries';

      const embed = message.embeds[0];
      const newEmbed = {
        ...embed,
        title: `🎉 ${giveaway.prize} (ENDED)`,
        color: 0x3BA55C,
        description: `**Winner(s):** ${winnerMentions}\n**Entries:** ${giveaway.entryCount}\nCongratulations!`,
        timestamp: new Date(),
      };

      await message.edit({ embeds: [newEmbed], components: [] });

      // DM winners
      for (const winnerId of winners) {
        try {
          const user = await this.client.users.fetch(winnerId);
          await user.send({
            embeds: [{
              title: '🎉 You Won!',
              description: `You won **${giveaway.prize}** in **${channel.guild.name}**!\nContact the host to claim your prize.`,
              color: 0x3BA55C,
              timestamp: new Date(),
            }],
          });
        } catch (e) {
          // Ignore DM failures
        }
      }

      logger.info({ giveawayId: giveaway._id, winners }, 'Giveaway ended');
    } catch (error) {
      logger.error({ err: error, messageId }, 'Failed to end giveaway');
    }
  }

  /**
   * Check and end due giveaways
   * @param {Client} client
   */
  async checkGiveaways(client) {
    this.client = client;

    try {
      const endingGiveaways = await this.giveawayRepository.getEndingNow();

      for (const giveaway of endingGiveaways) {
        try {
          await this.endGiveaway(giveaway.messageId);
        } catch (error) {
          logger.error({ err: error, giveawayId: giveaway._id }, 'Failed to end giveaway');
        }
      }

      // Also check for scheduled giveaways that should start
      const startingGiveaways = await this.giveawayRepository.getStartingNow();
      for (const giveaway of startingGiveaways) {
        try {
          await this.startGiveaway(giveaway);
        } catch (error) {
          logger.error({ err: error, giveawayId: giveaway._id }, 'Failed to start giveaway');
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Giveaway check error');
    }
  }

  // Delegate to repository
  get giveawayRepository() {
    return giveawayRepository;
  }
}

export const giveawayService = new GiveawayService();
export default giveawayService;