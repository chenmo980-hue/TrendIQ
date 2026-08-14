import type { Request, Response, NextFunction } from 'express';

export function withJsonSafety(handler: (req: Request, res: Response, next: NextFunction) => Promise<any> | any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (err: any) {
      console.error(`[API Error ${req.path}]`, err);
      if (!res.headersSent) {
        res.status(500).json({
          error: err?.message || 'Internal Server Error',
          status: 'error',
          path: req.path,
        });
      }
    }
  };
}
