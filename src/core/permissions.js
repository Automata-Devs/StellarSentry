/**
 * Permission utilities for Discord.js
 * Handles user and bot permission checks
 */
import { PermissionFlagsBits, ChannelType } from 'discord.js';
import { logger } from '../utils/logger.js';

/**
 * Common permission sets
 */
export const PERMISSIONS = {
  // Moderation
  MODERATE_MEMBERS: PermissionFlagsBits.ModerateMembers,
  BAN_MEMBERS: PermissionFlagsBits.BanMembers,
  KICK_MEMBERS: PermissionFlagsBits.KickMembers,
  MANAGE_MESSAGES: PermissionFlagsBits.ManageMessages,
  MANAGE_CHANNELS: PermissionFlagsBits.ManageChannels,
  MANAGE_ROLES: PermissionFlagsBits.ManageRoles,
  MANAGE_GUILD: PermissionFlagsBits.ManageGuild,
  MANAGE_WEBHOOKS: PermissionFlagsBits.ManageWebhooks,
  MANAGE_EMOJIS_AND_STICKERS: PermissionFlagsBits.ManageEmojisAndStickers,
  MANAGE_THREADS: PermissionFlagsBits.ManageThreads,
  MANAGE_NICKNAMES: PermissionFlagsBits.ManageNicknames,

  // Admin
  ADMINISTRATOR: PermissionFlagsBits.Administrator,
  VIEW_AUDIT_LOG: PermissionFlagsBits.ViewAuditLog,
  VIEW_GUILD_INSIGHTS: PermissionFlagsBits.ViewGuildInsights,

  // Messages
  SEND_MESSAGES: PermissionFlagsBits.SendMessages,
  EMBED_LINKS: PermissionFlagsBits.EmbedLinks,
  ATTACH_FILES: PermissionFlagsBits.AttachFiles,
  READ_MESSAGE_HISTORY: PermissionFlagsBits.ReadMessageHistory,
  MENTION_EVERYONE: PermissionFlagsBits.MentionEveryone,
  USE_EXTERNAL_EMOJIS: PermissionFlagsBits.UseExternalEmojis,
  ADD_REACTIONS: PermissionFlagsBits.AddReactions,

  // Voice
  CONNECT: PermissionFlagsBits.Connect,
  SPEAK: PermissionFlagsBits.Speak,
  MUTE_MEMBERS: PermissionFlagsBits.MuteMembers,
  DEAFEN_MEMBERS: PermissionFlagsBits.DeafenMembers,
  MOVE_MEMBERS: PermissionFlagsBits.MoveMembers,
  USE_VAD: PermissionFlagsBits.UseVAD,
  PRIORITY_SPEAKER: PermissionFlagsBits.PrioritySpeaker,

  // Other
  CREATE_INSTANT_INVITE: PermissionFlagsBits.CreateInstantInvite,
  CHANGE_NICKNAME: PermissionFlagsBits.ChangeNickname,
};

/**
 * Permission groups for easier checking
 */
export const PERMISSION_GROUPS = {
  MODERATION: [
    PERMISSIONS.MODERATE_MEMBERS,
    PERMISSIONS.BAN_MEMBERS,
    PERMISSIONS.KICK_MEMBERS,
    PERMISSIONS.MANAGE_MESSAGES,
  ],
  ADMIN: [
    PERMISSIONS.ADMINISTRATOR,
    PERMISSIONS.MANAGE_GUILD,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.MANAGE_CHANNELS,
  ],
  MESSAGE_MANAGEMENT: [
    PERMISSIONS.MANAGE_MESSAGES,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.EMBED_LINKS,
    PERMISSIONS.ATTACH_FILES,
    PERMISSIONS.READ_MESSAGE_HISTORY,
  ],
  VOICE_MANAGEMENT: [
    PERMISSIONS.CONNECT,
    PERMISSIONS.SPEAK,
    PERMISSIONS.MUTE_MEMBERS,
    PERMISSIONS.DEAFEN_MEMBERS,
    PERMISSIONS.MOVE_MEMBERS,
  ],
  BOT_BASE: [
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.EMBED_LINKS,
    PERMISSIONS.READ_MESSAGE_HISTORY,
    PERMISSIONS.ADD_REACTIONS,
    PERMISSIONS.USE_EXTERNAL_EMOJIS,
  ],
};

/**
 * Check if member has permission(s)
 * @param {GuildMember} member
 * @param {bigint|bigint[]} permissions
 * @param {boolean} requireAll
 * @returns {boolean}
 */
export function hasPermission(member, permissions, requireAll = true) {
  if (!member) return false;

  // Owner always has permission
  if (member.guild.ownerId === member.id) return true;

  // Administrator has all permissions
  if (member.permissions.has(PERMISSIONS.ADMINISTRATOR)) return true;

  const perms = Array.isArray(permissions) ? permissions : [permissions];

  if (requireAll) {
    return perms.every(p => member.permissions.has(p));
  }
  return perms.some(p => member.permissions.has(p));
}

/**
 * Check if bot has permission(s) in channel/guild
 * @param {Guild} guild
 * @param {bigint|bigint[]} permissions
 * @param {Channel} channel
 * @returns {boolean}
 */
export function botHasPermission(guild, permissions, channel = null) {
  if (!guild) return false;

  const me = guild.members.me;
  if (!me) return false;

  // Check if bot is guild owner (unlikely but possible)
  if (guild.ownerId === me.id) return true;

  // Administrator has all permissions
  if (me.permissions.has(PERMISSIONS.ADMINISTRATOR)) return true;

  const perms = Array.isArray(permissions) ? permissions : [permissions];

  if (channel) {
    // Check channel-specific permissions
    const channelPerms = channel.permissionsFor(me);
    if (!channelPerms) return false;
    return perms.every(p => channelPerms.has(p));
  }

  // Check guild permissions
  return perms.every(p => me.permissions.has(p));
}

/**
 * Get missing permissions
 * @param {GuildMember|Guild} memberOrGuild
 * @param {bigint[]} permissions
 * @param {Channel} channel
 * @returns {bigint[]}
 */
export function getMissingPermissions(memberOrGuild, permissions, channel = null) {
  const perms = Array.isArray(permissions) ? permissions : [permissions];
  const missing = [];

  if (channel && 'permissionsFor' in channel) {
    const channelPerms = channel.permissionsFor(memberOrGuild);
    if (!channelPerms) return perms;
    for (const p of perms) {
      if (!channelPerms.has(p)) missing.push(p);
    }
  } else {
    for (const p of perms) {
      if (!memberOrGuild.permissions.has(p)) missing.push(p);
    }
  }

  return missing;
}

/**
 * Format permission name for display
 * @param {bigint} permission
 * @returns {string}
 */
export function formatPermission(permission) {
  const names = {
    [PermissionFlagsBits.ModerateMembers]: 'Timeout Members',
    [PermissionFlagsBits.BanMembers]: 'Ban Members',
    [PermissionFlagsBits.KickMembers]: 'Kick Members',
    [PermissionFlagsBits.ManageMessages]: 'Manage Messages',
    [PermissionFlagsBits.ManageChannels]: 'Manage Channels',
    [PermissionFlagsBits.ManageRoles]: 'Manage Roles',
    [PermissionFlagsBits.ManageGuild]: 'Manage Server',
    [PermissionFlagsBits.ManageWebhooks]: 'Manage Webhooks',
    [PermissionFlagsBits.ManageEmojisAndStickers]: 'Manage Emojis',
    [PermissionFlagsBits.ManageThreads]: 'Manage Threads',
    [PermissionFlagsBits.ManageNicknames]: 'Manage Nicknames',
    [PermissionFlagsBits.Administrator]: 'Administrator',
    [PermissionFlagsBits.ViewAuditLog]: 'View Audit Log',
    [PermissionFlagsBits.ViewGuildInsights]: 'View Server Insights',
    [PermissionFlagsBits.SendMessages]: 'Send Messages',
    [PermissionFlagsBits.EmbedLinks]: 'Embed Links',
    [PermissionFlagsBits.AttachFiles]: 'Attach Files',
    [PermissionFlagsBits.ReadMessageHistory]: 'Read Message History',
    [PermissionFlagsBits.MentionEveryone]: 'Mention @everyone',
    [PermissionFlagsBits.UseExternalEmojis]: 'Use External Emojis',
    [PermissionFlagsBits.AddReactions]: 'Add Reactions',
    [PermissionFlagsBits.Connect]: 'Connect',
    [PermissionFlagsBits.Speak]: 'Speak',
    [PermissionFlagsBits.MuteMembers]: 'Mute Members',
    [PermissionFlagsBits.DeafenMembers]: 'Deafen Members',
    [PermissionFlagsBits.MoveMembers]: 'Move Members',
    [PermissionFlagsBits.UseVAD]: 'Use Voice Activity',
    [PermissionFlagsBits.PrioritySpeaker]: 'Priority Speaker',
    [PermissionFlagsBits.CreateInstantInvite]: 'Create Invite',
    [PermissionFlagsBits.ChangeNickname]: 'Change Nickname',
  };

  return names[permission] || permission.toString();
}

/**
 * Format missing permissions for user message
 * @param {bigint[]} permissions
 * @returns {string}
 */
export function formatMissingPermissions(permissions) {
  return permissions.map(formatPermission).join(', ');
}

/**
 * Check if user can moderate target
 * @param {GuildMember} moderator
 * @param {GuildMember|User} target
 * @returns {Object} { canModerate: boolean, reason: string }
 */
export function canModerate(moderator, target) {
  // Can't moderate yourself
  if (moderator.id === target.id) {
    return { canModerate: false, reason: 'You cannot moderate yourself.' };
  }

  // Guild owner can moderate everyone
  if (moderator.guild.ownerId === moderator.id) {
    return { canModerate: true, reason: null };
  }

  // Can't moderate guild owner
  if (moderator.guild.ownerId === target.id) {
    return { canModerate: false, reason: 'You cannot moderate the server owner.' };
  }

  // Check if target is a member (for role hierarchy)
  if (!('roles' in target)) {
    return { canModerate: false, reason: 'Target is not a member of this server.' };
  }

  // Check role hierarchy - moderator's highest role must be higher than target's
  if (moderator.roles.highest.position <= target.roles.highest.position) {
    return { canModerate: false, reason: 'You cannot moderate someone with a higher or equal role.' };
  }

  // Bot can't moderate someone with higher role than itself
  const me = moderator.guild.members.me;
  if (me.roles.highest.position <= target.roles.highest.position) {
    return { canModerate: false, reason: 'I cannot moderate someone with a higher or equal role than me.' };
  }

  return { canModerate: true, reason: null };
}

/**
 * Check if bot can moderate target
 * @param {Guild} guild
 * @param {GuildMember} target
 * @returns {Object} { canModerate: boolean, reason: string }
 */
export function botCanModerate(guild, target) {
  const me = guild.members.me;
  if (!me) return { canModerate: false, reason: 'I am not a member of this server.' };

  // Bot owner check (if configured)
  // Can't moderate guild owner
  if (guild.ownerId === target.id) {
    return { canModerate: false, reason: 'I cannot moderate the server owner.' };
  }

  // Check role hierarchy
  if (me.roles.highest.position <= target.roles.highest.position) {
    return { canModerate: false, reason: 'I cannot moderate someone with a higher or equal role than me.' };
  }

  return { canModerate: true, reason: null };
}

/**
 * Check if user is bot owner
 * @param {string} userId
 * @returns {boolean}
 */
export function isBotOwner(userId) {
  const ownerIds = process.env.OWNER_IDS?.split(',').map(id => id.trim()) || [];
  return ownerIds.includes(userId);
}

/**
 * Check if user is guild owner
 * @param {Guild} guild
 * @param {string} userId
 * @returns {boolean}
 */
export function isGuildOwner(guild, userId) {
  return guild.ownerId === userId;
}

/**
 * Check if user has admin permissions (Manage Guild or Administrator)
 * @param {GuildMember} member
 * @returns {boolean}
 */
export function hasAdminPermission(member) {
  return hasPermission(member, [PERMISSIONS.MANAGE_GUILD, PERMISSIONS.ADMINISTRATOR], false);
}

/**
 * Check if user can manage bot settings
 * @param {GuildMember} member
 * @returns {boolean}
 */
export function canManageBot(member) {
  return hasPermission(member, PERMISSIONS.MANAGE_GUILD) || isBotOwner(member.id);
}

/**
 * Get required bot permissions for a command
 * @param {Object} command
 * @returns {bigint[]}
 */
export function getRequiredBotPermissions(command) {
  return command.permissions?.bot || [];
}

/**
 * Get required user permissions for a command
 * @param {Object} command
 * @returns {bigint[]}
 */
export function getRequiredUserPermissions(command) {
  return command.permissions?.user || [];
}

export default {
  PERMISSIONS,
  PERMISSION_GROUPS,
  hasPermission,
  botHasPermission,
  getMissingPermissions,
  formatPermission,
  formatMissingPermissions,
  canModerate,
  botCanModerate,
  isBotOwner,
  isGuildOwner,
  hasAdminPermission,
  canManageBot,
  getRequiredBotPermissions,
  getRequiredUserPermissions,
};