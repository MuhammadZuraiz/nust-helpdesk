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

  const category = await prisma.category.upsert({
    where: { name_departmentId: { name: 'Plumbing', departmentId: d1.id } },
    update: {},
    create: { name: 'Plumbing', departmentId: d1.id }
  });

  // example ticket (created by Student Demo)
  const student = await prisma.user.findUnique({ where: { email: 'student@example.com' }});
  await prisma.ticket.upsert({
    where: { id: 'seed-ticket-1' },
    update: {},
    create: {
      id: 'seed-ticket-1',
      title: 'Leaky sink in room 201',
      description: 'Water leaking from sink since last night.',
      studentId: student.id,
      departmentId: d1.id,
      categoryId: category.id,
      priority: 'MED'
    }
  });


  console.log('Seeded.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });