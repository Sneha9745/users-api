import { describe, expect, it, vi } from 'vitest';
import { UsersController } from '../../src/controllers/users.controller.js';

describe('UsersController', () => {
  it('lists users', async () => {
    const usersService = {
      list: vi.fn().mockResolvedValue({
        data: [{ id: '1', firstName: 'Sita' }],
        meta: { page: 1, pageSize: 20, total: 1 },
      }),
    };

    const controller = new UsersController(usersService);
    const req = { query: {} };
    const res = { json: vi.fn() };

    await controller.list(req, res);

    expect(usersService.list).toHaveBeenCalledWith({});
    expect(res.json).toHaveBeenCalled();
  });

  it('gets a user by id', async () => {
    const usersService = {
      getById: vi.fn().mockResolvedValue({
        id: '123',
        firstName: 'Sita',
      }),
    };

    const controller = new UsersController(usersService);
    const req = { params: { id: '123' } };
    const res = { json: vi.fn() };

    await controller.getById(req, res);

    expect(usersService.getById).toHaveBeenCalledWith('123');
    expect(res.json).toHaveBeenCalledWith({
      data: { id: '123', firstName: 'Sita' },
    });
  });

  it('creates a user', async () => {
    const user = { id: '123', firstName: 'Sita' };

    const usersService = {
      create: vi.fn().mockResolvedValue(user),
    };

    const controller = new UsersController(usersService);
    const req = {
      body: { firstName: 'Sita' },
      baseUrl: '/api/v1/users',
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      location: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await controller.create(req, res);

    expect(usersService.create).toHaveBeenCalledWith({
      firstName: 'Sita',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.location).toHaveBeenCalledWith(
      '/api/v1/users/123'
    );
  });
});