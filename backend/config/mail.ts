import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

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

/**
 * Envoie un email de bienvenue avec le mot de passe généré.
 * Si le SMTP n'est pas configuré, journalise le mot de passe en console
 * afin de ne pas bloquer le flux de développement.
 */
export const sendWelcomeEmail = async (to: string, password: string) => {
  const tr = getTransporter();
  const subject = "Vos accès — Défi Vie de Classe";
  const text = [
    "Bonjour,",
    "",
    "Votre compte a été créé sur la plateforme Défi Vie de Classe.",
    "",
    `Identifiant : ${to}`,
    `Mot de passe : ${password}`,
    "",
    "Merci de conserver ces identifiants et de ne pas les partager.",
    "",
    "Cordialement,",
    "Équipe Défi Vie de Classe",
  ].join("\n");

  if (!tr) {
    console.warn(
      `[MAIL] SMTP non configuré — mot de passe généré pour ${to} : ${password}`,
    );
    return;
  }

  await tr.sendMail({
    from: DEFAULT_FROM(),
    to,
    subject,
    text,
  });
};

export const mailConfigured = isSmtpConfigured;
