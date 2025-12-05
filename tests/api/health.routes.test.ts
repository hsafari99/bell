/**
 * Health check routes tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { createHealthRoutes } from '../../src/api/health.routes.js';
import { CommerceProviderInterface } from '../../src/providers/index.js';

describe('Health Routes', () => {
  let router: ReturnType<typeof createHealthRoutes>;
  let mockProvider: CommerceProviderInterface;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockProvider = {} as CommerceProviderInterface;
    router = createHealthRoutes(mockProvider);

    mockRequest = {};

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('should return health status', async () => {
    const route = router.stack.find((r: any) => r.route?.path === '/' && r.route?.methods?.get);
    expect(route).toBeDefined();

    if (route && route.route.stack[0]?.handle) {
      await route.route.stack[0].handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
      
      const callArgs = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.success).toBe(true);
      expect(callArgs.data.status).toBe('healthy');
      expect(callArgs.data.version).toBe('1.0.0');
      expect(callArgs.data.services).toBeDefined();
    }
  });

  it('should handle errors and return degraded status', async () => {
    // Import the module to spy on sendSuccess
    const responseHelpers = await import('../../src/api/response-helpers.js');
    
    // Make sendSuccess throw an error on first call
    let callCount = 0;
    const originalSendSuccess = responseHelpers.sendSuccess;
    vi.spyOn(responseHelpers, 'sendSuccess').mockImplementation((...args) => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Test error');
      }
      return originalSendSuccess(...args);
    });

    const route = router.stack.find((r: any) => r.route?.path === '/' && r.route?.methods?.get);
    if (route && route.route.stack[0]?.handle) {
      await route.route.stack[0].handle(mockRequest as Request, mockResponse as Response);

      // Should call sendSuccess twice - once that throws, once in catch block
      expect(responseHelpers.sendSuccess).toHaveBeenCalledTimes(2);
      
      // Check the second call (in catch block) has degraded status
      const secondCall = (responseHelpers.sendSuccess as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(secondCall[1].status).toBe('degraded');
      expect(secondCall[1].services.externalProvider).toBe('unhealthy');
    }

    // Restore
    vi.restoreAllMocks();
  });
});
