
import { conflict, notFound, unauthorized } from '../utils/http-error.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { paginate, parsePagination, sortItems } from '../utils/query.js';
import { randomUUID } from 'node:crypto';

const SORTABLE_FIELDS = ['firstName', 'lastName', 'email', 'createdAt'];
export const ROLES = ['customer', 'admin'];

const withDefaults = (profile) => ({
  ...profile,
  phone: profile.phone ?? null,
  dateOfBirth: profile.dateOfBirth ?? null,
  address: profile.address ?? null,
  githubId: profile.githubId ?? null,
});

export const toPublicUser = ({ passwordHash, ...user }) => user;

const DUMMY_HASH = await hashPassword('dummy-password-for-timing');

export class UsersService {
  constructor(usersRepository, { hash = hashPassword, verify = verifyPassword } = {}) {
    this.users = usersRepository;
    this.hash = hash;
    this.verify = verify;
  }

  async list(query = {}) {
    let items = await this.users.findAll();

    if (typeof query.q === 'string' && query.q.trim()) {
      const needle = query.q.trim().toLowerCase();
      items = items.filter((u) =>
        `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(needle),
      );
    }

    if (typeof query.role === 'string') {
      items = items.filter((u) => u.role === query.role);
    }

    items = sortItems(items, query.sort ?? 'lastName', SORTABLE_FIELDS);
    const page = paginate(items, parsePagination(query));

    return { ...page, data: page.data.map(toPublicUser) };
  }

  async getById(id) {
    const user = await this.users.findById(id);
    if (!user) throw notFound(`User ${id} does not exist`);
    return toPublicUser(user);
  }

  async create(data, { role = 'customer' } = {}) {
    await this.#assertEmailAvailable(data.email);

    const { password, ...profile } = data;
    const passwordHash = await this.hash(password);

    const user = await this.users.create({
      ...withDefaults(profile),
      role,
      passwordHash,
    });

    return toPublicUser(user);
  }

  async update(id, changes) {
    await this.getById(id);

    if (changes.email) {
      await this.#assertEmailAvailable(changes.email, id);
    }

    return toPublicUser(await this.users.update(id, changes));
  }

  async remove(id) {
    await this.getById(id);
    await this.users.delete(id);
  }

  async verifyCredentials(email, password) {
    const user = await this.users.findByEmail(email);
    const ok = await this.verify(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !user.passwordHash || !ok) {
      throw unauthorized('Invalid email or password');
    }

    return toPublicUser(user);
  }

  async changePassword(id, currentPassword, newPassword) {
    const user = await this.users.findById(id);

    if (!user?.passwordHash || !(await this.verify(currentPassword, user.passwordHash))) {
      throw unauthorized('Current password is incorrect');
    }

    await this.users.update(id, {
      passwordHash: await this.hash(newPassword),
    });
  }

  async changeRole(id, role) {
    await this.getById(id);
    return toPublicUser(await this.users.update(id, { role }));
  }

  async findOrCreateFromGithub({ githubId, email, name, login }) {
    const byGithub = await this.users.findByGithubId(githubId);
    if (byGithub) return toPublicUser(byGithub);

    const byEmail = await this.users.findByEmail(email);
    if (byEmail) {
      return toPublicUser(await this.users.update(byEmail.id, { githubId }));
    }

    const [firstName, ...rest] = (name ?? login).trim().split(/\s+/);

    const user = await this.users.create({
      ...withDefaults({
        firstName,
        lastName: rest.join(' '),
        email: email.toLowerCase(),
        githubId,
      }),
      role: 'customer',
      passwordHash: null,
    });

    return toPublicUser(user);
  }

  async #assertEmailAvailable(email, exceptId) {
    const existing = await this.users.findByEmail(email);

    if (existing && existing.id !== exceptId) {
      throw conflict(`Email ${email} is already registered`);
    }
  }
}
