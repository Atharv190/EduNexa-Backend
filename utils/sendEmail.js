import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, text }) => {
  try {
    const response = await resend.emails.send({
      from: "EduNexa <onboarding@resend.dev>",
      to: to,
      subject: subject,
      text: text, // same as nodemailer text
    });

    console.log("Email sent:", response);
  } catch (error) {
    console.error("Email error FULL:", error);
    throw error;
  }
};