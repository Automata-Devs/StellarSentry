/**
 * BotInfo Command - Display bot information and statistics
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { env } from '../../config/env.js';
import { version } from '../../../../package.json';

export default {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Display bot information and statistics'),

  category: 'general',
  cooldown: 10,
  permissions: { user: [], bot: [] },
  guildOnly: false,

  async execute(interaction, client) {
    const totalGuilds = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const totalChannels = client.channels.cache.size;
    const cacheStats = client.getCacheStats();

    const memoryUsage = process.memoryUsage();
    const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

    const nodeVersion = process.version;
    const discordJsVersion = '14.15.3';

    await interaction.reply({
      embeds: [{
        title: `${EMOJIS.BOT} StellarSentry Bot Information`,
        color: COLORS.PRIMARY,
        thumbnail: { url: client.user.displayAvatarURL({ size: 256 }) },
        fields: [
          { name: 'Version', value: `v${version}`, inline: true },
          { name: 'Node.js', value: nodeVersion, inline: true },
          { name: 'discord.js', value: discordJsVersion, inline: true },
          { name: 'Servers', value: totalGuilds.toLocaleString(), inline: true },
          { name: 'Users', value: totalUsers.toLocaleString(), inline: true },
          { name: 'Channels', value: totalChannels.toLocaleString(), inline: true },
          { name: 'Memory Usage', value: `${memoryMB} MB`, inline: true },
          { name: 'Uptime', value: client.getFormattedUptime(), inline: true },
          { name: 'Ping', value: `${client.ws.ping}ms`, inline: true },
          { name: 'Cached Guilds', value: cacheStats.guilds.toString(), inline: true },
          { name: 'Cached Users', value: cacheStats.users.toString(), inline: true },
          { name: 'Cached Channels', value: cacheStats.channels.toString(), inline: true },
        ],
        timestamp: new Date(),
        footer: { text: `StellarSentry v${version} • Made with ❤️` },
      }],
    });
  },
};