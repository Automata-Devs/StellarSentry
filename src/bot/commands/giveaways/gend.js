/**
 * Giveaway End Command - End a giveaway early
 */
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { giveawayRepository } from '../../database/repositories/GiveawayRepository.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';

export default {
  data: new SlashCommandBuilder()
    .setName('gend')
    .setDescription('End a giveaway early')
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The message ID of the giveaway to end')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  category: 'giveaways',
  cooldown: 5,
  permissions: { user: ['ManageGuild'], bot: ['SendMessages', 'EmbedLinks', 'ManageMessages'] },
  guildOnly: true,

  async execute(interaction, client) {
    const messageId = interaction.options.getString('message_id');

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

      if (giveaway.status !== 'active') {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} That giveaway is not active (status: ${giveaway.status}).`,
        });
      }

      // End the giveaway
      await endGiveaway(giveaway, client);

      eventBus.emit(EVENTS.GIVEAWAY_END, { guildId: interaction.guild.id, giveawayId: giveaway._id, winners: [] });

      await interaction.editReply({
        content: `${EMOJIS.SUCCESS} Giveaway ended early!`,
      });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to end giveaway: ${error.message}`,
      });
    }
  },
};

async function endGiveaway(giveaway, client) {
  try {
    const channel = await client.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(giveaway.messageId);

    const entries = giveaway.entries || [];

    if (entries.length === 0) {
      const embed = {
        title: `${EMOJIS.GIVEAWAY} ${giveaway.prize} (ENDED)`,
        color: COLORS.DEFAULT,
        description: 'No valid entries! No winners selected.',
        timestamp: new Date(),
      };

      await message.edit({ embeds: [embed], components: [] });
      await giveawayRepository.end(message.id, []);
      return;
    }

    const winners = [...entries].sort(() => Math.random() - 0.5).slice(0, giveaway.winners).map(e => e.userId);

    await giveawayRepository.end(message.id, winners);

    const winnerMentions = winners.map(w => `<@${w}>`).join(', ');
    const embed = {
      title: `${EMOJIS.GIVEAWAY} ${giveaway.prize} (ENDED)`,
      color: COLORS.SUCCESS,
      description: `**Winner(s):** ${winnerMentions}\n**Entries:** ${giveaway.entryCount}\nCongratulations!`,
      timestamp: new Date(),
    };

    await message.edit({ embeds: [embed], components: [] });

    for (const winnerId of winners) {
      try {
        const user = await client.users.fetch(winnerId);
        await user.send({
          embeds: [{
            title: `${EMOJIS.GIVEAWAY} You Won!`,
            color: COLORS.SUCCESS,
            description: `You won **${giveaway.prize}** in ${channel.guild.name}!\nContact the host to claim your prize.`,
            timestamp: new Date(),
          }],
        });
      } catch (e) {}
    }
  } catch (error) {
    console.error('Failed to end giveaway:', error);
  }
}