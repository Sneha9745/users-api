
import { Router } from 'express';
import { validateBody } from '../middleware/validate-body.js';
import { validateIdParam } from '../middleware/validate-id.js';
import {
  createUserSchema,
  updateUserSchema,
} from '../validators/user.schema.js';
import { changeRoleSchema } from '../validators/auth.schema.js';
import { createAuthenticate } from '../middleware/authenticate.js';
import { requirePermission, requireRole } from '../middleware/authorize.js';

export function createUsersRouter({
  usersController: controller,
  tokenService,
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
    validateBody(updateUserSchema, { partial: true }),
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

  return router;
}
