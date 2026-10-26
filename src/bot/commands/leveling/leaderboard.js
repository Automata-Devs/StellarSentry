/**
 * Leveling Leaderboard Command - View the leveling leaderboard
 */
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { levelingService } from '../../services/leveling.service.js';
import { client } from '../../core/client.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the leveling leaderboard')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Leaderboard type')
        .setRequired(false)
        .addChoices(
          { name: 'Level', value: 'level' },
          { name: 'XP', value: 'xp' },
          { name: 'Total XP', value: 'totalxp' }
        )
    ),

  category: 'leveling',
  cooldown: 10,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const type = interaction.options.getString('type') || 'level';

    await interaction.deferReply();

    const leaderboard = await levelingService.getLeaderboard(interaction.guild.id, LIMITS.LEADERBOARD_PER_PAGE, 1);

    if (leaderboard.data.length === 0) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} No leveling data found for this server.`,
      });
    }

    // Pagination
    let page = 0;
    const perPage = LIMITS.LEADERBOARD_PER_PAGE;
    const totalPages = leaderboard.pages;

    const generateEmbed = async (pageIndex) => {
      const lb = await levelingService.getLeaderboard(interaction.guild.id, perPage, pageIndex + 1);

      const fieldName = type === 'level' ? 'Level' : type === 'xp' ? 'XP' : 'Total XP';
      const getValue = (m) => type === 'level' ? m.level : type === 'xp' ? m.xp : m.totalXp;

      return {
        title: `${EMOJIS.LEVEL} ${interaction.guild.name} Leveling Leaderboard`,
        color: COLORS.LEVELING,
        description: lb.data.map((entry, i) => {
          const user = await client.users.fetch(entry.userId).catch(() => null);
          const name = user ? user.tag : `Unknown User (${entry.userId})`;
          const medal = pageIndex * perPage + i === 0 ? '🥇' : pageIndex * perPage + i === 1 ? '🥈' : pageIndex * perPage + i === 2 ? '🥉' : `${pageIndex * perPage + i + 1}.`;
          return `${medal} **${name}** - Level ${entry.level} (${getValue(entry).toLocaleString()} ${fieldName})`;
        }).join('\n'),
        timestamp: new Date(),
        footer: { text: `Page ${pageIndex + 1} of ${totalPages} • Sorted by ${fieldName}` },
      };
    };

    const generateButtons = (pageIndex) => {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('lvlb_first')
          .setLabel('⏮️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('lvlb_prev')
          .setLabel('◀️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('lvlb_next')
          .setLabel('▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === totalPages - 1),
        new ButtonBuilder()
          .setCustomId('lvlb_last')
          .setLabel('⏭️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === totalPages - 1)
      );
      return row;
    };

    const reply = await interaction.editReply({
      embeds: [await generateEmbed(page)],
      components: totalPages > 1 ? [generateButtons(page)] : [],
      fetchReply: true,
    });

    if (totalPages <= 1) return;

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async i => {
      switch (i.customId) {
        case 'lvlb_first':
          page = 0;
          break;
        case 'lvlb_prev':
          page = Math.max(0, page - 1);
          break;
        case 'lvlb_next':
          page = Math.min(totalPages - 1, page + 1);
          break;
        case 'lvlb_last':
          page = totalPages - 1;
          break;
      }
      await i.update({
        embeds: [await generateEmbed(page)],
        components: [generateButtons(page)],
      });
    });

    collector.on('end', async () => {
      const disabledButtons = generateButtons(page).components.map(btn => ButtonBuilder.from(btn).setDisabled(true));
      await interaction.editReply({
        components: [new ActionRowBuilder().addComponents(disabledButtons)],
      }).catch(() => {});
    });
  },
};