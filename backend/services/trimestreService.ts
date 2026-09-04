import { pool } from "../config/db";
import { Trimestre } from "../models/types";
import { AppError, handleDatabaseError } from "../utils/appError";

/**
 * Synchronise l'état `is_active` des trimestres en fonction de la date du jour :
 * - le trimestre dont [start_date, end_date] contient aujourd'hui devient actif ;
 * - tous les autres sont désactivés (actif unique) ;
 * - si aucun trimestre ne couvre la date du jour, tous sont désactivés.
 */
export const syncActiveTrimestresByDate = async (): Promise<void> => {
  try {
    const [rows]: any = await pool.query(
      "SELECT id, start_date, end_date FROM trimestres",
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Archivage automatique des trimestres terminés (date de fin dépassée)
    for (const tri of rows) {
      const end = new Date(tri.end_date);
      end.setHours(23, 59, 59, 999);
      if (end < today) {
        await archiveClassSnapshots(tri.id);
      }
    }

    let activeId: number | null = null;
    for (const tri of rows) {
      const start = new Date(tri.start_date);
      const end = new Date(tri.end_date);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      if (today >= start && today <= end) {
        activeId = tri.id;
        break;
      }
    }

    if (activeId === null) {
      await pool.query("UPDATE trimestres SET is_active = 0");
    } else {
      await pool.query("UPDATE trimestres SET is_active = 0 WHERE id <> ?", [
        activeId,
      ]);
      await pool.query("UPDATE trimestres SET is_active = 1 WHERE id = ?", [
        activeId,
      ]);
    }
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

const deactivateOthers = async (exceptId: number): Promise<void> => {
  await pool.query("UPDATE trimestres SET is_active = 0 WHERE id <> ?", [
    exceptId,
  ]);
};

const archiveClassSnapshots = async (trimestreId: number): Promise<void> => {
  const [classes]: any = await pool.query("SELECT id FROM classes");

  for (const cls of classes) {
    const [points]: any = await pool.query(
      `SELECT COALESCE(SUM(pl.points_awarded), 0) as total_points
       FROM points_log pl
       WHERE pl.class_id = ? AND pl.trimestre_id = ?`,
      [cls.id, trimestreId],
    );

    const [items]: any = await pool.query(
      `SELECT i.id, i.points_required,
              COALESCE(SUM(pl.points_awarded), 0) as total_points
       FROM items i
       LEFT JOIN points_log pl ON i.id = pl.item_id AND pl.class_id = ? AND pl.trimestre_id = ?
       GROUP BY i.id, i.points_required`,
      [cls.id, trimestreId],
    );

    const validatedLevels: number[] = [];
    const levelsSet = new Set<number>();
    const [levelRows]: any = await pool.query(
      `SELECT DISTINCT l.id as level_id
       FROM levels l
       JOIN items i ON i.level_id = l.id
       JOIN points_log pl ON pl.item_id = i.id
       WHERE pl.class_id = ? AND pl.trimestre_id = ?`,
      [cls.id, trimestreId],
    );
    for (const lr of levelRows) levelsSet.add(lr.level_id);

    for (const lvlId of levelsSet) {
      const [lvlItems]: any = await pool.query(
        `SELECT i.points_required,
                COALESCE(SUM(pl.points_awarded), 0) as total_points
         FROM items i
         LEFT JOIN points_log pl ON i.id = pl.item_id AND pl.class_id = ? AND pl.trimestre_id = ?
         WHERE i.level_id = ?
         GROUP BY i.id, i.points_required`,
        [cls.id, trimestreId, lvlId],
      );
      const allValidated = lvlItems.every(
        (i: any) => i.total_points >= i.points_required,
      );
      if (allValidated && lvlItems.length > 0) {
        validatedLevels.push(lvlId);
      }
    }

    const totalPoints = points[0]?.total_points || 0;

    const [existing]: any = await pool.query(
      "SELECT id FROM class_archives WHERE class_id = ? AND trimestre_id = ?",
      [cls.id, trimestreId],
    );

    if (existing.length > 0) {
      await pool.query(
        "UPDATE class_archives SET total_points = ?, levels_validated = ? WHERE class_id = ? AND trimestre_id = ?",
        [totalPoints, JSON.stringify(validatedLevels), cls.id, trimestreId],
      );
    } else {
      await pool.query(
        "INSERT INTO class_archives (class_id, trimestre_id, total_points, levels_validated) VALUES (?, ?, ?, ?)",
        [cls.id, trimestreId, totalPoints, JSON.stringify(validatedLevels)],
      );
    }
  }
};

export const archiveTrimestre = async (id: number): Promise<void> => {
  try {
    const [tri]: any = await pool.query(
      "SELECT id, is_active, start_date, end_date FROM trimestres WHERE id = ?",
      [id],
    );
    if (tri.length === 0) {
      throw new AppError("Trimestre introuvable.", 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(tri[0].start_date);
    const end = new Date(tri[0].end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    if (today >= start && today <= end) {
      throw new AppError(
        "Ce trimestre est encore en cours. Attendez la date de fin pour l'archiver.",
        409,
      );
    }

    await archiveClassSnapshots(id);

    await pool.query("UPDATE trimestres SET is_active = 0 WHERE id = ?", [id]);

    await activateNextTrimestre(id, tri[0]?.start_date);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw handleDatabaseError(error);
  }
};

/**
 * Active automatiquement le trimestre suivant (par date) après archivage,
 * pour que la vue courante ne reste pas sans trimestre actif.
 */
const activateNextTrimestre = async (
  archivedId: number,
  archivedStart?: Date | string | null,
): Promise<void> => {
  try {
    const [nextRows]: any = await pool.query(
      `SELECT id FROM trimestres
       WHERE id <> ? AND (? IS NULL OR start_date > ?)
       ORDER BY start_date ASC LIMIT 1`,
      [archivedId, archivedStart, archivedStart],
    );

    if (nextRows.length > 0) {
      await pool.query("UPDATE trimestres SET is_active = 0 WHERE id <> ?", [
        nextRows[0].id,
      ]);
      await pool.query("UPDATE trimestres SET is_active = 1 WHERE id = ?", [
        nextRows[0].id,
      ]);
    } else {
      await syncActiveTrimestresByDate();
    }
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const getAllTrimestres = async (): Promise<Trimestre[]> => {
  try {
    const [rows] = await pool.query("SELECT * FROM trimestres");
    return rows as Trimestre[];
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const createTrimestre = async (data: {
  name: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}): Promise<number> => {
  try {
    const activate = Boolean(data.is_active);
    if (activate) {
      await pool.query("UPDATE trimestres SET is_active = 0");
    }
    const [result]: any = await pool.query(
      "INSERT INTO trimestres (name, start_date, end_date, is_active) VALUES (?, ?, ?, ?)",
      [data.name, data.start_date, data.end_date, activate ? 1 : 0],
    );
    await syncActiveTrimestresByDate();
    return result.insertId;
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const updateTrimestre = async (
  id: number,
  data: {
    name?: string;
    start_date?: string;
    end_date?: string;
    is_active?: boolean;
  },
): Promise<void> => {
  try {
    const explicitActivate = data.is_active === true;
    if (explicitActivate) {
      await deactivateOthers(id);
    }
    await pool.query(
      "UPDATE trimestres SET name = COALESCE(?, name), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date), is_active = COALESCE(?, is_active) WHERE id = ?",
      [data.name, data.start_date, data.end_date, data.is_active, id],
    );

    if (explicitActivate) {
      await pool.query("UPDATE trimestres SET is_active = 1 WHERE id = ?", [
        id,
      ]);
    } else {
      await syncActiveTrimestresByDate();
    }
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const deleteTrimestre = async (id: number): Promise<void> => {
  try {
    const [result]: any = await pool.query(
      "DELETE FROM trimestres WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0) {
      throw new AppError("Trimestre introuvable.", 404);
    }
    await syncActiveTrimestresByDate();
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw handleDatabaseError(error);
  }
};
