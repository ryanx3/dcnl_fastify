import fs from "fs";
import path from "path";
import { env } from "../env";
import nodemailer from "nodemailer";

interface SendEmailProps {
  files?: string[];
  html?: string;
  environment: string
  bodyData?: any;
  errorData?: any;
}

export async function sendEmail({
  files = [],
  html,
  environment,
  bodyData,
  errorData,
}: SendEmailProps) {
  try {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: true,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    const attachments = files
      .filter((filePath) => fs.existsSync(filePath))
      .map((filePath) => ({
        filename: path.basename(filePath),
        content: fs.readFileSync(filePath),
      }));

    const finalHtml =
      html ??
      `<h2>Erro no envio para DNCL ${environment}</h2>
       <h3>Body recebido:</h3>
       <pre>${JSON.stringify(bodyData, null, 2)}</pre>
       <h3>Erro:</h3>
       <pre>${JSON.stringify(errorData, null, 2)}</pre>`;

    const info = await transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
      to: ["ryan.martins@pluricall.pt"],
      subject: `Erro ao enviar para DNCL ${environment}`,
      html: finalHtml,
      attachments,
    });

    console.log("✅ E-mail enviado:", info.response);

    return { success: true, accepted: info.accepted, rejected: info.rejected, response: info.response };
  } catch (err) {
    console.error("❌ Falha ao enviar e-mail:", err);
    return { success: false, error: err };
  }
}
