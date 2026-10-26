/**
 * Embed Builder - Utility for creating consistent embeds
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../config/constants.js';

/**
 * Create a success embed
 * @param {Object} options
 * @returns {EmbedBuilder}
 */
export function successEmbed(options = {}) {
  return new EmbedBuilder()
    .setColor(options.color || COLORS.SUCCESS)
    .setTitle(`${options.emoji || EMOJIS.SUCCESS} ${options.title || 'Success'}`)
    .setDescription(options.description)
    .setTimestamp()
    .setFooter({ text: options.footer || 'StellarSentry' });
}

/**
 * Create an error embed
 * @param {Object} options
 * @returns {EmbedBuilder}
 */
export function errorEmbed(options = {}) {
  return new EmbedBuilder()
    .setColor(options.color || COLORS.ERROR)
    .setTitle(`${options.emoji || EMOJIS.ERROR} ${options.title || 'Error'}`)
    .setDescription(options.description)
    .setTimestamp()
    .setFooter({ text: options.footer || 'StellarSentry' });
}

/**
 * Create a warning embed
 * @param {Object} options
 * @returns {EmbedBuilder}
 */
export function warningEmbed(options = {}) {
  return new EmbedBuilder()
    .setColor(options.color || COLORS.WARNING)
    .setTitle(`${options.emoji || EMOJIS.WARNING} ${options.title || 'Warning'}`)
    .setDescription(options.description)
    .setTimestamp()
    .setFooter({ text: options.footer || 'StellarSentry' });
}

/**
 * Create an info embed
 * @param {Object} options
 * @returns {EmbedBuilder}
 */
export function infoEmbed(options = {}) {
  return new EmbedBuilder()
    .setColor(options.color || COLORS.INFO)
    .setTitle(`${options.emoji || EMOJIS.INFO} ${options.title || 'Information'}`)
    .setDescription(options.description)
    .setTimestamp()
    .setFooter({ text: options.footer || 'StellarSentry' });
}

/**
 * Create a moderation embed
 * @param {Object} options
 * @returns {EmbedBuilder}
 */
export function moderationEmbed(options = {}) {
  const colors = {
    ban: COLORS.ERROR,
    kick: COLORS.WARNING,
    timeout: COLORS.WARNING,
    warn: COLORS.WARNING,
    unban: COLORS.SUCCESS,
    unmute: COLORS.SUCCESS,
  };

  return new EmbedBuilder()
    .setColor(options.color || colors[options.action] || COLORS.PRIMARY)
    .setTitle(`${getActionEmoji(options.action)} ${options.title}`)
    .setDescription(options.description)
    .addFields(options.fields || [])
    .setTimestamp()
    .setFooter({ text: options.footer || 'StellarSentry Moderation' });
}

/**
 * Create a music embed
 * @param {Object} options
 * @returns {EmbedBuilder}
 */
export function musicEmbed(options = {}) {
  return new EmbedBuilder()
    .setColor(options.color || COLORS.MUSIC)
    .setTitle(`${options.emoji || EMOJIS.MUSIC} ${options.title}`)
    .setDescription(options.description)
    .setThumbnail(options.thumbnail)
    .addFields(options.fields || [])
    .setTimestamp()
    .setFooter({ text: options.footer || 'StellarSentry Music' });
}

/**
 * Create a leveling embed
 * @param {Object} options
 * @returns {EmbedBuilder}
 */
export function levelingEmbed(options = {}) {
  return new EmbedBuilder()
    .setColor(options.color || COLORS.LEVELING)
    .setTitle(`${options.emoji || EMOJIS.LEVEL} ${options.title}`)
    .setDescription(options.description)
    .addFields(options.fields || [])
    .setTimestamp()
    .setFooter({ text: options.footer || 'StellarSentry Leveling' });
}

/**
 * Create an economy embed
 * @param {Object} options
 * @returns {EmbedBuilder}
 */
export function economyEmbed(options = {}) {
  return new EmbedBuilder()
    .setColor(options.color || COLORS.ECONOMY)
    .setTitle(`${options.emoji || EMOJIS.ECONOMY} ${options.title}`)
    .setDescription(options.description)
    .addFields(options.fields || [])
    .setTimestamp()
    .setFooter({ text: options.footer || 'StellarSentry Economy' });
}

/**
 * Create a paginated embed
 * @param {Object} options
 * @returns {EmbedBuilder}
 */
export function paginatedEmbed(options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color || COLORS.PRIMARY)
    .setTitle(options.title)
    .setDescription(options.description)
    .setTimestamp()
    .setFooter({ text: `Page ${options.page}/${options.pages} • ${options.footer || 'StellarSentry'}` });

  if (options.fields) {
    embed.addFields(options.fields);
  }

  return embed;
}

/**
 * Create a user profile embed
 * @param {Object} options
 * @returns {EmbedBuilder}
 */
export function profileEmbed(options = {}) {
  return new EmbedBuilder()
    .setColor(options.color || COLORS.PRIMARY)
    .setTitle(`${EMOJIS.USER} ${options.username}'s Profile`)
    .setThumbnail(options.avatar)
    .addFields(options.fields || [])
    .setTimestamp()
    .setFooter({ text: options.footer || 'StellarSentry' });
}

/**
 * Create a server info embed
 * @param {Object} options
 * @returns {EmbedBuilder}
 */
export function serverInfoEmbed(options = {}) {
  return new EmbedBuilder()
    .setColor(options.color || COLORS.PRIMARY)
    .setTitle(`${EMOJIS.SERVER} ${options.name}`)
    .setThumbnail(options.icon)
    .addFields(options.fields || [])
    .setTimestamp()
    .setFooter({ text: options.footer || 'StellarSentry' });
}

/**
 * Get emoji for moderation action
 * @param {string} action
 * @returns {string}
 */
function getActionEmoji(action) {
  const emojis = {
    ban: EMOJIS.ERROR,
    kick: EMOJIS.WARNING,
    timeout: EMOJIS.WARNING,
    warn: EMOJIS.WARNING,
    unban: EMOJIS.SUCCESS,
    unmute: EMOJIS.SUCCESS,
    purge: EMOJIS.DELETE,
  };
  return emojis[action] || EMOJIS.INFO;
}

/**
 * Truncate text to fit embed limits
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(text, maxLength = LIMITS.EMBED_FIELD_VALUE_MAX) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export default {
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
  moderationEmbed,
  musicEmbed,
  levelingEmbed,
  economyEmbed,
  paginatedEmbed,
  profileEmbed,
  serverInfoEmbed,
  truncate,
};