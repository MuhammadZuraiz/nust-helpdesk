const prisma = require('../src/prismaClient');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('Seeding...');
  const d1 = await prisma.department.upsert({
    where: { name: 'Maintenance' },
    update: {},
    create: { name: 'Maintenance' }
  });

  const pw = await bcrypt.hash('Password123', 10);

  const users = [
    { name: 'Student Demo', email: 'student@example.com', role: 'STUDENT', passwordHash: pw },
    { name: 'Agent Demo', email: 'agent@example.com', role: 'AGENT', passwordHash: pw, departmentId: d1.id },
    { name: 'Supervisor Demo', email: 'supervisor@example.com', role: 'SUPERVISOR', passwordHash: pw, departmentId: d1.id },
    { name: 'Admin Demo', email: 'admin@example.com', role: 'ADMIN', passwordHash: pw }
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u
    });
  }
  console.log('Seeded.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });