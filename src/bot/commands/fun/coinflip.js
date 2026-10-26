/**
 * Coinflip Command - Flip a coin
 */
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';

export default {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin')
    .addIntegerOption(option =>
      option.setName('flips')
        .setDescription('Number of coins to flip (1-10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    ),

  category: 'fun',
  cooldown: 5,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const flips = interaction.options.getInteger('flips') || 1;

    const results = [];
    for (let i = 0; i < flips; i++) {
      results.push(Math.random() < 0.5 ? 'Heads' : 'Tails');
    }

    const headsCount = results.filter(r => r === 'Heads').length;
    const tailsCount = results.filter(r => r === 'Tails').length;

    let description;
    if (flips === 1) {
      description = `The coin landed on **${results[0]}**! ${results[0] === 'Heads' ? '🦅' : '🦅'}`;
    } else {
      description = results.map((r, i) => `${i + 1}. ${r} ${r === 'Heads' ? '🦅' : '🦅'}`).join('\n');
    }

    const embed = {
      title: `${EMOJIS.INFO} Coin Flip`,
      color: COLORS.PRIMARY,
      description,
      fields: flips > 1 ? [
        { name: 'Heads', value: headsCount.toString(), inline: true },
        { name: 'Tails', value: tailsCount.toString(), inline: true },
        { name: 'Total', value: flips.toString(), inline: true },
      ] : [],
      timestamp: new Date(),
      footer: { text: `Flipped by ${interaction.user.tag}` },
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('coinflip_again')
        .setLabel('Flip Again')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄')
    );

    const reply = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async i => {
      if (i.customId === 'coinflip_again') {
        await i.deferUpdate();
        // Recursively call execute logic
        const newResults = [];
        for (let j = 0; j < flips; j++) {
          newResults.push(Math.random() < 0.5 ? 'Heads' : 'Tails');
        }

        const newHeads = newResults.filter(r => r === 'Heads').length;
        const newTails = newResults.filter(r => r === 'Tails').length;

        const newEmbed = {
          title: `${EMOJIS.INFO} Coin Flip`,
          color: COLORS.PRIMARY,
          description: flips === 1
            ? `The coin landed on **${newResults[0]}**! ${newResults[0] === 'Heads' ? '🦅' : '🦅'}`
            : newResults.map((r, idx) => `${idx + 1}. ${r} ${r === 'Heads' ? '🦅' : '🦅'}`).join('\n'),
          fields: flips > 1 ? [
            { name: 'Heads', value: newHeads.toString(), inline: true },
            { name: 'Tails', value: newTails.toString(), inline: true },
            { name: 'Total', value: flips.toString(), inline: true },
          ] : [],
          timestamp: new Date(),
          footer: { text: `Flipped by ${interaction.user.tag}` },
        };

        await interaction.editReply({ embeds: [newEmbed] });
      }
    });
  },
};