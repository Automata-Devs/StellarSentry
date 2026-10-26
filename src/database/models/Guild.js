/**
 * Guild model - Stores per-guild configuration
 */
import mongoose from 'mongoose';

const guildSchema = new mongoose.Schema({
  // Discord guild ID
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // Basic settings
  prefix: {
    type: String,
    default: '!',
  },
  language: {
    type: String,
    default: 'en',
  },

  // Feature flags
  features: {
    automod: { type: Boolean, default: true },
    welcome: { type: Boolean, default: true },
    leveling: { type: Boolean, default: true },
    economy: { type: Boolean, default: true },
    tickets: { type: Boolean, default: true },
    reactionRoles: { type: Boolean, default: true },
    giveaways: { type: Boolean, default: true },
    suggestions: { type: Boolean, default: true },
    starboard: { type: Boolean, default: true },
    music: { type: Boolean, default: true },
    logging: { type: Boolean, default: true },
  },

  // Moderation settings
  moderation: {
    logChannel: { type: String, default: null },
    modRole: { type: String, default: null },
    muteRole: { type: String, default: null },
    dmOnAction: { type: Boolean, default: true },
    caseNumber: { type: Number, default: 0 },
  },

  // AutoMod settings
  automod: {
    enabled: { type: Boolean, default: false },
    antiSpam: {
      enabled: { type: Boolean, default: false },
      maxMessages: { type: Number, default: 5 },
      interval: { type: Number, default: 5000 },
      action: { type: String, enum: ['delete', 'warn', 'timeout'], default: 'delete' },
    },
    antiLinks: {
      enabled: { type: Boolean, default: false },
      action: { type: String, enum: ['delete', 'warn', 'timeout'], default: 'delete' },
      whitelist: [{ type: String }],
    },
    blacklistedWords: {
      enabled: { type: Boolean, default: false },
      words: [{ type: String }],
      action: { type: String, enum: ['delete', 'warn', 'timeout'], default: 'delete' },
    },
    massMentions: {
      enabled: { type: Boolean, default: false },
      maxMentions: { type: Number, default: 5 },
      action: { type: String, enum: ['delete', 'warn', 'timeout'], default: 'delete' },
    },
    capsLock: {
      enabled: { type: Boolean, default: false },
      minLength: { type: Number, default: 10 },
      maxPercent: { type: Number, default: 70 },
      action: { type: String, enum: ['delete', 'warn', 'timeout'], default: 'delete' },
    },
    whitelistedRoles: [{ type: String }],
    whitelistedChannels: [{ type: String }],
  },

  // Welcome/Leave settings
  welcome: {
    enabled: { type: Boolean, default: false },
    channel: { type: String, default: null },
    message: { type: String, default: 'Welcome {user} to {server}! We now have {memberCount} members.' },
    embed: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: 'Welcome!' },
      description: { type: String, default: 'Welcome {user} to {server}!' },
      color: { type: String, default: '#5865F2' },
      thumbnail: { type: String, default: '' },
      image: { type: String, default: '' },
      footer: { type: String, default: 'Member #{memberCount}' },
    },
    autoRoles: [{ type: String }],
  },

  leave: {
    enabled: { type: Boolean, default: false },
    channel: { type: String, default: null },
    message: { type: String, default: '{user} has left {server}. We now have {memberCount} members.' },
    embed: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: 'Goodbye!' },
      description: { type: String, default: '{user} has left {server}.' },
      color: { type: String, default: '#ED4245' },
    },
  },

  // Leveling settings
  leveling: {
    enabled: { type: Boolean, default: false },
    xpPerMessage: { type: Number, default: 15 },
    xpCooldown: { type: Number, default: 60 },
    multiplier: { type: Number, default: 1.0 },
    levelUpChannel: { type: String, default: null },
    levelUpMessage: { type: String, default: 'Congratulations {user}! You reached level {level}!' },
    roleRewards: [{
      level: { type: Number, required: true },
      role: { type: String, required: true },
    }],
    ignoredChannels: [{ type: String }],
    ignoredRoles: [{ type: String }],
  },

  // Economy settings
  economy: {
    enabled: { type: Boolean, default: false },
    startingBalance: { type: Number, default: 100 },
    dailyMin: { type: Number, default: 100 },
    dailyMax: { type: Number, default: 500 },
    workMin: { type: Number, default: 50 },
    workMax: { type: Number, default: 300 },
    dailyCooldown: { type: Number, default: 86400000 },
    workCooldown: { type: Number, default: 1800000 },
    transferEnabled: { type: Boolean, default: true },
    shop: [{
      name: { type: String, required: true },
      description: { type: String, default: '' },
      price: { type: Number, required: true, min: 1 },
      role: { type: String, default: null },
      stock: { type: Number, default: -1 },
      maxPerUser: { type: Number, default: 1 },
    }],
  },

  // Ticket settings
  tickets: {
    enabled: { type: Boolean, default: false },
    category: { type: String, default: null },
    supportRole: { type: String, default: null },
    logChannel: { type: String, default: null },
    panel: {
      channel: { type: String, default: null },
      messageId: { type: String, default: null },
      title: { type: String, default: 'Support Tickets' },
      description: { type: String, default: 'Click the button below to create a ticket.' },
      buttonLabel: { type: String, default: 'Create Ticket' },
      buttonStyle: { type: String, enum: ['Primary', 'Secondary', 'Success', 'Danger'], default: 'Primary' },
    },
    transcripts: {
      enabled: { type: Boolean, default: true },
      channel: { type: String, default: null },
    },
    limits: {
      maxPerUser: { type: Number, default: 3 },
      maxOpen: { type: Number, default: 50 },
    },
  },

  // Reaction roles settings
  reactionRoles: {
    enabled: { type: Boolean, default: false },
    panels: [{
      channel: { type: String, required: true },
      messageId: { type: String, required: true },
      title: { type: String, default: 'Reaction Roles' },
      description: { type: String, default: '' },
      roles: [{
        role: { type: String, required: true },
        emoji: { type: String, required: true },
        label: { type: String, default: '' },
        type: { type: String, enum: ['button', 'reaction'], default: 'button' },
        style: { type: String, enum: ['Primary', 'Secondary', 'Success', 'Danger'], default: 'Secondary' },
      }],
    }],
  },

  // Giveaway settings
  giveaways: {
    enabled: { type: Boolean, default: false },
    defaultDuration: { type: Number, default: 3600000 },
    defaultWinners: { type: Number, default: 1 },
    managerRole: { type: String, default: null },
    requirements: {
      requiredRole: { type: String, default: null },
      requiredLevel: { type: Number, default: 0 },
      accountAge: { type: Number, default: 0 },
      serverAge: { type: Number, default: 0 },
    },
    blacklistedRoles: [{ type: String }],
  },

  // Suggestion settings
  suggestions: {
    enabled: { type: Boolean, default: false },
    channel: { type: String, default: null },
    logChannel: { type: String, default: null },
    anonymous: { type: Boolean, default: false },
    approval: {
      required: { type: Boolean, default: false },
      roles: [{ type: String }],
    },
    voting: {
      enabled: { type: Boolean, default: true },
      upvoteEmoji: { type: String, default: '👍' },
      downvoteEmoji: { type: String, default: '👎' },
    },
    statuses: {
      pending: { type: String, default: 'Pending' },
      approved: { type: String, default: 'Approved' },
      denied: { type: String, default: 'Denied' },
      considered: { type: String, default: 'Under Consideration' },
      implemented: { type: String, default: 'Implemented' },
    },
  },

  // Starboard settings
  starboard: {
    enabled: { type: Boolean, default: false },
    channel: { type: String, default: null },
    emoji: { type: String, default: '⭐' },
    threshold: { type: Number, default: 5 },
    selfStar: { type: Boolean, default: false },
    ignoredChannels: [{ type: String }],
    nsfwOnly: { type: Boolean, default: false },
    requireImage: { type: Boolean, default: false },
    links: { type: Boolean, default: true },
  },

  // Music settings
  music: {
    enabled: { type: Boolean, default: false },
    djRole: { type: String, default: null },
    maxQueueSize: { type: Number, default: 100 },
    defaultVolume: { type: Number, default: 50 },
    autoLeave: { type: Boolean, default: true },
    idleTimeout: { type: Number, default: 5 },
    voteSkip: { type: Boolean, default: false },
    voteSkipPercent: { type: Number, default: 50 },
  },

  // Logging settings
  logging: {
    enabled: { type: Boolean, default: false },
    channels: {
      messageEdit: { type: String, default: null },
      messageDelete: { type: String, default: null },
      messageDeleteBulk: { type: String, default: null },
      memberJoin: { type: String, default: null },
      memberLeave: { type: String, default: null },
      memberUpdate: { type: String, default: null },
      memberBan: { type: String, default: null },
      memberUnban: { type: String, default: null },
      roleCreate: { type: String, default: null },
      roleUpdate: { type: String, default: null },
      roleDelete: { type: String, default: null },
      channelCreate: { type: String, default: null },
      channelUpdate: { type: String, default: null },
      channelDelete: { type: String, default: null },
      emojiCreate: { type: String, default: null },
      emojiUpdate: { type: String, default: null },
      emojiDelete: { type: String, default: null },
      inviteCreate: { type: String, default: null },
      inviteDelete: { type: String, default: null },
      voiceJoin: { type: String, default: null },
      voiceLeave: { type: String, default: null },
      voiceMove: { type: String, default: null },
      moderation: { type: String, default: null },
      starboard: { type: String, default: null },
      suggestions: { type: String, default: null },
      giveaways: { type: String, default: null },
      tickets: { type: String, default: null },
    },
    ignoredChannels: [{ type: String }],
    ignoredRoles: [{ type: String }],
    includeBots: { type: Boolean, default: false },
    retentionDays: { type: Number, default: 30 },
  },

  // Command settings
  commands: {
    disabledCommands: [{ type: String }],
    disabledCategories: [{ type: String }],
    commandCooldowns: mongoose.Schema.Types.Mixed,
  },

  // Metadata
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  leftAt: {
    type: Date,
    default: null,
  },
  ownerId: {
    type: String,
    default: null,
  },
  icon: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: null,
  },
  memberCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
  collection: 'guilds',
});

// Indexes
guildSchema.index({ guildId: 1 }, { unique: true });
guildSchema.index({ 'features.automod': 1 });
guildSchema.index({ 'features.welcome': 1 });
guildSchema.index({ 'features.leveling': 1 });
guildSchema.index({ 'features.economy': 1 });
guildSchema.index({ 'features.tickets': 1 });
guildSchema.index({ 'features.reactionRoles': 1 });
guildSchema.index({ 'features.giveaways': 1 });
guildSchema.index({ 'features.suggestions': 1 });
guildSchema.index({ 'features.starboard': 1 });
guildSchema.index({ 'features.music': 1 });
guildSchema.index({ 'features.logging': 1 });

// Virtual for getting a feature status
guildSchema.virtual('isFeatureEnabled').get(function() {
  return (feature) => this.features[feature] === true;
});

// Methods
guildSchema.methods.incrementCaseNumber = function() {
  this.moderation.caseNumber += 1;
  return this.moderation.caseNumber;
};

guildSchema.methods.toggleFeature = function(feature) {
  if (this.features.hasOwnProperty(feature)) {
    this.features[feature] = !this.features[feature];
    return this.features[feature];
  }
  return false;
};

export const Guild = mongoose.model('Guild', guildSchema);
export default Guild;