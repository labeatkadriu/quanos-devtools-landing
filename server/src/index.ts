import mongoose from 'mongoose';
import { config } from './config/env.js';
import { logger } from './logger.js';
import { createApp } from './app.js';
import { ensureInitialAdmin } from './bootstrap.js';

async function main(): Promise<void> {
  await mongoose.connect(config.mongoUri);
  logger.info('connected to MongoDB');

  await ensureInitialAdmin();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'server listening');
  });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    server.close(() => process.exit(0));
    await mongoose.disconnect().catch(() => {});
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'failed to start');
  process.exit(1);
});
