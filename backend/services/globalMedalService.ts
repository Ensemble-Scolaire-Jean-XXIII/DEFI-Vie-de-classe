import { pool } from "../config/db";
import { GlobalMedal } from "../models/types";
import { AppError, handleDatabaseError } from "../utils/appError";

export const getAllGlobalMedals = async (): Promise<any[]> => {
  try {
    const [rows]: any = await pool.query(
      `SELECT gm.*, COALESCE((SELECT COUNT(*) FROM levels l WHERE l.global_medal_id = gm.id), 0) as assigned_levels
       FROM global_medals gm`,
    );
    return rows;
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const createGlobalMedal = async (data: {
  name: string;
  points_required?: number;
  image?: string;
  is_level_medal?: boolean;
}): Promise<number> => {
  try {
    const [result]: any = await pool.query(
      "INSERT INTO global_medals (name, points_required, image, is_level_medal) VALUES (?, ?, ?, ?)",
      [
        data.name,
        data.is_level_medal ? 0 : data.points_required ?? 0,
        data.image || null,
        data.is_level_medal ? 1 : 0,
      ],
    );
    return result.insertId;
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const updateGlobalMedal = async (
  id: number,
  data: {
    name?: string;
    points_required?: number;
    image?: string;
    is_level_medal?: boolean;
  },
): Promise<void> => {
  try {
    await pool.query(
      "UPDATE global_medals SET name = COALESCE(?, name), points_required = COALESCE(?, points_required), image = COALESCE(?, image), is_level_medal = COALESCE(?, is_level_medal) WHERE id = ?",
      [
        data.name,
        data.points_required,
        data.image,
        data.is_level_medal === undefined ? undefined : data.is_level_medal ? 1 : 0,
        id,
      ],
    );
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const deleteGlobalMedal = async (id: number): Promise<void> => {
  try {
    const [assigned]: any = await pool.query(
      "SELECT COUNT(*) as cnt FROM levels WHERE global_medal_id = ?",
      [id],
    );
    if (assigned[0]?.cnt > 0) {
      throw new AppError(
        "Impossible de supprimer cette médaille : elle est attribuée à un ou plusieurs niveaux.",
        409,
      );
    }

    const [result]: any = await pool.query(
      "DELETE FROM global_medals WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0) {
      throw new AppError("Médaille globale introuvable.", 404);
    }
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw handleDatabaseError(error);
  }
};
