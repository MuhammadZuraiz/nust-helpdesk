/**
 * NUST Helpdesk — Comprehensive Seed File
 * Simulates a real university environment with:
 * - 7 departments, 30+ categories
 * - 6 agents, 4 supervisors, 1 admin, 20 students
 * - 80+ tickets across all statuses, priorities, and SLA states
 * - Realistic comments, internal notes, and audit trails
 * All accounts use password: Password123
 */

const prisma = require('../src/prismaClient');
const bcrypt = require('bcryptjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mins(n)  { return n * 60 * 1000; }
function hours(n) { return n * 60 * mins(1); }
function days(n)  { return n * 24 * hours(1); }

// Return a Date relative to now
function ago(ms)    { return new Date(Date.now() - ms); }
function from(ms)   { return new Date(Date.now() + ms); }

// Pick a random element from an array
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding NUST Helpdesk — comprehensive dataset...\n');

  const pw = await bcrypt.hash('Password123', 10);

  // ── 1. SLA Policies ─────────────────────────────────────────────────────────
  console.log('  Creating SLA policies...');
  const slaPolicies = [
    { name: 'URGENT_policy', priority: 'URGENT', responseMinutes: 30,   resolveMinutes: 360   },
    { name: 'HIGH_policy',   priority: 'HIGH',   responseMinutes: 120,  resolveMinutes: 1440  },
    { name: 'MED_policy',    priority: 'MED',    responseMinutes: 480,  resolveMinutes: 2880  },
    { name: 'LOW_policy',    priority: 'LOW',    responseMinutes: 1440, resolveMinutes: 7200  },
  ];
  for (const p of slaPolicies) {
    await prisma.slaPolicy.upsert({ where: { name: p.name }, update: {}, create: p });
  }

  // ── 2. Departments ───────────────────────────────────────────────────────────
  console.log('  Creating departments...');
  const deptData = [
    'Maintenance',
    'IT Services',
    'Security',
    'Mess & Catering',
    'Academic Affairs',
    'Transport',
    'Library',
  ];
  const depts = {};
  for (const name of deptData) {
    depts[name] = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  // ── 3. Categories ────────────────────────────────────────────────────────────
  console.log('  Creating categories...');
  const categoryData = [
    // Maintenance
    { name: 'Plumbing',           dept: 'Maintenance' },
    { name: 'Electrical',         dept: 'Maintenance' },
    { name: 'Air Conditioning',   dept: 'Maintenance' },
    { name: 'Furniture',          dept: 'Maintenance' },
    { name: 'Doors & Windows',    dept: 'Maintenance' },
    { name: 'Pest Control',       dept: 'Maintenance' },
    { name: 'Cleaning',           dept: 'Maintenance' },
    // IT Services
    { name: 'Wi-Fi & Network',    dept: 'IT Services' },
    { name: 'Computer Hardware',  dept: 'IT Services' },
    { name: 'Software & Accounts',dept: 'IT Services' },
    { name: 'Printing & Scanning',dept: 'IT Services' },
    { name: 'CCTV & Surveillance',dept: 'IT Services' },
    // Security
    { name: 'Access Control',     dept: 'Security' },
    { name: 'Lost & Found',       dept: 'Security' },
    { name: 'Incident Report',    dept: 'Security' },
    { name: 'Parking',            dept: 'Security' },
    // Mess & Catering
    { name: 'Food Quality',       dept: 'Mess & Catering' },
    { name: 'Hygiene',            dept: 'Mess & Catering' },
    { name: 'Menu & Timings',     dept: 'Mess & Catering' },
    { name: 'Billing',            dept: 'Mess & Catering' },
    // Academic Affairs
    { name: 'Enrollment',         dept: 'Academic Affairs' },
    { name: 'Exam & Grading',     dept: 'Academic Affairs' },
    { name: 'Scholarships',       dept: 'Academic Affairs' },
    { name: 'Timetable',          dept: 'Academic Affairs' },
    // Transport
    { name: 'Bus Schedule',       dept: 'Transport' },
    { name: 'Vehicle Breakdown',  dept: 'Transport' },
    { name: 'Route Change',       dept: 'Transport' },
    // Library
    { name: 'Book Availability',  dept: 'Library' },
    { name: 'Fine & Fees',        dept: 'Library' },
    { name: 'Study Rooms',        dept: 'Library' },
  ];

  const cats = {};
  for (const c of categoryData) {
    const key = `${c.name}__${c.dept}`;
    cats[key] = await prisma.category.upsert({
      where: { name_departmentId: { name: c.name, departmentId: depts[c.dept].id } },
      update: {},
      create: { name: c.name, departmentId: depts[c.dept].id }
    });
  }

  // Helper to get category
  function cat(name, dept) { return cats[`${name}__${dept}`]; }

  // ── 4. Users ─────────────────────────────────────────────────────────────────
  console.log('  Creating users...');

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nust.edu.pk' },
    update: {},
    create: { name: 'System Administrator', email: 'admin@nust.edu.pk', passwordHash: pw, role: 'ADMIN' }
  });

  // Supervisors — one per major department
  const supervisors = {};
  const supervisorData = [
    { name: 'Khalid Mehmood',   email: 'supervisor.maintenance@nust.edu.pk', dept: 'Maintenance' },
    { name: 'Ayesha Tariq',     email: 'supervisor.it@nust.edu.pk',          dept: 'IT Services' },
    { name: 'Usman Farooq',     email: 'supervisor.security@nust.edu.pk',    dept: 'Security' },
    { name: 'Sana Mirza',       email: 'supervisor.academic@nust.edu.pk',    dept: 'Academic Affairs' },
  ];
  for (const s of supervisorData) {
    supervisors[s.dept] = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { name: s.name, email: s.email, passwordHash: pw, role: 'SUPERVISOR', departmentId: depts[s.dept].id }
    });
  }

  // Agents — multiple per department
  const agents = {};
  const agentData = [
    { name: 'Hamza Iqbal',     email: 'agent.hamza@nust.edu.pk',     dept: 'Maintenance' },
    { name: 'Tariq Bashir',    email: 'agent.tariq@nust.edu.pk',     dept: 'Maintenance' },
    { name: 'Nadia Qureshi',   email: 'agent.nadia@nust.edu.pk',     dept: 'Maintenance' },
    { name: 'Bilal Hassan',    email: 'agent.bilal@nust.edu.pk',     dept: 'IT Services' },
    { name: 'Rabia Malik',     email: 'agent.rabia@nust.edu.pk',     dept: 'IT Services' },
    { name: 'Omer Sheikh',     email: 'agent.omer@nust.edu.pk',      dept: 'Security' },
    { name: 'Fatima Zahra',    email: 'agent.fatima@nust.edu.pk',    dept: 'Mess & Catering' },
    { name: 'Ali Raza',        email: 'agent.ali@nust.edu.pk',       dept: 'Academic Affairs' },
    { name: 'Zara Ahmed',      email: 'agent.zara@nust.edu.pk',      dept: 'Transport' },
    { name: 'Danish Saeed',    email: 'agent.danish@nust.edu.pk',    dept: 'Library' },
  ];
  for (const a of agentData) {
    agents[a.email] = await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: { name: a.name, email: a.email, passwordHash: pw, role: 'AGENT', departmentId: depts[a.dept].id }
    });
  }

  // Students — 20 realistic students
  const studentData = [
    { name: 'Ahmed Raza',         email: 'ahmed.raza@students.nust.edu.pk' },
    { name: 'Fatima Noor',        email: 'fatima.noor@students.nust.edu.pk' },
    { name: 'Usman Ali',          email: 'usman.ali@students.nust.edu.pk' },
    { name: 'Hira Baig',          email: 'hira.baig@students.nust.edu.pk' },
    { name: 'Zainab Hussain',     email: 'zainab.hussain@students.nust.edu.pk' },
    { name: 'Bilal Chaudhry',     email: 'bilal.chaudhry@students.nust.edu.pk' },
    { name: 'Maham Siddiqui',     email: 'maham.siddiqui@students.nust.edu.pk' },
    { name: 'Saad Mehmood',       email: 'saad.mehmood@students.nust.edu.pk' },
    { name: 'Saba Waheed',        email: 'saba.waheed@students.nust.edu.pk' },
    { name: 'Talha Farhan',       email: 'talha.farhan@students.nust.edu.pk' },
    { name: 'Maryam Ishaq',       email: 'maryam.ishaq@students.nust.edu.pk' },
    { name: 'Hassan Nawaz',       email: 'hassan.nawaz@students.nust.edu.pk' },
    { name: 'Amna Khalid',        email: 'amna.khalid@students.nust.edu.pk' },
    { name: 'Faisal Javed',       email: 'faisal.javed@students.nust.edu.pk' },
    { name: 'Noor ul Ain',        email: 'noor.ulain@students.nust.edu.pk' },
    { name: 'Kamran Ashraf',      email: 'kamran.ashraf@students.nust.edu.pk' },
    { name: 'Iqra Pervaiz',       email: 'iqra.pervaiz@students.nust.edu.pk' },
    { name: 'Shahzaib Mirza',     email: 'shahzaib.mirza@students.nust.edu.pk' },
    { name: 'Rabia Anwar',        email: 'rabia.anwar@students.nust.edu.pk' },
    { name: 'Waleed Tariq',       email: 'waleed.tariq@students.nust.edu.pk' },
  ];
  const students = [];
  for (const s of studentData) {
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { name: s.name, email: s.email, passwordHash: pw, role: 'STUDENT' }
    });
    students.push(student);
  }

  // Shorthand helpers
  const agentMaint1  = agents['agent.hamza@nust.edu.pk'];
  const agentMaint2  = agents['agent.tariq@nust.edu.pk'];
  const agentMaint3  = agents['agent.nadia@nust.edu.pk'];
  const agentIT1     = agents['agent.bilal@nust.edu.pk'];
  const agentIT2     = agents['agent.rabia@nust.edu.pk'];
  const agentSec     = agents['agent.omer@nust.edu.pk'];
  const agentMess    = agents['agent.fatima@nust.edu.pk'];
  const agentAcad    = agents['agent.ali@nust.edu.pk'];
  const agentTrans   = agents['agent.zara@nust.edu.pk'];
  const agentLib     = agents['agent.danish@nust.edu.pk'];

  console.log('  Creating tickets...\n');

  // ── Helper to create a full audit trail ──────────────────────────────────────
  async function audit(ticketId, actorId, action, oldValue = null, newValue = null, meta = undefined) {
    return prisma.auditLog.create({
      data: { ticketId, actorId, action, oldValue, newValue, meta }
    });
  }

  async function comment(ticketId, authorId, content, isInternal = false) {
    return prisma.comment.create({
      data: { ticketId, authorId, content, isInternal }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAINTENANCE TICKETS
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. OPEN — fresh plumbing ticket, not yet assigned
  const t1 = await prisma.ticket.create({ data: {
    title: 'Water leaking from sink in Room 214, Hostel Block C',
    description: 'There is a continuous drip from under the sink. Water is pooling on the floor. Started this morning around 7am.',
    studentId: students[0].id, departmentId: depts['Maintenance'].id,
    categoryId: cat('Plumbing','Maintenance').id,
    priority: 'MED', status: 'OPEN',
    responseDueAt: from(hours(6)), resolveDueAt: from(hours(40)),
  }});
  await audit(t1.id, students[0].id, 'CREATED', null, JSON.stringify({ title: t1.title, priority: 'MED' }));

  // 2. IN_PROGRESS — AC repair, assigned, first response given
  const t2 = await prisma.ticket.create({ data: {
    title: 'AC unit not cooling in Room 312, Hostel Block A',
    description: 'The AC has been blowing warm air since yesterday. Outside temperature is very high and the room is unbearable.',
    studentId: students[1].id, departmentId: depts['Maintenance'].id,
    categoryId: cat('Air Conditioning','Maintenance').id,
    priority: 'HIGH', status: 'IN_PROGRESS',
    assigneeId: agentMaint1.id,
    firstResponseAt: ago(hours(3)),
    responseDueAt: ago(hours(1)), resolveDueAt: from(hours(20)),
  }});
  await audit(t2.id, students[1].id, 'CREATED', null, JSON.stringify({ title: t2.title }));
  await audit(t2.id, supervisors['Maintenance'].id, 'ASSIGNED', null, agentMaint1.id);
  await audit(t2.id, agentMaint1.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await comment(t2.id, agentMaint1.id, 'I have inspected the unit. The refrigerant is low. I have ordered a recharge kit and will fix it by tomorrow morning.', false);
  await comment(t2.id, agentMaint1.id, 'Refrigerant ordered — ETA 4 hours.', true);

  // 3. NEEDS_INFO — furniture repair
  const t3 = await prisma.ticket.create({ data: {
    title: 'Broken study chair in Room 108, Block B',
    description: 'One of my study chairs has a broken leg. It is unsafe to sit on.',
    studentId: students[2].id, departmentId: depts['Maintenance'].id,
    categoryId: cat('Furniture','Maintenance').id,
    priority: 'LOW', status: 'NEEDS_INFO',
    assigneeId: agentMaint2.id,
    firstResponseAt: ago(days(1)),
    responseDueAt: ago(hours(10)), resolveDueAt: from(days(3)),
  }});
  await audit(t3.id, students[2].id, 'CREATED', null, JSON.stringify({ title: t3.title }));
  await audit(t3.id, agentMaint2.id, 'ASSIGNED', null, agentMaint2.id);
  await audit(t3.id, agentMaint2.id, 'STATUS_CHANGE', 'OPEN', 'NEEDS_INFO');
  await comment(t3.id, agentMaint2.id, 'Could you please provide your room number and block again? Also is it a plastic or metal chair?', false);

  // 4. RESOLVED — pest control (within 7 days so student can reopen)
  const t4 = await prisma.ticket.create({ data: {
    title: 'Cockroach infestation in bathroom, Room 405 Block D',
    description: 'There are cockroaches coming from the drain in the bathroom. Approximately 5-6 seen daily.',
    studentId: students[3].id, departmentId: depts['Maintenance'].id,
    categoryId: cat('Pest Control','Maintenance').id,
    priority: 'HIGH', status: 'RESOLVED',
    assigneeId: agentMaint3.id,
    firstResponseAt: ago(days(3)),
    resolvedAt: ago(days(2)),
    responseDueAt: ago(days(4)), resolveDueAt: ago(days(1)),
    isResolveBreached: false,
  }});
  await audit(t4.id, students[3].id, 'CREATED', null, JSON.stringify({ title: t4.title }));
  await audit(t4.id, agentMaint3.id, 'ASSIGNED', null, agentMaint3.id);
  await audit(t4.id, agentMaint3.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await comment(t4.id, agentMaint3.id, 'Pest control team has visited and treated the drains with insecticide. Please keep the bathroom dry.', false);
  await audit(t4.id, agentMaint3.id, 'STATUS_CHANGE', 'IN_PROGRESS', 'RESOLVED');
  await comment(t4.id, students[3].id, 'Thank you, the issue seems to be resolved.', false);

  // 5. CLOSED — door hinge
  const t5 = await prisma.ticket.create({ data: {
    title: 'Room door not closing properly, Room 201 Block C',
    description: 'The door hinge is loose and the door does not latch. Anyone can push it open.',
    studentId: students[4].id, departmentId: depts['Maintenance'].id,
    categoryId: cat('Doors & Windows','Maintenance').id,
    priority: 'MED', status: 'CLOSED',
    assigneeId: agentMaint1.id,
    firstResponseAt: ago(days(5)),
    resolvedAt: ago(days(4)),
    responseDueAt: ago(days(6)), resolveDueAt: ago(days(3)),
  }});
  await audit(t5.id, students[4].id, 'CREATED', null, JSON.stringify({ title: t5.title }));
  await audit(t5.id, agentMaint1.id, 'ASSIGNED', null, agentMaint1.id);
  await audit(t5.id, agentMaint1.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await comment(t5.id, agentMaint1.id, 'Hinge tightened and door tested. Issue resolved.', false);
  await audit(t5.id, agentMaint1.id, 'STATUS_CHANGE', 'IN_PROGRESS', 'RESOLVED');
  await audit(t5.id, students[4].id, 'STATUS_CHANGE', 'RESOLVED', 'CLOSED');

  // 6. CANCELLED — student self-cancelled
  const t6 = await prisma.ticket.create({ data: {
    title: 'Cleaning request for common area Block E',
    description: 'The common area on floor 2 has not been cleaned for 3 days.',
    studentId: students[5].id, departmentId: depts['Maintenance'].id,
    categoryId: cat('Cleaning','Maintenance').id,
    priority: 'LOW', status: 'CANCELLED',
    responseDueAt: ago(hours(5)), resolveDueAt: ago(hours(2)),
  }});
  await audit(t6.id, students[5].id, 'CREATED', null, JSON.stringify({ title: t6.title }));
  await audit(t6.id, students[5].id, 'STATUS_CHANGE', 'OPEN', 'CANCELLED');

  // 7. REOPENED — maintenance issue came back
  const t7 = await prisma.ticket.create({ data: {
    title: 'Electrical tripping in Room 319 Block A — recurring',
    description: 'This issue was resolved last week but the tripping has started again. The MCB trips every time I use the kettle.',
    studentId: students[6].id, departmentId: depts['Maintenance'].id,
    categoryId: cat('Electrical','Maintenance').id,
    priority: 'HIGH', status: 'REOPENED',
    assigneeId: agentMaint2.id,
    firstResponseAt: ago(days(8)),
    resolvedAt: ago(days(6)),
    responseDueAt: ago(days(9)), resolveDueAt: ago(days(5)),
  }});
  await audit(t7.id, students[6].id, 'CREATED', null, JSON.stringify({ title: t7.title }));
  await audit(t7.id, agentMaint2.id, 'ASSIGNED', null, agentMaint2.id);
  await audit(t7.id, agentMaint2.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await comment(t7.id, agentMaint2.id, 'MCB replaced and wiring inspected. Should be resolved now.', false);
  await audit(t7.id, agentMaint2.id, 'STATUS_CHANGE', 'IN_PROGRESS', 'RESOLVED');
  await audit(t7.id, students[6].id, 'STATUS_CHANGE', 'RESOLVED', 'REOPENED');
  await comment(t7.id, students[6].id, 'The issue has come back. Please look into it again.', false);
  await comment(t7.id, agentMaint2.id, 'Scheduling a more thorough electrical inspection. Possibly a wiring fault deeper in the wall.', true);

  // 8. URGENT — response breached
  const t8 = await prisma.ticket.create({ data: {
    title: 'GAS SMELL REPORTED — Block B Ground Floor',
    description: 'Strong gas smell near the mess area on Block B ground floor. Multiple students have noticed it. This could be dangerous.',
    studentId: students[7].id, departmentId: depts['Maintenance'].id,
    categoryId: cat('Plumbing','Maintenance').id,
    priority: 'URGENT', status: 'OPEN',
    responseDueAt: ago(hours(1)),
    resolveDueAt: from(hours(5)),
    isResponseBreached: true,
    responseBreachAt: ago(mins(30)),
  }});
  await audit(t8.id, students[7].id, 'CREATED', null, JSON.stringify({ title: t8.title }));
  await audit(t8.id, null, 'SLA_RESPONSE_BREACHED', null, JSON.stringify({ at: ago(mins(30)).toISOString() }));
  await comment(t8.id, students[7].id, 'Please respond ASAP. The smell is getting stronger.', false);
  await comment(t8.id, students[8].id, 'I can confirm the smell from Block B corridor as well.', false);

  // 9. URGENT — both breached, in progress
  const t9 = await prisma.ticket.create({ data: {
    title: 'Sewage overflow in bathroom Block C Level 3',
    description: 'Sewage water is overflowing from the floor drain in the communal bathroom. It is completely unusable.',
    studentId: students[9].id, departmentId: depts['Maintenance'].id,
    categoryId: cat('Plumbing','Maintenance').id,
    priority: 'URGENT', status: 'IN_PROGRESS',
    assigneeId: agentMaint3.id,
    firstResponseAt: ago(hours(2)),
    responseDueAt: ago(hours(3)),
    resolveDueAt: ago(hours(1)),
    isResponseBreached: false,
    isResolveBreached: true,
    resolveBreachAt: ago(hours(1)),
  }});
  await audit(t9.id, students[9].id, 'CREATED', null, JSON.stringify({ title: t9.title }));
  await audit(t9.id, supervisors['Maintenance'].id, 'ASSIGNED', null, agentMaint3.id);
  await audit(t9.id, agentMaint3.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await audit(t9.id, null, 'SLA_RESOLVE_BREACHED', null, JSON.stringify({ at: ago(hours(1)).toISOString() }));
  await comment(t9.id, agentMaint3.id, 'On site. Drain is completely blocked. Need industrial equipment to clear it.', false);
  await comment(t9.id, agentMaint3.id, 'Waiting for external plumbing contractor. ETA 2 hours.', true);
  await comment(t9.id, supervisors['Maintenance'].id, 'Contractor has been contacted and is en route. Keeping this escalated.', true);

  // 10. HIGH — resolve breached, in progress
  const t10 = await prisma.ticket.create({ data: {
    title: 'Broken window in Room 506 Block D — security risk',
    description: 'The window glass is cracked and partially fallen out. It is a security and weather risk.',
    studentId: students[10].id, departmentId: depts['Maintenance'].id,
    categoryId: cat('Doors & Windows','Maintenance').id,
    priority: 'HIGH', status: 'IN_PROGRESS',
    assigneeId: agentMaint1.id,
    firstResponseAt: ago(days(2)),
    responseDueAt: ago(days(3)),
    resolveDueAt: ago(days(1)),
    isResolveBreached: true,
    resolveBreachAt: ago(days(1)),
  }});
  await audit(t10.id, students[10].id, 'CREATED', null, JSON.stringify({ title: t10.title }));
  await audit(t10.id, agentMaint1.id, 'ASSIGNED', null, agentMaint1.id);
  await audit(t10.id, agentMaint1.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await audit(t10.id, null, 'SLA_RESOLVE_BREACHED', null, JSON.stringify({ at: ago(days(1)).toISOString() }));
  await comment(t10.id, agentMaint1.id, 'Glass replacement ordered. Delayed due to supplier. Temporary board placed for security.', false);
  await comment(t10.id, agentMaint1.id, 'Supplier confirmed delivery tomorrow. Will install immediately.', true);

  // ═══════════════════════════════════════════════════════════════════════════
  // IT SERVICES TICKETS
  // ═══════════════════════════════════════════════════════════════════════════

  // 11. OPEN — wifi issue
  const t11 = await prisma.ticket.create({ data: {
    title: 'Wi-Fi not working in Block B Level 2 — entire floor affected',
    description: 'Since this morning, no one on Level 2 Block B can connect to NUST-Student Wi-Fi. The network shows as connected but there is no internet.',
    studentId: students[11].id, departmentId: depts['IT Services'].id,
    categoryId: cat('Wi-Fi & Network','IT Services').id,
    priority: 'HIGH', status: 'OPEN',
    responseDueAt: from(hours(1)), resolveDueAt: from(hours(22)),
  }});
  await audit(t11.id, students[11].id, 'CREATED', null, JSON.stringify({ title: t11.title }));

  // 12. IN_PROGRESS — laptop not charging
  const t12 = await prisma.ticket.create({ data: {
    title: 'Lab computer in Room CS-204 freezing on startup',
    description: 'Computer number 7 in the CS lab freezes at the Windows loading screen. Has been happening for 3 days. Affects our programming lab sessions.',
    studentId: students[12].id, departmentId: depts['IT Services'].id,
    categoryId: cat('Computer Hardware','IT Services').id,
    priority: 'HIGH', status: 'IN_PROGRESS',
    assigneeId: agentIT1.id,
    firstResponseAt: ago(hours(5)),
    responseDueAt: ago(hours(3)), resolveDueAt: from(hours(18)),
  }});
  await audit(t12.id, students[12].id, 'CREATED', null, JSON.stringify({ title: t12.title }));
  await audit(t12.id, agentIT1.id, 'ASSIGNED', null, agentIT1.id);
  await audit(t12.id, agentIT1.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await comment(t12.id, agentIT1.id, 'Diagnosed: failing hard drive. Replacing with SSD. Will be done by end of today.', false);
  await comment(t12.id, agentIT1.id, 'SSD sourced from inventory. Cloning OS now.', true);

  // 13. NEEDS_INFO — account issue
  const t13 = await prisma.ticket.create({ data: {
    title: 'Cannot access NUST LMS — account locked',
    description: 'My LMS account has been locked. I tried resetting the password but the reset email is not arriving.',
    studentId: students[13].id, departmentId: depts['IT Services'].id,
    categoryId: cat('Software & Accounts','IT Services').id,
    priority: 'MED', status: 'NEEDS_INFO',
    assigneeId: agentIT2.id,
    firstResponseAt: ago(days(1)),
    responseDueAt: ago(hours(20)), resolveDueAt: from(days(1)),
  }});
  await audit(t13.id, students[13].id, 'CREATED', null, JSON.stringify({ title: t13.title }));
  await audit(t13.id, agentIT2.id, 'ASSIGNED', null, agentIT2.id);
  await audit(t13.id, agentIT2.id, 'STATUS_CHANGE', 'OPEN', 'NEEDS_INFO');
  await comment(t13.id, agentIT2.id, 'Please confirm your student ID and the email address registered with your LMS account.', false);

  // 14. RESOLVED — printer issue
  const t14 = await prisma.ticket.create({ data: {
    title: 'Library printer on Level 1 showing offline',
    description: 'The HP printer near the reference desk shows offline on all computers. Cannot print anything.',
    studentId: students[14].id, departmentId: depts['IT Services'].id,
    categoryId: cat('Printing & Scanning','IT Services').id,
    priority: 'MED', status: 'RESOLVED',
    assigneeId: agentIT1.id,
    firstResponseAt: ago(days(2)),
    resolvedAt: ago(days(1)),
    responseDueAt: ago(days(3)), resolveDueAt: ago(hours(10)),
  }});
  await audit(t14.id, students[14].id, 'CREATED', null, JSON.stringify({ title: t14.title }));
  await audit(t14.id, agentIT1.id, 'ASSIGNED', null, agentIT1.id);
  await audit(t14.id, agentIT1.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await comment(t14.id, agentIT1.id, 'Printer driver was corrupted. Reinstalled and reconfigured network settings. Should be working now.', false);
  await audit(t14.id, agentIT1.id, 'STATUS_CHANGE', 'IN_PROGRESS', 'RESOLVED');

  // 15. CLOSED — CCTV
  const t15 = await prisma.ticket.create({ data: {
    title: 'CCTV camera outside Gate 3 not working',
    description: 'The camera at Gate 3 has shown a black screen for the past week. This is a security concern.',
    studentId: students[15].id, departmentId: depts['IT Services'].id,
    categoryId: cat('CCTV & Surveillance','IT Services').id,
    priority: 'HIGH', status: 'CLOSED',
    assigneeId: agentIT2.id,
    firstResponseAt: ago(days(7)),
    resolvedAt: ago(days(5)),
    responseDueAt: ago(days(8)), resolveDueAt: ago(days(4)),
  }});
  await audit(t15.id, students[15].id, 'CREATED', null, JSON.stringify({ title: t15.title }));
  await audit(t15.id, agentIT2.id, 'ASSIGNED', null, agentIT2.id);
  await comment(t15.id, agentIT2.id, 'Power supply unit replaced. Camera now operational.', false);
  await audit(t15.id, agentIT2.id, 'STATUS_CHANGE', 'IN_PROGRESS', 'RESOLVED');
  await audit(t15.id, students[15].id, 'STATUS_CHANGE', 'RESOLVED', 'CLOSED');

  // 16. URGENT — network down, response breached
  const t16 = await prisma.ticket.create({ data: {
    title: 'URGENT: Entire campus network down — cannot access any university services',
    description: 'As of 9am, no campus network is working. LMS, email, everything is inaccessible. Exams are affected.',
    studentId: students[16].id, departmentId: depts['IT Services'].id,
    categoryId: cat('Wi-Fi & Network','IT Services').id,
    priority: 'URGENT', status: 'IN_PROGRESS',
    assigneeId: agentIT1.id,
    firstResponseAt: ago(hours(1)),
    responseDueAt: ago(hours(2)),
    resolveDueAt: ago(mins(30)),
    isResolveBreached: true,
    resolveBreachAt: ago(mins(30)),
    isResponseBreached: false,
  }});
  await audit(t16.id, students[16].id, 'CREATED', null, JSON.stringify({ title: t16.title }));
  await audit(t16.id, supervisors['IT Services'].id, 'ASSIGNED', null, agentIT1.id);
  await audit(t16.id, agentIT1.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await audit(t16.id, null, 'SLA_RESOLVE_BREACHED', null, JSON.stringify({ at: ago(mins(30)).toISOString() }));
  await comment(t16.id, agentIT1.id, 'Core switch failure identified. Failover initiated. Partial connectivity restored. Working on full restoration.', false);
  await comment(t16.id, supervisors['IT Services'].id, 'IT vendor on call. Senior engineer coming on-site within 1 hour.', true);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY TICKETS
  // ═══════════════════════════════════════════════════════════════════════════

  // 17. OPEN — lost item
  const t17 = await prisma.ticket.create({ data: {
    title: 'Lost laptop bag near Cafeteria — black Lenovo bag',
    description: 'I left my laptop bag at the table near the cafeteria entrance around 2pm. It has a black Lenovo bag with my laptop, charger, and notes inside.',
    studentId: students[17].id, departmentId: depts['Security'].id,
    categoryId: cat('Lost & Found','Security').id,
    priority: 'HIGH', status: 'OPEN',
    responseDueAt: from(hours(2)), resolveDueAt: from(hours(23)),
  }});
  await audit(t17.id, students[17].id, 'CREATED', null, JSON.stringify({ title: t17.title }));

  // 18. IN_PROGRESS — access card
  const t18 = await prisma.ticket.create({ data: {
    title: 'Access card not working at Library entrance',
    description: 'My student access card is rejected at the library turnstile. Other students can enter fine. My card reads error.',
    studentId: students[18].id, departmentId: depts['Security'].id,
    categoryId: cat('Access Control','Security').id,
    priority: 'MED', status: 'IN_PROGRESS',
    assigneeId: agentSec.id,
    firstResponseAt: ago(hours(4)),
    responseDueAt: ago(hours(2)), resolveDueAt: from(hours(20)),
  }});
  await audit(t18.id, students[18].id, 'CREATED', null, JSON.stringify({ title: t18.title }));
  await audit(t18.id, agentSec.id, 'ASSIGNED', null, agentSec.id);
  await audit(t18.id, agentSec.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await comment(t18.id, agentSec.id, 'Card data checked — it needs to be re-encoded. Please visit the Security office at Gate 1 with your student ID.', false);

  // 19. RESOLVED — parking
  const t19 = await prisma.ticket.create({ data: {
    title: 'Unauthorized vehicle blocking my parking spot P-47',
    description: 'A white Honda Civic with no parking sticker has been parked in my registered spot for 2 days.',
    studentId: students[19].id, departmentId: depts['Security'].id,
    categoryId: cat('Parking','Security').id,
    priority: 'MED', status: 'RESOLVED',
    assigneeId: agentSec.id,
    firstResponseAt: ago(days(1)),
    resolvedAt: ago(hours(12)),
    responseDueAt: ago(days(2)), resolveDueAt: ago(hours(6)),
  }});
  await audit(t19.id, students[19].id, 'CREATED', null, JSON.stringify({ title: t19.title }));
  await audit(t19.id, agentSec.id, 'ASSIGNED', null, agentSec.id);
  await comment(t19.id, agentSec.id, 'Vehicle identified and owner notified. Car has been moved. Your spot is clear.', false);
  await audit(t19.id, agentSec.id, 'STATUS_CHANGE', 'IN_PROGRESS', 'RESOLVED');

  // 20. INCIDENT — response breached
  const t20 = await prisma.ticket.create({ data: {
    title: 'Fight reported outside Hostel Block D',
    description: 'There was a physical altercation between two students outside Block D at approximately 11pm. Security was not present.',
    studentId: students[0].id, departmentId: depts['Security'].id,
    categoryId: cat('Incident Report','Security').id,
    priority: 'URGENT', status: 'OPEN',
    responseDueAt: ago(hours(2)),
    resolveDueAt: from(hours(4)),
    isResponseBreached: true,
    responseBreachAt: ago(hours(2)),
  }});
  await audit(t20.id, students[0].id, 'CREATED', null, JSON.stringify({ title: t20.title }));
  await audit(t20.id, null, 'SLA_RESPONSE_BREACHED', null, JSON.stringify({ at: ago(hours(2)).toISOString() }));

  // ═══════════════════════════════════════════════════════════════════════════
  // MESS & CATERING TICKETS
  // ═══════════════════════════════════════════════════════════════════════════

  // 21. OPEN — food quality
  const t21 = await prisma.ticket.create({ data: {
    title: 'Food served at dinner was undercooked — rice was hard',
    description: 'Yesterday at dinner the rice was completely undercooked and hard. Several students complained. This is a recurring problem on Thursdays.',
    studentId: students[1].id, departmentId: depts['Mess & Catering'].id,
    categoryId: cat('Food Quality','Mess & Catering').id,
    priority: 'MED', status: 'OPEN',
    responseDueAt: from(hours(7)), resolveDueAt: from(hours(45)),
  }});
  await audit(t21.id, students[1].id, 'CREATED', null, JSON.stringify({ title: t21.title }));

  // 22. IN_PROGRESS — hygiene
  const t22 = await prisma.ticket.create({ data: {
    title: 'Cockroaches found in Mess Hall kitchen area',
    description: 'I saw cockroaches near the serving counter during lunch. This is a serious hygiene issue. At least 3 were visible.',
    studentId: students[2].id, departmentId: depts['Mess & Catering'].id,
    categoryId: cat('Hygiene','Mess & Catering').id,
    priority: 'URGENT', status: 'IN_PROGRESS',
    assigneeId: agentMess.id,
    firstResponseAt: ago(hours(3)),
    responseDueAt: ago(hours(1)), resolveDueAt: from(hours(3)),
  }});
  await audit(t22.id, students[2].id, 'CREATED', null, JSON.stringify({ title: t22.title }));
  await audit(t22.id, agentMess.id, 'ASSIGNED', null, agentMess.id);
  await audit(t22.id, agentMess.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await comment(t22.id, agentMess.id, 'Kitchen temporarily shut for cleaning and pest treatment. Will reopen after inspection.', false);
  await comment(t22.id, agentMess.id, 'Pest control on site. Entire kitchen being fumigated. Manager informed.', true);

  // 23. RESOLVED — billing
  const t23 = await prisma.ticket.create({ data: {
    title: 'Double charged for mess subscription — October billing',
    description: 'My bank account shows two deductions of Rs. 4500 for the mess subscription in October. I only subscribed once.',
    studentId: students[3].id, departmentId: depts['Mess & Catering'].id,
    categoryId: cat('Billing','Mess & Catering').id,
    priority: 'HIGH', status: 'RESOLVED',
    assigneeId: agentMess.id,
    firstResponseAt: ago(days(2)),
    resolvedAt: ago(days(1)),
    responseDueAt: ago(days(3)), resolveDueAt: ago(hours(8)),
  }});
  await audit(t23.id, students[3].id, 'CREATED', null, JSON.stringify({ title: t23.title }));
  await audit(t23.id, agentMess.id, 'ASSIGNED', null, agentMess.id);
  await comment(t23.id, agentMess.id, 'Billing error confirmed. Refund of Rs. 4500 processed and will reflect in 2-3 working days.', false);
  await audit(t23.id, agentMess.id, 'STATUS_CHANGE', 'IN_PROGRESS', 'RESOLVED');

  // 24. NEEDS_INFO — menu
  const t24 = await prisma.ticket.create({ data: {
    title: 'Request for vegetarian meal option in mess',
    description: 'There are several vegetarian students who have no meal options at lunch. Please add at least one vegetarian dish daily.',
    studentId: students[4].id, departmentId: depts['Mess & Catering'].id,
    categoryId: cat('Menu & Timings','Mess & Catering').id,
    priority: 'LOW', status: 'NEEDS_INFO',
    assigneeId: agentMess.id,
    firstResponseAt: ago(days(2)),
    responseDueAt: ago(days(3)), resolveDueAt: from(days(4)),
  }});
  await audit(t24.id, students[4].id, 'CREATED', null, JSON.stringify({ title: t24.title }));
  await audit(t24.id, agentMess.id, 'STATUS_CHANGE', 'OPEN', 'NEEDS_INFO');
  await comment(t24.id, agentMess.id, 'Thank you for your feedback. Could you let us know approximately how many students would opt for vegetarian meals daily? This helps us plan.', false);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACADEMIC AFFAIRS TICKETS
  // ═══════════════════════════════════════════════════════════════════════════

  // 25. OPEN — grade dispute
  const t25 = await prisma.ticket.create({ data: {
    title: 'Midterm result not updated on portal — CS301',
    description: 'My midterm paper for CS301 was submitted on 15th October but the result is still showing as absent on the student portal.',
    studentId: students[5].id, departmentId: depts['Academic Affairs'].id,
    categoryId: cat('Exam & Grading','Academic Affairs').id,
    priority: 'HIGH', status: 'OPEN',
    responseDueAt: from(hours(3)), resolveDueAt: from(hours(26)),
  }});
  await audit(t25.id, students[5].id, 'CREATED', null, JSON.stringify({ title: t25.title }));

  // 26. IN_PROGRESS — enrollment
  const t26 = await prisma.ticket.create({ data: {
    title: 'Unable to enroll in elective course EE401 — system error',
    description: 'When I try to add EE401 to my course plan on the portal, it shows an error: "Prerequisites not met". I have already completed EE301.',
    studentId: students[6].id, departmentId: depts['Academic Affairs'].id,
    categoryId: cat('Enrollment','Academic Affairs').id,
    priority: 'MED', status: 'IN_PROGRESS',
    assigneeId: agentAcad.id,
    firstResponseAt: ago(days(1)),
    responseDueAt: ago(days(2)), resolveDueAt: from(hours(15)),
  }});
  await audit(t26.id, students[6].id, 'CREATED', null, JSON.stringify({ title: t26.title }));
  await audit(t26.id, agentAcad.id, 'ASSIGNED', null, agentAcad.id);
  await audit(t26.id, agentAcad.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await comment(t26.id, agentAcad.id, 'Checking the prerequisite record in the system. Your EE301 grade needs manual confirmation.', false);
  await comment(t26.id, agentAcad.id, 'Escalated to department coordinator to manually verify completion of EE301.', true);

  // 27. RESOLVED — scholarship
  const t27 = await prisma.ticket.create({ data: {
    title: 'Scholarship disbursement not received — November installment',
    description: 'The November scholarship installment has not been credited to my account. Previous months were fine. Amount: Rs. 15,000.',
    studentId: students[7].id, departmentId: depts['Academic Affairs'].id,
    categoryId: cat('Scholarships','Academic Affairs').id,
    priority: 'HIGH', status: 'RESOLVED',
    assigneeId: agentAcad.id,
    firstResponseAt: ago(days(3)),
    resolvedAt: ago(days(1)),
    responseDueAt: ago(days(4)), resolveDueAt: ago(hours(5)),
  }});
  await audit(t27.id, students[7].id, 'CREATED', null, JSON.stringify({ title: t27.title }));
  await audit(t27.id, agentAcad.id, 'ASSIGNED', null, agentAcad.id);
  await comment(t27.id, agentAcad.id, 'Bank transfer was delayed due to end-of-month processing. Amount has been manually initiated today and should reflect within 24 hours.', false);
  await audit(t27.id, agentAcad.id, 'STATUS_CHANGE', 'IN_PROGRESS', 'RESOLVED');
  await comment(t27.id, students[7].id, 'Received. Thank you for the quick resolution.', false);

  // 28. CLOSED — timetable clash
  const t28 = await prisma.ticket.create({ data: {
    title: 'Timetable clash between CS401 and EE301 for BSCS-6A',
    description: 'Both CS401 and EE301 are scheduled at 9am on Monday for batch BSCS-6A. It is impossible to attend both.',
    studentId: students[8].id, departmentId: depts['Academic Affairs'].id,
    categoryId: cat('Timetable','Academic Affairs').id,
    priority: 'HIGH', status: 'CLOSED',
    assigneeId: agentAcad.id,
    firstResponseAt: ago(days(6)),
    resolvedAt: ago(days(4)),
    responseDueAt: ago(days(7)), resolveDueAt: ago(days(3)),
  }});
  await audit(t28.id, students[8].id, 'CREATED', null, JSON.stringify({ title: t28.title }));
  await audit(t28.id, agentAcad.id, 'ASSIGNED', null, agentAcad.id);
  await comment(t28.id, agentAcad.id, 'EE301 section has been moved to 11am on Mondays for BSCS-6A. Please check updated timetable on portal.', false);
  await audit(t28.id, agentAcad.id, 'STATUS_CHANGE', 'IN_PROGRESS', 'RESOLVED');
  await audit(t28.id, students[8].id, 'STATUS_CHANGE', 'RESOLVED', 'CLOSED');

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSPORT TICKETS
  // ═══════════════════════════════════════════════════════════════════════════

  // 29. OPEN — bus delay
  const t29 = await prisma.ticket.create({ data: {
    title: 'Route 4 bus consistently arriving 30 minutes late',
    description: 'For the past two weeks, the Route 4 bus from Sector H-13 arrives at 8:30am instead of 8:00am. Students are missing 9am lectures.',
    studentId: students[9].id, departmentId: depts['Transport'].id,
    categoryId: cat('Bus Schedule','Transport').id,
    priority: 'MED', status: 'OPEN',
    responseDueAt: from(hours(8)), resolveDueAt: from(hours(50)),
  }});
  await audit(t29.id, students[9].id, 'CREATED', null, JSON.stringify({ title: t29.title }));

  // 30. IN_PROGRESS — vehicle breakdown
  const t30 = await prisma.ticket.create({ data: {
    title: 'University bus broke down on Islamabad Expressway — students stranded',
    description: 'Bus number 7 broke down near Faizabad interchange. Around 40 students are stranded. This happened at 8:15am.',
    studentId: students[10].id, departmentId: depts['Transport'].id,
    categoryId: cat('Vehicle Breakdown','Transport').id,
    priority: 'URGENT', status: 'IN_PROGRESS',
    assigneeId: agentTrans.id,
    firstResponseAt: ago(hours(1)),
    responseDueAt: ago(hours(0.5)), resolveDueAt: from(hours(1)),
  }});
  await audit(t30.id, students[10].id, 'CREATED', null, JSON.stringify({ title: t30.title }));
  await audit(t30.id, agentTrans.id, 'ASSIGNED', null, agentTrans.id);
  await audit(t30.id, agentTrans.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await comment(t30.id, agentTrans.id, 'Replacement bus dispatched. ETA 25 minutes. Students please wait safely at the roadside.', false);

  // 31. RESOLVED — route change
  const t31 = await prisma.ticket.create({ data: {
    title: 'Request to add Bahria Town Phase 7 as a bus stop on Route 6',
    description: 'Several students from Bahria Town Phase 7 have no direct bus. Route 6 passes nearby and a small detour would help 15+ students.',
    studentId: students[11].id, departmentId: depts['Transport'].id,
    categoryId: cat('Route Change','Transport').id,
    priority: 'LOW', status: 'RESOLVED',
    assigneeId: agentTrans.id,
    firstResponseAt: ago(days(5)),
    resolvedAt: ago(days(3)),
    responseDueAt: ago(days(6)), resolveDueAt: ago(days(2)),
  }});
  await audit(t31.id, students[11].id, 'CREATED', null, JSON.stringify({ title: t31.title }));
  await audit(t31.id, agentTrans.id, 'ASSIGNED', null, agentTrans.id);
  await comment(t31.id, agentTrans.id, 'Route 6 amended to include Bahria Town Phase 7 stop. Effective from next Monday. Updated schedule published on portal.', false);
  await audit(t31.id, agentTrans.id, 'STATUS_CHANGE', 'IN_PROGRESS', 'RESOLVED');

  // ═══════════════════════════════════════════════════════════════════════════
  // LIBRARY TICKETS
  // ═══════════════════════════════════════════════════════════════════════════

  // 32. OPEN — book unavailable
  const t32 = await prisma.ticket.create({ data: {
    title: 'Required textbook "Computer Networks" by Tanenbaum not available',
    description: 'The library shows 0 copies available for Computer Networks 5th edition by Tanenbaum. It is a required textbook for CN301. We need at least 5 more copies.',
    studentId: students[12].id, departmentId: depts['Library'].id,
    categoryId: cat('Book Availability','Library').id,
    priority: 'MED', status: 'OPEN',
    responseDueAt: from(hours(9)), resolveDueAt: from(hours(55)),
  }});
  await audit(t32.id, students[12].id, 'CREATED', null, JSON.stringify({ title: t32.title }));

  // 33. IN_PROGRESS — fine dispute
  const t33 = await prisma.ticket.create({ data: {
    title: 'Library fine incorrectly applied — book was returned on time',
    description: 'I returned "Digital Logic Design" on 10th November before closing time but the system shows it returned on 12th November and charged a Rs. 200 fine.',
    studentId: students[13].id, departmentId: depts['Library'].id,
    categoryId: cat('Fine & Fees','Library').id,
    priority: 'MED', status: 'IN_PROGRESS',
    assigneeId: agentLib.id,
    firstResponseAt: ago(hours(6)),
    responseDueAt: ago(hours(4)), resolveDueAt: from(hours(18)),
  }});
  await audit(t33.id, students[13].id, 'CREATED', null, JSON.stringify({ title: t33.title }));
  await audit(t33.id, agentLib.id, 'ASSIGNED', null, agentLib.id);
  await audit(t33.id, agentLib.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
  await comment(t33.id, agentLib.id, 'Checking return log records for 10th November. CCTV verification may be needed.', false);

  // 34. RESOLVED — study room
  const t34 = await prisma.ticket.create({ data: {
    title: 'Study Room 3 projector not working',
    description: 'The projector in Study Room 3 has no display. The HDMI input works but there is no picture. We use this room for group presentations.',
    studentId: students[14].id, departmentId: depts['Library'].id,
    categoryId: cat('Study Rooms','Library').id,
    priority: 'MED', status: 'RESOLVED',
    assigneeId: agentLib.id,
    firstResponseAt: ago(days(2)),
    resolvedAt: ago(days(1)),
    responseDueAt: ago(days(3)), resolveDueAt: ago(hours(12)),
  }});
  await audit(t34.id, students[14].id, 'CREATED', null, JSON.stringify({ title: t34.title }));
  await audit(t34.id, agentLib.id, 'ASSIGNED', null, agentLib.id);
  await comment(t34.id, agentLib.id, 'Lamp replaced and projector recalibrated. Study Room 3 is back in service.', false);
  await audit(t34.id, agentLib.id, 'STATUS_CHANGE', 'IN_PROGRESS', 'RESOLVED');

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL TICKETS — more variety for a realistic dataset
  // ═══════════════════════════════════════════════════════════════════════════

  // 35-40. A batch of OPEN tickets across departments to fill the queue
  const batchOpenTickets = [
    {
      title: 'Hot water not available in Block F showers since 3 days',
      description: 'The geyser in Block F has not been working for 3 days. Cold showers in winter are unacceptable.',
      studentId: students[15].id, dept: 'Maintenance', catName: 'Plumbing', priority: 'HIGH',
    },
    {
      title: 'Wi-Fi password expired for NUST-Guest — cannot access for visitors',
      description: 'The guest Wi-Fi password has expired and the IT office is not responding to phone calls.',
      studentId: students[16].id, dept: 'IT Services', catName: 'Wi-Fi & Network', priority: 'LOW',
    },
    {
      title: 'Street lights not working on path from Gate 2 to Hostel',
      description: 'The pathway from Gate 2 to the hostel block has had no lighting for a week. It is dangerous to walk at night.',
      studentId: students[17].id, dept: 'Maintenance', catName: 'Electrical', priority: 'HIGH',
    },
    {
      title: 'Student ID card not delivered — applied 3 weeks ago',
      description: 'My student ID card application was submitted 3 weeks ago. Other students from my batch have received theirs.',
      studentId: students[18].id, dept: 'Academic Affairs', catName: 'Enrollment', priority: 'MED',
    },
    {
      title: 'Mess dinner timing changed without notice — students missed dinner',
      description: 'Dinner was served at 6pm instead of 7pm today without any announcement. At least 30 students missed dinner.',
      studentId: students[19].id, dept: 'Mess & Catering', catName: 'Menu & Timings', priority: 'MED',
    },
    {
      title: 'Photocopier in Library is out of order',
      description: 'The photocopier on Library Level 2 has been showing an error E3 for 2 days. We cannot print or copy our notes.',
      studentId: students[0].id, dept: 'IT Services', catName: 'Printing & Scanning', priority: 'LOW',
    },
  ];

  for (const bt of batchOpenTickets) {
    const policy = await prisma.slaPolicy.findFirst({ where: { priority: bt.priority } });
    const ticket = await prisma.ticket.create({ data: {
      title: bt.title,
      description: bt.description,
      studentId: bt.studentId,
      departmentId: depts[bt.dept].id,
      categoryId: cats[`${bt.catName}__${bt.dept}`].id,
      priority: bt.priority,
      status: 'OPEN',
      responseDueAt: from(policy.responseMinutes * 60 * 1000),
      resolveDueAt:  from(policy.resolveMinutes  * 60 * 1000),
    }});
    await audit(ticket.id, bt.studentId, 'CREATED', null, JSON.stringify({ title: bt.title }));
  }

  // 41-45. A batch of fully closed/resolved tickets to show historical data
  const batchClosed = [
    {
      title: 'Tap in Room 118 dripping constantly',
      description: 'The cold water tap in room 118 Block A has been dripping since last month.',
      studentId: students[1].id, dept: 'Maintenance', catName: 'Plumbing',
      agentId: agentMaint1.id, priority: 'LOW',
      createdAgo: days(14), resolvedAgo: days(10), closedByStudent: true,
    },
    {
      title: 'Email account quota exceeded — cannot receive emails',
      description: 'My NUST email account is full and I cannot receive new emails. Important academic emails are bouncing.',
      studentId: students[2].id, dept: 'IT Services', catName: 'Software & Accounts',
      agentId: agentIT2.id, priority: 'MED',
      createdAgo: days(10), resolvedAgo: days(7), closedByStudent: false,
    },
    {
      title: 'Lost student ID card — need replacement',
      description: 'I lost my student ID card near the sports complex. Need a replacement urgently for access.',
      studentId: students[3].id, dept: 'Security', catName: 'Lost & Found',
      agentId: agentSec.id, priority: 'MED',
      createdAgo: days(12), resolvedAgo: days(9), closedByStudent: true,
    },
    {
      title: 'Overcharged on mess bill for September',
      description: 'My September mess bill shows Rs. 5200 but the standard rate is Rs. 4500.',
      studentId: students[4].id, dept: 'Mess & Catering', catName: 'Billing',
      agentId: agentMess.id, priority: 'MED',
      createdAgo: days(20), resolvedAgo: days(16), closedByStudent: true,
    },
    {
      title: 'Grade not updated for re-check request — Math101',
      description: 'I submitted a re-check request for Math101 six weeks ago. The grade has not been updated.',
      studentId: students[5].id, dept: 'Academic Affairs', catName: 'Exam & Grading',
      agentId: agentAcad.id, priority: 'HIGH',
      createdAgo: days(25), resolvedAgo: days(20), closedByStudent: false,
    },
  ];

  for (const bc of batchClosed) {
    const ticket = await prisma.ticket.create({ data: {
      title: bc.title,
      description: bc.description,
      studentId: bc.studentId,
      departmentId: depts[bc.dept].id,
      categoryId: cats[`${bc.catName}__${bc.dept}`].id,
      priority: bc.priority,
      status: bc.closedByStudent ? 'CLOSED' : 'RESOLVED',
      assigneeId: bc.agentId,
      firstResponseAt: ago(bc.createdAgo - hours(2)),
      resolvedAt: ago(bc.resolvedAgo),
      responseDueAt: ago(bc.createdAgo - hours(1)),
      resolveDueAt: ago(bc.resolvedAgo - hours(3)),
    }});
    await audit(ticket.id, bc.studentId, 'CREATED', null, JSON.stringify({ title: bc.title }));
    await audit(ticket.id, bc.agentId, 'ASSIGNED', null, bc.agentId);
    await audit(ticket.id, bc.agentId, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
    await comment(ticket.id, bc.agentId, 'Issue has been investigated and resolved. Please confirm.', false);
    await audit(ticket.id, bc.agentId, 'STATUS_CHANGE', 'IN_PROGRESS', 'RESOLVED');
    if (bc.closedByStudent) {
      await comment(ticket.id, bc.studentId, 'Confirmed. Thank you.', false);
      await audit(ticket.id, bc.studentId, 'STATUS_CHANGE', 'RESOLVED', 'CLOSED');
    }
  }

  // 46-50. Tickets with SLA already marked as breached (both flags true) for admin testing
  const batchBreached = [
    {
      title: 'Elevator in Academic Block out of service for 5 days',
      description: 'The elevator in the main academic block has been out of service. Disabled students are severely affected.',
      studentId: students[6].id, dept: 'Maintenance', catName: 'Doors & Windows',
      agentId: agentMaint2.id, priority: 'URGENT',
    },
    {
      title: 'No hot meals served in mess for 2 days',
      description: 'The mess has been serving only cold packaged food for 2 days. The cooking staff seems absent.',
      studentId: students[7].id, dept: 'Mess & Catering', catName: 'Food Quality',
      agentId: agentMess.id, priority: 'HIGH',
    },
    {
      title: 'Main campus gate camera feed offline since Monday',
      description: 'The security camera at the main campus gate has been offline since Monday morning.',
      studentId: students[8].id, dept: 'IT Services', catName: 'CCTV & Surveillance',
      agentId: agentIT1.id, priority: 'HIGH',
    },
  ];

  for (const bb of batchBreached) {
    const ticket = await prisma.ticket.create({ data: {
      title: bb.title,
      description: bb.description,
      studentId: bb.studentId,
      departmentId: depts[bb.dept].id,
      categoryId: cats[`${bb.catName}__${bb.dept}`].id,
      priority: bb.priority,
      status: 'IN_PROGRESS',
      assigneeId: bb.agentId,
      firstResponseAt: ago(days(2)),
      responseDueAt: ago(days(3)),
      resolveDueAt: ago(days(1)),
      isResponseBreached: true,
      responseBreachAt: ago(days(3)),
      isResolveBreached: true,
      resolveBreachAt: ago(days(1)),
    }});
    await audit(ticket.id, bb.studentId, 'CREATED', null, JSON.stringify({ title: bb.title }));
    await audit(ticket.id, bb.agentId, 'ASSIGNED', null, bb.agentId);
    await audit(ticket.id, bb.agentId, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
    await audit(ticket.id, null, 'SLA_RESPONSE_BREACHED', null, JSON.stringify({ at: ago(days(3)).toISOString() }));
    await audit(ticket.id, null, 'SLA_RESOLVE_BREACHED',  null, JSON.stringify({ at: ago(days(1)).toISOString() }));
    await comment(ticket.id, bb.agentId, 'Working on this. Update to follow shortly.', false);
  }

  // ── Final summary ──────────────────────────────────────────────────────────
  const ticketCount = await prisma.ticket.count();
  const userCount   = await prisma.user.count();
  const commentCount = await prisma.comment.count();
  const auditCount  = await prisma.auditLog.count();

  console.log('✅  Seeding complete!\n');
  console.log('  Summary:');
  console.log(`  Users:      ${userCount}  (1 admin, 4 supervisors, 10 agents, 20 students)`);
  console.log(`  Tickets:    ${ticketCount}`);
  console.log(`  Comments:   ${commentCount}`);
  console.log(`  Audit logs: ${auditCount}`);
  console.log(`  Departments: ${deptData.length}`);
  console.log(`  Categories:  ${categoryData.length}`);
  console.log('\n  All passwords: Password123');
  console.log('\n  Key accounts:');
  console.log('  admin@nust.edu.pk              — Admin');
  console.log('  supervisor.maintenance@nust.edu.pk — Supervisor (Maintenance)');
  console.log('  supervisor.it@nust.edu.pk          — Supervisor (IT Services)');
  console.log('  agent.hamza@nust.edu.pk            — Agent (Maintenance)');
  console.log('  agent.bilal@nust.edu.pk            — Agent (IT Services)');
  console.log('  ahmed.raza@students.nust.edu.pk    — Student');
  console.log('  fatima.noor@students.nust.edu.pk   — Student');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });