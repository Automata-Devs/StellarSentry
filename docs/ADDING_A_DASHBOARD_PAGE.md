# Adding a New Dashboard Page

This guide walks you through adding a new page to the StellarSentry web dashboard.

---

## Quick Overview

The dashboard uses **Express.js + EJS + Tailwind CSS + Alpine.js** with auto-loading routes. To add a page:

1. Create a route file in `src/dashboard/routes/`
2. Create a view template in `src/dashboard/views/pages/`
3. Register the route in the route loader (auto-discovered)

---

## Quick Overview

```
src/dashboard/
├── routes/
│   ├── auth.routes.js          # /auth/*
│   ├── home.routes.js          # /
│   ├── health.routes.js        # /health
│   ├── guilds.routes.js        # /guilds
│   ├── overview.routes.js      # /overview/:guildId
│   ├── settings.routes.js      # /settings/:guildId
│   ├── moderation.routes.js    # /moderation/:guildId
│   └── ... (other feature routes)
├── views/
│   ├── layouts/
│   │   └── main.ejs            # Main layout with sidebar, header
│   ├── partials/
│   │   ├── navbar.ejs          # Top navigation
│   │   └── sidebar.ejs         # Guild-specific sidebar
│   ├── pages/
│   │   ├── index.ejs           # Landing page
│   │   ├── guilds.ejs          # Server list
│   │   ├── overview.ejs        # Server overview
│   │   ├── settings.ejs        # Settings page
│   │   └── ... (other pages)
│   └── errors/
│       ├── 404.ejs
│       ├── 500.ejs
│       ├── 403.ejs
│       └── 401.ejs
└── public/
    ├── css/
    │   ├── input.css           # Tailwind input
    │   └── output.css          # Compiled CSS (committed)
    └── js/                     # Alpine.js components
```

---

## Step-by-Step

### 1. Create Route File

Create a new file in `src/dashboard/routes/`:

```javascript
// src/dashboard/routes/music.routes.js
/**
 * Music Routes - Music player dashboard
 */
import express from 'express';
import { musicService } from '../../services/music.service.js';
import { guildService } from '../../services/guild.service.js';

const router = express.Router();

/**
 * GET /music/:guildId - Music player dashboard
 */
router.get('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = req.guild;
    const settings = await guildService.getGuild(guildId);
    const musicSettings = settings?.music || {};

    // Get current player state
    const playerState = musicService.getPlayerState(guildId);

    res.render('pages/music', {
      title: `${guild.name} - Music - StellarSentry`,
      user: req.user,
      guild,
      settings,
      musicSettings,
      playerState,
    });
  } catch (error) {
    console.error('Music page error:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load music player',
    });
  }
});

/**
 * POST /music/:guildId/control - Music control from dashboard
 */
router.post('/:guildId/control', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { action, value } = req.body;

    // Verify permissions (guildAccessMiddleware already ran)
    if (!hasGuildAccess(req.user, guildId, req.bot)) {
      return res.status(403).json({ success: false, error: 'No permission' });
    }

    const { musicService } = await import('../../services/music.service.js');
    let result;

    switch (action) {
      case 'play':
        // Would need track info from queue
        break;
      case 'pause':
        await musicService.pause(guildId);
        break;
      case 'resume':
        await musicService.resume(guildId);
        break;
      case 'skip':
        await musicService.skip(guildId);
        break;
      case 'stop':
        await musicService.stop(guildId);
        break;
      case 'volume':
        await musicService.setVolume(guildId, value);
        break;
      case 'loop':
        await musicService.setLoop(guildId, value);
        break;
      case 'shuffle':
        await musicService.shuffle(guildId);
        break;
      case 'seek':
        await musicService.seek(guildId, value);
        break;
    }

    // Return updated state
    const state = musicService.getPlayerState(guildId);
    res.json({ success: true, data: state });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /music/:guildId/queue - Get queue for AJAX updates
 */
router.get('/:guildId/queue', async (req, res) => {
  try {
    const { guildId } = req.params;
    const queue = musicService.getQueue(guildId);
    const current = musicService.getCurrentTrack(guildId);

    res.json({ success: true, data: { current, queue } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

---

### 2. Create View Template

Create the EJS view in `src/dashboard/views/pages/`:

```ejs
<!-- src/dashboard/views/pages/music.ejs -->
<%- include('../layouts/main', { title: guild.name + ' - Music - StellarSentry', body: `
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <!-- Header -->
  <div class="flex items-center justify-between mb-8">
    <div class="flex items-center space-4">
      <img src="<%= guild.icon ? 'https://cdn.discordapp.com/icons/' + guild.id + '/' + guild.icon + '.png?size=128' : 'https://cdn.discordapp.com/embed/avatars/0.png' %>" alt="" class="w-12 h-12 rounded-lg bg-discord-darker object-cover">
      <div>
        <h1 class="text-2xl font-bold text-white"><%= guild.name %></h1>
        <p class="text-gray-400">Music Player</p>
      </div>
    </div>
  </div>

  <!-- Music Player -->
  <div class="bg-discord-card border border-discord-border rounded-xl overflow-hidden">
    <!-- Player Header -->
    <div class="px-5 py-4 border-b border-discord-border flex items-center justify-between">
      <h2 class="text-lg font-semibold text-white flex items-center">
        <i class="fas fa-music text-purple-400 mr-2"></i>
        Now Playing
      </h2>
      <div class="flex items-center space-2">
        <span id="music-status" class="px-2 py-1 text-xs font-medium rounded-full bg-gray-600 text-gray-300">
          <%= playerState?.playing ? 'Playing' : 'Stopped' %>
        </span>
      </div>
    </div>

    <!-- Current Track -->
    <div id="now-playing" class="p-5">
      <% if (playerState && playerState.current) { %>
        <div class="flex items-center space-4">
          <% if (playerState.current.artwork) { %>
            <img src="<%= playerState.current.artwork %>" alt="" class="w-20 h-20 rounded-lg bg-discord-darker object-cover">
          <% } else { %>
            <div class="w-20 h-20 rounded-lg bg-discord-darker flex items-center justify-center">
              <i class="fas fa-music text-3xl text-gray-500"></i>
            </div>
          <% } %>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-white truncate"><%= playerState.current.title %></h3>
            <p class="text-gray-400 text-sm"><%= playerState.current.author %></p>
            <div class="mt-2 flex items-center space-2">
              <span id="current-time" class="text-xs text-gray-400 font-mono"><%= formatDuration(playerState.position || 0) %></span>
              <div class="flex-1 h-2 bg-discord-darker rounded-full overflow-hidden">
                <div id="progress-bar" class="h-full bg-primary rounded-full transition-all duration-100" style="width: <%= playerState.current.length ? ((playerState.position || 0) / playerState.current.length * 100) : 0 %>%"></div>
              </div>
              <span id="total-time" class="text-xs text-gray-400 font-mono"><%= formatDuration(playerState.current.length || 0) %></span>
            </div>
            <p class="text-xs text-gray-500 mt-1">Requested by: <span id="requester-name">Loading...</span></p>
          </div>
        </div>

        <!-- Controls -->
        <div class="mt-6 flex items-center justify-center space-2">
          <button id="btn-shuffle" class="p-2 rounded-lg bg-discord-darker border border-discord-border hover:border-purple-500/50 transition-colors <%= playerState?.loop === 'track' ? 'text-purple-400' : 'text-gray-400' %>" data-action="shuffle" title="Shuffle">
            <i class="fas fa-random text-lg"></i>
          </button>
          <button id="btn-prev" class="p-2 rounded-lg bg-discord-darker border border-discord-border hover:border-primary/50 transition-colors text-gray-400" data-action="previous" title="Previous">
            <i class="fas fa-step-backward text-xl"></i>
          </button>
          <button id="btn-play-pause" class="p-3 rounded-full bg-primary hover:bg-primary-hover text-white transition-colors" data-action="play-pause" title="Play/Pause">
            <i class="fas fa-play text-xl" id="play-icon"></i>
          </button>
          <button id="btn-next" class="p-2 rounded-lg bg-discord-darker border border-discord-border hover:border-primary/50 transition-colors text-gray-400" data-action="next" title="Next">
            <i class="fas fa-step-forward text-xl"></i>
          </button>
          <button id="btn-loop" class="p-2 rounded-lg bg-discord-darker border border-discord-border hover:border-purple-500/50 transition-colors <%= playerState?.loop === 'track' ? 'text-purple-400' : playerState?.loop === 'queue' ? 'text-purple-400' : 'text-gray-400' %>" data-action="loop" title="Loop">
            <i class="fas fa-redo text-lg"></i>
          </button>
        </div>

        <!-- Volume -->
        <div class="mt-4 flex items-center space-3">
          <i class="fas fa-volume-down text-gray-400"></i>
          <input type="range" id="volume-slider" min="0" max="100" value="<%= playerState?.volume || 50 %>" class="flex-1 h-2 bg-discord-darker rounded-lg appearance-none accent-primary" aria-label="Volume">
          <i class="fas fa-volume-up text-gray-400"></i>
          <span id="volume-display" class="text-sm text-gray-400 w-10"><%= playerState?.volume || 50 %>%</span>
        </div>
      <% } else { %>
        <div class="text-center py-12 text-gray-400">
          <i class="fas fa-music text-4xl mb-4 opacity-50"></i>
          <p class="text-lg">Nothing playing</p>
          <p class="text-sm mt-2">Use <code>/play</code> in Discord to start music</p>
        </div>
      <% } %>
    </div>
  </div>

  <!-- Queue -->
  <div class="mt-6 bg-discord-card border border-discord-border rounded-xl overflow-hidden">
    <div class="px-5 py-4 border-b border-discord-border flex items-center justify-between">
      <h2 class="text-lg font-semibold text-white flex items-center">
        <i class="fas fa-list text-purple-400 mr-2"></i>
        Queue (<span id="queue-count"><%= playerState?.queueSize || 0 %></span>)
      </h2>
      <button id="clear-queue" class="px-3 py-1 text-xs bg-red-500/20 border border-red-500/30 text-red-400 rounded hover:bg-red-500/30 transition-colors">
        Clear Queue
      </button>
    </div>
    <div id="queue-list" class="divide-y divide-discord-border max-h-96 overflow-y-auto">
      <% if (playerState && playerState.queue && playerState.queue.length > 0) { %>
        <% playerState.queue.slice(0, 20).forEach((track, index) => { %>
          <div class="px-5 py-3 flex items-center space-3 hover:bg-discord-darker/50 transition-colors">
            <span class="w-6 text-center text-gray-400 font-medium">#<%= index + 1 %></span>
            <img src="<%= track.artwork %>" alt="" class="w-10 h-10 rounded bg-discord-darker object-cover" onerror="this.style.display='none'">
            <div class="flex-1 min-w-0">
              <p class="font-medium text-white truncate"><%= track.title %></p>
              <p class="text-xs text-gray-400"><%= track.author %> • <%= formatDuration(track.length) %></p>
            </div>
            <span class="text-xs text-gray-500"><%= track.requester ? 'Requested by ' + track.requester : '' %></span>
          </div>
        <% }) %>
        <% if (playerState.queue.length > 20) { %>
          <div class="px-5 py-3 text-center text-gray-500">
            And <%= playerState.queue.length - 20 %> more...
          </div>
        <% } %>
      <% } else { %>
        <div class="px-5 py-8 text-center text-gray-500">
          <i class="fas fa-list text-2xl mb-2 opacity-50"></i>
          <p>Queue is empty</p>
        </div>
      <% } %>
    </div>
  </div>

  <!-- Filters -->
  <div class="mt-6 bg-discord-card border border-discord-border rounded-xl p-5">
    <h3 class="text-lg font-semibold text-white mb-4 flex items-center">
      <i class="fas fa-sliders-h text-purple-400 mr-2"></i>
      Audio Filters
    </h3>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <% const filters = [
        { id: 'bass', name: 'Bass Boost', emoji: '🔊', desc: 'Enhance bass frequencies' },
        { id: 'nightcore', name: 'Nightcore', emoji: '⚡', desc: 'Speed up and pitch up' },
        { id: 'vaporwave', name: 'Vaporwave', emoji: '🌊', desc: 'Slow down and pitch down' },
        { id: 'eightD', name: '8D Audio', emoji: '🎧', desc: 'Rotating audio effect' },
        { id: 'karaoke', name: 'Karaoke', emoji: '🎤', desc: 'Remove vocals' },
        { id: 'clear', name: 'Clear Filters', emoji: '🧹', desc: 'Remove all filters' },
      ]; %>
      <% filters.forEach(filter => { %>
        <button class="filter-btn p-4 bg-discord-darker border border-discord-border rounded-lg hover:border-purple-500/50 transition-colors text-left" data-filter="<%= filter.id %>">
          <div class="flex items-center space-3">
            <span class="text-2xl"><%= filter.emoji %></span>
            <div>
              <p class="font-medium text-white"><%= filter.name %></p>
              <p class="text-xs text-gray-400"><%= filter.desc %></p>
            </div>
          </div>
        </button>
      <% }) %>
    </div>
  </div>
</div>

<script>
  // Music Dashboard JavaScript
  const GUILD_ID = '<%= guild.id %>';
  const SOCKET = io();

  // Join guild room for real-time updates
  SOCKET.emit('joinGuild', GUILD_ID);

  // DOM Elements
  const playPauseBtn = document.getElementById('btn-play-pause');
  const playIcon = document.getElementById('play-icon');
  const progressBar = document.getElementById('progress-bar');
  const currentTimeEl = document.getElementById('current-time');
  const totalTimeEl = document.getElementById('total-time');
  const volumeSlider = document.getElementById('volume-slider');
  const volumeDisplay = document.getElementById('volume-display');
  const musicStatus = document.getElementById('music-status');
  const queueCount = document.getElementById('queue-count');

  // State
  let isPlaying = <%= playerState?.playing ? 'true' : 'false' %>;
  let currentDuration = <%= playerState?.current?.length || 0 %>;

  // Format duration helper
  function formatDuration(ms) {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return \`\${hours}:\${(minutes % 60).toString().padStart(2, '0')}:\${(seconds % 60).toString().padStart(2, '0')}\`;
    return \`\${minutes}:\${(seconds % 60).toString().padStart(2, '0')}\`;
  }

  // API Helper
  async function apiCall(endpoint, method = 'POST', body = {}) {
    const response = await fetch(\`/music/<%= guild.id %>\${endpoint}\`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || '',
      },
      body: method !== 'GET' ? JSON.stringify(body) : undefined,
    });
    return response.json();
  }

  // Event Listeners
  playPauseBtn?.addEventListener('click', async () => {
    await apiCall('/control', 'POST', { action: isPlaying ? 'pause' : 'resume' });
    isPlaying = !isPlaying;
    updatePlayButton();
  });

  document.getElementById('btn-skip')?.addEventListener('click', () => apiCall('/control', 'POST', { action: 'skip' }));
  document.getElementById('btn-stop')?.addEventListener('click', () => apiCall('/control', 'POST', { action: 'stop' }));
  document.getElementById('btn-loop')?.addEventListener('click', () => {
    const modes = ['off', 'track', 'queue'];
    const current = document.getElementById('btn-loop').dataset.loop || 'off';
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    apiCall('/control', 'POST', { action: 'loop', value: next });
  });

  volumeSlider?.addEventListener('input', (e) => {
    volumeDisplay.textContent = e.target.value + '%';
  });

  volumeSlider?.addEventListener('change', (e) => {
    apiCall('/control', 'POST', { action: 'volume', value: parseInt(e.target.value) });
    volumeDisplay.textContent = e.target.value + '%';
  });

  // Filter Buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      apiCall('/control', 'POST', { action: 'filter', value: filter });
      btn.classList.toggle('ring-2', true);
      btn.classList.toggle('ring-purple-500', true);
    });
  });

  // Socket.IO Events
  SOCKET.on('music:state', (state) => {
    updatePlayerUI(state);
  });

  SOCKET.on('music:play', (data) => {
    isPlaying = true;
    updatePlayButton();
  });

  SOCKET.on('music:stop', () => {
    isPlaying = false;
    updatePlayButton();
    progressBar.style.width = '0%';
    currentTimeEl.textContent = '0:00';
  });

  SOCKET.on('music:queue_update', (data) => {
    queueCount.textContent = data.queueSize || 0;
  });

  // Update UI from state
  function updatePlayerUI(state) {
    if (!state) return;

    isPlaying = state.playing;
    updatePlayButton();

    if (state.current) {
      currentDuration = state.current.length || 0;
      totalTimeEl.textContent = formatDuration(currentDuration);
    }

    if (state.queueSize !== undefined) {
      queueCount.textContent = state.queueSize;
    }
  }

  function updatePlayButton() {
    if (playPauseBtn && playIcon) {
      playIcon.className = isPlaying ? 'fas fa-pause text-xl' : 'fas fa-play text-xl';
    }
    if (musicStatus) {
      musicStatus.textContent = isPlaying ? 'Playing' : 'Paused';
      musicStatus.className = isPlaying 
        ? 'px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400'
        : 'px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400';
    }
  }

  // Progress bar simulation (real implementation would use Socket.IO position updates)
  let progressInterval;
  function startProgressSimulation() {
    clearInterval(progressInterval);
    if (isPlaying && currentDuration > 0) {
      progressInterval = setInterval(() => {
        const position = parseInt(currentTimeEl.textContent.split(':').reduce((a, b) => parseInt(a) * 60 + parseInt(b), 0)) * 1000 + 1000;
        if (position <= currentDuration) {
          const percent = (position / currentDuration) * 100;
          progressBar.style.width = percent + '%';
          currentTimeEl.textContent = formatDuration(position);
        } else {
          clearInterval(progressInterval);
        }
      }, 1000);
    }
  }

  // Initialize
  updatePlayButton();
  startProgressSimulation();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(progressInterval);
    SOCKET.emit('leaveGuild', GUILD_ID);
  });
</script>
` }) %>