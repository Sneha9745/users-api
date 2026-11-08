export const policies = {
  'users:read': ({ actor, resource }) =>
    actor.role === 'admin' || actor.id === resource.id,

  'users:update': ({ actor, resource }) =>
    actor.role === 'admin' || actor.id === resource.id,

  'users:delete': ({ actor, resource }) =>
    actor.role === 'admin' && actor.id !== resource.id,
};

export function can(actor, action, resource) {
  const policy = policies[action];
  if (!policy) throw new Error(`Unknown action "${action}"`);
  return Boolean(actor) && policy({ actor, resource });
}