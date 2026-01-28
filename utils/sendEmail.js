import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.verify(); // keep this

    const info = await transporter.sendMail({
      from: `"EduNexa Admin" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });

    console.log("✅ Email sent:", info.response);
  } catch (error) {
    console.error("❌ Email error FULL:", error);
    throw error;
  }
};
