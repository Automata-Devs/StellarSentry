/**
 * Embed Command - Create a custom embed message
 */
import { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';

export default {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create a custom embed message')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to send the embed to')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Embed title')
        .setRequired(false)
        .setMaxLength(LIMITS.EMBED_TITLE_MAX)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Embed description')
        .setRequired(false)
        .setMaxLength(LIMITS.EMBED_DESCRIPTION_MAX)
    )
    .addStringOption(option =>
      option.setName('color')
        .setDescription('Embed color (hex code, e.g., #5865F2)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Image URL')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('thumbnail')
        .setDescription('Thumbnail URL')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('footer')
        .setDescription('Footer text')
        .setRequired(false)
        .setMaxLength(LIMITS.EMBED_FOOTER_MAX)
    )
    .addStringOption(option =>
      option.setName('author')
        .setDescription('Author name')
        .setRequired(false)
        .setMaxLength(LIMITS.EMBED_AUTHOR_NAME_MAX)
    )
    .addStringOption(option =>
      option.setName('author_icon')
        .setDescription('Author icon URL')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('timestamp')
        .setDescription('Include timestamp (default: true)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  category: 'utility',
  cooldown: 10,
  permissions: { user: ['ManageMessages'], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const colorStr = interaction.options.getString('color');
    const image = interaction.options.getString('image');
    const thumbnail = interaction.options.getString('thumbnail');
    const footer = interaction.options.getString('footer');
    const author = interaction.options.getString('author');
    const authorIcon = interaction.options.getString('author_icon');
    const timestamp = interaction.options.getBoolean('timestamp') !== false;

    // Validate color
    let color = COLORS.PRIMARY;
    if (colorStr) {
      const hexMatch = colorStr.match(/^#?([0-9A-Fa-f]{6})$/);
      if (hexMatch) {
        color = parseInt(hexMatch[1], 16);
      } else {
        return interaction.reply({
          content: `${EMOJIS.ERROR} Invalid color format. Use hex code like #5865F2.`,
          ephemeral: true,
        });
      }
    }

    // Check permissions
    if (!channel.permissionsFor(client.user).has('SendMessages')) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} I don't have permission to send messages in that channel.`,
        ephemeral: true,
      });
    }

    if (!channel.permissionsFor(client.user).has('EmbedLinks')) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} I don't have permission to embed links in that channel.`,
        ephemeral: true,
      });
    }

    // Build embed
    const embed = {
      color,
      timestamp: timestamp ? new Date() : undefined,
    };

    if (title) embed.title = title;
    if (description) embed.description = description;
    if (image) embed.image = { url: image };
    if (thumbnail) embed.thumbnail = { url: thumbnail };
    if (footer) embed.footer = { text: footer };
    if (author) {
      embed.author = { name: author };
      if (authorIcon) embed.author.icon_url = authorIcon;
    }

    // Send embed
    await channel.send({ embeds: [embed] });

    await interaction.reply({
      content: `${EMOJIS.SUCCESS} Embed sent to ${channel}!`,
      ephemeral: true,
    });
  },
};