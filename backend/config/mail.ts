import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import path from "path";
import { FRONTEND_URL } from "./appConfig";

let transporter: Transporter | null = null;

const isSmtpConfigured = (): boolean =>
  Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );

const getTransporter = (): Transporter | null => {
  if (transporter) return transporter;
  if (!isSmtpConfigured()) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST as string,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER as string,
      pass: process.env.SMTP_PASS as string,
    },
  });
  return transporter;
};

const DEFAULT_FROM = (): string =>
  process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@jean23.org";

const SIGNATURE_PATH = path.resolve(process.cwd(), "public", "signature.png");

const generateHtmlEmail = (title: string, content: string): string => {
  const formattedContent = content
    ? content.replace(/\r\n/g, "\n").replace(/\n/g, "<br>")
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 20px; background-color: #0f172a;">
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-top: 4px solid #e84e1b; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);">
        <h2 style="color: #f8fafc; border-bottom: 2px solid #334155; padding-bottom: 10px; font-weight: 600; margin-top: 0;">${title}</h2>
        <div style="margin: 20px 0; font-size: 16px; line-height: 1.6; color: #cbd5e1;">
          ${formattedContent}
        </div>
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155;">
          <img src="cid:signature" alt="Signature Ensemble Scolaire Jean 23" style="width: 100%; height: auto; display: block;" />
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Envoie un email stylisé (template CRM Jean 23 : carte blanche, bandeau
 * orange, signature en pied de page).
 */
export const sendMail = async (
  to: string,
  subject: string,
  text: string,
  htmlContent?: string,
): Promise<void> => {
  const tr = getTransporter();
  if (!tr) {
    console.warn(`[MAIL] SMTP non configuré — email non envoyé à ${to}`);
    return;
  }

  try {
    const finalHtml = generateHtmlEmail(subject, htmlContent || text);

    await tr.sendMail({
      from: `"Ensemble Scolaire Jean 23 | NO REPLY " <${DEFAULT_FROM()}>`,
      to,
      subject,
      text,
      html: finalHtml,
      attachments: [
        {
          filename: "signature.png",
          path: SIGNATURE_PATH,
          cid: "signature",
          contentDisposition: "inline",
        },
      ],
    });
  } catch (error) {
    throw new Error("Impossible d'envoyer l'email");
  }
};

/**
 * Envoie un email de création de compte avec lien vers la plateforme,
 * les identifiants de connexion et la signature.
 * Si le SMTP n'est pas configuré, journalise le mot de passe en console
 * afin de ne pas bloquer le flux de développement.
 */
export const sendWelcomeEmail = async (
  to: string,
  password: string,
  user?: { firstName?: string; lastName?: string },
): Promise<void> => {
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const subject = "Création de votre compte — Défi Vie de Classe";
  const text = [
    `Bonjour${fullName ? ` ${fullName}` : ""},`,
    "",
    "Un administrateur vient de vous créer un compte sur la plateforme Défi Vie de Classe.",
    `Vous pouvez vous connecter dès maintenant en cliquant sur ce lien : ${FRONTEND_URL}`,
    "",
    "Voici vos identifiants de connexion :",
    `Identifiant : ${to}`,
    `Mot de passe temporaire : ${password}`,
    "",
    "Merci de conserver ces identifiants et de ne pas les partager.",
    "",
    "Cordialement,",
    "Équipe Défi Vie de Classe",
  ].join("\n");
  const htmlContent = `Bonjour${fullName ? ` <strong>${fullName}</strong>` : ""},<br><br>Un administrateur vient de vous créer un compte sur la plateforme <strong>Défi Vie de Classe</strong>.<br>Vous pouvez vous connecter dès maintenant en cliquant sur ce lien : <a href="${FRONTEND_URL}" style="color: #fb923c; font-weight: 600;">Accéder à la plateforme</a>.<br><br>Voici vos identifiants de connexion :<ul style="margin: 8px 0 8px 20px; padding: 0;"><li style="margin-bottom: 4px;"><strong>Identifiant :</strong> ${to}</li><li><strong>Mot de passe temporaire :</strong> ${password}</li></ul><p>Merci de conserver ces identifiants et de ne pas les partager.</p><br>Cordialement,<br><strong>Équipe Défi Vie de Classe</strong>`;

  const tr = getTransporter();
  if (!tr) {
    console.warn(
      `[MAIL] SMTP non configuré — mot de passe généré pour ${to} : ${password}`,
    );
    return;
  }

  await sendMail(to, subject, text, htmlContent);
};

export const mailConfigured = isSmtpConfigured;