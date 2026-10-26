/**
 * Reminder model - User reminders
 */
import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
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
  },

  // Reminder details
  content: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  originalMessageId: {
    type: String,
    default: null,
  },

  // Timing
  remindAt: {
    type: Date,
    required: true,
    index: true,
  },
  recurring: {
    enabled: { type: Boolean, default: false },
    interval: { type: Number, default: 0 }, // in milliseconds
    cron: { type: String, default: null }, // cron expression
    endAt: { type: Date, default: null },
    count: { type: Number, default: 0 }, // max occurrences (0 = infinite)
    executedCount: { type: Number, default: 0 },
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'cancelled', 'failed', 'expired'],
    default: 'pending',
    index: true,
  },
  sentAt: {
    type: Date,
    default: null,
  },
  error: {
    type: String,
    default: null,
  },

  // DM option
  dm: {
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
}, {
  timestamps: true,
  collection: 'reminders',
});

// Indexes
reminderSchema.index({ guildId: 1, userId: 1, status: 1 });
reminderSchema.index({ remindAt: 1, status: 1 });
reminderSchema.index({ 'recurring.enabled': 1, remindAt: 1, status: 1 });

// TTL index for old completed reminders
reminderSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days

// Static methods
reminderSchema.statics.getPendingReminders = function(now = new Date()) {
  return this.find({
    status: 'pending',
    remindAt: { $lte: now },
  }).sort({ remindAt: 1 });
};

reminderSchema.statics.getUserReminders = function(guildId, userId, status = null) {
  const query = { guildId, userId };
  if (status) query.status = status;
  return this.find(query).sort({ remindAt: 1 });
};

reminderSchema.statics.getRecurringReminders = function(now = new Date()) {
  return this.find({
    'recurring.enabled': true,
    status: 'pending',
    remindAt: { $lte: now },
  }).sort({ remindAt: 1 });
};

// Methods
reminderSchema.methods.markSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();

  if (this.recurring.enabled) {
    this.recurring.executedCount += 1;

    // Check if we should stop recurring
    if (this.recurring.count > 0 && this.recurring.executedCount >= this.recurring.count) {
      this.status = 'cancelled';
    } else if (this.recurring.endAt && new Date() >= this.recurring.endAt) {
      this.status = 'cancelled';
    } else {
      // Calculate next reminder time
      let nextRemindAt;
      if (this.recurring.cron) {
        // Would need cron parser - simplified for now
        nextRemindAt = new Date(this.remindAt.getTime() + this.recurring.interval);
      } else {
        nextRemindAt = new Date(this.remindAt.getTime() + this.recurring.interval);
      }

      this.remindAt = nextRemindAt;
      this.status = 'pending';
      this.sentAt = null;
    }
  }

  return this.save();
};

reminderSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

reminderSchema.methods.reschedule = function(newDate) {
  this.remindAt = newDate;
  this.status = 'pending';
  this.sentAt = null;
  this.error = null;
  return this.save();
};

export const Reminder = mongoose.model('Reminder', reminderSchema);
export default Reminder;