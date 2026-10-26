# Architecture Overview

## High-Level Architecture

StellarSentry follows a **modular, layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Discord Gateway                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    Discord.js Client (Shard)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Commands  │ │   Events    │ │ Components  │ │ Context   │ │
│  │  (Slash)    │ │  (Gateway)  │ │ (Btn/Sel/Mod)│ │ Menus     │ │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────┬────┘ │
└─────────┼───────────────┼────────────────┼──────────────┼──────┘
          │               │                │              │
┌─────────▼───────────────▼────────────────▼──────────────▼──────┐
│                    Service Layer (Business Logic)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │
│  │  Guild   │ │ Moderat. │ │ Economy  │ │ Leveling │ │ ...  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─┘ │
└───────┼─────────────┼────────────┼────────────┼────────────┼───┘
        │             │            │            │            │
┌───────▼─────────────▼────────────▼────────────▼────────────▼───┐
│                   Repository Layer (Data Access)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │
│  │  Guild   │ │ Member   │ │ Ticket   │ │ Giveaway │ │ ...  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─┘ │
└───────┼─────────────┼────────────┼────────────┼────────────┼───┘
        │             │            │            │            │
┌───────▼─────────────▼────────────▼────────────▼────────────▼───┐
│                      Mongoose Models (MongoDB)                 │
│  Guild, Member, Warning, Ticket, ShopItem, ReactionRole,      │
│  Reminder, Giveaway, StarboardEntry, Suggestion, AuditLog     │
└────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Discord.js Client (`src/core/client.js`)
Extended `Client` class with:
- **Cache limits & sweepers** for memory efficiency
- **Auto-registration** for commands, components, context menus
- **Permission helpers** and cooldown management
- **Graceful shutdown** handling

### 2. Event Bus (`src/core/eventBus.js`)
Central `EventEmitter` for decoupled communication:
- **Bot ↔ Dashboard** real-time updates
- **Inter-service** communication
- **Async event emission** with error handling
- **Event logging** in development

### 3. Auto-Loaders (`src/loaders/`)
Dynamic discovery and registration:
- **Commands**: `src/bot/commands/**/*.js`
- **Events**: `src/bot/events/**/*.js`
- **Components**: `src/bot/components/**/*.js`
- **Routes**: `src/dashboard/routes/**/*.js`
- **Context Menus**: `src/bot/contextMenus/**/*.js`

### 4. Service Layer (`src/services/`)
Business logic separated by domain:
- **GuildService**: Configuration management
- **ModerationService**: Ban, kick, timeout, warn, purge
- **EconomyService**: Balance, daily, work, shop, transfer
- **LevelingService**: XP, levels, role rewards, leaderboards
- **TicketService**: Creation, claiming, transcripts
- **GiveawayService**: Creation, ending, rerolling
- **AutomodService**: Spam, links, words, mentions, caps
- **MusicService**: Lavalink wrapper with queue management

### 5. Repository Layer (`src/database/repositories/`)
Data access abstraction:
- **BaseRepository**: CRUD, pagination, aggregation
- **GuildRepository**: Settings, features, nested updates
- **MemberRepository**: Leveling, economy, inventory, warnings
- **TicketRepository**: Status management, transcripts
- **GiveawayRepository**: Status transitions, entries, winners
- **AuditLogRepository**: Logging queries and stats

### 6. Dashboard (`src/dashboard/`)
Express.js + Socket.IO real-time dashboard:
- **Auth**: Discord OAuth2 with Passport
- **Middleware**: Auth, Guild Access, CSRF, Rate Limit, Validation
- **Routes**: Modular per-feature routes
- **Views**: EJS + Tailwind CSS + Alpine.js
- **Sockets**: Real-time updates for music, logs, settings

---

## Data Flow

### Command Execution
```
User → Discord → InteractionCreate Event
  → Command Loader → Command.execute()
    → Permission Checks → Cooldown Check
      → Service Layer (business logic)
        → Repository (data access)
          → Mongoose Model → MongoDB
        ← Result
      ← Result
    ← Interaction Reply
  ← Discord API
```

### Dashboard Settings Update
```
User → Dashboard UI → PUT /settings/:guildId
  → Auth Middleware → Guild Access Check
    → Validation (Zod) → GuildService.updateSettings()
      → GuildRepository.updateSettings() → MongoDB
    ← Updated Settings
  ← JSON Response
  → EventBus.emit(SETTING_UPDATE)
    → Socket.IO → Connected Dashboard Clients
      → Real-time UI Update
```

### Real-time Music Updates
```
Lavalink Event → MusicService.handleTrackStart()
  → EventBus.emit(MUSIC_PLAY)
    → Dashboard Server → Socket.IO
      → Broadcast to guild:guildId room
        → Dashboard UI Updates in Real-time
```

---

## Memory Management

### Discord.js Cache Configuration
```javascript
makeCache: {
  GuildMember: (member) => member.guild.memberCount < 1000,
  Message: (msg) => msg.guild?.id === DEV_GUILD_ID,
  Reaction: (r) => r.message.guild?.id === DEV_GUILD_ID,
  Presence: () => false,
  VoiceState: (s) => s.guild?.id === DEV_GUILD_ID,
}

sweepers: {
  messages: { interval: 600, lifetime: 3600 },
  guildMembers: { interval: 300, lifetime: 1800 },
  // ... more sweepers
}
```

### Memory Budget (Bot-Hosting.net Starter+)
| Component | Estimated Memory |
|-----------|-----------------|
| Discord.js Cache | 200-300 MB |
| Mongoose Pool (10) | ~50 MB |
| Lavalink Client | ~50 MB |
| Socket.IO | ~20 MB |
| In-memory Caches | ~50 MB |
| Node.js Baseline | ~100 MB |
| **Total** | **~500-600 MB** |

---

## Security Architecture

### Authentication & Authorization
- **Discord OAuth2** with `identify` + `guilds` scopes
- **Session Management**: `express-session` + `connect-mongo`
- **CSRF Protection**: Per-request tokens via `csrf` package
- **Rate Limiting**: `express-rate-limit` (stricter on auth/API)
- **Helmet**: Security headers
- **Input Validation**: Zod schemas for all inputs
- **Guild Access Control**: Server-side `MANAGE_GUILD` verification

### Data Protection
- **No Secrets in Code**: All via environment variables
- **Secure Cookies**: `httpOnly`, `secure`, `sameSite: 'lax'`
- **Proxy Trust**: `app.set('trust proxy', 1)` for Bot-Hosting.net
- **Audit Logging**: All moderation and settings changes

---

## Scalability Considerations

### Current: Single Process
- Bot + Dashboard in one Node.js process
- Suitable for ~500 guilds on Bot-Hosting.net Starter+

### Future: Sharding Support
```javascript
// src/shard.js - Ready but disabled by default
const { ShardingManager } = require('discord.js');
const manager = new ShardingManager('./src/index.js', {
  totalShards: 'auto',
  token: process.env.DISCORD_TOKEN,
});
```

### Future: Microservice Split
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Bot       │     │  Dashboard  │     │   API       │
│  Service    │────▶│  Service    │◀───▶│  Gateway    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
                    ┌─────────────┐
                    │  Message    │
                    │   Queue     │
                    │  (Redis)    │
                    └─────────────┘
```

---

## Deployment Architecture (Bot-Hosting.net)

```
┌────────────────────────────────────────────────────────────┐
│                    Bot-Hosting.net Project                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ stellar-    │  │ stellar-    │  │ stellar-    │         │
│  │ sentry      │  │ sentry-db   │  │ sentry-     │         │
│  │ (Bot+Dash)  │  │ (MongoDB)   │  │ lavalink    │         │
│  │ npm start   │  │ MongoDB 7   │  │ Lavalink 4  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          ▼                                 │
│              ┌───────────────────────┐                      │
│              │   Shared Network      │                      │
│              │   (Internal DNS)      │                      │
│              └───────────────────────┘                      │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  Discord API    │
                   │  (Gateway)      │
                   └─────────────────┘
```

---

## Configuration Management

### Environment-Based Configuration
- **Zod Validation** at startup (`src/config/env.js`)
- **Centralized Constants** (`src/config/constants.js`)
- **Feature Flags** with defaults (`src/config/features.js`)

### Per-Guild Settings
- Stored in MongoDB with **validation schemas**
- **Cached in memory** with TTL (5 min default)
- **Cache invalidation** on dashboard changes via EventBus
- **Feature flags** per guild with defaults

---

## Error Handling & Monitoring

### Centralized Error Handling
- **Global handlers**: `unhandledRejection`, `uncaughtException`
- **Command errors**: User-friendly messages, detailed logs
- **Express errors**: Centralized middleware with proper status codes
- **Lavalink errors**: Automatic reconnection with backoff

### Logging
- **Pino** logger with pretty printing in dev, JSON in prod
- **Structured logs**: Context objects for searchability
- **Log levels**: fatal, error, warn, info, debug, trace
- **Audit logs**: Separate MongoDB collection with TTL

### Health Checks
- **`/health` endpoint**: Bot, Database, Lavalink status
- **Docker healthchecks**: MongoDB, Lavalink containers
- **Bot-Hosting.net**: Auto-restart on crash

---

## Future Extensibility

### Plugin System (Planned)
```
src/plugins/
├── custom-command/
├── twitch-notifications/
├── youtube-notifications/
└── ...
```

### Webhook Integrations (Planned)
- GitHub, GitLab, Twitch, YouTube, Twitter
- Custom webhook receiver with signature verification

### Mobile App (Future)
- React Native / Expo
- Shared API with dashboard
- Push notifications via Expo

---

## Performance Optimization

### Database
- **Indexes** on all frequent query fields
- **TTL indexes** for automatic cleanup
- **Connection pooling** (max 10 connections)
- **Lean queries** for read-heavy operations

### Caching
- **In-memory TTL cache** (`src/utils/cache.js`)
- **Guild settings**: 5 min TTL
- **Channel/Role lists**: 10 min TTL
- **Lavalink tracks**: 30 min TTL

### Discord.js Optimization
- **Partial structures** for minimal data
- **Intent filtering** - only required intents
- **Cache sweepers** for automatic cleanup
- **Shard-ready** architecture

---

## Testing Strategy

### Unit Tests (Services)
- **EconomyService**: Balance, transfer, daily, work, shop
- **LevelingService**: XP calculation, leveling, role rewards
- **ModerationService**: Ban, kick, timeout, permissions
- **AutomodService**: Spam detection, link filtering

### Integration Tests (API)
- **Auth flow**: Login, callback, logout
- **Settings CRUD**: GET, PUT, feature toggles
- **Audit logs**: Filtering, pagination

### Coverage Target
- **Services**: 80%+ coverage
- **Critical paths**: 90%+ coverage

---

## Conclusion

StellarSentry's architecture prioritizes:
1. **Maintainability** through modularity and clear layering
2. **Performance** through caching, sweepers, and efficient queries
3. **Security** through defense-in-depth approach
4. **Scalability** through shard-ready and microservice-ready design
5. **Developer Experience** through auto-loading, TypeScript-ready JSDoc, and comprehensive tooling