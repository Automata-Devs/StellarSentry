/**
 * Remind Command - Set a reminder
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { Reminder } from '../../database/models/Reminder.js';
import { parseTime } from '../../utils/time.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .addStringOption(option =>
      option.setName('time')
        .setDescription('When to remind you (e.g., 10m, 1h, 1d, 2024-12-25 15:00)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('What to remind you about')
        .setRequired(true)
        .setMaxLength(1000)
    )
    .addBooleanOption(option =>
      option.setName('dm')
        .setDescription('Send reminder via DM instead of channel (default: false)')
        .setRequired(false)
    ),

  category: 'utility',
  cooldown: 10,
  permissions: { user: [], bot: ['SendMessages'] },
  guildOnly: true,

  async execute(interaction, client) {
    const timeStr = interaction.options.getString('time');
    const message = interaction.options.getString('message');
    const dm = interaction.options.getBoolean('dm') || false;

    // Parse time - can be relative (10m, 1h) or absolute (ISO string)
    let remindAt;
    const relativeTime = parseTime(timeStr);

    if (relativeTime) {
      remindAt = new Date(Date.now() + relativeTime);
    } else {
      // Try parsing as absolute date
      remindAt = new Date(timeStr);
      if (isNaN(remindAt.getTime())) {
        return interaction.reply({
          content: `${EMOJIS.ERROR} Invalid time format. Use relative time (10m, 1h, 1d) or absolute date (YYYY-MM-DD HH:MM).`,
          ephemeral: true,
        });
      }
    }

    const now = Date.now();
    if (remindAt.getTime() <= now) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Reminder time must be in the future.`,
        ephemeral: true,
      });
    }

    const duration = remindAt.getTime() - now;
    if (duration > LIMITS.REMINDER_MAX_DURATION) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Maximum reminder duration is 90 days.`,
        ephemeral: true,
      });
    }

    // Create reminder in database
    const reminder = await Reminder.create({
      guildId: interaction.guild.id,
      channelId: dm ? null : interaction.channel.id,
      userId: interaction.user.id,
      message,
      remindAt,
      dm,
    });

    const embed = {
      title: `${EMOJIS.SUCCESS} Reminder Set`,
      color: COLORS.SUCCESS,
      fields: [
        { name: 'Message', value: message, inline: false },
        { name: 'Time', value: `<t:${Math.floor(remindAt.getTime() / 1000)}:F>`, inline: true },
        { name: 'In', value: formatDuration(duration), inline: true },
        { name: 'Via', value: dm ? 'DM' : 'Channel', inline: true },
      ],
      timestamp: new Date(),
      footer: { text: `Reminder ID: ${reminder._id}` },
    };

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}