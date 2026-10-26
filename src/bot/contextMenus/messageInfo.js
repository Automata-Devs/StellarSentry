/**
 * Message Info Context Menu - Right-click message to get info
 */
import { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';

export default {
  data: new ContextMenuCommandBuilder()
    .setName('Message Info')
    .setType(ApplicationCommandType.Message),

  category: 'utility',
  cooldown: 5,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const message = interaction.targetMessage;

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.INFO} Message Information`)
      .setColor(COLORS.PRIMARY)
      .setDescription(message.content || '*No text content*')
      .addFields(
        { name: 'Author', value: `${message.author.tag} (${message.author.id})`, inline: true },
        { name: 'Channel', value: `${message.channel}`, inline: true },
        { name: 'Sent', value: `<t:${Math.floor(message.createdTimestamp / 1000)}:F>`, inline: true },
        { name: 'Edited', value: message.editedAt ? `<t:${Math.floor(message.editedTimestamp / 1000)}:F>` : 'Never', inline: true },
        { name: 'Message ID', value: `\`${message.id}\``, inline: true },
        { name: 'Link', value: `[Jump to message](${message.url})`, inline: true },
      )
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `Requested by ${interaction.user.tag}` });

    if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      if (attachment.contentType?.startsWith('image/')) {
        embed.setImage(attachment.url);
      }
      embed.addFields({ name: 'Attachments', value: message.attachments.map(a => `[${a.name}](${a.url})`).join('\n'), inline: false });
    }

    if (message.embeds.length > 0) {
      embed.addFields({ name: 'Embeds', value: `${message.embeds.length} embed(s)`, inline: true });
    }

    if (message.reference) {
      embed.addFields({ name: 'Reply to', value: `<#${message.channelId}> (${message.reference.messageId})`, inline: true });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};