/**
 * Feature flags configuration
 * All features can be toggled per-guild via the dashboard
 * Default values are defined here and can be overridden per guild in the database
 */

import { FEATURE_DEFAULTS } from './constants.js';

/**
 * Feature flag definitions with metadata
 * @type {Record<string, { name: string, description: string, default: boolean, category: string }>}
 */
export const FEATURES = {
  automod: {
    name: 'Auto Moderation',
    description: 'Automatically moderate messages (spam, links, bad words, caps, mentions)',
    default: FEATURE_DEFAULTS.automod,
    category: 'moderation',
  },
  welcome: {
    name: 'Welcome System',
    description: 'Custom welcome/leave messages with embeds and auto-roles',
    default: FEATURE_DEFAULTS.welcome,
    category: 'general',
  },
  leveling: {
    name: 'Leveling System',
    description: 'XP gain, level up messages, role rewards, and rank cards',
    default: FEATURE_DEFAULTS.leveling,
    category: 'engagement',
  },
  economy: {
    name: 'Economy System',
    description: 'Balance, daily rewards, work, shop, pay, and leaderboards',
    default: FEATURE_DEFAULTS.economy,
    category: 'engagement',
  },
  tickets: {
    name: 'Ticket System',
    description: 'Support tickets with panels, transcripts, and categories',
    default: FEATURE_DEFAULTS.tickets,
    category: 'support',
  },
  reactionRoles: {
    name: 'Reaction Roles',
    description: 'Self-assignable roles via reactions or buttons',
    default: FEATURE_DEFAULTS.reactionRoles,
    category: 'general',
  },
  giveaways: {
    name: 'Giveaways',
    description: 'Create and manage giveaways with requirements and rerolls',
    default: FEATURE_DEFAULTS.giveaways,
    category: 'engagement',
  },
  suggestions: {
    name: 'Suggestions',
    description: 'Community suggestions with voting and staff review',
    default: FEATURE_DEFAULTS.suggestions,
    category: 'engagement',
  },
  starboard: {
    name: 'Starboard',
    description: 'Highlight popular messages with star reactions',
    default: FEATURE_DEFAULTS.starboard,
    category: 'engagement',
  },
  music: {
    name: 'Music Player',
    description: 'Lavalink-powered music with queue, filters, and dashboard control',
    default: FEATURE_DEFAULTS.music,
    category: 'entertainment',
  },
  logging: {
    name: 'Audit Logging',
    description: 'Comprehensive logging of server events and moderation actions',
    default: FEATURE_DEFAULTS.logging,
    category: 'moderation',
  },
};

/** Feature categories for dashboard organization */
export const FEATURE_CATEGORIES = {
  general: { name: 'General', icon: '⚙️', order: 1 },
  moderation: { name: 'Moderation', icon: '🛡️', order: 2 },
  engagement: { name: 'Engagement', icon: '🎮', order: 3 },
  support: { name: 'Support', icon: '🎫', order: 4 },
  entertainment: { name: 'Entertainment', icon: '🎵', order: 5 },
};

/**
 * Get all features sorted by category order
 * @returns {Array<{ key: string, ...Feature }>}
 */
export function getFeaturesSorted() {
  return Object.entries(FEATURES)
    .map(([key, feature]) => ({ key, ...feature }))
    .sort((a, b) => FEATURE_CATEGORIES[a.category].order - FEATURE_CATEGORIES[b.category].order);
}

/**
 * Get features by category
 * @param {string} category
 * @returns {Array<{ key: string, ...Feature }>}
 */
export function getFeaturesByCategory(category) {
  return Object.entries(FEATURES)
    .filter(([, feature]) => feature.category === category)
    .map(([key, feature]) => ({ key, ...feature }));
}

/**
 * Get default value for a feature
 * @param {string} key
 * @returns {boolean}
 */
export function getFeatureDefault(key) {
  return FEATURES[key]?.default ?? false;
}

/**
 * Get all feature keys
 * @returns {string[]}
 */
export function getFeatureKeys() {
  return Object.keys(FEATURES);
}