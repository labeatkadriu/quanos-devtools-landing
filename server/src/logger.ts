import pino, { type Logger } from 'pino';

const defaultLevel =
  process.env.NODE_ENV === 'test'
    ? 'silent'
    : process.env.NODE_ENV === 'production'
      ? 'info'
      : 'debug';

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL || defaultLevel,
  redact: ['req.headers.authorization', 'password'],
});
