import { Router } from 'express';
import { createContainer } from '../container.js';
import { validateIdParam } from '../middleware/validate-id.js';
import { requireJson } from '../middleware/require-json.js';
import { requirePermission } from '../middleware/authorize.js';

export function createAvatarRouter(container = createContainer()) {
  const router = Router();
  const { avatarController, avatarUpload, authenticate } = container;

  router.post(
    '/users/:id/avatar',
    authenticate,
    validateIdParam,
    requirePermission('users:update', (req) => ({ id: req.params.id })),
    avatarUpload,
    avatarController.upload,
  );

  router.delete(
    '/users/:id/avatar',
    authenticate,
    validateIdParam,
    requirePermission('users:update', (req) => ({ id: req.params.id })),
    avatarController.remove,
  );

  router.post(
    '/users/:id/avatar/presign',
    authenticate,
    validateIdParam,
    requirePermission('users:update', (req) => ({ id: req.params.id })),
    requireJson,
    avatarController.createDirectUpload,
  );

  router.post(
    '/users/:id/avatar/complete',
    authenticate,
    validateIdParam,
    requirePermission('users:update', (req) => ({ id: req.params.id })),
    requireJson,
    avatarController.completeDirectUpload,
  );

  return router;
}