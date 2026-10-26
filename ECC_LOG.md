# ECC Usage Log

## 2026-10-26 - Project Setup
- **Action**: Installed ECC plugin and copied rules
- **Method**: Manual clone of https://github.com/affaan-m/ECC and copy rules/common + rules/typescript to .claude/rules/ecc/
- **Result**: ECC rules available at .claude/rules/ecc/

## 2026-10-26 - Architecture Planning
- **Command**: /ecc:plan "StellarSentry Discord bot with web dashboard"
- **Output**: Architecture summary documented in PROGRESS.md and below

## Architecture Summary

### Final Dependency List (with justification)

**Production Dependencies:**
- `discord.js@^14.15.3` - Core Discord API library (required)
- `@discordjs/builders@^1.8.2` - Slash command builders (required for discord.js)
- `@discordjs/collection@^2.1.1` - Collection utilities (required for discord.js)
- `@discordjs/rest@^2.3.0` - REST API client (required for discord.js)
- `@discordjs/voice@^0.17.0` - Voice connection support (required for music)
- `@napi-rs/canvas@^0.1.65` - Canvas for rank cards (prebuilt binaries, no native build)
- `lavalink-client@^4.4.0` - Lavalink v4 client for music (maintained, TypeScript)
- `mongoose@^8.4.0` - MongoDB ODM (required)
- `express@^4.19.2` - Web server (required)
- `ejs@^3.1.10` - Template engine (required)
- `passport@^0.7.0` + `passport-discord@^0.1.4` - Discord OAuth2 (required)
- `express-session@^1.18.0` - Session management (required)
- `connect-mongo@^5.1.0` - MongoDB session store (required)
- `socket.io@^4.7.5` - Real-time communication (required)
- `helmet@^7.1.0` - Security headers (required)
- `express-rate-limit@^7.2.0` - Rate limiting (required)
- `pino@^9.0.0` + `pino-pretty@^11.0.0` - Logging (required)
- `zod@^3.23.8` - Validation (required)
- `node-cron@^3.0.3` - Scheduling (required)
- `dotenv@^16.4.5` - Environment loading (required)
- `alpinejs@^3.14.1` - Lightweight JS framework (required for dashboard interactivity)

**Development Dependencies:**
- `eslint@^9.3.0` + `@eslint/js@^9.3.0` + `globals@^15.3.0` - Linting (required)
- `prettier@^3.2.5` - Formatting (required)
- `husky@^9.0.11` + `lint-staged@^15.2.5` - Git hooks (required)
- `nodemon@^3.1.1` - Dev server (required)
- `tailwindcss@^3.4.3` - CSS framework (required)
- `vitest@^1.6.0` + `@vitest/coverage-v8@^1.6.0` - Testing (required)

### Data Models (fields + indexes)

**Guild** - Per-guild configuration (see Guild.js for full schema)
- Indexes: guildId (unique), feature flags
- Key fields: guildId, features, moderation, automod, welcome, leveling, economy, tickets, reactionRoles, giveaways, suggestions, starboard, music, logging, commands, metadata

**User** - Global user data
- Indexes: userId (unique), globalXp, globalBalance

**Member** - Per-guild member data (XP, balance, warnings)
- Indexes: guildId_userId (unique), xp, balance

**Warning** - Standalone warning records
- Indexes: guildId_userId, caseNumber, createdAt

**Ticket** - Support tickets
- Indexes: guildId, channelId, userId, status, createdAt

**ShopItem** - Economy shop items
- Indexes: guildId, name

**ReactionRole** - Reaction role panels
- Indexes: guildId, messageId

**Reminder** - User reminders
- Indexes: guildId_userId, expiresAt (TTL)

**Giveaway** - Giveaway events
- Indexes: guildId, channelId, messageId, endsAt, status

**StarboardEntry** - Starboard messages
- Indexes: guildId, messageId, starCount

**Suggestion** - Suggestions
- Indexes: guildId, channelId, messageId, status, createdAt

**AuditLog** - Comprehensive logging
- Indexes: guildId, eventCategory, userId, createdAt (TTL based on retentionDays)

### Memory Budget (Bot-Hosting.net Starter+ ~2GB)

- **Discord.js Cache**: ~200-300MB (aggressive sweepers, limited to dev guild for messages)
- **Mongoose Pool**: ~50MB (maxPoolSize: 10)
- **Lavalink Client**: ~50MB
- **Socket.IO**: ~20MB
- **In-memory caches (TTL)**: ~50MB
- **Node.js baseline**: ~100MB
- **Total target**: ~500-600MB (well under 1GB limit)

### Key Architectural Decisions

1. **Single process** for bot + dashboard (splittable later via eventBus)
2. **ESM only** with `"type": "module"`
3. **Auto-loading** for commands, events, components, routes
4. **Repository pattern** for database access
5. **Service layer** for business logic
6. **Event-driven** communication between bot and dashboard
7. **Committed compiled Tailwind CSS** for Bot-Hosting.net (no build step)
8. **Graceful shutdown** on SIGTERM/SIGINT
9. **Per-guild feature toggles** with in-memory cache invalidation
10. **Security-first**: helmet, CORS, CSRF, rate limiting, secure cookies, trust proxy