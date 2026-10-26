/**
 * Health Routes - Health check endpoints
 */
import express from 'express';
import { env } from '../../config/env.js';
import { isDatabaseConnected, getConnectionStatus } from '../../database/connection.js';
import { musicService } from '../../services/music.service.js';

const router = express.Router();

/**
 * GET /health - Basic health check
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * GET /health/detailed - Detailed health check
 */
router.get('/detailed', async (req, res) => {
  const dbStatus = getConnectionStatus();
  const musicStatus = musicService.lavalink ? 'connected' : 'disconnected';

  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: env.NODE_ENV,
    services: {
      database: dbStatus,
      music: musicStatus,
      discord: 'connected', // Would check botClient.ws.status
    },
  };

  // Overall status
  if (dbStatus.connected === false || musicStatus === 'disconnected') {
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(checks);
});

/**
 * GET /health/live - Liveness probe (for Kubernetes)
 */
router.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

/**
 * GET /health/ready - Readiness probe (for Kubernetes)
 */
router.get('/ready', async (req, res) => {
  const dbStatus = getConnectionStatus();

  if (dbStatus.connected) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'Database not connected' });
  }
});

export default router;