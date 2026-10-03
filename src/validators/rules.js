export const string = ({ min = 1, max = 200 } = {}) => ({
  check: (value) =>
    typeof value === 'string' && value.length >= min && value.length <= max
      ? null
      : `must be a string with ${min}-${max} characters`,
});

export const integer = ({ min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) => ({
  check: (value) =>
    Number.isInteger(value) && value >= min && value <= max
      ? null
      : `must be an integer between ${min} and ${max}`,
});

export const money = ({ min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => ({
  check: (value) =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
      ? null
      : `must be a number between ${min} and ${max}`,
});

export const oneOf = (allowed) => ({
  check: (value) => (allowed.includes(value) ? null : `must be one of: ${allowed.join(', ')}`),
});

export const email = () => ({
  check: (value) =>
    typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? null
      : 'must be a valid email address',
});

export const password = ({ min = 8, max = 128 } = {}) => ({
  check: (value) =>
    typeof value === 'string' && value.length >= min && value.length <= max
      ? null
      : `must be ${min}-${max} characters`,
});

export const phone = () => ({
  check: (value) =>
    typeof value === 'string' && /^[+0-9 ()-]{7,20}$/.test(value)
      ? null
      : 'must be a valid phone number',
});

export const pastDate = () => ({
  check: (value) => {
    const date = new Date(value);
    return !Number.isNaN(date.valueOf()) && date < new Date() ? null : 'must be a date in the past';
  },
});

export const isbn13 = () => ({
  check: (value) => {
    const digits = String(value).replace(/-/g, '');
    if (!/^\d{13}$/.test(digits)) return 'must be a 13-digit ISBN';
    const sum = [...digits].reduce((acc, digit, i) => acc + Number(digit) * (i % 2 === 0 ? 1 : 3), 0);
    return sum % 10 === 0 ? null : 'must be a valid ISBN-13';
  },
});

export const object = (shape) => ({
  check: (value) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return 'must be an object';
    const errors = [];
    for (const [field, rule] of Object.entries(shape)) {
      const fieldValue = value[field];
      if (fieldValue === undefined) {
        if (rule.required) errors.push(`${field} is required`);
        continue;
      }
      const message = rule.check(fieldValue);
      if (message) errors.push(`${field} ${message}`);
    }
    for (const field of Object.keys(value)) {
      if (!(field in shape)) errors.push(`${field} is not allowed`);
    }
    return errors.length ? errors.join('; ') : null;
  },
});

export const trim = (value) => value.trim();

export const lowercase = (value) => value.toLowerCase();

export const digitsOnly = (value) => value.replace(/\D/g, '');