// Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD if that account doesn't exist yet.
export async function bootstrapAdmin(usersService, { email, password }) {
  if (!email || !password) return;

  try {
    await usersService.create(
      { firstName: 'Admin', lastName: 'User', email, password },
      { role: 'admin' }
    );
    console.log(`👑 Admin account created: ${email}`);
  } catch (err) {
    if (err.status !== 409) throw err;
  }
}