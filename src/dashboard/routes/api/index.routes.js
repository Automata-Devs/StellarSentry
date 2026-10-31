/**
<<<<<<< HEAD
 * API Routes v1 - REST API for dashboard
 */
import express from 'express';
import { guildService } from '../../services/guild.service.js';
import { memberRepository } from '../../database/repositories/MemberRepository.js';
import { AuditLog } from '../../database/models/AuditLog.js';
=======
 * API Routes v1 - REST API for external integrations
 */
import express from 'express';
import { guildService } from '../../../services/guild.service.js';
import { memberRepository } from '../../../database/repositories/MemberRepository.js';
import { AuditLog } from '../../../database/models/AuditLog.js';
import { musicService } from '../../../services/music.service.js';
>>>>>>> f652c8f (Initial Commit - 2)
import { validateMiddleware } from '../middleware/validate.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const guildIdSchema = z.object({
  params: z.object({ guildId: z.string().min(1) }),
});

<<<<<<< HEAD
=======
const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
  }),
});

>>>>>>> f652c8f (Initial Commit - 2)
// GET /api/v1/bot/status - Bot status
router.get('/bot/status', (req, res) => {
  const bot = req.bot;
  if (!bot) {
    return res.status(503).json({ success: false, error: 'Bot not available' });
  }

  res.json({
    success: true,
    data: {
      online: bot.isReady(),
      user: bot.user ? {
        id: bot.user.id,
        username: bot.user.username,
        discriminator: bot.user.discriminator,
        avatar: bot.user.avatar,
      } : null,
      guilds: bot.guilds.cache.size,
      users: bot.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
      channels: bot.channels.cache.size,
      uptime: bot.uptime,
      wsPing: bot.ws.ping,
    },
  });
});

// GET /api/v1/guilds - List user's guilds
router.get('/guilds', async (req, res) => {
  try {
    const user = req.user;
    const bot = req.bot;

    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    const userGuilds = await response.json();

    const manageableGuilds = userGuilds
      .filter(g => {
<<<<<<< HEAD
        const hasPermission = (g.permissions & 0x20) === 0x20 || g.owner;
        const botInGuild = bot.guilds.cache.has(g.id);
        return hasPermission;
      })
      .map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
        owner: g.owner,
        memberCount: g.approximate_member_count,
        botInGuild: bot.guilds.cache.has(g.id),
        permissions: g.permissions,
      }));

    res.json({ success: true, data: manageableGuilds });
=======
        const hasPermission = (g.permissions & 0x20) === 0x20 || g.owner; // MANAGE_GUILD = 0x20
        const botInGuild = req.bot.guilds.cache.has(g.id);
        return hasPermission && botInGuild;
      })
      .map(async g => {
        const settings = await guildService.getGuild(g.id);
        return {
          id: g.id,
          name: g.name,
          icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
          owner: g.owner,
          memberCount: g.approximate_member_count,
          botInGuild: true,
          features: settings?.features || {},
        };
      });

    const guilds = await Promise.all(manageableGuilds);

    res.json({ success: true, data: guilds });
>>>>>>> f652c8f (Initial Commit - 2)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch guilds' });
  }
});

// GET /api/v1/guilds/:guildId - Get guild info
router.get('/guilds/:guildId', validateMiddleware(guildIdSchema), async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = req.guild;

    if (!guild) {
      return res.status(404).json({ success: false, error: 'Guild not found' });
    }

    res.json({
      success: true,
      data: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
        ownerId: guild.ownerId,
        memberCount: guild.memberCount,
        channels: guild.channels.cache.size,
        roles: guild.roles.cache.size,
        features: guild.features,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch guild' });
  }
});

// GET /api/v1/guilds/:guildId/settings - Get guild settings
router.get('/guilds/:guildId/settings', validateMiddleware(guildIdSchema), async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// PUT /api/v1/guilds/:guildId/settings - Update guild settings
router.put('/guilds/:guildId/settings', validateMiddleware(guildIdSchema), async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = req.body;

<<<<<<< HEAD
    // Validate updates (would use zod schema in production)
    const updated = await guildService.updateSettings(req.params.guildId, updates);
=======
    const updated = await guildService.updateSettings(guildId, updates);
>>>>>>> f652c8f (Initial Commit - 2)
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// GET /api/v1/guilds/:guildId/members - List guild members
router.get('/guilds/:guildId/members', validateMiddleware(guildIdSchema), async (req, res) => {
  try {
    const { guildId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const search = req.query.search;

<<<<<<< HEAD
    const guild = req.guild;
=======
    const guild = req.bot.guilds.cache.get(guildId);
>>>>>>> f652c8f (Initial Commit - 2)
    if (!guild) {
      return res.status(404).json({ success: false, error: 'Guild not found' });
    }

    let members = Array.from(guild.members.cache.values());

    if (search) {
      const searchLower = search.toLowerCase();
      members = members.filter(m =>
        m.user.username.toLowerCase().includes(searchLower) ||
        m.user.id === search ||
        (m.nickname && m.nickname.toLowerCase().includes(searchLower))
      );
    }

    const total = members.length;
    const start = (page - 1) * limit;
    const pageMembers = members.slice(start, start + limit).map(m => ({
      id: m.id,
      userId: m.user.id,
      username: m.user.username,
      discriminator: m.user.discriminator,
      avatar: m.user.avatar,
      nickname: m.nickname,
      roles: m.roles.cache.map(r => r.id).filter(r => r !== guildId),
      joinedAt: m.joinedAt,
      premiumSince: m.premiumSince,
<<<<<<< HEAD
      pending: m.pending,
=======
>>>>>>> f652c8f (Initial Commit - 2)
    }));

    res.json({
      success: true,
      data: pageMembers,
      pagination: {
        page,
        limit,
        total,
<<<<<<< HEAD
        pages: Math.ceil(total / 25),
=======
        pages: Math.ceil(total / limit),
>>>>>>> f652c8f (Initial Commit - 2)
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch members' });
  }
});

// GET /api/v1/guilds/:guildId/channels - List channels
router.get('/guilds/:guildId/channels', validateMiddleware(guildIdSchema), async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = req.guild;

    if (!guild) {
      return res.status(404).json({ success: false, error: 'Guild not found' });
    }

    const channels = Array.from(guild.channels.cache.values()).map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parentId,
      position: c.position,
      nsfw: c.nsfw,
<<<<<<< HEAD
      topic: c.topic,
      rateLimitPerUser: c.rateLimitPerUser,
=======
>>>>>>> f652c8f (Initial Commit - 2)
    }));

    res.json({ success: true, data: channels });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch channels' });
  }
});

// GET /api/v1/guilds/:guildId/roles - List roles
router.get('/guilds/:guildId/roles', validateMiddleware(guildIdSchema), async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = req.guild;

    if (!guild) {
      return res.status(404).json({ success: false, error: 'Guild not found' });
    }

    const roles = Array.from(guild.roles.cache.values())
      .filter(r => r.id !== guildId)
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        hoist: r.hoist,
        position: r.position,
<<<<<<< HEAD
        permissions: r.permissions.toArray(),
        mentionable: r.mentionable,
        managed: r.managed,
=======
        mentionable: r.mentionable,
        managed: r.managed,
        permissions: r.permissions.toArray(),
>>>>>>> f652c8f (Initial Commit - 2)
      }));

    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch roles' });
  }
});

// GET /api/v1/guilds/:guildId/members/:userId - Get member details
router.get('/guilds/:guildId/members/:userId', async (req, res) => {
  try {
    const { guildId, userId } = req.params;
    const guild = req.bot.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({ success: false, error: 'Guild not found' });
    }

    const member = guild.members.cache.get(userId);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    // Get member data from database
    const { memberRepository } = await import('../../database/repositories/MemberRepository.js');
    const memberData = await memberRepository.getByGuildAndUser(guildId, userId);

    res.json({
      success: true,
      data: {
        id: member.id,
        userId: member.user.id,
        username: member.user.username,
        discriminator: member.user.discriminator,
        avatar: member.user.avatar,
        nickname: member.nickname,
        roles: member.roles.cache.map(r => r.id).filter(r => r !== guildId),
        joinedAt: member.joinedAt,
        premiumSince: member.premiumSince,
<<<<<<< HEAD
        pending: member.pending,
        communicationDisabledUntil: member.communicationDisabledUntilTimestamp,
        leveling: memberData?.leveling || null,
        economy: memberData?.economy || null,
        warnings: memberData?.warnings || [],
=======
        leveling: memberData?.leveling || null,
        economy: memberData?.economy || null,
>>>>>>> f652c8f (Initial Commit - 2)
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch member' });
  }
});

// GET /api/v1/guilds/:guildId/audit-logs - Get audit logs
router.get('/guilds/:guildId/audit-logs', validateMiddleware(guildIdSchema), async (req, res) => {
  try {
    const { guildId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const category = req.query.category;
    const userId = req.query.userId;

    const query = { guildId };
    if (category) query.eventCategory = category;
    if (userId) query.userId = userId;

    const [logs, total] = await Promise.all([
<<<<<<< HEAD
      AuditLog.find(query)
=======
      (await import('../../database/models/AuditLog.js')).AuditLog.find(query)
>>>>>>> f652c8f (Initial Commit - 2)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
<<<<<<< HEAD
      AuditLog.countDocuments(query),
=======
      (await import('../../database/models/AuditLog.js')).AuditLog.countDocuments(query),
>>>>>>> f652c8f (Initial Commit - 2)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

// GET /api/v1/bot/stats - Bot statistics
router.get('/bot/stats', (req, res) => {
  const bot = req.bot;
  if (!bot) {
    return res.status(503).json({ success: false, error: 'Bot not available' });
  }

  const guilds = bot.guilds.cache.size;
  const users = bot.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
  const channels = bot.channels.cache.size;

  // Memory usage
  const mem = process.memoryUsage();
  const memoryMB = Math.round(mem.heapUsed / 1024 / 1024);

  res.json({
    success: true,
    data: {
      guilds,
      users,
      channels,
      uptime: bot.uptime,
      wsPing: bot.ws.ping,
      memoryMB,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  });
});

<<<<<<< HEAD
=======
export const apiRoutes = router;
>>>>>>> f652c8f (Initial Commit - 2)
export default router;