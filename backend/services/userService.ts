import { pool } from "../config/db";
import { User } from "../models/types";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { AppError, handleDatabaseError } from "../utils/appError";
import { generateTemporaryPassword } from "../utils/password";
import { sendWelcomeEmail } from "../config/mail";

type Role = User["role"];

const isSuperAdmin = (role?: string) => role === "superadmin";

const assertRoleTarget = (actorRole: string | undefined, targetRole?: string) => {
  if (targetRole === "superadmin" && !isSuperAdmin(actorRole)) {
    throw new AppError(
      "Seul un superadmin peut modifier ou supprimer un superadmin.",
      403,
    );
  }
};

const assertAllowedRole = (
  actorRole: string | undefined,
  requestedRole?: string,
) => {
  if (requestedRole && !isSuperAdmin(actorRole) && requestedRole !== "professeur" && requestedRole !== "admin") {
    throw new AppError(
      "Seul un superadmin peut assigner ce rôle.",
      403,
    );
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  const [rows] = await pool.query(
    "SELECT id, email, first_name, last_name, role, created_at FROM users",
  );
  return rows as User[];
};

export const getUserById = async (id: string): Promise<User | null> => {
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
    email,
  ]);
  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
};

/**
 * Crée un utilisateur avec un mot de passe généré automatiquement,
 * envoyé par email. Ne requiert aucun mot de passe de la part de l'appelant.
 */
export const createUser = async (
  data: Omit<User, "id" | "created_at" | "password_hash"> & {
    password_hash?: string;
  },
  actorRole?: string,
): Promise<{ id: string; generatedPassword: string }> => {
  assertAllowedRole(actorRole, data.role);

  const id = uuidv4();
  const generatedPassword = data.password_hash ?? generateTemporaryPassword();
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(generatedPassword, salt);

  try {
    await pool.query(
      "INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)",
      [
        id,
        data.email,
        hashedPassword,
        data.first_name,
        data.last_name,
        data.role || "professeur",
      ],
    );
    if (!data.password_hash) {
      await sendWelcomeEmail(data.email, generatedPassword);
    }
    return { id, generatedPassword };
  } catch (error: any) {
    return handleDatabaseError(error);
  }
};

/**
 * Met à jour un utilisateur.
 * - Seul un superadmin peut modifier un compte superadmin.
 * - Seul un superadmin peut réinitialiser le mot de passe d'un autre utilisateur.
 */
export const updateUser = async (
  id: string,
  data: Partial<User>,
  actorRole?: string,
): Promise<void> => {
  const target = await getUserById(id);
  if (!target) {
    throw new AppError("Utilisateur introuvable.", 404);
  }

  assertRoleTarget(actorRole, target.role);
  assertAllowedRole(actorRole, data.role);

  if (data.password_hash && !isSuperAdmin(actorRole)) {
    throw new AppError(
      "Seul un superadmin peut réinitialiser le mot de passe d'un utilisateur.",
      403,
    );
  }

  const updateData: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (key === "password_hash" && typeof value === "string" && value === "") {
      continue;
    }
    if (value !== undefined && key !== "id" && key !== "created_at") {
      if (key === "password_hash" && typeof value === "string") {
        const isAlreadyHashed =
          value.startsWith("$2a$") || value.startsWith("$2b$");
        if (!isAlreadyHashed) {
          const salt = await bcrypt.genSalt(10);
          updateData[key] = await bcrypt.hash(value, salt);
        }
      } else {
        updateData[key] = value;
      }
    }
  }

  if (Object.keys(updateData).length === 0) return;

  const fields = Object.keys(updateData)
    .map((key) => `${key} = ?`)
    .join(", ");
  const values = Object.values(updateData);
  values.push(id);

  try {
    await pool.query(`UPDATE users SET ${fields} WHERE id = ?`, values);
  } catch (error: any) {
    handleDatabaseError(error);
  }
};

/**
 * Mise à jour du profil de l'utilisateur connecté (PUT /users/me).
 * La modification du mot de passe requiert l'ancien mot de passe.
 */
export const updateSelf = async (
  userId: string,
  data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    password_hash?: string;
    old_password?: string;
  },
): Promise<void> => {
  const target = await getUserById(userId);
  if (!target) {
    throw new AppError("Utilisateur introuvable.", 404);
  }

  const updateData: Record<string, any> = {};

  if (data.first_name !== undefined) updateData.first_name = data.first_name;
  if (data.last_name !== undefined) updateData.last_name = data.last_name;
  if (data.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new AppError("Format d'email invalide.", 400);
    }
    updateData.email = data.email;
  }

  if (data.password_hash) {
    if (!data.old_password) {
      throw new AppError("L'ancien mot de passe est requis.", 400);
    }
    const valid = await bcrypt.compare(data.old_password, target.password_hash);
    if (!valid) {
      throw new AppError("L'ancien mot de passe est incorrect.", 401);
    }
    const salt = await bcrypt.genSalt(10);
    updateData.password_hash = await bcrypt.hash(data.password_hash, salt);
  }

  if (Object.keys(updateData).length === 0) return;

  const fields = Object.keys(updateData)
    .map((key) => `${key} = ?`)
    .join(", ");
  const values = Object.values(updateData);
  values.push(userId);

  try {
    await pool.query(`UPDATE users SET ${fields} WHERE id = ?`, values);
  } catch (error: any) {
    handleDatabaseError(error);
  }
};

export const login = async (
  email: string,
  password: string,
): Promise<{ token: string; role: string }> => {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new AppError("Identifiants invalides.", 401);
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError("Identifiants invalides.", 401);
  }
  const jwt = await import("jsonwebtoken");
  const token = jwt.default.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "24h" },
  );
  return { token, role: user.role };
};

export const deleteUser = async (id: string, actorRole?: string): Promise<void> => {
  const target = await getUserById(id);
  if (target) {
    assertRoleTarget(actorRole, target.role);
  }
  try {
    const [result]: any = await pool.query("DELETE FROM users WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      throw new AppError("Utilisateur introuvable.", 404);
    }
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    handleDatabaseError(error);
  }
};

export const getMe = async (userId: string) => {
  const [rows]: any = await pool.query(
    "SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ?",
    [userId],
  );
  if (rows.length === 0) {
    throw new AppError("Utilisateur introuvable.", 404);
  }

  const [classes]: any = await pool.query(
    `SELECT c.id, c.name, cu.is_principal
     FROM classes c
     JOIN class_users cu ON c.id = cu.class_id
     WHERE cu.user_id = ?`,
    [userId],
  );

  return {
    ...rows[0],
    classes,
  };
};
