import crypto from "crypto";

/**
 * Génère un mot de passe temporaire aléatoire et robuste.
 * Format : 16 caractères satisfaisant un critère lettre + chiffre + caractère spécial
 * (compatible avec la règle de la page profil).
 */
export const generateTemporaryPassword = (length = 16): string => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$%&*!?+-=";
  const all = upper + lower + digits + special;

  const rand = (n: number) =>
    crypto.randomInt(0, n);

  let pw = "";
  pw += upper[rand(upper.length)];
  pw += lower[rand(lower.length)];
  pw += digits[rand(digits.length)];
  pw += special[rand(special.length)];

  for (let i = pw.length; i < length; i++) {
    pw += all[rand(all.length)];
  }

  const chars = pw.split("");
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};
