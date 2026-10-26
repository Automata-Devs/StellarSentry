/**
 * Rank Command - View your or another user's rank
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { levelingService } from '../../services/leveling.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your or another user\'s rank and level')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check rank for (defaults to yourself)')
        .setRequired(false)
    ),

  category: 'leveling',
  cooldown: 5,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;

    const levelData = await levelingService.getLevel(interaction.guild.id, target.id);

    // Generate progress bar
    const progressBar = generateProgressBar(levelData.progress);

    const embed = {
      title: `${EMOJIS.LEVEL} ${target.username}'s Rank`,
      color: COLORS.LEVELING,
      thumbnail: { url: target.displayAvatarURL({ dynamic: true }) },
      fields: [
        { name: 'Level', value: levelData.level.toString(), inline: true },
        { name: 'Rank', value: `#${levelData.rank}`, inline: true },
        { name: 'XP', value: `${levelData.xp.toLocaleString()} / ${levelData.xpForNext.toLocaleString()}`, inline: true },
        { name: 'Progress', value: `${progressBar} ${levelData.progress.toFixed(1)}%`, inline: false },
        { name: 'Total XP', value: levelData.totalXp.toLocaleString(), inline: true },
      ],
      timestamp: new Date(),
      footer: { text: `StellarSentry Leveling` },
    };

    await interaction.reply({ embeds: [embed] });
  },
};

function generateProgressBar(percentage, length = 20) {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}