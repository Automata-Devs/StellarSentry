/**
 * Music Service - Lavalink integration for music playback
 * Handles player management, queue, and controls
 */
import { Client } from 'discord.js';
<<<<<<< HEAD
import { LavalinkClient, Player, Track, Queue } from 'lavalink-client';
=======
import { LavalinkManager, Player, Queue } from 'lavalink-client';
>>>>>>> f652c8f (Initial Commit - 2)
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { eventBus, EVENTS } from '../core/eventBus.js';

class MusicService {
  constructor() {
    this.lavalink = null;
    this.players = new Map(); // guildId -> Player
<<<<<<< HEAD
=======
    this.initialized = false;
>>>>>>> f652c8f (Initial Commit - 2)
  }

  /**
   * Initialize Lavalink connection
   * @param {Client} discordClient
   */
  async initialize(discordClient) {
    try {
<<<<<<< HEAD
      this.lavalink = new LavalinkClient(discordClient, {
        nodes: [{
          host: env.LAVALINK_HOST,
          port: env.LAVALINK_PORT,
          password: env.LAVALINK_PASSWORD,
          secure: env.LAVALINK_SECURE,
          id: 'stellarsentry-main',
          retryAmount: 5,
          retryInterval: 5000,
        }],
        send: (payload) => {
          const guild = discordClient.guilds.cache.get(payload.d.guild_id);
=======
      const clientId = discordClient.user?.id;
      if (!clientId) {
        throw new Error('Discord client user ID not available');
      }

      this.lavalink = new LavalinkManager({
        client: {
          id: clientId,
          username: discordClient.user?.username ?? 'StellarSentry',
        },
        nodes: [{
          host: env.LAVALINK_HOST,
          port: env.LAVALINK_PORT,
          authorization: env.LAVALINK_PASSWORD,
          secure: false, // Force false to avoid port 443 requirement
          id: 'stellarsentry-main',
          // Only retry a few times with long intervals to avoid log spam when Lavalink isn't running
          retryAmount: 3,
          retryInterval: 60000, // 1 minute between retries
          // Don't auto-reconnect if not configured properly
          reconnectTries: 3,
        }],
        sendToShard: (guildId, payload) => {
          const guild = discordClient.guilds.cache.get(guildId);
>>>>>>> f652c8f (Initial Commit - 2)
          if (guild) guild.shard.send(payload);
        },
      });

<<<<<<< HEAD
=======
      // Handle node events - prevent uncaught exceptions
>>>>>>> f652c8f (Initial Commit - 2)
      this.lavalink.on('nodeConnect', (node) => {
        logger.info({ node: node.id }, 'Lavalink node connected');
      });

      this.lavalink.on('nodeDisconnect', (node, reason) => {
        logger.warn({ node: node.id, reason }, 'Lavalink node disconnected');
      });

      this.lavalink.on('nodeError', (node, error) => {
<<<<<<< HEAD
        logger.error({ node: node.id, err: error }, 'Lavalink node error');
      });

=======
        // Don't throw - just log to prevent uncaught exceptions
        logger.error({ node: node.id, err: error }, 'Lavalink node error (non-fatal)');
      });

      // Also handle errors on the node manager to prevent uncaught exceptions
      if (this.lavalink.nodeManager) {
        let lastErrorLog = 0;
        this.lavalink.nodeManager.on('error', (error) => {
          const now = Date.now();
          // Only log once per minute to avoid spam when Lavalink isn't running
          if (now - lastErrorLog > 60000) {
            logger.error({ err: error }, 'Lavalink node manager error (non-fatal)');
            lastErrorLog = now;
          }
        });
      }

>>>>>>> f652c8f (Initial Commit - 2)
      this.lavalink.on('trackStart', (player, track) => {
        this.handleTrackStart(player, track);
      });

      this.lavalink.on('trackEnd', (player, track, info) => {
        this.handleTrackEnd(player, track, info);
      });

      this.lavalink.on('trackStuck', (player, track, thresholdMs) => {
        logger.warn({ guildId: player.guildId, track: track.info.title }, 'Track stuck');
      });

      this.lavalink.on('trackError', (player, track, error) => {
        logger.error({ guildId: player.guildId, track: track.info.title, err: error }, 'Track error');
      });

      this.lavalink.on('queueEnd', (player) => {
        this.handleQueueEnd(player);
      });

      this.lavalink.on('playerDisconnect', (player) => {
        this.handlePlayerDisconnect(player);
      });

<<<<<<< HEAD
      await this.lavalink.connect();
      logger.info('Lavalink client initialized');
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize Lavalink');
      throw error;
=======
      // Initialize Lavalink - don't throw on connection failure, just log
      try {
        await this.lavalink.init({
          id: clientId,
          username: discordClient.user?.username ?? 'StellarSentry',
        });
        this.initialized = true;
        logger.info('Lavalink client initialized');
      } catch (initError) {
        // Connection failed but Lavalink client is still usable (will retry)
        logger.warn({ err: initError }, 'Lavalink initialization failed (will retry in background)');
        this.initialized = true; // Mark as initialized so commands don't error
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize Lavalink');
      // Don't rethrow - allow bot to continue without music
      this.initialized = true;
>>>>>>> f652c8f (Initial Commit - 2)
    }
  }

  /**
   * Get or create player for guild
   * @param {string} guildId
   * @returns {Promise<Player>}
   */
  async getPlayer(guildId) {
    let player = this.lavalink.players.get(guildId);
    if (!player) {
      player = this.lavalink.createPlayer({
        guildId,
        voiceChannelId: null,
        textChannelId: null,
        selfDeaf: true,
        selfMute: false,
        volume: 50,
      });
      this.players.set(guildId, player);
    }
    return player;
  }

  /**
   * Search for tracks
   * @param {string} query
   * @param {string} source
<<<<<<< HEAD
   * @returns {Promise<Track[]>}
=======
   * @returns {Promise<Array>}
>>>>>>> f652c8f (Initial Commit - 2)
   */
  async search(query, source = 'ytsearch') {
    if (!this.lavalink) throw new Error('Lavalink not initialized');

    const searchQuery = query.startsWith('http') ? query : `${source}:${query}`;
    const result = await this.lavalink.search(searchQuery);
    return result.tracks;
  }

  /**
   * Play a track
   * @param {Object} params
   * @returns {Promise<Player>}
   */
  async play({ guildId, voiceChannelId, textChannelId, track, requesterId }) {
    const player = await this.getPlayer(guildId);
    player.textChannelId = textChannelId;
    player.setVoiceChannel(voiceChannelId);

    await player.play(track);

    // Store requester info in track
    track.requester = requesterId;

    return player;
  }

  /**
   * Add track to queue
   * @param {string} guildId
<<<<<<< HEAD
   * @param {Track} track
=======
   * @param {Object} track
>>>>>>> f652c8f (Initial Commit - 2)
   * @returns {Promise<Queue>}
   */
  async addToQueue(guildId, track) {
    const player = this.lavalink.players.get(guildId);
    if (!player) throw new Error('No player for this guild');

    player.queue.add(track);
    return player.queue;
  }

  /**
   * Pause playback
   * @param {string} guildId
   * @returns {Promise<Player>}
   */
  async pause(guildId) {
    const player = this.lavalink.players.get(guildId);
    if (!player) throw new Error('No player for this guild');
    await player.pause(true);
    return player;
  }

  /**
   * Resume playback
   * @param {string} guildId
   * @returns {Promise<Player>}
   */
  async resume(guildId) {
    const player = this.lavalink.players.get(guildId);
    if (!player) throw new Error('No player for this guild');
    await player.pause(false);
    return player;
  }

  /**
   * Skip current track
   * @param {string} guildId
   * @returns {Promise<Player>}
   */
  async skip(guildId) {
    const player = this.lavalink.players.get(guildId);
    if (!player) throw new Error('No player for this guild');
    await player.skip();
    return player;
  }

  /**
   * Stop playback and clear queue
   * @param {string} guildId
   * @returns {Promise<void>}
   */
  async stop(guildId) {
    const player = this.lavalink.players.get(guildId);
    if (!player) return;
    await player.stop();
    player.queue.clear();
    this.players.delete(guildId);
  }

  /**
   * Set volume
   * @param {string} guildId
   * @param {number} volume (0-1000)
   * @returns {Promise<Player>}
   */
  async setVolume(guildId, volume) {
    const player = this.lavalink.players.get(guildId);
    if (!player) throw new Error('No player for this guild');
    await player.setVolume(Math.max(0, Math.min(1000, volume)));
    return player;
  }

  /**
   * Set loop mode
   * @param {string} guildId
   * @param {string} mode - 'off', 'track', 'queue'
   * @returns {Promise<Player>}
   */
  async setLoop(guildId, mode) {
    const player = this.lavalink.players.get(guildId);
    if (!player) throw new Error('No player for this guild');
    player.setLoop(mode);
    return player;
  }

  /**
   * Shuffle queue
   * @param {string} guildId
   * @returns {Promise<Queue>}
   */
  async shuffle(guildId) {
    const player = this.lavalink.players.get(guildId);
    if (!player) throw new Error('No player for this guild');
    player.queue.shuffle();
    return player.queue;
  }

  /**
   * Seek to position
   * @param {string} guildId
   * @param {number} positionMs
   * @returns {Promise<Player>}
   */
  async seek(guildId, positionMs) {
    const player = this.lavalink.players.get(guildId);
    if (!player) throw new Error('No player for this guild');
    await player.seek(positionMs);
    return player;
  }

  /**
   * Get queue
   * @param {string} guildId
   * @returns {Queue|null}
   */
  getQueue(guildId) {
    const player = this.lavalink.players.get(guildId);
    return player?.queue || null;
  }

  /**
   * Get current track
   * @param {string} guildId
<<<<<<< HEAD
   * @returns {Track|null}
=======
   * @returns {Object|null}
>>>>>>> f652c8f (Initial Commit - 2)
   */
  getCurrentTrack(guildId) {
    const player = this.lavalink.players.get(guildId);
    return player?.current || null;
  }

  /**
   * Check if playing
   * @param {string} guildId
   * @returns {boolean}
   */
  isPlaying(guildId) {
    const player = this.lavalink.players.get(guildId);
    return player?.playing || false;
  }

  /**
   * Get player state for dashboard
   * @param {string} guildId
   * @returns {Object|null}
   */
  getPlayerState(guildId) {
    const player = this.lavalink.players.get(guildId);
    if (!player) return null;

    return {
      guildId,
      playing: player.playing,
      paused: player.paused,
      volume: player.volume,
      loop: player.loop,
      current: player.current ? {
        title: player.current.info.title,
        author: player.current.info.author,
        length: player.current.info.length,
        uri: player.current.info.uri,
        artwork: player.current.info.artworkUrl,
        requester: player.current.requester,
        position: player.position,
      } : null,
      queue: player.queue.map(t => ({
        title: t.info.title,
        author: t.info.author,
        length: t.info.length,
        uri: t.info.uri,
        requester: t.requester,
      })),
      queueSize: player.queue.size,
      queueDuration: player.queue.duration,
    };
  }

  /**
   * Set filters
   * @param {string} guildId
   * @param {Object} filters
   * @returns {Promise<Player>}
   */
  async setFilters(guildId, filters) {
    const player = this.lavalink.players.get(guildId);
    if (!player) throw new Error('No player for this guild');

    const filterData = {};
    if (filters.bass) filterData.bass = filters.bass;
    if (filters.nightcore) filterData.timescale = { speed: 1.3, pitch: 1.3, rate: 1 };
    if (filters.vaporwave) filterData.timescale = { speed: 0.8, pitch: 0.8, rate: 1 };
    if (filters.eightD) filterData.rotation = { rotationHz: 0.2 };
    if (filters.karaoke) filterData.karaoke = { level: 1, monoLevel: 1, filterBand: 220, filterWidth: 100 };

    await player.setFilters(filterData);
    return player;
  }

  /**
   * Clear filters
   * @param {string} guildId
   * @returns {Promise<Player>}
   */
  async clearFilters(guildId) {
    const player = this.lavalink.players.get(guildId);
    if (!player) throw new Error('No player for this guild');
    await player.setFilters({});
    return player;
  }

  // Event handlers
  handleTrackStart(player, track) {
    eventBus.emit(EVENTS.MUSIC_PLAY, {
      guildId: player.guildId,
      track: {
        title: track.info.title,
        author: track.info.author,
        length: track.info.length,
        uri: track.info.uri,
        artwork: track.info.artworkUrl,
        requester: track.requester,
      },
    });
  }

  handleTrackEnd(player, track, info) {
    eventBus.emit(EVENTS.MUSIC_STOP, {
      guildId: player.guildId,
      track: {
        title: track.info.title,
      },
      reason: info.reason,
    });
  }

  handleQueueEnd(player) {
    eventBus.emit(EVENTS.MUSIC_STOP, {
      guildId: player.guildId,
      queueEnd: true,
    });
    // Auto leave if configured
    this.scheduleAutoLeave(player.guildId);
  }

  handlePlayerDisconnect(player) {
    this.players.delete(player.guildId);
  }

  scheduleAutoLeave(guildId) {
    // Would check settings and auto-leave after timeout
    setTimeout(() => {
      const player = this.lavalink.players.get(guildId);
      if (player && !player.playing && player.queue.size === 0) {
        this.stop(guildId);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Shutdown Lavalink connection
   */
  async shutdown() {
    if (this.lavalink) {
<<<<<<< HEAD
      for (const player of this.lavalink.players.values()) {
        await player.destroy();
      }
      await this.lavalink.destroy();
=======
      // Destroy all players
      for (const player of this.lavalink.players.values()) {
        try {
          await player.destroy();
        } catch (error) {
          logger.error({ err: error }, 'Error destroying player');
        }
      }
      this.players.clear();

      // Disconnect all nodes
      if (this.lavalink.nodeManager) {
        for (const node of this.lavalink.nodeManager.nodes.values()) {
          try {
            await node.disconnect();
          } catch (error) {
            logger.error({ err: error }, 'Error disconnecting node');
          }
        }
      }

>>>>>>> f652c8f (Initial Commit - 2)
      logger.info('Lavalink connection closed');
    }
  }
}

export const musicService = new MusicService();
export default musicService;