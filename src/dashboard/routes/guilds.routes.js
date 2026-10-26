/**
 * Guilds Routes - Server selection and management
 */
import express from 'express';
import { guildService } from '../../services/guild.service.js';

const router = express.Router();

/**
 * GET /guilds - List user's guilds where they can manage the bot
 */
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const bot = req.bot;

    // Fetch user's guilds from Discord
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    const userGuilds = await response.json();

    // Filter guilds where user has MANAGE_GUILD or is owner, and bot is in guild
    const manageableGuilds = userGuilds
      .filter(g => {
        const hasPermission = (g.permissions & 0x20) === 0x20 || g.owner; // MANAGE_GUILD = 0x20
        const botInGuild = bot.guilds.cache.has(g.id);
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
          botJoined: true,
          features: settings?.features || {},
        };
      });

    const guilds = await Promise.all(manageableGuilds);

    // Guilds where bot is not present
    const unaddedGuilds = userGuilds
      .filter(g => {
        const hasPermission = (g.permissions & 0x20) === 0x20 || g.owner;
        const botInGuild = bot.guilds.cache.has(g.id);
        return hasPermission && !botInGuild;
      })
      .map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
        owner: g.owner,
        memberCount: g.approximate_member_count,
      }));

    res.render('pages/guilds', {
      title: 'Your Servers - StellarSentry',
      user: req.user,
      guilds,
      unaddedGuilds,
    });
  } catch (error) {
    console.error('Guilds error:', error);
    res.render('pages/guilds', {
      title: 'Your Servers - StellarSentry',
      user: req.user,
      guilds: [],
      unaddedGuilds: [],
      error: 'Failed to load servers',
    });
  }
});

/**
 * GET /guilds/:guildId - Redirect to overview
 */
router.get('/:guildId', (req, res) => {
  res.redirect(`/overview/${req.params.guildId}`);
});

export default router;