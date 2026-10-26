/**
 * Socket.IO Setup - Real-time communication between bot and dashboard
 */
import { eventBus, EVENTS } from '../../core/eventBus.js';

/**
 * Setup Socket.IO connections and event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Client} botClient - Discord.js client instance
 */
export function setupSockets(io, botClient) {
  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const session = socket.request.session;
    if (session && session.user) {
      socket.user = session.user;
      next();
    } else {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`User connected: ${userId} (${socket.id})`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join guild rooms for guilds user manages
    const userGuilds = getUserManageableGuilds(socket.user, botClient);
    userGuilds.forEach(guildId => {
      socket.join(`guild:${guildId}`);
    });

    // Handle guild room joining
    socket.on('joinGuild', (guildId) => {
      // Verify user has access to this guild
      if (hasGuildAccess(socket.user, guildId, botClient)) {
        socket.join(`guild:${guildId}`);
        socket.emit('joinedGuild', { guildId });
      }
    });

    // Handle guild room leaving
    socket.on('leaveGuild', (guildId) => {
      socket.leave(`guild:${guildId}`);
    });

    // Handle music controls from dashboard
    socket.on('music:control', async (data) => {
      const { guildId, action, value } = data;
      if (!hasGuildAccess(socket.user, guildId, botClient)) {
        return socket.emit('error', { message: 'No permission' });
      }

      try {
        const { musicService } = await import('../../services/music.service.js');
        let result;

        switch (action) {
          case 'play':
            // Would need track info
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

        // Broadcast updated state
        const state = musicService.getPlayerState(guildId);
        io.to(`guild:${guildId}`).emit('music:state', state);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle setting updates from dashboard
    socket.on('setting:update', async (data) => {
      const { guildId, path, value } = data;
      if (!hasGuildAccess(socket.user, guildId, botClient)) {
        return socket.emit('error', { message: 'No permission' });
      }

      try {
        const { guildService } = await import('../../services/guild.service.js');
        await guildService.updateNestedSetting(guildId, path, value);
        io.to(`guild:${guildId}`).emit('setting:updated', { path, value });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle command toggles
    socket.on('command:toggle', async (data) => {
      const { guildId, command, enabled } = data;
      if (!hasGuildAccess(socket.user, guildId, botClient)) {
        return socket.emit('error', { message: 'No permission' });
      }

      try {
        const { guildService } = await import('../../services/guild.service.js');
        if (enabled) {
          await guildService.pullFromArraySetting(guildId, 'commands.disabledCommands', command);
        } else {
          await guildService.pushToArraySetting(guildId, 'commands.disabledCommands', command);
        }
        io.to(`guild:${guildId}`).emit('command:toggled', { command, enabled });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${userId} (${reason})`);
    });
  });

  return io;
}

/**
 * Check if user has access to manage a guild
 */
function hasGuildAccess(user, guildId, botClient) {
  const guild = botClient.guilds.cache.get(guildId);
  if (!guild) return false;

  const member = guild.members.cache.get(user.id);
  if (!member) return false;

  return member.permissions.has('ManageGuild') || member.permissions.has('Administrator') || guild.ownerId === user.id;
}

/**
 * Get guilds where user has manage permissions
 */
function getUserManageableGuilds(user, botClient) {
  const guilds = [];
  botClient.guilds.cache.forEach(guild => {
    const member = guild.members.cache.get(user.id);
    if (member && (member.permissions.has('ManageGuild') || member.permissions.has('Administrator') || guild.ownerId === user.id)) {
      guilds.push(guild.id);
    }
  });
  return guilds;
}

export default { setupSockets };