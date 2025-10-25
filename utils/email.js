import nodemailer from 'nodemailer';

// Simple reusable email utility
// Requires env vars: EMAIL_USER, EMAIL_PASS (App password or SMTP creds)

const transporter = nodemailer.createTransport({
  service: 'gmail', // change as needed
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) throw new Error('Email "to" address missing');
  await transporter.sendMail({
    from: `PrintEase <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};
