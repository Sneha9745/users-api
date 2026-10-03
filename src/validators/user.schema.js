import { email, lowercase, object, password, pastDate, phone, string, trim } from './rules.js';

const addressShape = {
  street:     { required: true,  check: string({ max: 120 }).check },
  city:       { required: true,  check: string({ max: 80 }).check },
  postalCode: { required: false, check: string({ max: 20 }).check },
  country:    { required: true,  check: string({ max: 80 }).check },
};

export const createUserSchema = {
  firstName: { required: true, check: string({ max: 50 }).check, transform: trim },
  lastName: { required: true, check: string({ max: 50 }).check, transform: trim },
  email: { required: true, check: email().check, transform: lowercase },
  password: { required: true, check: password().check },
  phone: { required: false, check: phone().check, transform: trim },
  dateOfBirth: { required: false, check: pastDate().check },
  address: { required: false, check: object(addressShape).check },
};

const { password: _omitPassword, ...updatableFields } = createUserSchema;
export const updateUserSchema = updatableFields;