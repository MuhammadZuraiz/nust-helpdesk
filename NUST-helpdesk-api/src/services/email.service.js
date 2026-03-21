const nodemailer = require('nodemailer');
const AppError = require('../utils/AppError');

// A transporter is Nodemailer's term for the SMTP connection.
// Think of it as the client that knows how to talk to the mail server.
// We create it once and reuse it — same reason we have one prisma client.
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

async function sendEmail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to,
      subject,
      text,    // plain text version
      html,    // HTML version — email clients prefer this if available
    });

    // Ethereal gives you a URL to preview the email in your browser.
    // In production this line does nothing — real providers don't return preview URLs.
    console.log('Email preview URL:', nodemailer.getTestMessageUrl(info));

    return info;
  } catch (err) {
    // Email failure should never crash the main request.
    // We log it and throw so the caller can decide what to do.
    console.error('Email send failed:', err);
    throw new AppError('Failed to send email', 500);
  }
}

module.exports = { sendEmail };