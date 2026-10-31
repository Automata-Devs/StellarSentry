/**
 * Guild Access Middleware - Verify user has access to manage a guild
 */

/**
<<<<<<< HEAD
=======
 * Check if request expects JSON response
 */
function expectsJson(req) {
  return req.xhr
    || req.headers.accept?.includes('application/json')
    || req.headers['content-type']?.includes('application/json')
    || req.path.startsWith('/api/');
}

/**
>>>>>>> f652c8f (Initial Commit - 2)
 * Verify user has MANAGE_GUILD or is Administrator in the guild
 * Also verifies the bot is in the guild
 */
export function guildAccessMiddleware(req, res, next) {
  const guildId = req.params.guildId || req.query.guildId || req.body.guildId;

  if (!guildId) {
<<<<<<< HEAD
=======
    if (expectsJson(req)) {
      return res.status(400).json({ success: false, error: 'Guild ID is required.' });
    }
>>>>>>> f652c8f (Initial Commit - 2)
    return res.status(400).render('errors/400', {
      title: 'Bad Request',
      message: 'Guild ID is required.',
    });
  }

  const bot = req.bot;
  if (!bot) {
<<<<<<< HEAD
=======
    if (expectsJson(req)) {
      return res.status(500).json({ success: false, error: 'Bot client not available.' });
    }
>>>>>>> f652c8f (Initial Commit - 2)
    return res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Bot client not available.',
    });
  }

  // Check if bot is in the guild
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) {
<<<<<<< HEAD
=======
    if (expectsJson(req)) {
      return res.status(404).json({ success: false, error: 'Bot is not in this server.' });
    }
>>>>>>> f652c8f (Initial Commit - 2)
    return res.status(404).render('errors/404', {
      title: 'Not Found',
      message: 'Bot is not in this server.',
    });
  }

  // Get member from guild
  const member = guild.members.cache.get(req.user.id);
  if (!member) {
<<<<<<< HEAD
=======
    if (expectsJson(req)) {
      return res.status(403).json({ success: false, error: 'You are not a member of this server.' });
    }
>>>>>>> f652c8f (Initial Commit - 2)
    return res.status(403).render('errors/403', {
      title: 'Forbidden',
      message: 'You are not a member of this server.',
    });
  }

  // Check permissions
  const hasManageGuild = member.permissions.has('ManageGuild');
  const isAdmin = member.permissions.has('Administrator');
  const isOwner = guild.ownerId === req.user.id;

  if (!hasManageGuild && !isAdmin && !isOwner) {
<<<<<<< HEAD
=======
    if (expectsJson(req)) {
      return res.status(403).json({ success: false, error: 'You need Manage Server or Administrator permission to access this page.' });
    }
>>>>>>> f652c8f (Initial Commit - 2)
    return res.status(403).render('errors/403', {
      title: 'Forbidden',
      message: 'You need Manage Server or Administrator permission to access this page.',
    });
  }

  // Attach guild and member to request
  req.guild = guild;
  req.guildMember = member;
  req.isGuildOwner = isOwner;

  next();
}

/**
 * Optional guild access - attach if available but don't require
 */
export function optionalGuildAccess(req, res, next) {
  const guildId = req.params.guildId || req.query.guildId || req.body.guildId;

  if (!guildId) {
    return next();
  }

  const bot = req.bot;
  if (!bot) {
    return next();
  }

  const guild = bot.guilds.cache.get(guildId);
  if (!guild) {
    return next();
  }

  const member = guild.members.cache.get(req.user.id);
  if (!member) {
    return next();
  }

  req.guild = guild;
  req.guildMember = member;
  req.isGuildOwner = guild.ownerId === req.user.id;

  next();
}

export default { guildAccessMiddleware, optionalGuildAccess };