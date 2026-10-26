# Bot-Hosting.net Deployment Guide

Complete step-by-step guide to deploying StellarSentry on **Bot-Hosting.net Starter+ plan**.

---

## Prerequisites

- **Bot-Hosting.net account** with Starter+ plan (~$5/month)
- **GitHub repository** with StellarSentry code
- **Discord Developer Application** configured
- **MongoDB** and **Lavalink** deployments (provided by Bot-Hosting.net)

---

## Step 1: Prepare Your Repository

### 1.1 Ensure CSS is Built
```bash
npm run build:css
git add src/dashboard/public/css/output.css
git commit -m "Add compiled CSS for production"
git push origin main
```

### 1.2 Verify package.json
Ensure these scripts exist:
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "build:css": "tailwindcss -i ./src/dashboard/public/css/input.css -o ./src/dashboard/public/css/output.css --minify"
  }
}
```

---

## Step 2: Create Bot-Hosting.net Project

1. Go to [Bot-Hosting.net](https://bot-hosting.net) and sign in
2. Click **"Create Project"**
3. Choose **Node.js** as runtime
4. Connect your **GitHub repository**
5. Select **Starter+ plan** (2GB RAM, 100% CPU, 8GB storage)

---

## Step 3: Configure Deployments

You have **4 deployment slots**. Use them as follows:

### Deployment 1: `stellarsentry` (Main Bot + Dashboard)

| Setting | Value |
|---------|-------|
| **Name** | `stellarsentry` |
| **Branch** | `main` |
| **Build Command** | `npm run build:css` (or leave empty if CSS committed) |
| **Start Command** | `npm start` |
| **Node Version** | `20` |

**Environment Variables** (add all):
```
NODE_ENV=production
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_DEV_GUILD_ID=your_test_guild_id
OWNER_IDS=111111111111111111,222222222222222222
MONGODB_URI=mongodb://stellarsentry-db:27017/stellarsentry
PORT=3000
DASHBOARD_URL=https://stellarsentry.apps.bot-hosting.cloud
SESSION_SECRET=your_secure_random_string_32_chars_min
LAVALINK_HOST=stellarsentry-lavalink
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
SHARDING_ENABLED=false
LOG_LEVEL=info
```

### Deployment 2: `stellarsentry-db` (MongoDB)

| Setting | Value |
|---------|-------|
| **Name** | `stellarsentry-db` |
| **Type** | **MongoDB** (Bot-Hosting.net service) |
| **Version** | `7.0` |

After creation, copy the **internal connection string** (format: `mongodb://stellarsentry-db:27017/stellarsentry`) and update `MONGODB_URI` in Deployment 1.

### Deployment 3: `stellarsentry-lavalink` (Lavalink)

| Setting | Value |
|---------|-------|
| **Name** | `stellarsentry-lavalink` |
| **Type** | **Lavalink** (Bot-Hosting.net service) |
| **Version** | `4.x` |

After creation, copy the **internal host** (e.g., `stellarsentry-lavalink`), **port** (`2333`), and **password** from the Lavalink deployment details. Update `LAVALINK_HOST`, `LAVALINK_PORT`, `LAVALINK_PASSWORD` in Deployment 1.

### Deployment 4: Spare (Optional)

Reserve for future use (Uptime Kuma, separate dashboard, etc.)

---

## Step 4: Configure Discord OAuth2

### 4.1 Update Redirect URI
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application → **OAuth2** → **General**
3. Add Redirect URI:
   ```
   https://stellarsentry.apps.bot-hosting.cloud/auth/callback
   ```
   (Replace `stellarsentry` with your actual deployment name)

### 4.2 Update Environment Variable
Update `DASHBOARD_URL` in Deployment 1:
```
DASHBOARD_URL=https://stellarsentry.apps.bot-hosting.cloud
```

---

## Step 5: Deploy

1. **Push to main branch**:
   ```bash
   git push origin main
   ```

2. **Watch deployment logs** in Bot-Hosting.net dashboard

3. **Verify deployment**:
   - Check logs for "Bot is ready!" message
   - Visit `https://stellarsentry.apps.bot-hosting.cloud`
   - Login with Discord → Should see your servers

---

## Step 6: Verify Bot Functionality

1. **Slash Commands**: Run `/ping` in your test server
2. **Dashboard**: Login at your dashboard URL
3. **Music**: Join voice channel → `/play never gonna give you up`
4. **Moderation**: Try `/warn @user test reason`

---

## Step 7: Configure Custom Domain (Optional)

1. **Bot-Hosting.net Dashboard** → Your deployment → **Domains**
2. Add custom domain (e.g., `dashboard.yourdomain.com`)
2. Add DNS records as instructed
3. Update `DASHBOARD_URL` and Discord OAuth2 Redirect URI to use custom domain

---

## Troubleshooting

### Bot Won't Start
- Check **logs** in Bot-Hosting.net dashboard
- Verify all **environment variables** are set
- Check **MongoDB connection** (Deployment 2 running?)
- Check **Lavalink connection** (Deployment 3 running?)

### Commands Not Registering
- Verify `DISCORD_CLIENT_ID` is correct
- Check bot has `applications.commands` scope in OAuth2
- For instant testing: Set `DISCORD_DEV_GUILD_ID`

### Dashboard Not Loading
- Check `DASHBOARD_URL` matches your deployment URL
- Verify `SESSION_SECRET` is set (32+ chars)
- Check Discord OAuth2 Redirect URI matches exactly

### Music Not Working
- Verify Lavalink deployment is healthy
- Check `LAVALINK_HOST` uses internal hostname (not localhost)
- Verify `LAVALINK_PASSWORD` matches Lavalink deployment

### Database Connection Failed
- Verify MongoDB deployment is running
- Check `MONGODB_URI` uses internal hostname (`stellarsentry-db`)
- Ensure database name matches (`stellarsentry`)

---

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `DISCORD_TOKEN` | Yes | Bot token from Developer Portal |
| `DISCORD_CLIENT_ID` | Yes | Application ID |
| `DISCORD_CLIENT_SECRET` | Yes | OAuth2 secret |
| `DISCORD_DEV_GUILD_ID` | No | Guild ID for instant command deployment |
| `OWNER_IDS` | No | Comma-separated Discord user IDs |
| `MONGODB_URI` | Yes | `mongodb://stellarsentry-db:27017/stellarsentry` |
| `PORT` | Yes | `3000` (Bot-Hosting.net provides) |
| `DASHBOARD_URL` | Yes | `https://your-app.apps.bot-hosting.cloud` |
| `SESSION_SECRET` | Yes | 32+ char random string |
| `LAVALINK_HOST` | Yes | `stellarsentry-lavalink` |
| `LAVALINK_PORT` | Yes | `2333` |
| `LAVALINK_PASSWORD` | Yes | From Lavalink deployment |
| `LAVALINK_SECURE` | No | `false` (internal network) |
| `SHARDING_ENABLED` | No | `false` |
| `LOG_LEVEL` | No | `info` |

---

## Monitoring & Maintenance

### Logs
- View in Bot-Hosting.net dashboard → **Logs** tab
- Use `LOG_LEVEL=debug` for troubleshooting

### Updates
1. Push to `main` branch
2. Bot-Hosting.net auto-deploys
3. Zero-downtime deployment (Bot-Hosting.net handles)

### Backups
- **MongoDB**: Bot-Hosting.net provides automated backups
- **Manual**: `docker exec stellarsentry-db mongodump --out /backup`

### Scaling
- **Starter+**: 2GB RAM, handles ~500 guilds
- **Upgrade plan** for more resources
- **Sharding**: Enable `SHARDING_ENABLED=true` for >2000 guilds

---

## Security Checklist

- [ ] `SESSION_SECRET` is 32+ random characters
- [ ] `DISCORD_TOKEN` not exposed in logs
- [ ] `MONGODB_URI` uses internal hostname only
- [ ] `LAVALINK_PASSWORD` is strong
- [ ] Discord OAuth2 Redirect URI uses HTTPS
- [ ] `SESSION_SECRET` not committed to git
- [ ] `DASHBOARD_URL` uses HTTPS

---

## Support

- **Bot-Hosting.net Docs**: https://bot-hosting.net/docs
- **StellarSentry Issues**: GitHub Issues
- **Discord Support**: https://discord.gg/stellarsentry

---

*Last updated: 2024 | StellarSentry v1.0*