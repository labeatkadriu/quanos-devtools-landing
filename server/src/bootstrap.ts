import { User } from './models/User.js';
import { config } from './config/env.js';
import { logger } from './logger.js';

export async function ensureInitialAdmin(): Promise<void> {
  const count = await User.estimatedDocumentCount();
  if (count > 0) return;
  if (!config.adminPassword) {
    logger.warn('No users exist and ADMIN_PASSWORD is not set — skipping initial admin creation');
    return;
  }
  const passwordHash = await User.hashPassword(config.adminPassword);
  await User.create({
    username: config.adminUsername.toLowerCase(),
    passwordHash,
    role: 'admin',
  });
  logger.info({ username: config.adminUsername }, 'initial admin user created');
}
