/**
 * Seed Script - Create development/test data
 * Run with: npm run seed
 */
import { connectDatabase } from '../src/database/connection.js';
import { Guild } from '../src/database/models/Guild.js';
import { Member } from '../src/database/models/Member.js';
import { ShopItem } from '../src/database/models/ShopItem.js';
import { logger } from '../src/utils/logger.js';
import { loadEnv } from '../src/config/env.js';
import { randomInt } from '../src/utils/helpers.js';

async function main() {
  try {
    loadEnv();
    await connectDatabase();

    logger.info('Starting database seed...');

    // Create test guild
    const testGuild = await Guild.findOneAndUpdate(
      { guildId: '123456789012345678' },
      {
        guildId: '123456789012345678',
        name: 'Test Server',
        icon: null,
        ownerId: '111111111111111111',
        memberCount: 100,
        features: {
          automod: true,
          welcome: true,
          leveling: true,
          economy: true,
          tickets: true,
          reactionRoles: true,
          giveaways: true,
          suggestions: true,
          starboard: true,
          music: true,
          logging: true,
        },
        moderation: {
          logChannel: null,
          modRole: null,
          muteRole: null,
          dmOnAction: true,
          caseNumber: 0,
        },
        automod: {
          enabled: false,
          antiSpam: { enabled: false, maxMessages: 5, interval: 5000, action: 'delete' },
          antiLinks: { enabled: false, action: 'delete', whitelist: [] },
          blacklistedWords: { enabled: false, words: [], action: 'delete' },
          massMentions: { enabled: false, maxMentions: 5, action: 'delete' },
          capsLock: { enabled: false, minLength: 10, maxPercent: 70, action: 'delete' },
          whitelistedRoles: [],
          whitelistedChannels: [],
        },
        welcome: {
          enabled: false,
          channel: null,
          message: 'Welcome {user} to {server}! We now have {memberCount} members.',
          embed: { enabled: false, title: 'Welcome!', description: 'Welcome {user} to {server}!', color: '#5865F2', thumbnail: '', image: '', footer: 'Member #{memberCount}' },
          autoRoles: [],
        },
        leave: {
          enabled: false,
          channel: null,
          message: '{user} has left {server}. We now have {memberCount} members.',
          embed: { enabled: false, title: 'Goodbye!', description: '{user} has left {server}.', color: '#ED4245' },
        },
        leveling: {
          enabled: false,
          xpPerMessage: 15,
          xpCooldown: 60,
          multiplier: 1.0,
          levelUpChannel: null,
          levelUpMessage: 'Congratulations {user}! You reached level {level}!',
          roleRewards: [],
          ignoredChannels: [],
          ignoredRoles: [],
        },
        economy: {
          enabled: false,
          startingBalance: 100,
          dailyMin: 100,
          dailyMax: 500,
          workMin: 50,
          workMax: 300,
          dailyCooldown: 86400000,
          workCooldown: 1800000,
          transferEnabled: true,
          shop: [],
        },
        tickets: {
          enabled: false,
          category: null,
          supportRole: null,
          logChannel: null,
          panel: { channel: null, messageId: null, title: 'Support Tickets', description: 'Click the button below to create a ticket.', buttonLabel: 'Create Ticket', buttonStyle: 'Primary' },
          transcripts: { enabled: true, channel: null },
          limits: { maxPerUser: 3, maxOpen: 50 },
        },
        reactionRoles: {
          enabled: false,
          panels: [],
        },
        giveaways: {
          enabled: false,
          defaultDuration: 3600000,
          defaultWinners: 1,
          managerRole: null,
          requirements: { requiredRole: null, requiredLevel: 0, accountAge: 0, serverAge: 0 },
          blacklistedRoles: [],
        },
        suggestions: {
          enabled: false,
          channel: null,
          logChannel: null,
          anonymous: false,
          approval: { required: false, roles: [] },
          voting: { enabled: true, upvoteEmoji: '👍', downvoteEmoji: '👎' },
          statuses: { pending: 'Pending', approved: 'Approved', denied: 'Denied', considered: 'Under Consideration', implemented: 'Implemented' },
        },
        starboard: {
          enabled: false,
          channel: null,
          emoji: '⭐',
          threshold: 5,
          selfStar: false,
          ignoredChannels: [],
          nsfwOnly: false,
          requireImage: false,
          links: true,
        },
        music: {
          enabled: false,
          djRole: null,
          maxQueueSize: 100,
          defaultVolume: 50,
          autoLeave: true,
          idleTimeout: 5,
          voteSkip: false,
          voteSkipPercent: 50,
        },
        logging: {
          enabled: false,
          channels: {},
          ignoredChannels: [],
          ignoredRoles: [],
          includeBots: false,
          retentionDays: 30,
        },
        commands: { disabledCommands: [], disabledCategories: [], commandCooldowns: {} },
        joinedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    logger.info({ guildId: testGuild.guildId }, 'Test guild created/updated');

    // Create test members
    for (let i = 1; i <= 10; i++) {
      const userId = `1111111111111111${i.toString().padStart(2, '0')}`;
      const level = randomInt(1, 50);
      const xp = randomInt(0, 10000);
      const balance = randomInt(0, 10000);

      await Member.findOneAndUpdate(
        { guildId: '123456789012345678', userId },
        {
          guildId: '123456789012345678',
          userId,
          leveling: {
            level,
            xp,
            totalXp: xp + (level * 100),
            lastXpGain: new Date(),
          },
          economy: {
            wallet: balance,
            bank: randomInt(0, 5000),
            netWorth: balance + randomInt(0, 5000),
            lastDaily: new Date(Date.now() - randomInt(0, 86400000)),
            lastWork: new Date(Date.now() - randomInt(0, 1800000)),
            dailyStreak: randomInt(1, 30),
          },
          inventory: [],
          warnings: [],
        },
        { upsert: true, new: true }
      );
    }

    logger.info('Test members created');

    // Create sample shop items
    const shopItems = [
      { name: 'VIP Role', description: 'Get a special VIP role', price: 5000, roleId: null, stock: -1, maxPerUser: 1 },
      { name: 'Custom Color Role', description: 'Get a role with a custom color', price: 10000, roleId: null, stock: -1, maxPerUser: 1 },
      { name: 'Server Booster', description: 'Boost the server for perks', price: 15000, roleId: null, stock: -1, maxPerUser: 1 },
      { name: 'Custom Emoji', description: 'Add a custom emoji to the server', price: 20000, roleId: null, stock: 5, maxPerUser: 1 },
    ];

    for (const item of shopItems) {
      await ShopItem.findOneAndUpdate(
        { guildId: '123456789012345678', name: item.name },
        { guildId: '123456789012345678', ...item, itemId: `item_${Date.now()}_${randomInt(1000, 9999)}` },
        { upsert: true, new: true }
      );
    }

    logger.info('Sample shop items created');

    logger.info('Database seed completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Seed failed');
    process.exit(1);
  }
}

main();