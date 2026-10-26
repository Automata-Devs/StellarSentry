/**
 * SetXP Command - Set a user's XP or level (admin only)
 */
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { levelingService } from '../../services/leveling.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setxp')
    .setDescription('Set a user\'s XP or level (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to modify')
        .setRequired(true)
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('xp')
        .setDescription('Set user\'s XP amount')
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('XP amount to set')
            .setRequired(true)
            .setMinValue(0)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('level')
        .setDescription('Set user\'s level')
        .addIntegerOption(option =>
          option.setName('level')
            .setDescription('Level to set')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(1000)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  category: 'leveling',
  cooldown: 10,
  permissions: { user: ['Administrator'], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ ephemeral: true });

    try {
      if (subcommand === 'xp') {
        const amount = interaction.options.getInteger('amount');
        await levelingService.setXp(interaction.guild.id, target.id, amount);
      } else if (subcommand === 'level') {
        const level = interaction.options.getInteger('level');
        await levelingService.setLevel(interaction.guild.id, target.id, level);
      }

      const newData = await levelingService.getLevel(interaction.guild.id, target.id);

      const embed = {
        title: `${EMOJIS.SUCCESS} Level/XP Updated`,
        color: COLORS.SUCCESS,
        fields: [
          { name: 'User', value: `${target.tag}`, inline: true },
          { name: 'New Level', value: newData.level.toString(), inline: true },
          { name: 'New XP', value: newData.xp.toLocaleString(), inline: true },
          { name: 'Rank', value: `#${newData.rank}`, inline: true },
        ],
        timestamp: new Date(),
        footer: { text: `Modified by ${interaction.user.tag}` },
      };

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to update: ${error.message}`,
      });
    }
  },
};