import { pool } from "../config/db";
import { AppError, handleDatabaseError } from "../utils/appError";

export class PointService {
  static async addPoint(
    classId: number,
    itemId: number,
    userId: string,
    trimestreId: number,
    actorRole?: string,
  ) {
    try {
      if (actorRole === "professeur") {
        const [assigned]: any = await pool.execute(
          `SELECT 1 FROM class_users WHERE class_id = ? AND user_id = ? LIMIT 1`,
          [classId, userId],
        );
        if (assigned.length === 0) {
          throw new AppError(
            "Vous ne pouvez attribuer des points qu'aux classes auxquelles vous êtes affecté.",
            403,
          );
        }
      }

      const [classExists]: any = await pool.execute(
        "SELECT 1 FROM classes WHERE id = ? LIMIT 1",
        [classId],
      );
      if (classExists.length === 0) {
        throw new AppError("Classe introuvable.", 404);
      }
      const [itemExists]: any = await pool.execute(
        "SELECT 1 FROM items WHERE id = ? LIMIT 1",
        [itemId],
      );
      if (itemExists.length === 0) {
        throw new AppError("Item introuvable.", 404);
      }
      const [triExists]: any = await pool.execute(
        "SELECT 1 FROM trimestres WHERE id = ? LIMIT 1",
        [trimestreId],
      );
      if (triExists.length === 0) {
        throw new AppError("Trimestre introuvable.", 404);
      }

      const [recentPoints]: any = await pool.execute(
        `SELECT 1 FROM points_log 
         WHERE class_id = ? 
         AND item_id = ? 
         AND user_id = ? 
         AND created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR) LIMIT 1`,
        [classId, itemId, userId],
      );

      if (recentPoints.length > 0) {
        throw new AppError(
          "Un point a déjà été attribué pour cet item à cette classe lors de cette séance.",
          429,
        );
      }

      await pool.execute(
        "INSERT INTO points_log (class_id, item_id, user_id, trimestre_id, points_awarded) VALUES (?, ?, ?, ?, 1)",
        [classId, itemId, userId, trimestreId],
      );
      return { classId, itemId, points: 1 };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw handleDatabaseError(error);
    }
  }

  static async getClassProgress(classId: number, trimestreId: number) {
    try {
      const [rows]: any = await pool.execute(
        `
        SELECT 
          i.id as item_id, 
          i.name as item_name, 
          i.points_required,
          l.id as level_id,
          l.name as level_name,
          COALESCE(SUM(pl.points_awarded), 0) as total_points
        FROM items i
        JOIN levels l ON i.level_id = l.id
        LEFT JOIN points_log pl ON i.id = pl.item_id AND pl.class_id = ? AND pl.trimestre_id = ?
        GROUP BY i.id, l.id
      `,
        [classId, trimestreId],
      );

      let globalTotal = 0;
      const levelsMap = new Map();

      for (const row of rows) {
        const currentPoints = Number(row.total_points);
        globalTotal += currentPoints;
        const itemValidated = currentPoints >= row.points_required;

        if (!levelsMap.has(row.level_id)) {
          levelsMap.set(row.level_id, {
            id: row.level_id,
            name: row.level_name,
            items: [],
            levelValidated: true,
          });
        }

        const levelData = levelsMap.get(row.level_id);
        levelData.items.push({
          id: row.item_id,
          name: row.item_name,
          points: currentPoints,
          required: row.points_required,
          validated: itemValidated,
        });

        if (!itemValidated) {
          levelData.levelValidated = false;
        }
      }

      return {
        classId,
        trimestreId,
        globalPoints: globalTotal,
        levels: Array.from(levelsMap.values()),
      };
    } catch (error: any) {
      throw handleDatabaseError(error);
    }
  }

  static async getMyPoints(userId: string) {
    try {
      const [rows]: any = await pool.execute(
        `
        SELECT
          pl.class_id,
          c.name as class_name,
          pl.item_id,
          i.name as item_name,
          pl.trimestre_id,
          tr.name as trimestre_name,
          pl.points_awarded,
          pl.created_at
        FROM points_log pl
        JOIN classes c ON c.id = pl.class_id
        JOIN items i ON i.id = pl.item_id
        LEFT JOIN trimestres tr ON tr.id = pl.trimestre_id
        WHERE pl.user_id = ?
        ORDER BY pl.created_at DESC
      `,
        [userId],
      );
      return rows;
    } catch (error: any) {
      throw handleDatabaseError(error);
    }
  }
}
