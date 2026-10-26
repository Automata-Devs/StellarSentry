/**
 * Dashboard Server - Express app factory with Socket.IO
 * Creates the web dashboard for managing the bot
 */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';

// Import middleware
import { authMiddleware } from '../middleware/auth.js';
import { csrfMiddleware } from '../middleware/csrf.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';
import { validateMiddleware } from '../middleware/validate.js';
import { errorHandlerMiddleware } from '../middleware/errorHandler.js';

// Import routes
import { authRoutes } from '../routes/auth.routes.js';
import { healthRoutes } from '../routes/health.routes.js';
import { homeRoutes } from '../routes/home.routes.js';
import { guildsRoutes } from '../routes/guilds.routes.js';
import { overviewRoutes } from '../routes/overview.routes.js';
import { settingsRoutes } from '../routes/settings.routes.js';
import { moderationRoutes } from '../routes/moderation.routes.js';
import { welcomeRoutes } from '../routes/welcome.routes.js';
import { levelingRoutes } from '../routes/leveling.routes.js';
import { economyRoutes } from '../routes/economy.routes.js';
import { ticketsRoutes } from '../routes/tickets.routes.js';
import { giveawaysRoutes } from '../routes/giveaways.routes.js';
import { suggestionsRoutes } from '../routes/suggestions.routes.js';
import { starboardRoutes } from '../routes/starboard.routes.js';
import { musicRoutes } from '../routes/music.routes.js';
import { reactionRolesRoutes } from '../routes/reactionRoles.routes.js';
import { commandsRoutes } from '../routes/commands.routes.js';
import { loggingRoutes } from '../routes/logging.routes.js';
import { apiRoutes } from '../routes/api/index.routes.js';

// Import sockets
import { setupSockets } from '../sockets/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create and configure the Express app with Socket.IO
 * @param {Object} botClient - Discord.js client instance
 * @returns {Object} { app, server, io }
 */
export function createDashboardServer(botClient) {
  const app = express();
  const server = createServer(app);

  // Socket.IO setup
  const io = new Server(server, {
    cors: {
      origin: env.DASHBOARD_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Trust proxy for Bot-Hosting.net
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.tailwindcss.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'cdn.tailwindcss.com', 'fonts.googleapis.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'cdn.discordapp.com', 'media.discordapp.net'],
        connectSrc: ["'self'", env.DASHBOARD_URL],
      },
    },
  }));

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Session configuration
  const sessionMiddleware = session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60, // 24 hours
      autoRemove: 'native',
    }),
    cookie: {
      secure: env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    name: 'stellarsentry.sid',
  });

  app.use(sessionMiddleware);

  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());

  // Pass session to Socket.IO
  io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
  });

  // Rate limiting
  app.use(rateLimitMiddleware);

  // Static files
  app.use('/static', express.static(path.join(__dirname, 'public')));

  // View engine
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Make bot client available to routes
  app.use((req, res, next) => {
    req.bot = botClient;
    req.io = io;
    next();
  });

  // Global variables for views
  app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.bot = botClient;
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
    res.locals.env = env.NODE_ENV;
    res.locals.dashboardUrl = env.DASHBOARD_URL;
    next();
  });

  // CSRF protection (after session and body parsing)
  app.use(csrfMiddleware);

  // Routes
  app.use('/auth', authRoutes);
  app.use('/health', healthRoutes);
  app.use('/', homeRoutes);
  app.use('/guilds', authMiddleware, guildsRoutes);
  app.use('/overview', authMiddleware, overviewRoutes);
  app.use('/settings', authMiddleware, settingsRoutes);
  app.use('/moderation', authMiddleware, moderationRoutes);
  app.use('/welcome', authMiddleware, welcomeRoutes);
  app.use('/leveling', authMiddleware, levelingRoutes);
  app.use('/economy', authMiddleware, economyRoutes);
  app.use('/tickets', authMiddleware, ticketsRoutes);
  app.use('/giveaways', authMiddleware, giveawaysRoutes);
  app.use('/suggestions', authMiddleware, suggestionsRoutes);
  app.use('/starboard', authMiddleware, starboardRoutes);
  app.use('/music', authMiddleware, musicRoutes);
  app.use('/reaction-roles', authMiddleware, reactionRolesRoutes);
  app.use('/commands', authMiddleware, commandsRoutes);
  app.use('/logging', authMiddleware, loggingRoutes);
  app.use('/api/v1', authMiddleware, apiRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).render('errors/404', { title: 'Page Not Found' });
  });

  // Error handler
  app.use(errorHandlerMiddleware);

  // Setup Socket.IO
  setupSockets(io, botClient);

  // Listen to bot events and broadcast to dashboard
  setupEventBroadcasting(botClient, io);

  return { app, server, io };
}

/**
 * Setup event broadcasting from bot to dashboard via Socket.IO
 */
function setupEventBroadcasting(botClient, io) {
  // Bot ready
  eventBus.on(EVENTS.BOT_READY, (data) => {
    io.emit('bot:ready', { status: 'online', timestamp: new Date() });
  });

  // Bot disconnect
  eventBus.on(EVENTS.BOT_DISCONNECT, (data) => {
    io.emit('bot:disconnect', { status: 'offline', timestamp: new Date() });
  });

  // Guild events
  eventBus.on(EVENTS.GUILD_CREATE, (data) => {
    io.emit('guild:create', data);
  });

  eventBus.on(EVENTS.GUILD_DELETE, (data) => {
    io.emit('guild:delete', data);
  });

  // Music events
  eventBus.on(EVENTS.MUSIC_PLAY, (data) => {
    io.to(`guild:${data.guildId}`).emit('music:play', data);
  });

  eventBus.on(EVENTS.MUSIC_STOP, (data) => {
    io.to(`guild:${data.guildId}`).emit('music:stop', data);
  });

  eventBus.on(EVENTS.MUSIC_QUEUE_UPDATE, (data) => {
    io.to(`guild:${data.guildId}`).emit('music:queue_update', data);
  });

  // Giveaway events
  eventBus.on(EVENTS.GIVEAWAY_START, (data) => {
    io.to(`guild:${data.guildId}`).emit('giveaway:start', data);
  });

  eventBus.on(EVENTS.GIVEAWAY_END, (data) => {
    io.to(`guild:${data.guildId}`).emit('giveaway:end', data);
  });

  // Ticket events
  eventBus.on(EVENTS.TICKET_CREATE, (data) => {
    io.to(`guild:${data.guildId}`).emit('ticket:create', data);
  });

  eventBus.on(EVENTS.TICKET_CLOSE, (data) => {
    io.to(`guild:${data.guildId}`).emit('ticket:close', data);
  });

  // Log events
  eventBus.on(EVENTS.LOG_ENTRY, (data) => {
    io.to(`guild:${data.guildId}`).emit('log:entry', data);
  });

  // Setting updates
  eventBus.on(EVENTS.SETTING_UPDATE, (data) => {
    io.to(`guild:${data.guildId}`).emit('setting:update', data);
  });

  // Feature toggles
  eventBus.on(EVENTS.FEATURE_TOGGLE, (data) => {
    io.to(`guild:${data.guildId}`).emit('feature:toggle', data);
  });

  // Command toggles
  eventBus.on(EVENTS.COMMAND_TOGGLE, (data) => {
    io.to(`guild:${data.guildId}`).emit('command:toggle', data);
  });
}

export default { createDashboardServer };