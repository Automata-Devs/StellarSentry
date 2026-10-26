/**
 * ShopItem model - Per-guild shop items
 */
import mongoose from 'mongoose';

const shopItemSchema = new mongoose.Schema({
  // Discord IDs
  guildId: {
    type: String,
    required: true,
    index: true,
  },

  // Item info
  itemId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
    default: '',
  },
  price: {
    type: Number,
    required: true,
    min: 1,
  },

  // Role reward (optional)
  roleId: {
    type: String,
    default: null,
  },

  // Stock management
  stock: {
    type: Number,
    default: -1, // -1 = unlimited
  },
  maxPerUser: {
    type: Number,
    default: 1,
  },
  sold: {
    type: Number,
    default: 0,
  },

  // Requirements
  requirements: {
    level: { type: Number, default: 0 },
    roles: [{ type: String }],
    badge: { type: String, default: null },
  },

  // Display
  emoji: {
    type: String,
    default: '📦',
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  hidden: {
    type: Boolean,
    default: false,
  },

  // Metadata
  createdBy: {
    type: String,
    required: true,
  },
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
  collection: 'shop_items',
});

// Compound indexes
shopItemSchema.index({ guildId: 1, itemId: 1 }, { unique: true });
shopItemSchema.index({ guildId: 1, displayOrder: 1, name: 1 });

// Virtual for availability
shopItemSchema.virtual('available').get(function() {
  if (this.stock === -1) return true;
  return this.stock > this.sold;
});

shopItemSchema.virtual('remaining').get(function() {
  if (this.stock === -1) return -1;
  return Math.max(0, this.stock - this.sold);
});

// Methods
shopItemSchema.methods.canBuy = function(member, quantity = 1) {
  // Check stock
  if (this.stock !== -1 && this.sold + quantity > this.stock) {
    return { canBuy: false, reason: 'Out of stock' };
  }

  // Check max per user
  const userPurchases = member.inventory?.find(i => i.itemId === this.itemId)?.quantity || 0;
  if (userPurchases + quantity > this.maxPerUser) {
    return { canBuy: false, reason: `Max ${this.maxPerUser} per user` };
  }

  // Check requirements
  if (this.requirements.level > 0 && member.leveling?.level < this.requirements.level) {
    return { canBuy: false, reason: `Requires level ${this.requirements.level}` };
  }

  if (this.requirements.roles?.length > 0) {
    // This would need member roles passed in
    // Checked in service layer
  }

  return { canBuy: true };
};

shopItemSchema.methods.purchase = function(quantity = 1) {
  this.sold += quantity;
  return this.save();
};

shopItemSchema.methods.restock = function(amount) {
  if (this.stock !== -1) {
    this.stock += amount;
  }
  return this.save();
};

export const ShopItem = mongoose.model('ShopItem', shopItemSchema);
export default ShopItem;