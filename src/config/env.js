/**
 * Environment configuration with Zod validation
 * Validates all required environment variables at startup
 */
import { z } from 'zod';

const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Discord Bot
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_CLIENT_SECRET: z.string().min(1, 'DISCORD_CLIENT_SECRET is required'),
  DISCORD_DEV_GUILD_ID: z.string().optional(),
  OWNER_IDS: z.string().optional().transform(val => val ? val.split(',').map(id => id.trim()) : []),

  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').url('MONGODB_URI must be a valid MongoDB connection string'),

  // Web Dashboard
  PORT: z.coerce.number().int().positive().default(3000),
  DASHBOARD_URL: z.string().url('DASHBOARD_URL must be a valid URL').default('http://localhost:3000'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  // Lavalink (Music)
  LAVALINK_HOST: z.string().default('127.0.0.1'),
  LAVALINK_PORT: z.coerce.number().int().positive().default(2333),
  LAVALINK_PASSWORD: z.string().default('youshallnotpass'),
  LAVALINK_SECURE: z.coerce.boolean().default(false),

  // Sharding
  SHARDING_ENABLED: z.coerce.boolean().default(false),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

<<<<<<< HEAD
let env;

export function loadEnv() {
  if (env) return env;
=======
let envCache;

export function loadEnv() {
  if (envCache) return envCache;
>>>>>>> f652c8f (Initial Commit - 2)

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors).flatMap(([field, msgs]) =>
      msgs.map(msg => `${field}: ${msg}`)
    );
    throw new Error(`Environment validation failed:\n${messages.join('\n')}`);
  }

<<<<<<< HEAD
  env = result.data;
  return env;
}

export function getEnv() {
  if (!env) return loadEnv();
  return env;
=======
  envCache = result.data;
  return envCache;
}

export function getEnv() {
  if (!envCache) return loadEnv();
  return envCache;
>>>>>>> f652c8f (Initial Commit - 2)
}

export const env = new Proxy({}, {
  get(_, prop) {
    return getEnv()[prop];
  },
});