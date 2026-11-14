
import { Router } from 'express';
import { validateBody } from '../middleware/validate-body.js';
import { validateIdParam } from '../middleware/validate-id.js';
import {
  createUserSchema,
  updateUserSchema,
} from '../validators/user.schema.js';
import { changeRoleSchema } from '../validators/auth.schema.js';
import { completeUploadSchema, presignSchema } from '../validators/upload.schema.js';
import { createAuthenticate } from '../middleware/authenticate.js';
import { requirePermission, requireRole } from '../middleware/authorize.js';

export function createUsersRouter({
  usersController: controller,
  tokenService,
  avatarController: avatar,
  avatarUpload,
}) {
  const router = Router();
  const authenticate = createAuthenticate(tokenService);

  router.param('id', validateIdParam);

  router.post('/', validateBody(createUserSchema), controller.create);

  router.use(authenticate);

  router.get('/', requireRole('admin'), controller.list);

  router.get(
    '/:id',
    requirePermission('users:read', (req) => ({ id: req.params.id })),
    controller.getById,
  );

  router.patch(
    '/:id',
    requirePermission('users:update', (req) => ({ id: req.params.id })),
    validateBody(updateUserSchema),
    controller.update,
  );

  router.patch(
    '/:id/role',
    requireRole('admin'),
    validateBody(changeRoleSchema),
    controller.changeRole,
  );

  router.delete(
    '/:id',
    requirePermission('users:delete', (req) => ({ id: req.params.id })),
    controller.remove,
  );

  router.post(
    '/:id/avatar',
    requirePermission('users:update', (req) => ({ id: req.params.id })),
    avatarUpload,
    avatar.upload,
  );

  router.delete(
    '/:id/avatar',
    requirePermission('users:update', (req) => ({ id: req.params.id })),
    avatar.remove,
  );

  router.post(
    '/:id/avatar/presign',
    requirePermission('users:update', (req) => ({ id: req.params.id })),
    validateBody(presignSchema),
    avatar.createDirectUpload,
  );

  router.post(
    '/:id/avatar/complete',
    requirePermission('users:update', (req) => ({ id: req.params.id })),
    validateBody(completeUploadSchema),
    avatar.completeDirectUpload,
  );

  return router;
}
