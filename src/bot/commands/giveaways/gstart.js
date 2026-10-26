/**
 * Giveaway Start Command - Create a new giveaway
 */
import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { giveawayRepository } from '../../database/repositories/GiveawayRepository.js';
import { guildService } from '../../services/guild.service.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';
import { parseTime } from '../../utils/time.js';

export default {
  data: new SlashCommandBuilder()
    .setName('gstart')
    .setDescription('Start a new giveaway')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to host the giveaway')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration of the giveaway (e.g., 1h, 1d, 1w)')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('winners')
        .setDescription('Number of winners')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(LIMITS.GIVEAWAY_MAX_WINNERS)
    )
    .addStringOption(option =>
      option.setName('prize')
        .setDescription('Prize for the giveaway')
        .setRequired(true)
        .setMaxLength(200)
    )
    .addRoleOption(option =>
      option.setName('required_role')
        .setDescription('Required role to enter')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('required_level')
        .setDescription('Minimum level to enter')
        .setRequired(false)
        .setMinValue(0)
    )
    .addIntegerOption(option =>
      option.setName('account_age')
        .setDescription('Minimum account age in days')
        .setRequired(false)
      .setMinValue(0)
    )
    .addIntegerOption(option =>
      option.setName('server_age')
        .setDescription('Minimum server age in days')
        .setRequired(false)
        .setMinValue(0)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  category: 'giveaways',
  cooldown: 10,
  permissions: { user: ['ManageGuild'], bot: ['SendMessages', 'EmbedLinks', 'AddReactions', 'ManageMessages'] },
  guildOnly: true,

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const durationStr = interaction.options.getString('duration');
    const winners = interaction.options.getInteger('winners');
    const prize = interaction.options.getString('prize');
    const requiredRole = interaction.options.getRole('required_role');
    const requiredLevel = interaction.options.getInteger('required_level') || 0;
    const accountAge = (interaction.options.getInteger('account_age') || 0) * 24 * 60 * 60 * 1000;
    const serverAge = (interaction.options.getInteger('server_age') || 0) * 24 * 60 * 60 * 1000;

    const settings = await guildService.getGuild(interaction.guild.id);
    const giveawaySettings = settings?.giveaways || {};

    if (!giveawaySettings.enabled) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Giveaways are not enabled for this server.`,
        ephemeral: true,
      });
    }

    // Parse duration
    const duration = parseTime(durationStr);
    if (!duration || duration > LIMITS.GIVEAWAY_MAX_DURATION) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Invalid duration. Maximum is 90 days. Use format like 1h, 1d, 1w.`,
        ephemeral: true,
      });
    }

    const endsAt = new Date(Date.now() + duration);

    await interaction.deferReply({ ephemeral: true });

    try {
      // Create giveaway message
      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.GIVEAWAY} ${prize}`)
        .setColor(COLORS.PRIMARY)
        .setDescription(
          `React with 🎉 to enter!\n` +
          `**Hosted by:** ${interaction.user}\n` +
          `**Winners:** ${winners}\n` +
          `**Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R> (<t:${Math.floor(endsAt.getTime() / 1000)}:F>)\n` +
          (requiredRole ? `**Required Role:** ${requiredRole}\n` : '') +
          (requiredLevel ? `**Required Level:** ${requiredLevel}+\n` : '') +
          (accountAge ? `**Min Account Age:** ${Math.floor(accountAge / 86400000)} days\n` : '') +
          (serverAge ? `**Min Server Age:** ${Math.floor(serverAge / 86400000)} days\n` : '')
        )
        .setTimestamp(endsAt)
        .setFooter({ text: 'Giveaway ends' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('giveaway_enter')
          .setLabel('Enter Giveaway')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎉')
      );

      const message = await channel.send({
        embeds: [embed],
        components: [row],
      });

      // Create giveaway in database
      const giveaway = await giveawayRepository.create({
        guildId: interaction.guild.id,
        channelId: channel.id,
        messageId: message.id,
        hostId: interaction.user.id,
        prize,
        winners,
        endsAt,
        status: 'active',
        requirements: {
          requiredRole: requiredRole?.id || null,
          requiredLevel,
          accountAge,
          serverAge,
        },
        entries: [],
        entryCount: 0,
        blacklistedRoles: giveawaySettings.blacklistedRoles || [],
      });

      // Schedule end
      scheduleGiveawayEnd(giveaway, client);

      eventBus.emit(EVENTS.GIVEAWAY_START, { guildId: interaction.guild.id, giveawayId: giveaway._id, hostId: interaction.user.id });

      await interaction.editReply({
        content: `${EMOJIS.SUCCESS} Giveaway started in ${channel}!`,
      });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to start giveaway: ${error.message}`,
      });
    }
  },
};

function scheduleGiveawayEnd(giveaway, client) {
  const delay = giveaway.endsAt.getTime() - Date.now();
  if (delay <= 0) return;

  setTimeout(async () => {
    await endGiveaway(giveaway.messageId, client);
  }, delay);
}

async function endGiveaway(messageId, client) {
  const giveaway = await giveawayRepository.getByMessageId(messageId);
  if (!giveaway || giveaway.status !== 'active') return;

  try {
    const channel = await client.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(messageId);

    // Pick winners
    const entries = giveaway.entries || [];
    const eligibleEntries = entries; // Would filter by requirements here

    if (eligibleEntries.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.GIVEAWAY} ${giveaway.prize} (ENDED)`)
        .setColor(COLORS.DEFAULT)
        .setDescription('No valid entries! No winners selected.')
        .setTimestamp();

      await message.edit({ embeds: [embed], components: [] });
      await giveawayRepository.end(messageId, []);
      return;
    }

    // Shuffle and pick winners
    const shuffled = [...eligibleEntries].sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, giveaway.winners).map(e => e.userId);

    // End giveaway
    await giveawayRepository.end(messageId, winners);

    // Announce winners
    const winnerMentions = winners.map(w => `<@${w}>`).join(', ');
    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.GIVEAWAY} ${giveaway.prize} (ENDED)`)
      .setColor(COLORS.SUCCESS)
      .setDescription(
        `**Winner(s):** ${winnerMentions}\n` +
        `**Entries:** ${giveaway.entryCount}\n` +
        `Congratulations!`
      )
      .setTimestamp();

    await message.edit({ embeds: [embed], components: [] });

    // DM winners
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
      } catch (e) {
        // Ignore DM failures
      }
    }

    eventBus.emit(EVENTS.GIVEAWAY_END, { guildId: giveaway.guildId, giveawayId: giveaway._id, winners });
  } catch (error) {
    console.error('Failed to end giveaway:', error);
  }
}