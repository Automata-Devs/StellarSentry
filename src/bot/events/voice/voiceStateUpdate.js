/**
 * Voice State Update Event - Handle music auto-leave and voice logs
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { musicService } from '../../../services/music.service.js';
import { logger } from '../../../utils/logger.js';
import { eventBus, EVENTS } from '../../../core/eventBus.js';

export default {
  name: 'voiceStateUpdate',
  once: false,
  async execute(oldState, newState) {
    const guild = newState.guild;
    if (!guild) return;

    try {
      const settings = await guildService.getGuild(guild.id);

      // Handle music auto-leave
      if (settings?.music?.enabled && settings.music.autoLeave) {
        await handleMusicAutoLeave(oldState, newState, settings);
      }

      // Handle voice logging
      if (settings?.logging?.enabled) {
        await handleVoiceLogs(oldState, newState, settings);
      }
    } catch (error) {
      logger.error({ err: error, guildId: guild.id }, 'Voice state update error');
    }
  },
};

async function handleMusicAutoLeave(oldState, newState, settings) {
  const player = musicService.getPlayer(newState.guild.id);
  if (!player) return;

  const voiceChannel = guild.channels.cache.get(player.voiceChannelId);
  if (!voiceChannel) return;

  // Count non-bot members in voice channel
  const members = voiceChannel.members.filter(m => !m.user.bot);

  // If bot is alone or only bots remain
  if (members.size === 0) {
    const idleTimeout = (settings.music.idleTimeout || 5) * 60 * 1000;

    // Schedule auto-leave
    setTimeout(async () => {
      // Re-check after timeout
      const currentChannel = guild.channels.cache.get(player.voiceChannelId);
      if (currentChannel) {
        const currentMembers = currentChannel.members.filter(m => !m.user.bot);
        if (currentMembers.size === 0 && musicService.isPlaying(newState.guild.id)) {
          await musicService.stop(newState.guild.id);
          logger.info({ guildId: guild.id }, 'Auto-left voice channel due to inactivity');
        }
      }
    }, idleTimeout);
  }
}

async function handleVoiceLogs(oldState, newState, settings) {
  const logging = settings.logging || {};

  if (!logging.enabled) return;
  if (logging.ignoredChannels?.includes(oldState.channelId) || logging.ignoredChannels?.includes(newState.channelId)) return;

  let logType = null;
  let logChannelId = null;

  // Determine log type and channel
  if (!oldState.channelId && newState.channelId) {
    // User joined
    logType = 'voiceJoin';
    logChannelId = logging.channels?.voiceJoin;
  } else if (oldState.channelId && !newState.channelId) {
    // User left
    logType = 'voiceLeave';
    logChannelId = logging.channels?.voiceLeave;
  } else if (oldState.channelId !== newState.channelId) {
    // User moved
    logType = 'voiceMove';
    logChannelId = logging.channels?.voiceMove;
  }

  if (!logType || !logChannelId) return;

  const logChannel = newState.guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const member = newState.member;
  if (!member) return;

  const embed = new EmbedBuilder()
    .setColor(logType === 'voiceJoin' ? COLORS.SUCCESS : logType === 'voiceLeave' ? COLORS.ERROR : COLORS.INFO)
    .setTimestamp()
    .setFooter({ text: `User ID: ${member.id}` });

  switch (logType) {
    case 'voiceJoin':
      embed.setTitle(`${EMOJIS.VOICE} Voice Channel Joined`)
        .setDescription(`**${member.user.tag}** joined **${newState.channel.name}**`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
      break;
    case 'voiceLeave':
      embed.setTitle(`${EMOJIS.VOICE} Voice Channel Left`)
        .setDescription(`**${member.user.tag}** left **${oldState.channel.name}**`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
      break;
    case 'voiceMove':
      embed.setTitle(`${EMOJIS.VOICE} Voice Channel Moved`)
        .setDescription(`**${member.user.tag}** moved from **${oldState.channel.name}** to **${newState.channel.name}**`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'From', value: oldState.channel.name, inline: true },
          { name: 'To', value: newState.channel.name, inline: true },
        );
      break;
  }

  await logChannel.send({ embeds: [embed] });
}