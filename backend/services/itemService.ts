import { pool } from "../config/db";
import { Item } from "../models/types";
import { AppError, handleDatabaseError } from "../utils/appError";

export const getAllItems = async (): Promise<Item[]> => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*, l.name as level_name 
      FROM items i 
      JOIN levels l ON i.level_id = l.id
    `);
    return rows as Item[];
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const createItem = async (data: {
  level_id: number;
  name: string;
  points_required: number;
  image?: string;
}): Promise<number> => {
  try {
    const [result]: any = await pool.query(
      "INSERT INTO items (level_id, name, points_required, image) VALUES (?, ?, ?, ?)",
      [data.level_id, data.name, data.points_required, data.image || null],
    );
    return result.insertId;
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const updateItem = async (
  id: number,
  data: {
    level_id?: number;
    name?: string;
    points_required?: number;
    image?: string;
  },
): Promise<void> => {
  try {
    await pool.query(
      "UPDATE items SET level_id = COALESCE(?, level_id), name = COALESCE(?, name), points_required = COALESCE(?, points_required), image = COALESCE(?, image) WHERE id = ?",
      [data.level_id, data.name, data.points_required, data.image, id],
    );
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const deleteItem = async (id: number): Promise<void> => {
  try {
    const [result]: any = await pool.query("DELETE FROM items WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      throw new AppError("Item introuvable.", 404);
    }
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw handleDatabaseError(error);
  }
};
