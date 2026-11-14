import cors from 'cors';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { forbidden, HttpError } from '../utils/http-error.js';

// ── Security headers (OWASP A05 Security Misconfiguration) ──
export const securityHeaders = () =>
  helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
  });

// ── CORS ──
export const corsPolicy = (allowedOrigins) =>
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Request-Id', 'Location'],
    maxAge: 600,
  });

// ── CSRF defence ──
export const verifyOrigin = (allowedOrigins) => (req, res, next) => {
  const origin = req.get('origin');

  if (origin && !allowedOrigins.includes(origin)) {
    return next(forbidden('Cross-site request blocked'));
  }

  next();
};

// ── Rate limiting ──
const tooManyRequests = (message) => (req, res, next) =>
  next(new HttpError(429, 'Too Many Requests', message));

export const apiRateLimit = ({ windowMs, limit }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: tooManyRequests('Too many requests, please try again later'),
  });

// ── Authentication rate limiting + security event logging (Bonus) ──
export const authRateLimit = ({ windowMs, limit }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,

    keyGenerator: (req) =>
      `${ipKeyGenerator(req.ip)}:${String(req.body?.email ?? '').toLowerCase()}`,

    handler: (req, res, next) => {
      console.warn(
        JSON.stringify({
          event: 'AUTH_RATE_LIMIT_TRIGGERED',
          requestId: req.id,
          email: String(req.body?.email ?? '').toLowerCase(),
          ip: req.ip,
          timestamp: new Date().toISOString(),
        }),
      );

      next(
        new HttpError(
          429,
          'Too Many Requests',
          'Too many attempts, please try again in 15 minutes',
        ),
      );
    },
  });