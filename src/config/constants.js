/**
 * Application constants - colors, emojis, limits, and magic values
 * Centralized to avoid magic numbers/strings throughout the codebase
 */

/** Discord brand colors */
export const COLORS = {
  PRIMARY: 0x5865F2,      // Blurple
  SUCCESS: 0x3BA55C,      // Green
  WARNING: 0xFAA61A,      // Yellow
  ERROR: 0xED4245,        // Red
  INFO: 0x5865F2,         // Blurple
  DEFAULT: 0x2F3136,      // Dark grey
  STARBOARD: 0xFFD700,    // Gold
  MUSIC: 0x9B59B6,        // Purple
  ECONOMY: 0xF1C40F,      // Gold
  LEVELING: 0x3498DB,     // Blue
};

/** Common emojis used throughout the bot */
export const EMOJIS = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '⏳',
  STAR: '⭐',
  MUSIC: '🎵',
  QUEUE: '📋',
  PLAY: '▶️',
  PAUSE: '⏸️',
  SKIP: '⏭️',
  STOP: '⏹️',
  VOLUME: '🔊',
  SHUFFLE: '🔀',
  LOOP: '🔁',
  DJ: '🎧',
  TICKET: '🎫',
  GIVEAWAY: '🎉',
  SUGGESTION: '💡',
  MODERATION: '🛡️',
  ECONOMY: '💰',
  LEVEL: '📊',
  SETTINGS: '⚙️',
  LOG: '📝',
  WELCOME: '👋',
  GOODBYE: '👋',
  ROLE: '🎭',
  CHANNEL: '#️⃣',
  USER: '👤',
  BOT: '🤖',
  SERVER: '🏠',
  TIME: '⏰',
  CALENDAR: '📅',
  SEARCH: '🔍',
  REFRESH: '🔄',
  DELETE: '🗑️',
  EDIT: '✏️',
  COPY: '📋',
  LINK: '🔗',
  LOCK: '🔒',
  UNLOCK: '🔓',
  CHECK: '✔️',
  CROSS: '✖️',
  ARROW_RIGHT: '➡️',
  ARROW_LEFT: '⬅️',
  ARROW_UP: '⬆️',
  ARROW_DOWN: '⬇️',
};

/** Application-wide limits */
export const LIMITS = {
  // Discord limits
  EMBED_FIELD_MAX: 25,
  EMBED_FIELD_VALUE_MAX: 1024,
  EMBED_TITLE_MAX: 256,
  EMBED_DESCRIPTION_MAX: 4096,
  EMBED_FOOTER_MAX: 2048,
  EMBED_AUTHOR_NAME_MAX: 256,
  MESSAGE_CONTENT_MAX: 2000,
  INTERACTION_REPLY_MAX: 2000,
  SELECT_MENU_OPTIONS_MAX: 25,
  BUTTON_LABEL_MAX: 80,
  MODAL_TITLE_MAX: 45,
  MODAL_TEXT_MAX: 4000,

  // Bot limits
  PURGE_MAX: 100,
  SLOWMODE_MAX: 21600,        // 6 hours
  TIMEOUT_MAX: 2419200,       // 28 days
  REMINDER_MAX_DURATION: 7776000, // 90 days
  GIVEAWAY_MAX_DURATION: 7776000, // 90 days
  GIVEAWAY_MAX_WINNERS: 20,
  STARBOARD_THRESHOLD_MIN: 1,
  STARBOARD_THRESHOLD_MAX: 100,
  LEVEL_XP_BASE: 100,
  LEVEL_XP_MULTIPLIER: 1.5,
  ECONOMY_DAILY_MIN: 100,
  ECONOMY_DAILY_MAX: 500,
  ECONOMY_WORK_MIN: 50,
  ECONOMY_WORK_MAX: 300,
  SHOP_ITEM_PRICE_MIN: 1,
  SHOP_ITEM_PRICE_MAX: 1000000,
  TICKET_NAME_MAX: 100,
  WELCOME_MESSAGE_MAX: 2000,
  AUTO_ROLE_MAX: 5,
  REACTION_ROLE_MAX: 20,
  MUSIC_QUEUE_MAX: 100,
  MUSIC_VOLUME_MAX: 200,
  LOG_RETENTION_DAYS: 30,
  AUDIT_LOG_MAX_ENTRIES: 1000,

  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
  HELP_COMMANDS_PER_PAGE: 8,
  LEADERBOARD_PER_PAGE: 10,
  QUEUE_PER_PAGE: 10,
  WARNINGS_PER_PAGE: 10,
  INVENTORY_PER_PAGE: 10,
};

/** Cache TTL values (in milliseconds) */
export const CACHE_TTL = {
  GUILD_SETTINGS: 5 * 60 * 1000,        // 5 minutes
  USER_PROFILE: 2 * 60 * 1000,          // 2 minutes
  CHANNEL_LIST: 10 * 60 * 1000,         // 10 minutes
  ROLE_LIST: 10 * 60 * 1000,            // 10 minutes
  MEMBER_LIST: 5 * 60 * 1000,           // 5 minutes
  LAVALINK_TRACK: 30 * 60 * 1000,       // 30 minutes
  DASHBOARD_STATS: 1 * 60 * 1000,       // 1 minute
};

/** Time-related constants */
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
};

/** Feature flag defaults */
export const FEATURE_DEFAULTS = {
  automod: true,
  welcome: true,
  leveling: true,
  economy: true,
  tickets: true,
  reactionRoles: true,
  giveaways: true,
  suggestions: true,
  starboard: true,
  music: true,
  logging: true,
};

/** Cooldown defaults (in seconds) */
export const COOLDOWNS = {
  DEFAULT: 5,
  XP_GAIN: 60,
  DAILY: 24 * 60 * 60,
  WORK: 30 * 60,
  REMINDER: 10,
  SUGGESTION: 30,
  COMMAND: 3,
};

/** Database index names */
export const DB_INDEXES = {
  GUILD_ID: 'guildId_1',
  USER_ID: 'userId_1',
  GUILD_USER: 'guildId_1_userId_1',
  EXPIRES_AT: 'expiresAt_1',
  CREATED_AT: 'createdAt_-1',
  GUILD_CREATED: 'guildId_1_createdAt_-1',
};

/** HTTP status codes */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/** Socket.IO event names */
export const SOCKET_EVENTS = {
  // Bot -> Dashboard
  BOT_READY: 'bot:ready',
  BOT_DISCONNECT: 'bot:disconnect',
  GUILD_CREATE: 'guild:create',
  GUILD_DELETE: 'guild:delete',
  LOG_ENTRY: 'log:entry',
  MUSIC_UPDATE: 'music:update',
  MUSIC_QUEUE_UPDATE: 'music:queue_update',
  GIVEAWAY_UPDATE: 'giveaway:update',
  TICKET_CREATE: 'ticket:create',
  TICKET_CLOSE: 'ticket:close',

  // Dashboard -> Bot
  SETTING_UPDATE: 'setting:update',
  MUSIC_CONTROL: 'music:control',
  COMMAND_TOGGLE: 'command:toggle',
};