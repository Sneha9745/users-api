
export class HttpError extends Error {
  constructor(status, title, detail, extras = {}) {
    super(detail ?? title);
    this.name = 'HttpError';
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.extras = extras;
  }
}

export const badRequest = (detail, errors) =>
  new HttpError(400, 'Bad Request', detail, errors ? { errors } : {});

export const unauthorized = (detail = 'Unauthorized') =>
  new HttpError(401, 'Unauthorized', detail);

export const forbidden = (detail = 'Forbidden') =>
  new HttpError(403, 'Forbidden', detail);

export const notFound = (detail) =>
  new HttpError(404, 'Not Found', detail);

export const conflict = (detail) =>
  new HttpError(409, 'Conflict', detail);
