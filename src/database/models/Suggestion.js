/**
 * Suggestion model - Community suggestions
 */
import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema({
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
    unique: true,
    index: true,
  },
  authorId: {
    type: String,
    required: true,
    index: true,
  },

  // Suggestion content
  title: {
    type: String,
    required: true,
    maxlength: 256,
  },
  content: {
    type: String,
    required: true,
    maxlength: 4000,
  },
  anonymous: {
    type: Boolean,
    default: false,
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'considered', 'implemented', 'archived'],
    default: 'pending',
    index: true,
  },

  // Voting
  votes: {
    up: [{
      userId: { type: String },
      votedAt: { type: Date, default: Date.now },
    }],
    down: [{
      userId: { type: String },
      votedAt: { type: Date, default: Date.now },
    }],
    upCount: { type: Number, default: 0 },
    downCount: { type: Number, default: 0 },
  },

  // Staff review
  reviewedBy: {
    type: String,
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  reviewReason: {
    type: String,
    maxlength: 1000,
    default: null,
  },
  reviewNotes: {
    type: String,
    maxlength: 2000,
    default: null,
  },

  // Implementation
  implementedBy: {
    type: String,
    default: null,
  },
  implementedAt: {
    type: Date,
    default: null,
  },
  implementationNotes: {
    type: String,
    maxlength: 2000,
    default: null,
  },

  // Thread (for discussion)
  threadId: {
    type: String,
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
  collection: 'suggestions',
});

// Compound indexes
suggestionSchema.index({ guildId: 1, status: 1, createdAt: -1 });
suggestionSchema.index({ guildId: 1, authorId: 1, createdAt: -1 });
suggestionSchema.index({ messageId: 1 }, { unique: true });

// Virtual for net votes
suggestionSchema.virtual('netVotes').get(function() {
  return this.votes.upCount - this.votes.downCount;
});

suggestionSchema.virtual('totalVotes').get(function() {
  return this.votes.upCount + this.votes.downCount;
});

// Static methods
suggestionSchema.statics.getPending = function(guildId, limit = 50) {
  return this.find({ guildId, status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(limit);
};

suggestionSchema.statics.getByStatus = function(guildId, status, limit = 50) {
  return this.find({ guildId, status })
    .sort({ createdAt: -1 })
    .limit(limit);
};

suggestionSchema.statics.getUserSuggestions = function(guildId, userId) {
  return this.find({ guildId, authorId: userId })
    .sort({ createdAt: -1 });
};

suggestionSchema.statics.getStats = async function(guildId) {
  const stats = await this.aggregate([
    { $match: { guildId } },
    { $group: {
      _id: '$status',
      count: { $sum: 1 },
    }},
  ]);

  const result = { pending: 0, approved: 0, denied: 0, considered: 0, implemented: 0, archived: 0, total: 0 };
  for (const stat of stats) {
    result[stat._id] = stat.count;
    result.total += stat.count;
  }
  return result;
};

// Methods
suggestionSchema.methods.vote = function(userId, type) {
  const oppositeType = type === 'up' ? 'down' : 'up';

  // Remove from opposite vote
  this.votes[oppositeType] = this.votes[oppositeType].filter(v => v.userId !== userId);

  // Check if already voted
  const existingVote = this.votes[type].find(v => v.userId === userId);
  if (existingVote) {
    // Remove vote (toggle off)
    this.votes[type] = this.votes[type].filter(v => v.userId !== userId);
  } else {
    // Add vote
    this.votes[type].push({ userId });
  }

  this.votes.upCount = this.votes.up.length;
  this.votes.downCount = this.votes.down.length;

  return this.save();
};

suggestionSchema.methods.hasVoted = function(userId) {
  return {
    up: this.votes.up.some(v => v.userId === userId),
    down: this.votes.down.some(v => v.userId === userId),
  };
};

suggestionSchema.methods.approve = function(reviewedBy, reason, notes) {
  this.status = 'approved';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.reviewReason = reason;
  this.reviewNotes = notes;
  return this.save();
};

suggestionSchema.methods.deny = function(reviewedBy, reason, notes) {
  this.status = 'denied';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.reviewReason = reason;
  this.reviewNotes = notes;
  return this.save();
};

suggestionSchema.methods.consider = function(reviewedBy, reason, notes) {
  this.status = 'considered';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.reviewReason = reason;
  this.reviewNotes = notes;
  return this.save();
};

suggestionSchema.methods.implement = function(implementedBy, notes) {
  this.status = 'implemented';
  this.implementedBy = implementedBy;
  this.implementedAt = new Date();
  this.implementationNotes = notes;
  return this.save();
};

suggestionSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

suggestionSchema.methods.setThread = function(threadId) {
  this.threadId = threadId;
  return this.save();
};

export const Suggestion = mongoose.model('Suggestion', suggestionSchema);
export default Suggestion;