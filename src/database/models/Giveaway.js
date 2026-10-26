/**
 * Giveaway model - Giveaway system
 */
import mongoose from 'mongoose';

const giveawaySchema = new mongoose.Schema({
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
  hostId: {
    type: String,
    required: true,
    index: true,
  },

  // Giveaway info
  title: {
    type: String,
    required: true,
    maxlength: 256,
  },
  description: {
    type: String,
    maxlength: 4000,
    default: '',
  },
  prize: {
    type: String,
    required: true,
    maxlength: 256,
  },

  // Winners
  winnerCount: {
    type: Number,
    required: true,
    min: 1,
    max: 20,
    default: 1,
  },
  winners: [{
    userId: { type: String },
    position: { type: Number },
    claimed: { type: Boolean, default: false },
    claimedAt: { type: Date, default: null },
  }],

  // Requirements
  requirements: {
    requiredRole: { type: String, default: null },
    requiredLevel: { type: Number, default: 0 },
    accountAge: { type: Number, default: 0 }, // in milliseconds
    serverAge: { type: Number, default: 0 }, // in milliseconds
    blacklistedRoles: [{ type: String }],
  },

  // Timing
  startsAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  endsAt: {
    type: Date,
    required: true,
    index: true,
  },
  duration: {
    type: Number,
    required: true, // in milliseconds
  },

  // Status
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended', 'cancelled', 'rerolled'],
    default: 'scheduled',
    index: true,
  },

  // Entries
  entries: [{
    userId: { type: String },
    enteredAt: { type: Date, default: Date.now },
  }],
  entryCount: {
    type: Number,
    default: 0,
  },

  // Messages
  messages: {
    start: { type: String, default: '' },
    end: { type: String, default: '' },
    reroll: { type: String, default: '' },
  },

  // Buttons
  button: {
    label: { type: String, default: 'Enter Giveaway' },
    emoji: { type: String, default: '🎉' },
    style: { type: String, enum: ['Primary', 'Secondary', 'Success', 'Danger'], default: 'Success' },
  },

  // Embed
  embed: {
    color: { type: String, default: '#5865F2' },
    thumbnail: { type: String, default: '' },
    image: { type: String, default: '' },
    footer: { type: String, default: 'Ends at' },
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
  endedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  collection: 'giveaways',
});

// Indexes
giveawaySchema.index({ guildId: 1, status: 1, endsAt: 1 });
giveawaySchema.index({ hostId: 1, createdAt: -1 });
giveawaySchema.index({ messageId: 1 }, { unique: true });

// TTL for old cancelled giveaways
giveawaySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days

// Static methods
giveawaySchema.statics.getActiveGiveaways = function(guildId = null) {
  const query = { status: 'active', endsAt: { $gt: new Date() } };
  if (guildId) query.guildId = guildId;
  return this.find(query).sort({ endsAt: 1 });
};

giveawaySchema.statics.getScheduledGiveaways = function(guildId = null) {
  const query = { status: 'scheduled', startsAt: { $gt: new Date() } };
  if (guildId) query.guildId = guildId;
  return this.find(query).sort({ startsAt: 1 });
};

giveawaySchema.statics.getEndedGiveaways = function(guildId = null, limit = 50) {
  const query = { status: { $in: ['ended', 'rerolled'] } };
  if (guildId) query.guildId = guildId;
  return this.find(query).sort({ endedAt: -1 }).limit(limit);
};

giveawaySchema.statics.getUserGiveaways = function(guildId, userId) {
  return this.find({
    guildId,
    $or: [
      { hostId: userId },
      { 'winners.userId': userId },
    ],
  }).sort({ createdAt: -1 });
};

// Methods
giveawaySchema.methods.addEntry = function(userId) {
  if (!this.entries.some(e => e.userId === userId)) {
    this.entries.push({ userId });
    this.entryCount = this.entries.length;
  }
  return this.save();
};

giveawaySchema.methods.removeEntry = function(userId) {
  this.entries = this.entries.filter(e => e.userId !== userId);
  this.entryCount = this.entries.length;
  return this.save();
};

giveawaySchema.methods.hasEntered = function(userId) {
  return this.entries.some(e => e.userId === userId);
};

giveawaySchema.methods.start = function() {
  this.status = 'active';
  return this.save();
};

giveawaySchema.methods.end = function(winners) {
  this.status = 'ended';
  this.endedAt = new Date();
  this.winners = winners.map((w, i) => ({
    userId: w,
    position: i + 1,
    claimed: false,
  }));
  return this.save();
};

giveawaySchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.endedAt = new Date();
  return this.save();
};

giveawaySchema.methods.reroll = function(newWinners) {
  this.status = 'rerolled';
  this.winners = newWinners.map((w, i) => ({
    userId: w,
    position: i + 1,
    claimed: false,
  }));
  this.endedAt = new Date();
  return this.save();
};

giveawaySchema.methods.claimPrize = function(userId) {
  const winner = this.winners.find(w => w.userId === userId);
  if (winner && !winner.claimed) {
    winner.claimed = true;
    winner.claimedAt = new Date();
    return this.save();
  }
  return false;
};

giveawaySchema.methods.getEligibleEntries = function(members) {
  // Filter entries based on requirements
  return this.entries.filter(entry => {
    const member = members.get(entry.userId);
    if (!member) return false;

    // Check blacklisted roles
    if (this.requirements.blacklistedRoles?.length > 0) {
      const hasBlacklisted = this.requirements.blacklistedRoles.some(r => member.roles.cache.has(r));
      if (hasBlacklisted) return false;
    }

    // Check required role
    if (this.requirements.requiredRole && !member.roles.cache.has(this.requirements.requiredRole)) {
      return false;
    }

    // Check account age
    if (this.requirements.accountAge > 0) {
      const accountAge = Date.now() - member.user.createdAt.getTime();
      if (accountAge < this.requirements.accountAge) return false;
    }

    // Check server age
    if (this.requirements.serverAge > 0) {
      const serverAge = Date.now() - member.joinedAt.getTime();
      if (serverAge < this.requirements.serverAge) return false;
    }

    // Check level (would need member data)
    // Checked in service layer

    return true;
  });
};

export const Giveaway = mongoose.model('Giveaway', giveawaySchema);
export default Giveaway;