/**
 * Warning model - Standalone warning records for detailed tracking
 */
import mongoose from 'mongoose';

const warningSchema = new mongoose.Schema({
  // Discord IDs
  guildId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  moderatorId: {
    type: String,
    required: true,
    index: true,
  },

  // Warning details
  caseNumber: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
  },

  // Evidence
  evidence: {
    messageId: { type: String, default: null },
    channelId: { type: String, default: null },
    attachments: [{ type: String }],
    logs: [{ type: String }],
  },

  // Status
  active: {
    type: Boolean,
    default: true,
  },
  dmSent: {
    type: Boolean,
    default: false,
  },
  dmError: {
    type: String,
    default: null,
  },

  // Expiration
  expiresAt: {
    type: Date,
    default: null,
    index: { expireAfterSeconds: 0 }, // TTL index
  },

  // Appeal
  appealed: {
    type: Boolean,
    default: false,
  },
  appealReason: {
    type: String,
    default: null,
  },
  appealDecision: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending',
  },
  appealModeratorId: {
    type: String,
    default: null,
  },
  appealAt: {
    type: Date,
    default: null,
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  collection: 'warnings',
});

// Compound indexes
warningSchema.index({ guildId: 1, userId: 1, active: 1 });
warningSchema.index({ guildId: 1, caseNumber: 1 }, { unique: true });
warningSchema.index({ guildId: 1, createdAt: -1 });
warningSchema.index({ moderatorId: 1, createdAt: -1 });
warningSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static methods
warningSchema.statics.getNextCaseNumber = async function(guildId) {
  const lastWarning = await this.findOne({ guildId })
    .sort({ caseNumber: -1 })
    .select('caseNumber')
    .lean();
  return (lastWarning?.caseNumber || 0) + 1;
};

warningSchema.statics.getActiveWarnings = function(guildId, userId) {
  return this.find({
    guildId,
    userId,
    active: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  }).sort({ createdAt: -1 });
};

warningSchema.statics.getWarningStats = async function(guildId, userId) {
  const stats = await this.aggregate([
    { $match: { guildId, userId } },
    { $group: {
      _id: '$active',
      count: { $sum: 1 },
      severity: { $push: '$severity' },
    }},
  ]);

  const result = { total: 0, active: 0, expired: 0, bySeverity: {} };
  for (const stat of stats) {
    if (stat._id) result.active = stat.count;
    else result.expired = stat.count;
    result.total += stat.count;
    for (const sev of stat.severity) {
      result.bySeverity[sev] = (result.bySeverity[sev] || 0) + 1;
    }
  }
  return result;
};

export const Warning = mongoose.model('Warning', warningSchema);
export default Warning;