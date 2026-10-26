/**
 * AuditLog model - Comprehensive logging of server events
 */
import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // Discord IDs
  guildId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    index: true,
    default: null,
  },
  targetId: {
    type: String,
    index: true,
    default: null,
  },
  moderatorId: {
    type: String,
    index: true,
    default: null,
  },
  channelId: {
    type: String,
    index: true,
    default: null,
  },

  // Event info
  eventType: {
    type: String,
    required: true,
    index: true,
    enum: [
      // Message events
      'messageCreate', 'messageUpdate', 'messageDelete', 'messageDeleteBulk',
      // Member events
      'memberJoin', 'memberLeave', 'memberUpdate', 'memberBan', 'memberUnban',
      // Role events
      'roleCreate', 'roleUpdate', 'roleDelete',
      // Channel events
      'channelCreate', 'channelUpdate', 'channelDelete',
      // Emoji/Sticker events
      'emojiCreate', 'emojiUpdate', 'emojiDelete',
      'stickerCreate', 'stickerUpdate', 'stickerDelete',
      // Invite events
      'inviteCreate', 'inviteDelete',
      // Voice events
      'voiceJoin', 'voiceLeave', 'voiceMove', 'voiceMute', 'voiceDeafen',
      'voiceStream', 'voiceVideo', 'voiceDisconnect',
      // Thread events
      'threadCreate', 'threadUpdate', 'threadDelete', 'threadJoin', 'threadLeave',
      // Moderation events
      'warn', 'timeout', 'ban', 'kick', 'unban', 'purge', 'lock', 'unlock',
      // Ticket events
      'ticketCreate', 'ticketClose', 'ticketReopen', 'ticketClaim',
      // Giveaway events
      'giveawayCreate', 'giveawayEnd', 'giveawayReroll',
      // Suggestion events
      'suggestionCreate', 'suggestionApprove', 'suggestionDeny', 'suggestionConsider', 'suggestionImplement',
      // Starboard events
      'starboardAdd', 'starboardRemove',
      // Reaction role events
      'reactionRoleAdd', 'reactionRoleRemove',
      // Welcome/Leave
      'welcomeSend', 'leaveSend',
      // Leveling
      'levelUp', 'roleReward',
      // Economy
      'dailyClaim', 'work', 'pay', 'buy', 'shopUpdate',
      // Settings changes
      'settingsUpdate', 'featureToggle', 'commandToggle',
      // Other
      'botAdd', 'botRemove', 'integrationCreate', 'integrationUpdate', 'integrationDelete',
      'webhookCreate', 'webhookUpdate', 'webhookDelete',
      'guildUpdate',
    ],
  },
  eventCategory: {
    type: String,
    required: true,
    index: true,
    enum: [
      'message', 'member', 'role', 'channel', 'emoji', 'invite',
      'voice', 'thread', 'moderation', 'ticket', 'giveaway',
      'suggestion', 'starboard', 'reactionRole', 'welcome',
      'leveling', 'economy', 'settings', 'guild', 'other',
    ],
  },

  // Event data (flexible)
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Changes (for update events)
  changes: [{
    field: { type: String, required: true },
    old: { type: mongoose.Schema.Types.Mixed },
    new: { type: mongoose.Schema.Types.Mixed },
  }],

  // Reason (for moderation actions)
  reason: {
    type: String,
    maxlength: 1000,
    default: null,
  },

  // Case number (for moderation)
  caseNumber: {
    type: Number,
    default: null,
  },

  // Severity
  severity: {
    type: String,
    enum: ['info', 'low', 'medium', 'high', 'critical'],
    default: 'info',
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false, // We use createdAt manually
  collection: 'audit_logs',
});

// Compound indexes
auditLogSchema.index({ guildId: 1, eventType: 1, createdAt: -1 });
auditLogSchema.index({ guildId: 1, eventCategory: 1, createdAt: -1 });
auditLogSchema.index({ guildId: 1, userId: 1, createdAt: -1 });
auditLogSchema.index({ guildId: 1, moderatorId: 1, createdAt: -1 });
auditLogSchema.index({ guildId: 1, channelId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days TTL

// Static methods
auditLogSchema.statics.log = function(data) {
  return this.create(data);
};

auditLogSchema.statics.getLogs = function(guildId, options = {}) {
  const {
    eventType,
    eventCategory,
    userId,
    moderatorId,
    channelId,
    startDate,
    endDate,
    limit = 50,
    skip = 0,
    sort = -1,
  } = options;

  const query = { guildId };

  if (eventType) query.eventType = eventType;
  if (eventCategory) query.eventCategory = eventCategory;
  if (userId) query.userId = userId;
  if (moderatorId) query.moderatorId = moderatorId;
  if (channelId) query.channelId = channelId;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  return this.find(query)
    .sort({ createdAt: sort })
    .skip(skip)
    .limit(limit)
    .lean();
};

auditLogSchema.statics.getLogsCount = function(guildId, options = {}) {
  const {
    eventType,
    eventCategory,
    userId,
    moderatorId,
    channelId,
    startDate,
    endDate,
  } = options;

  const query = { guildId };

  if (eventType) query.eventType = eventType;
  if (eventCategory) query.eventCategory = eventCategory;
  if (userId) query.userId = userId;
  if (moderatorId) query.moderatorId = moderatorId;
  if (channelId) query.channelId = channelId;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  return this.countDocuments(query);
};

auditLogSchema.statics.getStats = async function(guildId, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    { $match: { guildId, createdAt: { $gte: startDate } } },
    { $group: {
      _id: '$eventCategory',
      count: { $sum: 1 },
    }},
    { $sort: { count: -1 } },
  ]);

  return stats;
};

auditLogSchema.statics.getModerationStats = async function(guildId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    { $match: {
      guildId,
      eventCategory: 'moderation',
      createdAt: { $gte: startDate },
    }},
    { $group: {
      _id: '$eventType',
      count: { $sum: 1 },
    }},
    { $sort: { count: -1 } },
  ]);

  return stats;
};

auditLogSchema.statics.getTopModerators = async function(guildId, days = 30, limit = 10) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    { $match: {
      guildId,
      eventCategory: 'moderation',
      moderatorId: { $ne: null },
      createdAt: { $gte: startDate },
    }},
    { $group: {
      _id: '$moderatorId',
      count: { $sum: 1 },
      actions: { $push: '$eventType' },
    }},
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  return stats;
};

auditLogSchema.statics.cleanupOldLogs = function(guildId, days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.deleteMany({ guildId, createdAt: { $lt: cutoff } });
};

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;