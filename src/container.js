import { UsersController } from './controllers/users.controller.js';
import { UsersRepository } from './repositories/users.repository.js';
import { UsersService } from './services/users.service.js';

export function createContainer(overrides = {}) {
  const usersRepository = overrides.usersRepository ?? new UsersRepository();
  const usersService = overrides.usersService ?? new UsersService(usersRepository, { hash: overrides.hashPassword });
  const usersController = new UsersController(usersService);

  return { usersRepository, usersService, usersController };
}