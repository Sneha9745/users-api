import { ROLES } from '../services/users.service.js';
import { email, lowercase, oneOf, password, string } from './rules.js';

export const loginSchema = {
  email: { required: true, check: email().check, transform: lowercase },
  password: { required: true, check: string({ max: 72 }).check },
};

export const changePasswordSchema = {
  currentPassword: { required: true, check: string({ max: 72 }).check },
  newPassword: { required: true, check: password().check },
};

export const changeRoleSchema = {
  role: { required: true, check: oneOf(ROLES).check },
};