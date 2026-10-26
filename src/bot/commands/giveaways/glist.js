/**
 * Giveaway List Command - List all giveaways in the server
 */
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { giveawayRepository } from '../../database/repositories/GiveawayRepository.js';

export default {
  data: new SlashCommandBuilder()
    .setName('glist')
    .setDescription('List all giveaways in the server')
    .addStringOption(option =>
      option.setName('status')
        .setDescription('Filter by status')
        .setRequired(false)
        .addChoices(
          { name: 'Active', value: 'active' },
          { name: 'Ended', value: 'ended' },
          { name: 'Scheduled', value: 'scheduled' },
          { name: 'All', value: 'all' }
        )
    ),

  category: 'giveaways',
  cooldown: 10,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const status = interaction.options.getString('status') || 'all';

    const giveaways = await giveawayRepository.getGuildGiveaways(interaction.guild.id, {
      status: status === 'all' ? null : status,
      page: 1,
      limit: LIMITS.LEADERBOARD_PER_PAGE,
    });

    if (giveaways.data.length === 0) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} No giveaways found${status !== 'all' ? ` with status "${status}"` : ''}.`,
        ephemeral: true,
      });
    }

    // Pagination
    let page = 0;
    const perPage = LIMITS.LEADERBOARD_PER_PAGE;
    const totalPages = giveaways.pages;

    const generateEmbed = async (pageIndex) => {
      const gws = await giveawayRepository.getGuildGiveaways(interaction.guild.id, {
        status: status === 'all' ? null : status,
        page: pageIndex + 1,
        limit: perPage,
      });

      return {
        title: `${EMOJIS.GIVEAWAY} ${interaction.guild.name} Giveaways`,
        color: COLORS.PRIMARY,
        description: gws.data.map((g, i) => {
          const statusEmoji = {
            active: '🟢',
            ended: '🔴',
            scheduled: '🟡',
            cancelled: '⚫',
            rerolled: '🔵',
          }[g.status] || '⚪';

          const timeField = g.status === 'active' ? g.endsAt : g.status === 'scheduled' ? g.startsAt : g.endedAt;
          const timeLabel = g.status === 'active' ? 'Ends' : g.status === 'scheduled' ? 'Starts' : 'Ended';

          return `${statusEmoji} **${g.prize}**\n` +
            `   ${timeLabel}: <t:${Math.floor(timeField.getTime() / 1000)}:R>\n` +
            `   Winners: ${g.winners} | Entries: ${g.entryCount} | ID: \`${g.messageId}\``;
        }).join('\n\n'),
        timestamp: new Date(),
        footer: { text: `Page ${pageIndex + 1} of ${totalPages} • Total: ${giveaways.total} • Status: ${status}` },
      };
    };

    const generateButtons = (pageIndex) => {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('glist_first')
          .setLabel('⏮️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('glist_prev')
          .setLabel('◀️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('glist_next')
          .setLabel('▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === totalPages - 1),
        new ButtonBuilder()
          .setCustomId('glist_last')
          .setLabel('⏭️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === totalPages - 1)
      );
      return row;
    };

    const reply = await interaction.reply({
      embeds: [await generateEmbed(page)],
      components: totalPages > 1 ? [generateButtons(page)] : [],
      fetchReply: true,
      ephemeral: true,
    });

    if (totalPages <= 1) return;

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async i => {
      switch (i.customId) {
        case 'glist_first':
          page = 0;
          break;
        case 'glist_prev':
          page = Math.max(0, page - 1);
          break;
        case 'glist_next':
          page = Math.min(totalPages - 1, page + 1);
          break;
        case 'glist_last':
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