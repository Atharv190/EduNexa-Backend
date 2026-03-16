import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text }) => {
  try {
   const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
});

    const info = await transporter.sendMail({
      from: `"EduNexa Admin" <maratheatharv8@gmail.com>`,
      to,
      subject,
      text,
    });

    console.log("Email sent:", info.messageId);
  } catch (error) {
    console.error("Email error FULL:", error);
    throw error;
  }
};
