const prisma = require('../prismaClient');

//Creates a notification for a specific user. Called by other services when relevant events happen
async function createNotification({ userId, ticketId = null, type, message }) {
  // Some actions have no specific recipient, so skip
  if (!userId) return;

  return prisma.notification.create({
    data: { userId, ticketId, type, message }
  });
}

//Get unread notifications for a user. returns the 20 most recent unread ones
async function getUnreadNotifications(userId) {
  return prisma.notification.findMany({
    where:   { userId, read: false },
    orderBy: { createdAt: 'desc' },
    take:    20,
    include: {
      ticket: { select: { id: true, title: true } }
    }
  });
}

// Mark all unread notifications as read for a user, when they open the bell dropdown.
async function markAllRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data:  { read: true }
  });
}

module.exports = { createNotification, getUnreadNotifications, markAllRead };