const users = [
  { email: 'boss@ivs.com', fullName: 'Big Boss', role: 'admin' },
  { email: 'dev1@ivs.com', fullName: 'Alice Dev', role: 'employee' },
  { email: 'client@company.com', fullName: 'Client Name', role: 'client' }
];

async function runProvisioning() {
  for (const user of users) {
    // Call the same logic as above
    await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: 'TemporaryPassword123!',
      email_confirm: true
    });
    // ... insert into profiles table ...
    console.log(`Created: ${user.email}`);
  }
}