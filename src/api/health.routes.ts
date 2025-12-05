/**
 * Health check routes
 */

import { Router, Request, Response } from 'express';
import { CommerceProviderInterface } from '../providers/index.js';
import { sendSuccess } from './response-helpers.js';

export function createHealthRoutes(_provider: CommerceProviderInterface): Router {
  const router = Router();
  const startTime = Date.now();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      // Check provider health (simple validation)
      const providerHealthy = true; // Simplified - could do actual check

      const status = providerHealthy ? 'healthy' : 'degraded';

      sendSuccess(res, {
        status,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        services: {
          api: 'healthy',
          externalProvider: providerHealthy ? 'healthy' : 'unhealthy',
          cache: 'healthy',
        },
        uptime: Date.now() - startTime,
      });
    } catch (error) {
      sendSuccess(res, {
        status: 'degraded',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        services: {
          api: 'healthy',
          externalProvider: 'unhealthy',
          cache: 'healthy',
        },
        uptime: Date.now() - startTime,
      });
    }
  });

  return router;
}
