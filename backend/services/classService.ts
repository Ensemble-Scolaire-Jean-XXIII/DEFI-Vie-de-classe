import { pool } from "../config/db";
import { AppError, handleDatabaseError } from "../utils/appError";
import { syncActiveTrimestresByDate } from "./trimestreService";

export const getAllClasses = async () => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id, c.name,
             u.first_name as pp_first_name, u.last_name as pp_last_name
      FROM classes c
      LEFT JOIN class_users cu ON c.id = cu.class_id AND cu.is_principal = 1
      LEFT JOIN users u ON cu.user_id = u.id
    `);
    return rows;
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const createClass = async (data: { name: string }) => {
  try {
    const [result]: any = await pool.query(
      "INSERT INTO classes (name) VALUES (?)",
      [data.name],
    );
    return result.insertId;
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const updateClass = async (id: number, data: { name?: string }) => {
  try {
    await pool.query(
      "UPDATE classes SET name = COALESCE(?, name) WHERE id = ?",
      [data.name, id],
    );
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const deleteClass = async (id: number) => {
  try {
    const [result]: any = await pool.query("DELETE FROM classes WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      throw new AppError("Classe introuvable.", 404);
    }
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw handleDatabaseError(error);
  }
};

export const resetAllClasses = async (): Promise<void> => {
  try {
    await pool.query("DELETE FROM points_log");
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const getPublicLeaderboard = async (trimestreId?: number) => {
  try {
    let tid: number | null = null;
    if (Number.isFinite(trimestreId)) {
      tid = trimestreId as number;
    } else {
      tid = await getActiveTrimestreId();
    }
    const [rows]: any = await pool.query(
      `
      SELECT c.id, c.name, 
             COALESCE(SUM(pl.points_awarded), 0) as total_points,
             u.first_name as pp_first_name, u.last_name as pp_last_name
      FROM classes c
      LEFT JOIN class_users cu ON c.id = cu.class_id AND cu.is_principal = 1
      LEFT JOIN users u ON cu.user_id = u.id
      LEFT JOIN points_log pl ON c.id = pl.class_id AND pl.trimestre_id = ?
      GROUP BY c.id 
      ORDER BY total_points DESC
    `,
      [tid],
    );

    if (!tid) return rows;

    const leaderboard: any[] = [];
    for (const row of rows) {
      const progress = await getClassProgressPublic(row.id, tid);
      leaderboard.push({
        ...row,
        total_points: Number(row.total_points),
        completed_items: progress.completed_items.length,
        completed_levels: progress.completed_levels.length,
      });
    }
    return leaderboard;
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

const getActiveTrimestreId = async (): Promise<number | null> => {
  await syncActiveTrimestresByDate();
  const [rows]: any = await pool.query(
    "SELECT id FROM trimestres WHERE is_active = 1 ORDER BY start_date DESC LIMIT 1",
  );
  if (rows.length > 0) return rows[0].id;
  const [fallback]: any = await pool.query(
    "SELECT id FROM trimestres ORDER BY start_date DESC LIMIT 1",
  );
  return fallback.length > 0 ? fallback[0].id : null;
};

const getClassProgressPublic = async (
  classId: number,
  trimestreId: number | null,
) => {
  const [rows]: any = await pool.query(
    `
    SELECT
      i.id as item_id,
      i.name as item_name,
      i.image as item_image,
      i.points_required,
      l.id as level_id,
      l.name as level_name,
      l.medal_image as level_medal,
      l.global_medal_id as level_medal_id,
      COALESCE(SUM(pl.points_awarded), 0) as total_points
    FROM items i
    JOIN levels l ON i.level_id = l.id
    LEFT JOIN points_log pl ON i.id = pl.item_id AND pl.class_id = ? AND pl.trimestre_id = ?
    GROUP BY i.id, i.name, i.image, i.points_required, l.id, l.name, l.medal_image, l.global_medal_id
  `,
    [classId, trimestreId],
  );

  let globalTotal = 0;
  const itemsMap = new Map<number, any>();
  const levelsMap = new Map<number, any>();

  for (const row of rows) {
    const currentPoints = Number(row.total_points);
    globalTotal += currentPoints;
    const itemValidated = currentPoints >= row.points_required;

    itemsMap.set(row.item_id, {
      id: row.item_id,
      item_name: row.item_name,
      item_image: row.item_image,
      points: currentPoints,
      points_required: row.points_required,
      validated: itemValidated,
      level_id: row.level_id,
    });

    if (!levelsMap.has(row.level_id)) {
      levelsMap.set(row.level_id, {
        id: row.level_id,
        name: row.level_name,
        medal: row.level_medal,
        medal_id: row.level_medal_id,
        items: [],
        validated: true,
      });
    }

    const levelData = levelsMap.get(row.level_id);
    const itemValidatedForLevel = itemValidated;
    levelData.items.push({
      id: row.item_id,
      name: row.item_name,
      points: currentPoints,
      required: row.points_required,
      validated: itemValidatedForLevel,
    });

    if (!itemValidatedForLevel) {
      levelData.validated = false;
    }
  }

  const completedItems = Array.from(itemsMap.values()).filter(
    (item) => item.validated,
  );
  const completedLevels = Array.from(levelsMap.values()).filter(
    (level) => level.validated,
  );

  const medals = await computeUnlockedMedals(
    completedLevels,
    globalTotal,
  );

  return {
    total_points: globalTotal,
    completed_items: completedItems,
    completed_levels: completedLevels,
    levels: Array.from(levelsMap.values()),
    medals,
  };
};

const computeUnlockedMedals = async (
  completedLevels: any[],
  totalPoints: number,
) => {
  const [allMedals]: any = await pool.query(
    "SELECT id, name, image, points_required, is_level_medal FROM global_medals",
  );

  const unlocked = new Map<number, any>();

  const validatedLevelIds = completedLevels
    .map((l) => l.id)
    .filter((id: any) => id != null);

  if (validatedLevelIds.length > 0) {
    const [levelMedalRows]: any = await pool.query(
      `SELECT DISTINCT m.* FROM global_medals m
       JOIN levels l ON l.global_medal_id = m.id
       WHERE l.id IN (?) AND m.is_level_medal = 1`,
      [validatedLevelIds],
    );
    for (const row of levelMedalRows) {
      unlocked.set(row.id, row);
    }
  }

  for (const medal of allMedals) {
    if (
      !medal.is_level_medal &&
      Number(medal.points_required) <= totalPoints
    ) {
      unlocked.set(medal.id, medal);
    }
  }

  return Array.from(unlocked.values());
};

export const getClassById = async (id: number) => {
  try {
    if (!Number.isFinite(id) || id <= 0) {
      throw new AppError("Classe introuvable.", 404);
    }
    const trimestreId = await getActiveTrimestreId();
    const progress = await getClassProgressPublic(id, trimestreId);
    return { id, trimestreId, ...progress };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw handleDatabaseError(error);
  }
};

export const getClassTeachers = async (classId: number) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              COALESCE(SUM(pl.points_awarded), 0) as total_points_attributed
       FROM users u
       JOIN class_users cu ON u.id = cu.user_id
       LEFT JOIN points_log pl ON pl.user_id = u.id AND pl.class_id = cu.class_id
       WHERE cu.class_id = ?
       GROUP BY u.id, u.first_name, u.last_name, u.email
       ORDER BY total_points_attributed DESC`,
      [classId],
    );
    return rows;
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const getPointsByTeacherAndClass = async (
  userId?: string,
  role?: string,
) => {
  const trimestreId = await getActiveTrimestreId();

  const params: any[] = [trimestreId];
  let classFilter = "";

  if (role === "professeur" && userId) {
    const [clsRows]: any = await pool.query(
      "SELECT class_id FROM class_users WHERE user_id = ?",
      [userId],
    );
    const ids = clsRows.map((r: any) => r.class_id);
    if (ids.length === 0) return { trimestreId, rows: [] };
    classFilter = ` AND c.id IN (${ids.map(() => "?").join(",")})`;
    params.push(...ids);
  }

  const [rows]: any = await pool.query(
    `SELECT
       u.id as teacher_id,
       u.first_name as teacher_first_name,
       u.last_name as teacher_last_name,
       u.role as teacher_role,
       c.id as class_id,
       c.name as class_name,
       COALESCE(SUM(pl.points_awarded), 0) as total_points
     FROM points_log pl
     JOIN users u ON u.id = pl.user_id
     JOIN classes c ON c.id = pl.class_id
     WHERE u.role IN ('professeur', 'admin')
       AND pl.trimestre_id = ?${classFilter}
     GROUP BY u.id, u.first_name, u.last_name, u.role, c.id, c.name
     ORDER BY c.name ASC, u.last_name ASC, u.first_name ASC`,
    params,
  );
  return { trimestreId, rows };
};

export const getClassUsers = async (classId: number) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, cu.is_principal
       FROM users u
       JOIN class_users cu ON u.id = cu.user_id
       WHERE cu.class_id = ?
       ORDER BY cu.is_principal DESC, u.last_name ASC`,
      [classId],
    );
    return rows;
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const assignUserToClass = async (
  classId: number,
  userId: string,
  isPrincipal: boolean,
) => {
  try {
    await pool.query(
      "INSERT INTO class_users (class_id, user_id, is_principal) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE is_principal = VALUES(is_principal)",
      [classId, userId, isPrincipal ? 1 : 0],
    );
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};

export const removeUserFromClass = async (
  classId: number,
  userId: string,
) => {
  try {
    await pool.query(
      "DELETE FROM class_users WHERE class_id = ? AND user_id = ?",
      [classId, userId],
    );
  } catch (error: any) {
    throw handleDatabaseError(error);
  }
};
