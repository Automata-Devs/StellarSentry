/**
 * Member model - Per-guild member data (XP, balance, warnings, etc.)
 */
import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
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

  // Leveling
  leveling: {
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    totalXp: { type: Number, default: 0 },
    lastXpGain: { type: Date, default: null },
    messagesCount: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
  },

  // Economy (per-guild)
  economy: {
    wallet: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    bankLimit: { type: Number, default: 10000 },
    dailyStreak: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
    lastWork: { type: Date, default: null },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    netWorth: { type: Number, default: 0 },
  },

  // Inventory
  inventory: [{
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    acquiredAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  }],

  // Warnings
  warnings: [{
    caseNumber: { type: Number, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    dmSent: { type: Boolean, default: false },
  }],

  // Mutes/Timeouts
  timeouts: [{
    caseNumber: { type: Number, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, required: true },
    duration: { type: Number, required: true }, // in milliseconds
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date, required: true },
    active: { type: Boolean, default: true },
    roleId: { type: String, default: null },
  }],

  // Voice activity
  voice: {
    totalTime: { type: Number, default: 0 }, // in milliseconds
    sessions: [{
      channelId: { type: String },
      joinedAt: { type: Date },
      leftAt: { type: Date },
      duration: { type: Number }, // in milliseconds
    }],
    lastChannelId: { type: String, default: null },
    lastJoinedAt: { type: Date, default: null },
  },

  // Activity tracking
  activity: {
    messagesToday: { type: Number, default: 0 },
    messagesThisWeek: { type: Number, default: 0 },
    messagesThisMonth: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: null },
    commandsUsed: { type: Number, default: 0 },
    lastCommandAt: { type: Date, default: null },
  },

  // Reputation
  reputation: {
    positive: { type: Number, default: 0 },
    negative: { type: Number, default: 0 },
    lastGiven: { type: Date, default: null },
    lastReceived: { type: Date, default: null },
  },

  // Notes (mod notes)
  notes: [{
    moderatorId: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],

  // Join/Leave tracking
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date, default: null },
  isMember: { type: Boolean, default: true },
  leftCount: { type: Number, default: 0 },

  // Referral
  referredBy: { type: String, default: null },
  referrals: { type: Number, default: 0 },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'members',
});

// Compound indexes
memberSchema.index({ guildId: 1, userId: 1 }, { unique: true });
memberSchema.index({ guildId: 1, 'leveling.xp': -1 });
memberSchema.index({ guildId: 1, 'leveling.level': -1 });
memberSchema.index({ guildId: 1, 'economy.wallet': -1 });
memberSchema.index({ guildId: 1, 'economy.netWorth': -1 });
memberSchema.index({ guildId: 1, 'warnings.active': 1 });
memberSchema.index({ guildId: 1, 'timeouts.active': 1, 'timeouts.endsAt': 1 });

// Virtuals
memberSchema.virtual('totalBalance').get(function() {
  return this.economy.wallet + this.economy.bank;
});

memberSchema.virtual('activeWarnings').get(function() {
  return this.warnings.filter(w => w.active && (!w.expiresAt || w.expiresAt > new Date()));
});

memberSchema.virtual('activeTimeouts').get(function() {
  return this.timeouts.filter(t => t.active && t.endsAt > new Date());
});

// Methods
memberSchema.methods.addXp = function(amount) {
  this.leveling.xp += amount;
  this.leveling.totalXp += amount;
  this.leveling.lastXpGain = new Date();
  this.leveling.messagesCount += 1;

  // Check for level up
  const xpForNextLevel = this.calculateXpForLevel(this.leveling.level + 1);
  if (this.leveling.xp >= xpForNextLevel) {
    this.leveling.level += 1;
    this.leveling.xp -= xpForNextLevel;
    return { leveledUp: true, newLevel: this.leveling.level };
  }

  return { leveledUp: false, newLevel: this.leveling.level };
};

memberSchema.methods.calculateXpForLevel = function(level) {
  // Formula: 100 * level^1.5
  return Math.floor(100 * Math.pow(level, 1.5));
};

memberSchema.methods.getXpForNextLevel = function() {
  return this.calculateXpForLevel(this.leveling.level + 1);
};

memberSchema.methods.addBalance = function(amount, type = 'wallet') {
  if (type === 'wallet') {
    this.economy.wallet += amount;
  } else if (type === 'bank') {
    const newBalance = this.economy.bank + amount;
    this.economy.bank = Math.min(newBalance, this.economy.bankLimit);
  }
  this.economy.totalEarned += amount;
  this.economy.netWorth = this.economy.wallet + this.economy.bank;
  return this.save();
};

memberSchema.methods.removeBalance = function(amount, type = 'wallet') {
  if (type === 'wallet') {
    this.economy.wallet = Math.max(0, this.economy.wallet - amount);
  } else if (type === 'bank') {
    this.economy.bank = Math.max(0, this.economy.bank - amount);
  }
  this.economy.totalSpent += amount;
  this.economy.netWorth = this.economy.wallet + this.economy.bank;
  return this.save();
};

memberSchema.methods.addItem = function(itemId, name, quantity = 1, metadata = {}) {
  const existing = this.inventory.find(i => i.itemId === itemId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    this.inventory.push({ itemId, name, quantity, metadata });
  }
  return this.save();
};

memberSchema.methods.removeItem = function(itemId, quantity = 1) {
  const index = this.inventory.findIndex(i => i.itemId === itemId);
  if (index === -1) return false;

  const item = this.inventory[index];
  if (item.quantity <= quantity) {
    this.inventory.splice(index, 1);
  } else {
    item.quantity -= quantity;
  }
  return this.save();
};

memberSchema.methods.hasItem = function(itemId, quantity = 1) {
  const item = this.inventory.find(i => i.itemId === itemId);
  return item && item.quantity >= quantity;
};

memberSchema.methods.addWarning = function(warning) {
  const caseNumber = this.warnings.length > 0
    ? Math.max(...this.warnings.map(w => w.caseNumber)) + 1
    : 1;

  this.warnings.push({
    ...warning,
    caseNumber,
    createdAt: new Date(),
    active: true,
  });
  return this.save();
};

memberSchema.methods.removeWarning = function(caseNumber) {
  const warning = this.warnings.find(w => w.caseNumber === caseNumber);
  if (warning) {
    warning.active = false;
    return this.save();
  }
  return false;
};

memberSchema.methods.addTimeout = function(timeout) {
  this.timeouts.push({
    ...timeout,
    startsAt: new Date(),
    active: true,
  });
  return this.save();
};

memberSchema.methods.removeTimeout = function(caseNumber) {
  const timeout = this.timeouts.find(t => t.caseNumber === caseNumber);
  if (timeout) {
    timeout.active = false;
    return this.save();
  }
  return false;
};

memberSchema.methods.addVoiceTime = function(duration) {
  this.voice.totalTime += duration;
  this.voice.sessions.push({
    duration,
    joinedAt: new Date(Date.now() - duration),
    leftAt: new Date(),
  });
  // Keep only last 100 sessions
  if (this.voice.sessions.length > 100) {
    this.voice.sessions = this.voice.sessions.slice(-100);
  }
  return this.save();
};

memberSchema.methods.addReputation = function(type) {
  if (type === 'positive') this.reputation.positive += 1;
  else if (type === 'negative') this.reputation.negative += 1;
  return this.save();
};

memberSchema.methods.addNote = function(moderatorId, content) {
  this.notes.push({ moderatorId, content, createdAt: new Date() });
  // Keep only last 50 notes
  if (this.notes.length > 50) {
    this.notes = this.notes.slice(-50);
  }
  return this.save();
};

memberSchema.methods.recordActivity = function(type) {
  if (type === 'message') {
    this.activity.messagesToday += 1;
    this.activity.messagesThisWeek += 1;
    this.activity.messagesThisMonth += 1;
    this.activity.lastMessageAt = new Date();
  } else if (type === 'command') {
    this.activity.commandsUsed += 1;
    this.activity.lastCommandAt = new Date();
  }
  return this.save();
};

export const Member = mongoose.model('Member', memberSchema);
export default Member;