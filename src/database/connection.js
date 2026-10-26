/**
 * MongoDB connection with Mongoose
 * Handles connection lifecycle, events, and graceful shutdown
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let connection = null;
let isConnected = false;

/**
 * Connect to MongoDB
 * @returns {Promise<mongoose.Connection>}
 */
export async function connectDatabase() {
  if (isConnected && connection) {
    return connection;
  }

  const uri = env.MONGODB_URI;
  const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4, // Use IPv4
  };

  try {
    connection = await mongoose.connect(uri, options);
    isConnected = true;

    logger.info({ host: connection.connection.host, name: connection.connection.name }, 'Database connected');

    // Connection event handlers
    connection.connection.on('connected', () => {
      isConnected = true;
      logger.info('Database connection established');
    });

    connection.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('Database disconnected');
    });

    connection.connection.on('error', (error) => {
      logger.error({ err: error }, 'Database connection error');
    });

    connection.connection.on('reconnected', () => {
      isConnected = true;
      logger.info('Database reconnected');
    });

    // Handle process termination
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    return connection;
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to database');
    throw error;
  }
}

/**
 * Graceful shutdown of database connection
 */
export async function gracefulShutdown() {
  if (connection && isConnected) {
    logger.info('Closing database connection...');
    await mongoose.connection.close(false);
    isConnected = false;
    logger.info('Database connection closed');
  }
}

/**
 * Check if database is connected
 * @returns {boolean}
 */
export function isDatabaseConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Get connection status
 * @returns {Object}
 */
export function getConnectionStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    connected: isConnected,
    readyState: mongoose.connection.readyState,
    state: states[mongoose.connection.readyState] || 'unknown',
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
}

/**
 * Get Mongoose instance for direct access if needed
 * @returns {typeof mongoose}
 */
export function getMongoose() {
  return mongoose;
}

export default { connectDatabase, gracefulShutdown, isDatabaseConnected, getConnectionStatus, getMongoose };