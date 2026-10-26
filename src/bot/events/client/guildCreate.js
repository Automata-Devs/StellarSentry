/**
 * Guild Create Event - Bot joined a new guild
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';
import { eventBus, EVENTS } from '../../../core/eventBus.js';

export default {
  name: 'guildCreate',
  once: false,
  async execute(guild) {
    logger.info({ guildId: guild.id, name: guild.name, memberCount: guild.memberCount }, 'Joined new guild');

    // Create guild in database
    await guildService.getOrCreateGuild(guild.id, {
      name: guild.name,
      icon: guild.icon,
      ownerId: guild.ownerId,
      memberCount: guild.memberCount,
      joinedAt: new Date(),
    });

    // Try to send welcome message to system channel or first available channel
    const channel = guild.systemChannel ||
      guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages'));

    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.WELCOME} Thanks for adding StellarSentry!`)
        .setColor(COLORS.PRIMARY)
        .setDescription(
          'StellarSentry is a multi-purpose Discord bot with moderation, leveling, economy, music, and more!\n\n' +
          '**Get Started:**\n' +
          '• Use `/help` to see all commands\n' +
          '• Use `/config` to configure the bot\n' +
          '• Use `/setup` for interactive setup wizard\n' +
          '• Visit our dashboard to manage settings via web\n\n' +
          '**Key Features:**\n' +
          '🛡️ Moderation • 📊 Leveling • 💰 Economy\n' +
          '🎫 Tickets • 🎉 Giveaways • 💡 Suggestions\n' +
          '⭐ Starboard • 🎵 Music • 📝 Logging'
        )
        .addFields(
          { name: 'Prefix', value: 'Slash commands only (/)', inline: true },
          { name: 'Support', value: '[Support Server](https://discord.gg/stellarsentry)', inline: true },
          { name: 'Dashboard', value: 'Configure via web dashboard', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'StellarSentry • Made with ❤️' });

      try {
        await channel.send({ embeds: [embed] });
      } catch (e) {
        // Ignore if can't send
      }
    }

    // Emit event
    eventBus.emit(EVENTS.GUILD_CREATE, { guildId: guild.id, name: guild.name });
  },
};