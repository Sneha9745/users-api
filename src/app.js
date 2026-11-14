
import cookieParser from 'cookie-parser';
import express from 'express';

import { config } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { requireJson } from './middleware/require-json.js';
import { responseTime } from './middleware/response-time.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createUsersRouter } from './routes/users.routes.js';
import { createAvatarRouter } from './routes/avatar.routes.js';

export function createApp(container) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  app.use(requestId);
  if (!config.isTest) app.use(requestLogger);
  app.use(requireJson);
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(responseTime);
  app.use(cookieParser());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptimeSec: Math.round(process.uptime()) });
  });

  // Serve uploaded avatar images from local disk
  if (container.uploads.driver === 'local') {
    app.use(
      '/uploads',
      express.static(container.uploads.localDir, {
        index: false,
        dotfiles: 'deny',
        immutable: true,
        maxAge: '365d',
        setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff'),
      }),
    );
  }

  app.use('/api/v1/auth', createAuthRouter(container));
  app.use('/api/v1/users', createUsersRouter(container));
  app.use('/api/v1', createAvatarRouter(container));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
