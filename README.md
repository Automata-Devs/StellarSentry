# StellarSentry

<p align="center">
  <img src="https://img.shields.io/badge/StellarSentry-Discord%20Bot-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="StellarSentry">
  <img src="https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js 20.x">
  <img src="https://img.shields.io/badge/discord.js-14.15.3-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="discord.js 14.15.3">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License">
</p>

<p align="center">
  <strong>A production-ready, multi-purpose Discord bot with a beautiful web dashboard.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## 🌟 Features

### 🛡️ Moderation
- **Ban, Kick, Timeout, Warn** with reasons, DM notifications, and case numbers
- **Purge** messages with filters (user, content, bots, mentions)
- **Slowmode** and **Channel Lock/Unlock**
- **AutoMod** with anti-spam, anti-links, blacklisted words, mass mentions, caps lock detection
- Whitelisted roles and channels for automod

### 📊 Leveling & Engagement
- **XP System** with configurable rates, cooldowns, and multipliers
- **Level-up messages** with role rewards
- **Rank cards** with custom progress bars
- **Leaderboards** with pagination
- Ignored channels and roles

### 💰 Economy System
- **Balance, Daily, Work** with configurable rewards and cooldowns
- **Pay/Transfer** between users with atomic operations
- **Shop System** with roles, stock limits, and requirements
- **Inventory** and **Leaderboards**

### 🎫 Ticket System
- **Panel-based** ticket creation with custom categories
- **Transcripts** on close with logging
- **Claim/Unclaim** system for staff
- Configurable limits per user and server

### 🎉 Giveaways
- Create with **duration, winners, requirements** (role, level, account/server age)
- **Button-based entry** with requirement checking
- **Reroll** and **early end** functionality
- Persistent across restarts with scheduler

### 💡 Suggestions
- Submit with **title, description, anonymous option**
- **Voting** with up/down buttons
- **Staff approval workflow** (approve, deny, consider, implement)
- Status tracking with customizable statuses

### ⭐ Starboard
- Configurable **emoji, threshold, self-star settings**
- **NSFW handling, image requirements, ignored channels**
- Real-time updates with star counts
- Top starred messages view

### 🎵 Music Player
- **Lavalink v4** powered with YouTube, SoundCloud, Spotify support
- **Queue, Skip, Pause, Resume, Stop, Seek, Volume, Loop, Shuffle**
- **Filters** (bass, nightcore, vaporwave, 8D, karaoke)
- **Dashboard control** with real-time updates
- DJ role, auto-leave, vote skip

### 📝 Comprehensive Logging
- Message edits, deletes, bulk deletes
- Member join, leave, update (nickname, roles, timeout)
- Bans, unbans, role/channel/emoji changes
- Voice join, leave, move
- Invite create/delete, moderation actions
- Per-category channel configuration

### 🎨 Reaction Roles
- Button and reaction-based role assignment
- Multiple panels with custom emojis and styles
- Role requirements and limits

### 🌐 Web Dashboard
- **Discord OAuth2** authentication
- **Per-guild settings** with real-time updates via Socket.IO
- **Dark Discord-style UI** with Tailwind CSS + Alpine.js
- **Live music player, log viewer, statistics**
- REST API v1 for external integrations

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 20.x** or higher
- **MongoDB 7.0+** (local or cloud)
- **Lavalink 4.0+** (for music)
- **Discord Bot Application** with required intents

### Discord Developer Portal Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a **New Application**
3. Go to **Bot** section:
   - Enable **Privileged Gateway Intents**:
     - ✅ **Message Content Intent** (for commands, automod)
     - ✅ **Server Members Intent** (for member events, welcome)
     - ✅ **Presence Intent** (optional, for presence tracking)
   - Copy **Token** and **Client ID**
4. Go to **OAuth2** → **General**:
   - Copy **Client Secret**
   - Add **Redirect URI**: `https://your-domain.com/auth/callback` (or `http://localhost:3000/auth/callback` for local)
   - Enable **Scopes**: `identify`, `guilds`
5. Go to **OAuth2** → **URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Administrator` (or calculate specific permissions)
   - Copy generated URL and invite bot to your server

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/stellarsentry.git
cd stellarsentry

# Install dependencies
npm install

# Build CSS (required for production)
npm run build:css

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Deploy slash commands
npm run deploy:commands

# Start development
npm run dev

# Or start production
npm start
```

### Environment Variables

```env
# Environment
NODE_ENV=development

# Discord Bot
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_DEV_GUILD_ID=your_test_guild_id  # Optional: for instant command deployment
OWNER_IDS=111111111111111111,222222222222222222  # Comma-separated owner IDs

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/stellarsentry

# Web Dashboard
PORT=3000
DASHBOARD_URL=http://localhost:3000
SESSION_SECRET=your_secure_random_string_at_least_32_chars

# Lavalink (Music)
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false

# Sharding (disabled by default)
SHARDING_ENABLED=false

# Logging
LOG_LEVEL=info
```

### Local Development with Docker

```bash
# Start MongoDB and Lavalink
docker-compose -f docker-compose.dev.yml up -d

# Start bot in development mode
npm run dev
```

---

## 📦 Deployment

### Bot-Hosting.net (Recommended)

StellarSentry is designed for **Bot-Hosting.net Starter+ plan** (2GB RAM, 100% CPU, 8GB storage).

#### Step-by-step Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy StellarSentry"
   git push origin main
   ```

2. **Create Bot-Hosting.net Project**
   - Go to [Bot-Hosting.net](https://bot-hosting.net)
   - Create new project → **Node.js**
   - Connect your GitHub repository
   - Select **Starter+ plan**

3. **Configure Deployments** (4 deployments available):
   - **Deployment 1: `stellarsentry`** (Bot + Dashboard)
     - Build Command: `npm run build:css` (or leave empty if CSS committed)
     - Start Command: `npm start`
     - Environment Variables: Add all from `.env`
   - **Deployment 2: `stellarsentry-db`** (MongoDB)
     - Use Bot-Hosting.net's **MongoDB service**
     - Copy connection string to `MONGODB_URI`
   - **Deployment 3: `stellarsentry-lavalink`** (Lavalink)
     - Use Bot-Hosting.net's **Lavalink service**
     - Copy host, port, password to `LAVALINK_*` vars
   - **Deployment 4: Spare** (optional)

4. **Configure Discord OAuth2**
   - Update **Redirect URI** in Developer Portal to your Bot-Hosting.net URL:
     `https://stellarsentry.apps.bot-hosting.cloud/auth/callback`
   - Update `DASHBOARD_URL` in environment variables

5. **Deploy**
   - Push to main branch → Bot-Hosting.net auto-deploys
   - Commands auto-register on startup
   - Dashboard available at your `.apps.bot-hosting.cloud` URL

### Manual VPS Deployment

```bash
# On your server
git clone https://github.com/yourusername/stellarsentry.git
cd stellarsentry
npm ci --production
npm run build:css

# Configure systemd service
sudo cp stellarsentry.service /etc/systemd/system/
sudo systemctl enable stellarsentry
sudo systemctl start stellarsentry
```

---

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Adding a Command](docs/ADDING_A_COMMAND.md)
- [Adding a Dashboard Page](docs/ADDING_A_DASHBOARD_PAGE.md)
- [Bot-Hosting.net Deployment Guide](docs/DEPLOYMENT_BOT_HOSTING.md)

---

## 🏗️ Architecture

```
stellarsentry/
├── src/
│   ├── index.js                 # Entry point (bot + dashboard)
│   ├── config/                  # Configuration (env, constants, features)
│   ├── core/                    # Core systems (client, eventBus, cooldowns)
│   ├── loaders/                 # Auto-loaders (commands, events, components, routes)
│   ├── bot/
│   │   ├── commands/            # Slash commands by category
│   │   ├── events/              # Discord events
│   │   ├── components/          # Buttons, select menus, modals
│   │   ├── contextMenus/        # Right-click menus
│   │   ├── tasks/               # Scheduled tasks (reminders, giveaways)
│   │   └── utils/               # Bot-specific utilities
│   ├── dashboard/
│   │   ├── server/              # Express app factory
│   │   ├── middleware/          # Auth, CSRF, rate limit, validation
│   │   ├── routes/              # Express routes by feature
│   │   ├── controllers/         # Route controllers
│   │   ├── sockets/             # Socket.IO handlers
│   │   └── views/               # EJS templates (layouts, partials, pages)
│   ├── services/                # Business logic (guild, moderation, economy, etc.)
│   ├── database/
│   │   ├── connection.js        # MongoDB connection
│   │   ├── models/              # Mongoose models
│   │   └── repositories/        # Data access layer
│   ├── i18n/                    # Internationalization (English only)
│   └── utils/                   # Shared utilities (logger, time, cache, etc.)
├── tests/                       # Unit and integration tests
├── scripts/                     # Deployment and utility scripts
├── docs/                        # Documentation
└── docker-compose.dev.yml       # Local development services
```

### Key Design Principles
- **Modular & Layered**: Commands → Services → Repositories → Models
- **Auto-loading**: Add features by creating files, no registration needed
- **Single Process**: Bot + Dashboard in one process (splittable later)
- **Event-Driven**: Bot ↔ Dashboard communication via EventEmitter
- **Security-First**: Helmet, CSRF, Rate Limiting, Secure Cookies, Input Validation

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## 🔧 Development

```bash
# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Watch CSS changes
npm run build:css:dev
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style
- ESLint + Prettier configured
- JSDoc for all public functions
- Conventional Commits
- 80%+ test coverage for services

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [discord.js](https://discord.js.org/) - Discord API library
- [Lavalink](https://lavalink.dev/) - Audio streaming server
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Alpine.js](https://alpinejs.dev/) - Lightweight JavaScript framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Bot-Hosting.net](https://bot-hosting.net/) - Hosting platform

---

## 📞 Support

- **Discord Server**: [Join for support](https://discord.gg/stellarsentry)
- **Issues**: [GitHub Issues](https://github.com/yourusername/stellarsentry/issues)
- **Documentation**: [Wiki](https://github.com/yourusername/stellarsentry/wiki)

---

<p align="center">
  Made with ❤️ by the StellarSentry Team
</p>