/**
 * Giveaway Reroll Command - Reroll winners for a giveaway
 */
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { giveawayRepository } from '../../database/repositories/GiveawayRepository.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';

export default {
  data: new SlashCommandBuilder()
    .setName('greroll')
    .setDescription('Reroll winners for a giveaway')
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The message ID of the giveaway to reroll')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('winners')
        .setDescription('Number of new winners to pick (default: same as original)')
        .setRequired(false)
        .setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  category: 'giveaways',
  cooldown: 5,
  permissions: { user: ['ManageGuild'], bot: ['SendMessages', 'EmbedLinks', 'ManageMessages'] },
  guildOnly: true,

  async execute(interaction, client) {
    const messageId = interaction.options.getString('message_id');
    const newWinnerCount = interaction.options.getInteger('winners');

    await interaction.deferReply({ ephemeral: true });

    try {
      const giveaway = await giveawayRepository.getByMessageId(messageId);

      if (!giveaway) {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} No giveaway found with that message ID.`,
        });
      }

      if (giveaway.guildId !== interaction.guild.id) {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} That giveaway is not in this server.`,
        });
      }

      if (!['ended', 'rerolled'].includes(giveaway.status)) {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} Can only reroll ended or rerolled giveaways.`,
        });
      }

      const entries = giveaway.entries || [];
      if (entries.length === 0) {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} No entries to reroll from.`,
        });
      }

      const winnerCount = newWinnerCount || giveaway.winners;
      const eligibleEntries = entries; // Would filter by requirements here

      if (eligibleEntries.length < winnerCount) {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} Not enough eligible entries for ${winnerCount} winners.`,
        });
      }

      // Pick new winners
      const shuffled = [...eligibleEntries].sort(() => Math.random() - 0.5);
      const winners = shuffled.slice(0, winnerCount).map(e => e.userId);

      // Update giveaway
      await giveawayRepository.reroll(messageId, winners);

      // Update message
      const channel = await client.channels.fetch(giveaway.channelId);
      const message = await channel.messages.fetch(messageId);

      const winnerMentions = winners.map(w => `<@${w}>`).join(', ');
      const embed = {
        title: `${EMOJIS.GIVEAWAY} ${giveaway.prize} (REROLLED)`,
        color: COLORS.SUCCESS,
        description: `**New Winner(s):** ${winnerMentions}\n**Entries:** ${giveaway.entryCount}\nCongratulations!`,
        timestamp: new Date(),
      };

      await message.edit({ embeds: [embed], components: [] });

      // DM new winners
      for (const winnerId of winners) {
        try {
          const user = await client.users.fetch(winnerId);
          await user.send({
            embeds: [{
              title: `${EMOJIS.GIVEAWAY} You Won (Reroll)!`,
              color: COLORS.SUCCESS,
              description: `You won **${giveaway.prize}** in ${channel.guild.name}!\nContact the host to claim your prize.`,
              timestamp: new Date(),
            }],
          });
        } catch (e) {}
      }

      eventBus.emit(EVENTS.GIVEAWAY_REROLL, { guildId: interaction.guild.id, giveawayId: giveaway._id, winners });

      await interaction.editReply({
        content: `${EMOJIS.SUCCESS} Giveaway rerolled! ${winnerCount} new winner(s) selected.`,
      });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to reroll giveaway: ${error.message}`,
      });
    }
  },
};