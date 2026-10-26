/**
 * ServerInfo Command - Display server information
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { guildService } from '../../services/guild.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display server information and statistics')
    .addSubcommand(subcommand =>
      subcommand
        .setName('current')
        .setDescription('Show info for the current server')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('id')
        .setDescription('Show info for a specific server by ID')
        .addStringOption(option =>
          option.setName('guild_id')
            .setDescription('The server ID to look up')
            .setRequired(true)
        )
    ),

  category: 'general',
  cooldown: 10,
  permissions: { user: [], bot: [] },
  guildOnly: false,

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    let guild;

    if (subcommand === 'current') {
      if (!interaction.guild) {
        return interaction.reply({
          content: `${EMOJIS.ERROR} This command can only be used in a server.`,
          ephemeral: true,
        });
      }
      guild = interaction.guild;
    } else {
      const guildId = interaction.options.getString('guild_id');
      guild = await client.getGuild(guildId);
      if (!guild) {
        return interaction.reply({
          content: `${EMOJIS.ERROR} Could not find a server with that ID.`,
          ephemeral: true,
        });
      }
    }

    const owner = await client.getMember(guild.id, guild.ownerId);
    const memberCount = guild.memberCount;
    const botCount = guild.members.cache.filter(m => m.user.bot).size;
    const humanCount = memberCount - botCount;
    const channelCount = guild.channels.cache.size;
    const roleCount = guild.roles.cache.size;
    const emojiCount = guild.emojis.cache.size;
    const stickerCount = guild.stickers.cache.size;
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;

    // Get guild settings from database
    const settings = await guildService.getGuild(guild.id);
    const enabledFeatures = settings ? Object.entries(settings.features || {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => key)
      .join(', ') : 'None';

    const verificationLevels = ['None', 'Low', 'Medium', 'High', 'Very High'];
    const verificationLevel = verificationLevels[guild.verificationLevel] || 'Unknown';

    const features = guild.features.map(f => f.replace(/_/g, ' ').toLowerCase()).join(', ') || 'None';

    await interaction.reply({
      embeds: [{
        title: `${EMOJIS.SERVER} ${guild.name}`,
        color: COLORS.PRIMARY,
        thumbnail: { url: guild.iconURL({ size: 256 }) || null },
        image: { url: guild.bannerURL({ size: 1024 }) || null },
        fields: [
          { name: 'ID', value: guild.id, inline: true },
          { name: 'Owner', value: owner ? `${owner.user.tag} (${owner.id})` : 'Unknown', inline: true },
          { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
          { name: 'Members', value: `${memberCount} (${humanCount} humans, ${botCount} bots)`, inline: true },
          { name: 'Channels', value: channelCount.toString(), inline: true },
          { name: 'Roles', value: roleCount.toString(), inline: true },
          { name: 'Emojis', value: emojiCount.toString(), inline: true },
          { name: 'Stickers', value: stickerCount.toString(), inline: true },
          { name: 'Boost Level', value: `Level ${boostLevel} (${boostCount} boosts)`, inline: true },
          { name: 'Verification', value: verificationLevel, inline: true },
          { name: 'Features', value: features.length > 1024 ? features.substring(0, 1021) + '...' : features, inline: false },
          { name: 'Enabled Bot Features', value: enabledFeatures || 'None', inline: false },
        ],
        timestamp: new Date(),
        footer: { text: `Requested by ${interaction.user.tag}` },
      }],
    });
  },
};