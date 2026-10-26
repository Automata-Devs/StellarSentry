/**
 * Ticket model - Support ticket system
 */
import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
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
  channelId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // Ticket info
  ticketId: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['general', 'support', 'report', 'appeal', 'custom'],
    default: 'general',
  },
  subject: {
    type: String,
    required: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 2000,
  },

  // Status
  status: {
    type: String,
    enum: ['open', 'claimed', 'in_progress', 'waiting', 'closed', 'deleted'],
    default: 'open',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },

  // Assignment
  claimedBy: {
    type: String,
    default: null,
  },
  claimedAt: {
    type: Date,
    default: null,
  },
  assignedTo: [{
    type: String,
  }],

  // Participants
  participants: [{
    userId: { type: String },
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: String },
  }],

  // Messages/Transcript
  messageCount: {
    type: Number,
    default: 0,
  },
  firstMessageId: {
    type: String,
    default: null,
  },
  lastMessageId: {
    type: String,
    default: null,
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },

  // Transcript
  transcript: {
    generated: { type: Boolean, default: false },
    url: { type: String, default: null },
    generatedAt: { type: Date, default: null },
    messageCount: { type: Number, default: 0 },
  },

  // Closure
  closedBy: {
    type: String,
    default: null,
  },
  closedAt: {
    type: Date,
    default: null,
  },
  closeReason: {
    type: String,
    default: null,
  },
  closeType: {
    type: String,
    enum: ['resolved', 'abandoned', 'duplicate', 'spam', 'other'],
    default: 'resolved',
  },

  // Ratings
  rating: {
    score: { type: Number, min: 1, max: 5, default: null },
    feedback: { type: String, default: null },
    ratedAt: { type: Date, default: null },
  },

  // Tags
  tags: [{
    type: String,
    maxlength: 30,
  }],

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
  collection: 'tickets',
});

// Compound indexes
ticketSchema.index({ guildId: 1, ticketId: 1 }, { unique: true });
ticketSchema.index({ guildId: 1, userId: 1, status: 1 });
ticketSchema.index({ guildId: 1, status: 1, createdAt: -1 });
ticketSchema.index({ guildId: 1, claimedBy: 1, status: 1 });

// Static methods
ticketSchema.statics.getNextTicketId = async function(guildId) {
  const lastTicket = await this.findOne({ guildId })
    .sort({ ticketId: -1 })
    .select('ticketId')
    .lean();
  return (lastTicket?.ticketId || 0) + 1;
};

ticketSchema.statics.getOpenTickets = function(guildId, userId = null) {
  const query = { guildId, status: { $in: ['open', 'claimed', 'in_progress', 'waiting'] } };
  if (userId) query.userId = userId;
  return this.find(query).sort({ createdAt: -1 });
};

ticketSchema.statics.getTicketStats = async function(guildId) {
  const stats = await this.aggregate([
    { $match: { guildId } },
    { $group: {
      _id: '$status',
      count: { $sum: 1 },
    }},
  ]);

  const result = { open: 0, claimed: 0, in_progress: 0, waiting: 0, closed: 0, deleted: 0, total: 0 };
  for (const stat of stats) {
    result[stat._id] = stat.count;
    result.total += stat.count;
  }
  return result;
};

// Methods
ticketSchema.methods.claim = function(moderatorId) {
  this.status = 'claimed';
  this.claimedBy = moderatorId;
  this.claimedAt = new Date();
  this.lastActivityAt = new Date();
  return this.save();
};

ticketSchema.methods.assign = function(moderatorId) {
  if (!this.assignedTo.includes(moderatorId)) {
    this.assignedTo.push(moderatorId);
  }
  return this.save();
};

ticketSchema.methods.unassign = function(moderatorId) {
  this.assignedTo = this.assignedTo.filter(id => id !== moderatorId);
  if (this.claimedBy === moderatorId) {
    this.claimedBy = null;
    this.claimedAt = null;
    this.status = 'open';
  }
  return this.save();
};

ticketSchema.methods.addParticipant = function(userId, addedBy) {
  if (!this.participants.some(p => p.userId === userId)) {
    this.participants.push({ userId, addedBy });
  }
  return this.save();
};

ticketSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.userId !== userId);
  return this.save();
};

ticketSchema.methods.close = function(closedBy, reason, closeType = 'resolved') {
  this.status = 'closed';
  this.closedBy = closedBy;
  this.closedAt = new Date();
  this.closeReason = reason;
  this.closeType = closeType;
  this.lastActivityAt = new Date();
  return this.save();
};

ticketSchema.methods.reopen = function() {
  this.status = 'open';
  this.closedBy = null;
  this.closedAt = null;
  this.closeReason = null;
  this.closeType = null;
  this.lastActivityAt = new Date();
  return this.save();
};

ticketSchema.methods.addMessage = function(messageId) {
  this.messageCount += 1;
  this.lastMessageId = messageId;
  this.lastActivityAt = new Date();
  if (!this.firstMessageId) this.firstMessageId = messageId;
  return this.save();
};

ticketSchema.methods.setTranscript = function(url, messageCount) {
  this.transcript.generated = true;
  this.transcript.url = url;
  this.transcript.generatedAt = new Date();
  this.transcript.messageCount = messageCount;
  return this.save();
};

ticketSchema.methods.rate = function(score, feedback) {
  this.rating.score = score;
  this.rating.feedback = feedback;
  this.rating.ratedAt = new Date();
  return this.save();
};

ticketSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
  }
  return this.save();
};

ticketSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

export const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket;