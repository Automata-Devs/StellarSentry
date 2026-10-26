/**
 * StarboardEntry model - Starboard messages
 */
import mongoose from 'mongoose';

const starboardEntrySchema = new mongoose.Schema({
  // Discord IDs
  guildId: {
    type: String,
    required: true,
    index: true,
  },
  channelId: {
    type: String,
    required: true,
    index: true,
  },
  messageId: {
    type: String,
    required: true,
    index: true,
  },
  starboardMessageId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  authorId: {
    type: String,
    required: true,
    index: true,
  },

  // Star info
  starCount: {
    type: Number,
    default: 0,
  },
  starredBy: [{
    userId: { type: String },
    starredAt: { type: Date, default: Date.now },
  }],

  // Original message content
  content: {
    type: String,
    maxlength: 4000,
    default: '',
  },
  embeds: [{
    type: mongoose.Schema.Types.Mixed,
  }],
  attachments: [{
    url: { type: String },
    proxyUrl: { type: String },
    name: { type: String },
    contentType: { type: String },
    size: { type: Number },
  }],

  // Status
  locked: {
    type: Boolean,
    default: false,
  },
  deleted: {
    type: Boolean,
    default: false,
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
  lastStarAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  collection: 'starboard_entries',
});

// Compound indexes
starboardEntrySchema.index({ guildId: 1, messageId: 1 }, { unique: true });
starboardEntrySchema.index({ guildId: 1, starCount: -1, createdAt: -1 });
starboardEntrySchema.index({ authorId: 1, guildId: 1, createdAt: -1 });

// Static methods
starboardEntrySchema.statics.getTopStarred = function(guildId, limit = 10) {
  return this.find({ guildId, deleted: false })
    .sort({ starCount: -1, createdAt: -1 })
    .limit(limit);
};

starboardEntrySchema.statics.getRecent = function(guildId, limit = 20) {
  return this.find({ guildId, deleted: false })
    .sort({ lastStarAt: -1 })
    .limit(limit);
};

starboardEntrySchema.statics.getUserStarred = function(guildId, userId, limit = 10) {
  return this.find({ guildId, authorId: userId, deleted: false })
    .sort({ starCount: -1 })
    .limit(limit);
};

// Methods
starboardEntrySchema.methods.addStar = function(userId) {
  if (!this.starredBy.some(s => s.userId === userId)) {
    this.starredBy.push({ userId });
    this.starCount = this.starredBy.length;
    this.lastStarAt = new Date();
  }
  return this.save();
};

starboardEntrySchema.methods.removeStar = function(userId) {
  this.starredBy = this.starredBy.filter(s => s.userId !== userId);
  this.starCount = this.starredBy.length;
  return this.save();
};

starboardEntrySchema.methods.hasStarred = function(userId) {
  return this.starredBy.some(s => s.userId === userId);
};

starboardEntrySchema.methods.lock = function() {
  this.locked = true;
  return this.save();
};

starboardEntrySchema.methods.unlock = function() {
  this.locked = false;
  return this.save();
};

starboardEntrySchema.methods.markDeleted = function() {
  this.deleted = true;
  return this.save();
};

export const StarboardEntry = mongoose.model('StarboardEntry', starboardEntrySchema);
export default StarboardEntry;