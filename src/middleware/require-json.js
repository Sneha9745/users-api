
import { HttpError } from '../utils/http-error.js';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

const hasBody = (req) => {
  if (!req.headers) return true;

  return (
    req.headers['transfer-encoding'] !== undefined ||
    Number(req.headers['content-length'] ?? 0) > 0
  );
};

export function requireJson(req, res, next) {
  if (
    METHODS_WITH_BODY.has(req.method) &&
    hasBody(req) &&
    !req.is('application/json')
  ) {
    return next(
      new HttpError(
        415,
        'Unsupported Media Type',
        'Content-Type must be application/json',
      ),
    );
  }

  next();
}
