/**
 * User model - Global user data (cross-guild)
 */
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Discord user ID
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // Global economy
  globalBalance: {
    wallet: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
  },

  // Global stats
  stats: {
    commandsUsed: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    voiceTime: { type: Number, default: 0 }, // in milliseconds
    songsPlayed: { type: Number, default: 0 },
    giveawaysWon: { type: Number, default: 0 },
    ticketsCreated: { type: Number, default: 0 },
  },

  // Preferences
  preferences: {
    dmNotifications: { type: Boolean, default: true },
    compactMode: { type: Boolean, default: false },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
  },

  // Badges/Achievements
  badges: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    earnedAt: { type: Date, default: Date.now },
  }],

  // Social
  social: {
    bio: { type: String, default: '', maxlength: 500 },
    reputation: { type: Number, default: 0 },
    marriedTo: { type: String, default: null },
    marriageDate: { type: Date, default: null },
  },

  // Blacklist/Block
  blacklisted: { type: Boolean, default: false },
  blacklistReason: { type: String, default: null },
  blacklistedAt: { type: Date, default: null },
  blacklistedBy: { type: String, default: null },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'users',
});

// Indexes
userSchema.index({ userId: 1 }, { unique: true });
userSchema.index({ 'globalBalance.wallet': -1 });
userSchema.index({ 'stats.commandsUsed': -1 });
userSchema.index({ blacklisted: 1 });

// Virtual for total balance
userSchema.virtual('totalBalance').get(function() {
  return this.globalBalance.wallet + this.globalBalance.bank;
});

// Methods
userSchema.methods.addBalance = function(amount, type = 'wallet') {
  if (type === 'wallet') {
    this.globalBalance.wallet += amount;
  } else if (type === 'bank') {
    this.globalBalance.bank += amount;
  }
  return this.save();
};

userSchema.methods.removeBalance = function(amount, type = 'wallet') {
  if (type === 'wallet') {
    this.globalBalance.wallet = Math.max(0, this.globalBalance.wallet - amount);
  } else if (type === 'bank') {
    this.globalBalance.bank = Math.max(0, this.globalBalance.bank - amount);
  }
  return this.save();
};

userSchema.methods.transfer = function(toUser, amount) {
  if (this.globalBalance.wallet < amount) return false;
  this.globalBalance.wallet -= amount;
  toUser.globalBalance.wallet += amount;
  return this.save();
};

userSchema.methods.addBadge = function(badge) {
  if (!this.badges.some(b => b.id === badge.id)) {
    this.badges.push({
      ...badge,
      earnedAt: new Date(),
    });
    return this.save();
  }
  return false;
};

userSchema.methods.hasBadge = function(badgeId) {
  return this.badges.some(b => b.id === badgeId);
};

userSchema.methods.incrementStat = function(stat, amount = 1) {
  if (this.stats.hasOwnProperty(stat)) {
    this.stats[stat] += amount;
    return this.save();
  }
  return false;
};

export const User = mongoose.model('User', userSchema);
export default User;