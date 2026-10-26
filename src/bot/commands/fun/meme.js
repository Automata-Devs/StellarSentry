/**
 * Meme Command - Get a random meme from Reddit
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';

const MEME_SUBREDDITS = [
  'memes',
  'dankmemes',
  'me_irl',
  'wholesomememes',
  'programmingmemes',
  'discordmemes',
];

export default {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme from Reddit')
    .addStringOption(option =>
      option.setName('subreddit')
        .setDescription('Subreddit to get meme from')
        .setRequired(false)
        .addChoices(
          MEME_SUBREDDITS.map(s => ({ name: `r/${s}`, value: s }))
        )
    ),

  category: 'fun',
  cooldown: 10,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const subreddit = interaction.options.getString('subreddit') || MEME_SUBREDDITS[Math.floor(Math.random() * MEME_SUBREDDITS.length)];

    await interaction.deferReply();

    try {
      const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=100`, {
        headers: { 'User-Agent': 'StellarSentry/1.0' },
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`);
      }

      const data = await response.json();
      const posts = data.data.children
        .map(c => c.data)
        .filter(p => p.post_hint === 'image' || p.url.match(/\.(jpg|jpeg|png|gif|webp)$/i))
        .filter(p => !p.over_18); // Filter NSFW

      if (posts.length === 0) {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} No suitable memes found in r/${subreddit}.`,
        });
      }

      const post = posts[Math.floor(Math.random() * posts.length)];

      const embed = {
        title: post.title.substring(0, 256),
        color: COLORS.PRIMARY,
        url: `https://reddit.com${post.permalink}`,
        image: { url: post.url },
        fields: [
          { name: 'Subreddit', value: `r/${subreddit}`, inline: true },
          { name: 'Upvotes', value: post.ups.toLocaleString(), inline: true },
          { name: 'Comments', value: post.num_comments.toLocaleString(), inline: true },
        ],
        timestamp: new Date(),
        footer: { text: `Posted by u/${post.author} • StellarSentry` },
      };

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to fetch meme: ${error.message}`,
      });
    }
  },
};