import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { Link } from '../models/Link.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const linkSchema = z.object({
  title: z.string().min(1).max(120),
  url: z.string().url().max(2048),
  description: z.string().max(500).optional().default(''),
  icon: z.string().max(64).optional().default(''),
  category: z.string().max(60).optional().default('General'),
  color: z.string().max(16).optional().default('#3b82f6'),
  order: z.number().int().optional().default(0),
});

const partialLinkSchema = linkSchema.partial();

export type LinkInput = z.infer<typeof linkSchema>;
export type PartialLinkInput = z.infer<typeof partialLinkSchema>;

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const links = await Link.find().sort({ category: 1, order: 1, title: 1 });
    res.json(links);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = linkSchema.parse(req.body);
    const link = await Link.create(data);
    res.status(201).json(link);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = partialLinkSchema.parse(req.body);
    const link = await Link.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!link) return res.status(404).json({ error: 'Link not found' });
    return res.json(link);
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const link = await Link.findByIdAndDelete(req.params.id);
    if (!link) return res.status(404).json({ error: 'Link not found' });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

export default router;
