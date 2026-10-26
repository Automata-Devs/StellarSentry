/**
 * ReactionRole model - Reaction/Button roles
 */
import mongoose from 'mongoose';

const reactionRoleSchema = new mongoose.Schema({
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

  // Panel info
  title: {
    type: String,
    maxlength: 256,
    default: 'Reaction Roles',
  },
  description: {
    type: String,
    maxlength: 4000,
    default: '',
  },
  type: {
    type: String,
    enum: ['button', 'reaction', 'select'],
    default: 'button',
  },

  // Roles configuration
  roles: [{
    roleId: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      maxlength: 80,
      default: '',
    },
    emoji: {
      type: String,
      required: true,
    },
    // For buttons
    style: {
      type: String,
      enum: ['Primary', 'Secondary', 'Success', 'Danger'],
      default: 'Secondary',
    },
    // For select menu
    description: {
      type: String,
      maxlength: 100,
      default: '',
    },
    // Requirements
    requiredRoles: [{ type: String }],
    requiredLevel: { type: Number, default: 0 },
    // Limits
    maxUsers: { type: Number, default: 0 }, // 0 = unlimited
    currentUsers: { type: Number, default: 0 },
    // Exclusivity groups (only one role per group)
    exclusiveGroup: { type: String, default: null },
  }],

  // Settings
  settings: {
    removeOnReactionRemove: { type: Boolean, default: true },
    allowMultiple: { type: Boolean, default: true },
    requireAllRoles: { type: Boolean, default: false },
    cooldown: { type: Number, default: 0 }, // seconds
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
  collection: 'reaction_roles',
});

// Indexes
reactionRoleSchema.index({ guildId: 1, channelId: 1 });
reactionRoleSchema.index({ messageId: 1 }, { unique: true });

// Methods
reactionRoleSchema.methods.getRoleConfig = function(roleId) {
  return this.roles.find(r => r.roleId === roleId);
};

reactionRoleSchema.methods.canAssign = function(member, roleId) {
  const config = this.getRoleConfig(roleId);
  if (!config) return { canAssign: false, reason: 'Role not configured' };

  // Check max users
  if (config.maxUsers > 0 && config.currentUsers >= config.maxUsers) {
    return { canAssign: false, reason: 'Role limit reached' };
  }

  // Check exclusive group
  if (config.exclusiveGroup) {
    const hasExclusive = this.roles.some(r =>
      r.exclusiveGroup === config.exclusiveGroup &&
      r.roleId !== roleId &&
      member.roles.cache.has(r.roleId)
    );
    if (hasExclusive) {
      return { canAssign: false, reason: 'Already have a role from this group' };
    }
  }

  // Check required roles
  if (config.requiredRoles?.length > 0) {
    const hasRequired = config.requiredRoles.some(r => member.roles.cache.has(r));
    if (!hasRequired) {
      return { canAssign: false, reason: 'Missing required role(s)' };
    }
  }

  // Check required level (would need member data)
  // Checked in service layer

  return { canAssign: true };
};

reactionRoleSchema.methods.incrementUsers = function(roleId) {
  const role = this.roles.find(r => r.roleId === roleId);
  if (role) {
    role.currentUsers += 1;
  }
  return this.save();
};

reactionRoleSchema.methods.decrementUsers = function(roleId) {
  const role = this.roles.find(r => r.roleId === roleId);
  if (role && role.currentUsers > 0) {
    role.currentUsers -= 1;
  }
  return this.save();
};

reactionRoleSchema.methods.addRole = function(roleConfig) {
  this.roles.push(roleConfig);
  return this.save();
};

reactionRoleSchema.methods.removeRole = function(roleId) {
  this.roles = this.roles.filter(r => r.roleId !== roleId);
  return this.save();
};

reactionRoleSchema.methods.updateRole = function(roleId, updates) {
  const role = this.roles.find(r => r.roleId === roleId);
  if (role) {
    Object.assign(role, updates);
  }
  return this.save();
};

export const ReactionRole = mongoose.model('ReactionRole', reactionRoleSchema);
export default ReactionRole;