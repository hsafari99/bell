/**
 * Main application entry point
 */

import express, { Express } from 'express';
import { CartStore, ProviderContextStore, TaxRateStore } from './stores/index.js';
import { SalesforceCommerceProvider } from './providers/index.js';
import { CartService, CartCleanupService, TaxService } from './services/index.js';
import { createCartRoutes, createHealthRoutes } from './api/index.js';

const PORT = process.env.PORT || 3000;
const CONTEXT_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());

  // Initialize stores
  const cartStore = new CartStore();
  const contextStore = new ProviderContextStore();
  const taxRateStore = new TaxRateStore();

  // Initialize provider (test double)
  const provider = new SalesforceCommerceProvider(CONTEXT_EXPIRY_MS);

  // Initialize services
  const taxService = new TaxService(taxRateStore);
  const cartService = new CartService(cartStore, contextStore, provider, taxService);
  const cleanupService = new CartCleanupService(cartStore, contextStore);

  // Start cleanup service
  cleanupService.start();

  // Routes
  app.use('/api/v1/carts', createCartRoutes(cartService));
  app.use('/api/v1/health', createHealthRoutes(provider));

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    cleanupService.stop();
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    cleanupService.stop();
    process.exit(0);
  });

  return app;
}

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`🚀 Telecom Cart Service running on port ${PORT}`);
    console.log(`📍 API: http://localhost:${PORT}/api/v1`);
    console.log(`❤️  Health: http://localhost:${PORT}/api/v1/health`);
  });
}

export { createApp };
