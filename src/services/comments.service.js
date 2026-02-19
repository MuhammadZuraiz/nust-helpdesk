const prisma = require('../prismaClient');
const { createAudit } = require('./audit.service');

async function addComment({ ticketId, authorId, content, isInternal = false }) {
  //we make sure the ticket exists
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }});
  if (!ticket) throw new Error('Ticket not found');

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

  return comment;
}

module.exports = { addComment };