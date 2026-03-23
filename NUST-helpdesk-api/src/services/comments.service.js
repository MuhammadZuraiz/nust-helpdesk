const prisma = require('../prismaClient');
const { createAudit } = require('./audit.service');
const AppError = require('../utils/AppError');
const { createNotification } = require('./notification.service');

async function addComment({ ticketId, authorId, content, isInternal = false }) {
  //we make sure the ticket exists
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }});
  if (!ticket) throw new AppError('Ticket not found', 404);

  const comment = await prisma.comment.create({
    data: {
      ticketId,
      authorId,
      content,
      isInternal
    }
  });

  //audit
  await createAudit({
    ticketId,
    actorId: authorId,
    action: isInternal ? 'INTERNAL_NOTE_ADDED' : 'COMMENT_ADDED',
    oldValue: null,
    newValue: content.slice(0, 1000)
  });

  //if public staff comment, set firstResponseAt if not set
  const author = await prisma.user.findUnique({ where: { id: authorId }, select: { role: true }});
  if (!isInternal && author && author.role !== 'STUDENT' && !ticket.firstResponseAt) {
    await prisma.ticket.update({ where: { id: ticketId }, data: { firstResponseAt: new Date() }});
    await createAudit({ ticketId, actorId: authorId, action: 'FIRST_RESPONSE_MARKED', newValue: new Date().toISOString() });
  }

  // Notify the student when a staff member comments publicly on their ticket
  if (!isInternal && author && author.role !== 'STUDENT') {
    await createNotification({
      userId:   ticket.studentId,
      ticketId: ticketId,
      type:     'COMMENT_ADDED',
      message:  `A reply was added to your ticket "${ticket.title}".`
    });
  }

  // Notify the assignee when a student comments on their ticket
  if (!isInternal && author && author.role === 'STUDENT' && ticket.assigneeId) {
    await createNotification({
      userId:   ticket.assigneeId,
      ticketId: ticketId,
      type:     'COMMENT_ADDED',
      message:  `Student replied on ticket "${ticket.title}".`
    });
  }

  return comment;
}

module.exports = { addComment };