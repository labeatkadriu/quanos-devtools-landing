import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Error as MongooseError } from 'mongoose';
import { logger } from '../logger.js';

interface HttpError extends Error {
  status?: number;
  expose?: boolean;
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.errors });
    return;
  }
  if (err instanceof MongooseError.ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  logger.error({ err }, 'unhandled error');
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'Internal server error' });
}
