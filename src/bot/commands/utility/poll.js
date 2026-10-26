/**
 * Poll Command - Create a poll
 */
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';

export default {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The poll question')
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption(option =>
      option.setName('options')
        .setDescription('Poll options separated by | (max 10)')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Poll duration in minutes (default: 5)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10080) // 1 week
    )
    .addBooleanOption(option =>
      option.setName('anonymous')
        .setDescription('Hide voter identities (default: false)')
      .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to post the poll (defaults to current)')
        .setRequired(false)
    ),

  category: 'utility',
  cooldown: 10,
  permissions: { user: [], bot: ['SendMessages', 'AddReactions'] },
  guildOnly: true,

  async execute(interaction, client) {
    const question = interaction.options.getString('question');
    const optionsStr = interaction.options.getString('options');
    const duration = (interaction.options.getInteger('duration') || 5) * 60 * 1000;
    const anonymous = interaction.options.getBoolean('anonymous') || false;
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    const options = optionsStr.split('|').map(o => o.trim()).filter(Boolean);

    if (options.length < 2) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Please provide at least 2 options separated by \`|\``,
        ephemeral: true,
      });
    }

    if (options.length > 10) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Maximum 10 options allowed.`,
        ephemeral: true,
      });
    }

    const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    const embed = {
      title: `${EMOJIS.SUGGESTION} ${question}`,
      color: COLORS.PRIMARY,
      description: options.map((opt, i) => `${optionEmojis[i]} ${opt}`).join('\n'),
      fields: [
        { name: 'Created by', value: `${interaction.user}`, inline: true },
        { name: 'Ends', value: `<t:${Math.floor((Date.now() + duration) / 1000)}:R>`, inline: true },
        { name: 'Anonymous', value: anonymous ? 'Yes' : 'No', inline: true },
      ],
      timestamp: new Date(),
      footer: { text: `Poll ID: ${interaction.id}` },
    };

    const rows = [];
    for (let i = 0; i < options.length; i += 5) {
      const row = new ActionRowBuilder();
      for (let j = i; j < Math.min(i + 5, options.length); j++) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`poll_vote_${interaction.id}_${j}`)
            .setLabel(options[j].substring(0, 80))
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(optionEmojis[j])
        );
      }
      rows.push(row);
    }

    // Add end poll button for creator
    const endRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`poll_end_${interaction.id}`)
        .setLabel('End Poll')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🛑')
    );
    rows.push(endRow);

    const pollMessage = await channel.send({
      embeds: [embed],
      components: rows,
    });

    // Store poll data for vote tracking
    const pollData = {
      messageId: pollMessage.id,
      channelId: channel.id,
      guildId: interaction.guild.id,
      question,
      options,
      votes: new Map(), // userId -> optionIndex
      anonymous,
      creatorId: interaction.user.id,
      endsAt: Date.now() + duration,
      ended: false,
    };

    // Store in client for vote tracking (in production, use database)
    if (!client.polls) client.polls = new Map();
    client.polls.set(pollMessage.id, pollData);

    // Schedule poll end
    setTimeout(async () => {
      await endPoll(pollMessage.id, client);
    }, duration);

    await interaction.reply({
      content: `${EMOJIS.SUCCESS} Poll created in ${channel}!`,
      ephemeral: true,
    });
  },
};

async function endPoll(messageId, client) {
  const poll = client.polls?.get(messageId);
  if (!poll || poll.ended) return;

  poll.ended = true;

  try {
    const channel = await client.channels.fetch(poll.channelId);
    const message = await channel.messages.fetch(messageId);

    // Count votes
    const voteCounts = new Array(poll.options.length).fill(0);
    for (const [userId, optionIndex] of poll.votes) {
      if (optionIndex >= 0 && optionIndex < voteCounts.length) {
        voteCounts[optionIndex]++;
      }
    }

    // Find winner(s)
    const maxVotes = Math.max(...voteCounts);
    const winners = voteCounts
      .map((count, index) => ({ index, count }))
      .filter(w => w.count === maxVotes && maxVotes > 0);

    const embed = {
      title: `${EMOJIS.SUGGESTION} ${poll.question} (ENDED)`,
      color: COLORS.DEFAULT,
      description: poll.options.map((opt, i) => {
        const percentage = poll.votes.size > 0 ? ((voteCounts[i] / poll.votes.size) * 100).toFixed(1) : 0;
        const bar = '█'.repeat(Math.round(percentage / 5));
        return `${i + 1}. ${opt}\n${bar} ${voteCounts[i]} votes (${percentage}%)`;
      }).join('\n\n'),
      fields: [
        { name: 'Total Votes', value: poll.votes.size.toString(), inline: true },
        { name: 'Winner', value: winners.length > 0
          ? winners.map(w => `${w.index + 1}. ${poll.options[w.index]}`).join(', ')
          : 'No votes', inline: true },
      ],
      timestamp: new Date(),
      footer: { text: `Poll ended • ID: ${messageId}` },
    };

    await message.edit({
      embeds: [embed],
      components: [],
    });
  } catch (error) {
    console.error('Failed to end poll:', error);
  }
}