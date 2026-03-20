import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    if (!process.env.BREVO_USER || !process.env.BREVO_PASS) {
      throw new Error("Brevo credentials missing in environment variables");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS,
      },
    });

    await transporter.verify();
    console.log("✅ SMTP Connected");

    const info = await transporter.sendMail({
      from: `"EduNexa Admin" <maratheatharv8@gmail.com>`,
      to,
      subject,
      text,
      html,
    });

    console.log("✅ Email sent:", info.messageId);
    return true;

  } catch (error) {
    console.error("❌ Email error:", error);
    throw new Error("Email sending failed");
  }
};