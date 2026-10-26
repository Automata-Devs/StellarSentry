# Adding a New Slash Command

This guide walks you through adding a new slash command to StellarSentry.

---

## Quick Overview

Commands are **auto-loaded** from the filesystem. To add a command:

1. Create a file in the appropriate category folder
2. Export a command object with required properties
3. Run `npm run deploy:commands` to register with Discord

---

## Step-by-Step

### 1. Choose Category

Commands are organized by category in `src/bot/commands/`:

```
src/bot/commands/
├── general/        # ping, help, botinfo, serverinfo, userinfo, avatar
├── moderation/     # ban, kick, timeout, warn, warnings, purge, slowmode, lock, unlock
├── utility/        # poll, remind, embed, suggest-config
├── fun/            # 8ball, coinflip, meme, rps
├── economy/        # balance, daily, work, pay, shop, buy, inventory, leaderboard
├── leveling/       # rank, leaderboard, setxp
├── tickets/        # ticket setup/close/add/remove
├── giveaways/      # gstart, gend, greroll, glist
├── suggestions/    # suggest, approve, deny, consider
├── starboard/      # starboard config helpers
├── music/          # play, pause, resume, skip, stop, queue, nowplaying, volume, loop, shuffle, seek, filters
└── admin/          # config, setup, reload
```

Choose the appropriate category or create a new folder.

---

### 2. Create Command File

Create a new file in the chosen category folder:

```javascript
// src/bot/commands/moderation/purge.js
/**
 * Purge Command - Delete messages in bulk
 */
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { moderationService } from '../../services/moderation.service.js';
import { guildService } from '../../services/guild.service.js';

export default {
  // Required: SlashCommandBuilder with name and description
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete messages in bulk')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription(`Number of messages to delete (1-${LIMITS.PURGE_MAX})`)
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(LIMITS.PURGE_MAX)
    )
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('contains')
        .setDescription('Only delete messages containing this text')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('bots')
        .setDescription('Only delete messages from bots')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to purge (defaults to current channel)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  // Required: Category for help menu organization
  category: 'moderation',

  // Optional: Cooldown in seconds (default: 5)
  cooldown: 10,

  // Optional: Required permissions
  permissions: { 
    user: ['ManageMessages'], 
    bot: ['ManageMessages', 'ReadMessageHistory'] 
  },

  // Optional: Guild only (default: true)
  guildOnly: true,

  // Required: Execute function
  async execute(interaction, client) {
    // Defer reply for potentially long operations
    await interaction.deferReply({ ephemeral: true });

    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');
    const contains = interaction.options.getString('contains');
    const bots = interaction.options.getBoolean('bots');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    // Validation
    if (!channel.isTextBased()) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} This command can only be used in text channels.`,
      });
    }

    // Permission checks
    if (!channel.permissionsFor(client.user).has('ManageMessages')) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} I don't have permission to manage messages in that channel.`,
      });
    }

    try {
      // Call service layer for business logic
      const filter = {};
      if (user) filter.user = user.id;
      if (contains) filter.contains = contains;
      if (bots !== undefined) filter.bots = bots;

      const result = await moderationService.purge({
        channel,
        moderator: interaction.member,
        amount,
        filter,
      });

      // Get case number from settings
      const settings = await guildService.getGuild(interaction.guild.id);
      const caseNumber = settings?.moderation?.caseNumber || 0;

      // Send success response
      await interaction.editReply({
        embeds: [{
          title: `${EMOJIS.SUCCESS} Messages Purged`,
          color: COLORS.SUCCESS,
          fields: [
            { name: 'Channel', value: `${channel}`, inline: true },
            { name: 'Deleted', value: result.deleted.toString(), inline: true },
            { name: 'Case', value: `#${caseNumber}`, inline: true },
          ],
          timestamp: new Date(),
          footer: { text: `StellarSentry Moderation` },
        }],
      });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to purge messages: ${error.message}`,
      });
    }
  },

  // Optional: Autocomplete for dynamic options
  async autocomplete(interaction, client) {
    const focused = interaction.options.getFocused(true);
    
    // Example: Autocomplete for user search
    if (focused.name === 'user') {
      const members = interaction.guild.members.cache
        .filter(m => m.user.username.toLowerCase().includes(focused.value.toLowerCase()))
        .slice(0, 25)
        .map(m => ({ name: m.user.tag, value: m.user.id }));
      
      await interaction.respond(members);
    }
  },
};
```

---

### 3. Command Structure Reference

| Property | Required | Type | Description |
|----------|----------|------|-------------|
| `data` | ✅ | `SlashCommandBuilder` | Command definition |
| `category` | ✅ | `string` | Category for help menu |
| `cooldown` | ❌ | `number` | Seconds between uses (default: 5) |
| `permissions` | ❌ | `object` | `{ user: [], bot: [] }` |
| `guildOnly` | ❌ | `boolean` | Restrict to guilds (default: true) |
| `execute` | ✅ | `async function` | Main command logic |
| `autocomplete` | ❌ | `async function` | For autocomplete options |

---

### 4. Register with Discord

After creating the command file:

```bash
# Development (instant, guild-specific)
npm run deploy:commands

# Production (global, takes up to 1 hour)
NODE_ENV=production npm run deploy:commands
```

The deploy script auto-discovers all commands in `src/bot/commands/**/*.js`.

---

## Best Practices

### 1. Use Service Layer
Never put business logic directly in the command. Use services:
```javascript
// ❌ Bad - logic in command
const result = await guild.members.ban(target);

// ✅ Good - use service
const result = await moderationService.ban({
  guild: interaction.guild,
  moderator: interaction.member,
  target,
  reason,
});
```

### 2. Defer Long Operations
```javascript
await interaction.deferReply({ ephemeral: true });
// ... long operation ...
await interaction.editReply({ embeds: [embed] });
```

### 3. Use Constants
```javascript
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';

// ✅ Good
.setMaxValue(LIMITS.PURGE_MAX)

// ❌ Bad
.setMaxValue(100)
```

### 4. Handle Errors Gracefully
```javascript
try {
  await riskyOperation();
} catch (error) {
  logger.error({ err: error, userId: interaction.user.id }, 'Command failed');
  await interaction.editReply({
    content: `${EMOJIS.ERROR} An error occurred. Please try again.`,
  });
}
```

### 5. Validate Inputs
```javascript
import { z } from 'zod';

const schema = z.object({
  amount: z.number().int().min(1).max(100),
  reason: z.string().max(512).optional(),
});

// In execute:
const validated = schema.parse({
  amount: interaction.options.getInteger('amount'),
  reason: interaction.options.getString('reason'),
});
```

---

## Advanced Patterns

### Subcommands
```javascript
data: new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configure settings')
  .addSubcommand(sub => sub
    .setName('set')
    .setDescription('Set a value')
    .addStringOption(o => o.setName('key').setRequired(true))
    .addStringOption(o => o.setName('value').setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName('get')
    .setDescription('Get a value')
    .addStringOption(o => o.setName('key').setRequired(true))
  ),
```

### Context Menus
```javascript
// src/bot/contextMenus/userAvatar.js
import { ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js';

export default {
  data: new ContextMenuCommandBuilder()
    .setName('Get Avatar')
    .setType(ApplicationCommandType.User),

  async execute(interaction, client) {
    const user = interaction.targetUser;
    await interaction.reply({
      embeds: [{
        title: `${user.tag}'s Avatar`,
        image: { url: user.displayAvatarURL({ size: 512 }) },
      }],
      ephemeral: true,
    });
  },
};
```

### Autocomplete
```javascript
async autocomplete(interaction, client) {
  const focused = interaction.options.getFocused(true);
  
  const choices = await database.search(focused.value)
    .limit(25)
    .map(item => ({ name: item.name, value: item.id }));
  
  await interaction.respond(choices);
}
```

---

## Testing Commands

### Unit Test Template
```javascript
// tests/unit/commands/moderation/purge.test.js
import { describe, it, expect, vi } from 'vitest';
import { moderationService } from '../../../src/services/moderation.service.js';

vi.mock('../../src/services/moderation.service.js');

describe('Purge Command', () => {
  it('should purge messages', async () => {
    moderationService.purge.mockResolvedValue({ deleted: 50 });
    
    // Test logic here
    expect(true).toBe(true);
  });
});
```

Run tests:
```bash
npm test
```

---

## Deployment

### Development
```bash
npm run deploy:commands
# Uses DISCORD_DEV_GUILD_ID for instant deployment
```

### Production
```bash
NODE_ENV=production npm run deploy:commands
# Global deployment (takes up to 1 hour)
```

---

## Checklist Before Submitting

- [ ] Command file in correct category folder
- [ ] Exports default object with all required properties
- [ ] Uses service layer for business logic
- [ ] Defers reply for operations > 2 seconds
- [ ] Handles errors with user-friendly messages
- [ ] Uses constants for colors, emojis, limits
- [ ] Includes JSDoc comment at top
- [ ] Adds autocomplete if applicable
- [ ] Tests locally with `npm run dev`
- [ ] Runs `npm run deploy:commands` successfully

---

## Resources

- [discord.js Guide - Slash Commands](https://discordjs.guide/interactions/slash-commands.html)
- [Discord API - Slash Commands](https://discord.com/developers/docs/interactions/application-commands#slash-commands)
- [StellarSentry Source](src/bot/commands/)