/**
 * Starboard Command - Configure and view starboard
 */
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { StarboardEntry } from '../../database/models/StarboardEntry.js';
import { guildService } from '../../services/guild.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Configure and view starboard')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Set up the starboard')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Starboard channel')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('emoji')
            .setDescription('Star emoji (default: ⭐)')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('threshold')
            .setDescription('Minimum stars required (default: 5)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('Configure starboard settings')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable/disable starboard')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('emoji')
            .setDescription('Star emoji')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('threshold')
            .setDescription('Minimum stars required')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(100)
        )
        .addBooleanOption(option =>
          option.setName('self_star')
            .setDescription('Allow self-starring')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option.setName('nsfw_only')
            .setDescription('Only star NSFW messages')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option.setName('require_image')
            .setDescription('Only star messages with images')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option.setName('links')
            .setDescription('Allow messages with links')
            .setRequired(false)
        )
        .addChannelOption(option =>
          option.setName('ignored_channel')
            .setDescription('Channel to ignore')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current starboard settings')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('top')
        .setDescription('View top starred messages')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of messages to show (default: 10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable the starboard')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  category: 'starboard',
  cooldown: 10,
  permissions: { user: ['ManageGuild'], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'setup':
        await handleSetup(interaction);
        break;
      case 'settings':
        await handleSettings(interaction);
        break;
      case 'view':
        await handleView(interaction);
        break;
      case 'top':
        await handleTop(interaction);
        break;
      case 'disable':
        await handleDisable(interaction);
        break;
    }
  },
};

async function handleSetup(interaction) {
  const channel = interaction.options.getChannel('channel');
  const emoji = interaction.options.getString('emoji') || '⭐';
  const threshold = interaction.options.getInteger('threshold') || 5;

  await guildService.updateSettings(interaction.guild.id, {
    'starboard.enabled': true,
    'starboard.channel': channel.id,
    'starboard.emoji': emoji,
    'starboard.threshold': threshold,
  });

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Starboard Configured`)
    .setColor(COLORS.SUCCESS)
    .addFields(
      { name: 'Channel', value: `${channel}`, inline: true },
      { name: 'Emoji', value: emoji, inline: true },
      { name: 'Threshold', value: threshold.toString(), inline: true },
      { name: 'Status', value: 'Enabled', inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleSettings(interaction) {
  const enabled = interaction.options.getBoolean('enabled');
  const emoji = interaction.options.getString('emoji');
  const threshold = interaction.options.getInteger('threshold');
  const selfStar = interaction.options.getBoolean('self_star');
  const nsfwOnly = interaction.options.getBoolean('nsfw_only');
  const requireImage = interaction.options.getBoolean('require_image');
  const links = interaction.options.getBoolean('links');
  const ignoredChannel = interaction.options.getChannel('ignored_channel');

  const updates = {};
  if (enabled !== null) updates['starboard.enabled'] = enabled;
  if (emoji) updates['starboard.emoji'] = emoji;
  if (threshold) updates['starboard.threshold'] = threshold;
  if (selfStar !== null) updates['starboard.selfStar'] = selfStar;
  if (nsfwOnly !== null) updates['starboard.nsfwOnly'] = nsfwOnly;
  if (requireImage !== null) updates['starboard.requireImage'] = requireImage;
  if (links !== null) updates['starboard.links'] = links;
  if (ignoredChannel) {
    await guildService.pushToArraySetting(interaction.guild.id, 'starboard.ignoredChannels', ignoredChannel.id);
  }

  if (Object.keys(updates).length > 0) {
    await guildService.updateSettings(interaction.guild.id, updates);
  }

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Starboard Settings Updated`)
    .setColor(COLORS.SUCCESS)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleView(interaction) {
  const settings = await guildService.getGuild(interaction.guild.id);
  const s = settings?.starboard || {};

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.STARBOARD} Starboard Settings`)
    .setColor(COLORS.INFO)
    .addFields(
      { name: 'Enabled', value: s.enabled ? 'Yes' : 'No', inline: true },
      { name: 'Channel', value: s.channel ? `<#${s.channel}>` : 'Not set', inline: true },
      { name: 'Emoji', value: s.emoji || '⭐', inline: true },
      { name: 'Threshold', value: (s.threshold || 5).toString(), inline: true },
      { name: 'Self Star', value: s.selfStar ? 'Yes' : 'No', inline: true },
      { name: 'NSFW Only', value: s.nsfwOnly ? 'Yes' : 'No', inline: true },
      { name: 'Require Image', value: s.requireImage ? 'Yes' : 'No', inline: true },
      { name: 'Allow Links', value: s.links ? 'Yes' : 'No', inline: true },
      { name: 'Ignored Channels', value: s.ignoredChannels?.length ? s.ignoredChannels.map(c => `<#${c}>`).join(', ') : 'None', inline: false },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTop(interaction) {
  const limit = interaction.options.getInteger('limit') || 10;

  const entries = await StarboardEntry.getTopStarred(interaction.guild.id, limit);

  if (entries.length === 0) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} No starred messages found.`,
      ephemeral: true,
    });
  }

  // Pagination
  let page = 0;
  const perPage = 5;
  const totalPages = Math.ceil(entries.length / perPage);

  const generateEmbed = (pageIndex) => {
    const start = pageIndex * perPage;
    const end = start + perPage;
    const pageEntries = entries.slice(start, end);

    return {
      title: `${EMOJIS.STARBOARD} Top Starred Messages`,
      color: COLORS.STARBOARD,
      description: pageEntries.map((entry, i) => {
        const stars = entry.starCount;
        const author = entry.authorId ? `<@${entry.authorId}>` : 'Unknown';
        const channel = entry.channelId ? `<#${entry.channelId}>` : 'Unknown';
        const link = `https://discord.com/channels/${interaction.guild.id}/${entry.channelId}/${entry.messageId}`;

        let content = entry.content || '*No text content*';
        if (content.length > 500) content = content.substring(0, 500) + '...';

        return `${start + i + 1}. **${stars} ${EMOJIS.STAR}** — ${author} in ${channel}\n${content}\n[Jump to message](${link})`;
      }).join('\n\n'),
      timestamp: new Date(),
      footer: { text: `Page ${pageIndex + 1} of ${totalPages}` },
    };
  };

  const generateButtons = (pageIndex) => {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('starboard_top_first')
        .setLabel('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === 0),
      new ButtonBuilder()
        .setCustomId('starboard_top_prev')
        .setLabel('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === 0),
      new ButtonBuilder()
        .setCustomId('starboard_top_next')
        .setLabel('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === totalPages - 1),
      new ButtonBuilder()
        .setCustomId('starboard_top_last')
        .setLabel('⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === totalPages - 1)
    );
    return row;
  };

  const reply = await interaction.reply({
    embeds: [generateEmbed(page)],
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
      case 'starboard_top_first':
        page = 0;
        break;
      case 'starboard_top_prev':
        page = Math.max(0, page - 1);
        break;
      case 'starboard_top_next':
        page = Math.min(totalPages - 1, page + 1);
        break;
      case 'starboard_top_last':
        page = totalPages - 1;
        break;
    }
    await i.update({
      embeds: [generateEmbed(page)],
      components: [generateButtons(page)],
    });
  });

  collector.on('end', async () => {
    const disabledButtons = generateButtons(page).components.map(btn => ButtonBuilder.from(btn).setDisabled(true));
    await interaction.editReply({
      components: [new ActionRowBuilder().addComponents(disabledButtons)],
    }).catch(() => {});
  });
}

async function handleDisable(interaction) {
  await guildService.updateSettings(interaction.guild.id, {
    'starboard.enabled': false,
  });

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Starboard Disabled`)
    .setColor(COLORS.SUCCESS)
    .setDescription('The starboard has been disabled for this server.')
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}