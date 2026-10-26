/**
 * Overview Routes - Server dashboard overview
 */
import express from 'express';
import { guildService } from '../../services/guild.service.js';
import { memberRepository } from '../../database/repositories/MemberRepository.js';
import { AuditLog } from '../../database/models/AuditLog.js';

const router = express.Router();

/**
 * GET /overview/:guildId - Server overview
 */
router.get('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = req.guild;
    const settings = await guildService.getGuild(guildId);

    // Get stats
    const memberCount = guild.memberCount;
    const botCount = guild.members.cache.filter(m => m.user.bot).size;
    const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
    const textChannels = guild.channels.cache.filter(c => c.isTextBased()).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size; // GuildVoice
    const roles = guild.roles.cache.size - 1; // Exclude @everyone

    // Recent audit logs
    const recentLogs = await AuditLog.find({ guildId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Top members by XP (if leveling enabled)
    let topMembers = [];
    if (settings?.leveling?.enabled) {
      topMembers = await memberRepository.find(
        { guildId },
        { sort: { 'leveling.level': -1, 'leveling.xp': -1 }, limit: 5 }
      );
    }

    // Economy stats (if enabled)
    let economyStats = null;
    if (settings?.economy?.enabled) {
      const topEconomy = await memberRepository.find(
        { guildId },
        { sort: { 'economy.netWorth': -1 }, limit: 5 }
      );
      economyStats = { top: topEconomy };
    }

    res.render('pages/overview', {
      title: `${guild.name} - Overview - StellarSentry`,
      user: req.user,
      guild,
      settings,
      stats: {
        memberCount,
        botCount,
        onlineCount,
        textChannels,
        voiceChannels,
        roles,
      },
      recentLogs,
      topMembers,
      economyStats,
    });
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load overview',
    });
  }
});

export default router;