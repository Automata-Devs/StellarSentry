/**
 * 8Ball Command - Ask the magic 8-ball a question
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';

const responses = [
  // Positive
  'It is certain.',
  'It is decidedly so.',
  'Without a doubt.',
  'Yes, definitely.',
  'You may rely on it.',
  'As I see it, yes.',
  'Most likely.',
  'Outlook good.',
  'Yes.',
  'Signs point to yes.',

  // Neutral
  'Reply hazy, try again.',
  'Ask again later.',
  'Better not tell you now.',
  'Cannot predict now.',
  'Concentrate and ask again.',

  // Negative
  "Don't count on it.",
  'My reply is no.',
  'My sources say no.',
  'Outlook not so good.',
  'Very doubtful.',
];

export default {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('Your question for the 8-ball')
        .setRequired(true)
        .setMaxLength(500)
    ),

  category: 'fun',
  cooldown: 5,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const question = interaction.options.getString('question');
    const answer = responses[Math.floor(Math.random() * responses.length)];

    // Determine color based on answer type
    let color = COLORS.INFO;
    const positiveAnswers = responses.slice(0, 10);
    const negativeAnswers = responses.slice(20);

    if (positiveAnswers.includes(answer)) color = COLORS.SUCCESS;
    else if (negativeAnswers.includes(answer)) color = COLORS.ERROR;
    else color = COLORS.WARNING;

    await interaction.reply({
      embeds: [{
        title: `${EMOJIS.INFO} Magic 8-Ball`,
        color,
        fields: [
          { name: 'Question', value: question, inline: false },
          { name: 'Answer', value: answer, inline: false },
        ],
        timestamp: new Date(),
        footer: { text: `Asked by ${interaction.user.tag}` },
      }],
    });
  },
};