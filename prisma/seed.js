//AI generated seed for testing purposes
const prisma = require('../src/prismaClient');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('Seeding database for NUST Helpdesk (full test dataset)...');

  // ---------- Departments ----------
  const maintenance = await prisma.department.upsert({
    where: { name: 'Maintenance' },
    update: {},
    create: { name: 'Maintenance' }
  });
  const it = await prisma.department.upsert({
    where: { name: 'IT' },
    update: {},
    create: { name: 'IT' }
  });
  const security = await prisma.department.upsert({
    where: { name: 'Security' },
    update: {},
    create: { name: 'Security' }
  });
  const mess = await prisma.department.upsert({
    where: { name: 'Mess' },
    update: {},
    create: { name: 'Mess' }
  });

  // ---------- SLA Policies ----------
  // Define policies in minutes
  const policies = [
    { name: 'URGENT_policy', priority: 'URGENT', responseMinutes: 30,   resolveMinutes: 360 },   // 6h
    { name: 'HIGH_policy',   priority: 'HIGH',   responseMinutes: 120,  resolveMinutes: 1440 },  // 24h
    { name: 'MED_policy',    priority: 'MED',    responseMinutes: 480,  resolveMinutes: 2880 },  // 2d & 5d? (but we define as 48h)
    { name: 'LOW_policy',    priority: 'LOW',    responseMinutes: 1440, resolveMinutes: 7200 }   // 24h resp, 5d resolve ~ 7200? adjust as needed
  ];
  for (const p of policies) {
    await prisma.slaPolicy.upsert({
      where: { name: p.name },
      update: {},
      create: p
    });
  }

  // ---------- Users ----------
  const pw = await bcrypt.hash('Password123', 10);

  const student1 = await prisma.user.upsert({
    where: { email: 'student1@example.com' },
    update: {},
    create: {
      name: 'Student One',
      email: 'student1@example.com',
      passwordHash: pw,
      role: 'STUDENT'
    }
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@example.com' },
    update: {},
    create: {
      name: 'Student Two',
      email: 'student2@example.com',
      passwordHash: pw,
      role: 'STUDENT'
    }
  });

  const agentMaint = await prisma.user.upsert({
    where: { email: 'agent.maintenance@example.com' },
    update: {},
    create: {
      name: 'Agent Maintenance',
      email: 'agent.maintenance@example.com',
      passwordHash: pw,
      role: 'AGENT',
      departmentId: maintenance.id
    }
  });

  const agentIT = await prisma.user.upsert({
    where: { email: 'agent.it@example.com' },
    update: {},
    create: {
      name: 'Agent IT',
      email: 'agent.it@example.com',
      passwordHash: pw,
      role: 'AGENT',
      departmentId: it.id
    }
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@example.com' },
    update: {},
    create: {
      name: 'Supervisor Alice',
      email: 'supervisor@example.com',
      passwordHash: pw,
      role: 'SUPERVISOR',
      departmentId: maintenance.id
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin Root',
      email: 'admin@example.com',
      passwordHash: pw,
      role: 'ADMIN'
    }
  });

  // ---------- Categories ----------
  const plumbing = await prisma.category.upsert({
    where: { name_departmentId: { name: 'Plumbing', departmentId: maintenance.id } },
    update: {},
    create: { name: 'Plumbing', departmentId: maintenance.id }
  });
  const electricity = await prisma.category.upsert({
    where: { name_departmentId: { name: 'Electricity', departmentId: maintenance.id } },
    update: {},
    create: { name: 'Electricity', departmentId: maintenance.id }
  });
  const wifi = await prisma.category.upsert({
    where: { name_departmentId: { name: 'Wi-Fi', departmentId: it.id } },
    update: {},
    create: { name: 'Wi-Fi', departmentId: it.id }
  });
  const food = await prisma.category.upsert({
    where: { name_departmentId: { name: 'Food', departmentId: mess.id } },
    update: {},
    create: { name: 'Food', departmentId: mess.id }
  });

  // Helper: fetch policy by priority
  async function getPolicyFor(priority) {
    return prisma.slaPolicy.findFirst({ where: { priority }});
  }

  // ---------- Create tickets ----------
  // Helper to compute due dates from now
  function addMinutes(date, mins) {
    return new Date(date.getTime() + mins * 60 * 1000);
  }
  const now = new Date();

  // 1) OPEN ticket (no assignee) - not breached (MED)
  const medPolicy = await getPolicyFor('MED');
  const ticketOpen = await prisma.ticket.create({
    data: {
      title: 'Leaky sink in room 201',
      description: 'Water leaking from the sink since last night.',
      studentId: student1.id,
      departmentId: maintenance.id,
      categoryId: plumbing.id,
      priority: 'MED',
      status: 'OPEN',
      responseDueAt: addMinutes(now, medPolicy.responseMinutes),
      resolveDueAt: addMinutes(now, medPolicy.resolveMinutes)
    }
  });

  // 2) Assigned and IN_PROGRESS ticket (agent assigned) - firstResponseAt set (HIGH)
  const highPolicy = await getPolicyFor('HIGH');
  const ticketInProgress = await prisma.ticket.create({
    data: {
      title: 'AC not cooling in room 304',
      description: 'AC blows warm air and makes noise.',
      studentId: student2.id,
      departmentId: maintenance.id,
      categoryId: electricity.id,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assigneeId: agentMaint.id,
      firstResponseAt: addMinutes(now, -60), // staff responded 60 mins ago
      responseDueAt: addMinutes(now, -120 + highPolicy.responseMinutes), // created earlier but keep due date maybe in past
      resolveDueAt: addMinutes(now, highPolicy.resolveMinutes),
      resolvedAt: null
    }
  });

  // Add public staff comment (counts as first response already)
  await prisma.comment.create({
    data: {
      ticketId: ticketInProgress.id,
      authorId: agentMaint.id,
      content: 'I will inspect this evening.',
      isInternal: false
    }
  });
  await prisma.auditLog.create({
    data: {
      ticketId: ticketInProgress.id,
      actorId: agentMaint.id,
      action: 'ASSIGNED',
      oldValue: null,
      newValue: agentMaint.id
    }
  });

  // 3) NEEDS_INFO ticket: agent requested info (not breached)
  const ticketNeedsInfo = await prisma.ticket.create({
    data: {
      title: 'Internet disconnect in block A',
      description: 'Wi-Fi disconnects every 10 minutes.',
      studentId: student1.id,
      departmentId: it.id,
      categoryId: wifi.id,
      priority: 'MED',
      status: 'NEEDS_INFO',
      assigneeId: agentIT.id,
      responseDueAt: addMinutes(now, medPolicy.responseMinutes),
      resolveDueAt: addMinutes(now, medPolicy.resolveMinutes)
    }
  });
  await prisma.comment.create({
    data: {
      ticketId: ticketNeedsInfo.id,
      authorId: agentIT.id,
      content: 'Please share a screenshot of your Wi-Fi settings and the device model.',
      isInternal: false
    }
  });
  await prisma.auditLog.create({
    data: {
      ticketId: ticketNeedsInfo.id,
      actorId: agentIT.id,
      action: 'STATUS_CHANGE',
      oldValue: 'OPEN',
      newValue: 'NEEDS_INFO'
    }
  });

  // 4) RESOLVED ticket (student hasn't closed it) - resolvedAt in past within 3 days
  const ticketResolved = await prisma.ticket.create({
    data: {
      title: 'Clogged drain in kitchen',
      description: 'Drain is slow.',
      studentId: student2.id,
      departmentId: maintenance.id,
      categoryId: plumbing.id,
      priority: 'LOW',
      status: 'RESOLVED',
      assigneeId: agentMaint.id,
      firstResponseAt: addMinutes(now, -1440),
      resolvedAt: addMinutes(now, -48), // resolved 2 days ago
      responseDueAt: addMinutes(now, -1440),
      resolveDueAt: addMinutes(now, -60 * 24 * 5) // placeholder
    }
  });
  await prisma.auditLog.create({
    data: {
      ticketId: ticketResolved.id,
      actorId: agentMaint.id,
      action: 'STATUS_CHANGE',
      oldValue: 'IN_PROGRESS',
      newValue: 'RESOLVED'
    }
  });

  // 5) CLOSED ticket
  const ticketClosed = await prisma.ticket.create({
    data: {
      title: 'Room door hinge fixed',
      description: 'Hinge replaced.',
      studentId: student1.id,
      departmentId: maintenance.id,
      categoryId: electricity.id,
      priority: 'LOW',
      status: 'CLOSED',
      assigneeId: agentMaint.id,
      firstResponseAt: addMinutes(now, -72),
      resolvedAt: addMinutes(now, -48),
      responseDueAt: addMinutes(now, -200),
      resolveDueAt: addMinutes(now, -100)
    }
  });
  await prisma.auditLog.create({
    data: {
      ticketId: ticketClosed.id,
      actorId: student1.id,
      action: 'CLOSED',
      oldValue: 'RESOLVED',
      newValue: 'CLOSED'
    }
  });

  // 6) CANCELLED ticket
  const ticketCancelled = await prisma.ticket.create({
    data: {
      title: 'Moved out - cancel cleaning request',
      description: 'I no longer need cleaning.',
      studentId: student2.id,
      departmentId: maintenance.id,
      categoryId: plumbing.id,
      priority: 'LOW',
      status: 'CANCELLED',
      responseDueAt: addMinutes(now, medPolicy.responseMinutes),
      resolveDueAt: addMinutes(now, medPolicy.resolveMinutes)
    }
  });
  await prisma.auditLog.create({
    data: {
      ticketId: ticketCancelled.id,
      actorId: student2.id,
      action: 'CANCELLED',
      oldValue: 'OPEN',
      newValue: 'CANCELLED'
    }
  });

  // 7) REOPENED ticket (resolved > 8 days ago so reopen should be blocked if student tries)
  const oldResolvedAt = addMinutes(now, -60 * 24 * 10); // 10 days ago
  const ticketOldResolved = await prisma.ticket.create({
    data: {
      title: 'Noisy AC - previously resolved',
      description: 'Noise returned after repair.',
      studentId: student1.id,
      departmentId: maintenance.id,
      categoryId: electricity.id,
      priority: 'MED',
      status: 'RESOLVED',
      assigneeId: agentMaint.id,
      firstResponseAt: addMinutes(now, -20000),
      resolvedAt: oldResolvedAt,
      responseDueAt: addMinutes(now, -20000),
      resolveDueAt: addMinutes(now, -19000)
    }
  });
  // audit created
  await prisma.auditLog.create({
    data: {
      ticketId: ticketOldResolved.id,
      actorId: agentMaint.id,
      action: 'STATUS_CHANGE',
      oldValue: 'IN_PROGRESS',
      newValue: 'RESOLVED'
    }
  });

  // 8) A ticket that is already response-breached (URGENT)
  const urgentPolicy = await getPolicyFor('URGENT');
  const ticketUrgentBreached = await prisma.ticket.create({
    data: {
      title: 'Gas smell in block B',
      description: 'I can smell gas near the mess — urgent!',
      studentId: student2.id,
      departmentId: maintenance.id,
      categoryId: plumbing.id,
      priority: 'URGENT',
      status: 'OPEN',
      responseDueAt: addMinutes(now, -60), // due 60 mins ago -> breached
      resolveDueAt: addMinutes(now, urgentPolicy.resolveMinutes),
      isResponseBreached: false // seed expects check to detect and mark it
    }
  });

  // 9) Ticket that is resolve-breached (should be flagged)
  // Make created earlier so resolveDueAt in the past and not resolved
  const ticketResolveBreached = await prisma.ticket.create({
    data: {
      title: 'Wiring fault in block C',
      description: 'Frequent tripping of electric supply.',
      studentId: student1.id,
      departmentId: maintenance.id,
      categoryId: electricity.id,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assigneeId: agentMaint.id,
      firstResponseAt: addMinutes(now, -10000),
      responseDueAt: addMinutes(now, -9999),
      resolveDueAt: addMinutes(now, -3000), // long past
      isResolveBreached: false
    }
  });

  // ---------- Comments / Internal Notes ----------
  await prisma.comment.create({
    data: {
      ticketId: ticketUrgentBreached.id,
      authorId: student2.id,
      content: 'Please respond ASAP, I can smell gas.',
      isInternal: false
    }
  });

  await prisma.comment.create({
    data: {
      ticketId: ticketResolveBreached.id,
      authorId: agentMaint.id,
      content: 'Technician scheduled but delayed due to parts.',
      isInternal: true
    }
  });

  // ---------- Some audit logs to simulate prior actions ----------
  await prisma.auditLog.create({
    data: {
      ticketId: ticketOpen.id,
      actorId: student1.id,
      action: 'CREATED',
      newValue: JSON.stringify({ title: ticketOpen.title })
    }
  });

  await prisma.auditLog.create({
    data: {
      ticketId: ticketUrgentBreached.id,
      actorId: student2.id,
      action: 'CREATED',
      newValue: JSON.stringify({ title: ticketUrgentBreached.title })
    }
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });