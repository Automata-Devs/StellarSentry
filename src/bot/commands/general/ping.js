/**
 * Ping Command - Check bot latency
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and API response time'),

  category: 'general',
  cooldown: 5,
  permissions: { user: [], bot: [] },
  guildOnly: false,

  async execute(interaction, client) {
    const sent = await interaction.reply({
      content: `${EMOJIS.LOADING} Pinging...`,
      fetchReply: true,
      ephemeral: true,
    });

    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const ws = client.ws.ping;

    await interaction.editReply({
      content: null,
      embeds: [{
        title: `${EMOJIS.INFO} Pong!`,
        color: COLORS.PRIMARY,
        fields: [
          { name: 'Roundtrip', value: `${roundtrip}ms`, inline: true },
          { name: 'WebSocket', value: `${ws}ms`, inline: true },
          { name: 'Uptime', value: client.getFormattedUptime(), inline: true },
        ],
        timestamp: new Date(),
        footer: { text: `Requested by ${interaction.user.tag}` },
      }],
    });
  },
};