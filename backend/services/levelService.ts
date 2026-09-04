import { pool } from "../config/db";
import { Level } from "../models/types";
import { AppError, handleDatabaseError } from "../utils/appError";

const getMedalImage = async (medalId?: number | null) => {
  if (!medalId) return null;
  const [rows]: any = await pool.query(
    "SELECT image FROM global_medals WHERE id = ?",
    [medalId],
  );
  return rows.length > 0 ? rows[0].image : null;
};

export const getAllLevels = async (): Promise<Level[]> => {
  try {
    const [rows] = await pool.query("SELECT * FROM levels");
    return rows as Level[];
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const createLevel = async (data: {
  name: string;
  global_medal_id?: number | null;
}): Promise<number> => {
  try {
    const medalImage = await getMedalImage(data.global_medal_id);
    const [result]: any = await pool.query(
      "INSERT INTO levels (name, medal_image, global_medal_id) VALUES (?, ?, ?)",
      [data.name, medalImage, data.global_medal_id || null],
    );
    return result.insertId;
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const updateLevel = async (
  id: number,
  data: { name?: string; global_medal_id?: number | null },
): Promise<void> => {
  try {
    if ("global_medal_id" in data) {
      const medalImage = data.global_medal_id
        ? await getMedalImage(data.global_medal_id)
        : null;
      await pool.query(
        "UPDATE levels SET name = COALESCE(?, name), medal_image = ?, global_medal_id = ? WHERE id = ?",
        [data.name, medalImage, data.global_medal_id ?? null, id],
      );
    } else {
      await pool.query(
        "UPDATE levels SET name = COALESCE(?, name) WHERE id = ?",
        [data.name, id],
      );
    }
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const deleteLevel = async (id: number): Promise<void> => {
  try {
    const [result]: any = await pool.query("DELETE FROM levels WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      throw new AppError("Niveau introuvable.", 404);
    }
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw handleDatabaseError(error);
  }
};
