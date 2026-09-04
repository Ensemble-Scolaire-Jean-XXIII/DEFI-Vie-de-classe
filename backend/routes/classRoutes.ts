import { Router } from "express";
import * as classService from "../services/classService";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const classes = await classService.getAllClasses();
    res.json(classes);
  } catch (error) {
    next(error);
  }
});

router.get("/leaderboard", async (req, res, next) => {
  try {
    const trimestreId = Number(req.query.trimestre_id);
    const leaderboard = await classService.getPublicLeaderboard(trimestreId);
    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/reset",
  authenticate,
  requireRole(["admin", "superadmin"]),
  async (req, res, next) => {
    try {
      await classService.resetAllClasses();
      res.status(200).json({ message: "Toutes les classes ont été réinitialisées." });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/points-by-teacher", authenticate, requireRole(["admin", "superadmin", "professeur"]), async (req, res, next) => {
  try {
    const user = (req as any).user;
    const result = await classService.getPointsByTeacherAndClass(
      user.id,
      user.role,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/teachers", async (req, res, next) => {
  try {
    const teachers = await classService.getClassTeachers(Number(req.params.id));
    res.json(teachers);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:id/users",
  authenticate,
  requireRole(["admin", "superadmin"]),
  async (req, res, next) => {
    try {
      const users = await classService.getClassUsers(Number(req.params.id));
      res.json(users);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/users",
  authenticate,
  requireRole(["admin", "superadmin"]),
  async (req, res, next) => {
    try {
      const { class_id, user_id, is_principal } = req.body;
      await classService.assignUserToClass(
        Number(class_id),
        String(user_id),
        !!is_principal,
      );
      res.status(201).json({ message: "Utilisateur assigné à la classe." });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id/users/:userId",
  authenticate,
  requireRole(["admin", "superadmin"]),
  async (req, res, next) => {
    try {
      await classService.removeUserFromClass(
        Number(req.params.id),
        String(req.params.userId),
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id", async (req, res, next) => {
  try {
    const details = await classService.getClassById(Number(req.params.id));
    res.json(details);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  authenticate,
  requireRole(["admin", "superadmin"]),
  async (req, res, next) => {
    try {
      const id = await classService.createClass(req.body);
      res.status(201).json({ id });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id",
  authenticate,
  requireRole(["admin", "superadmin"]),
  async (req, res, next) => {
    try {
      await classService.updateClass(Number(req.params.id), req.body);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  authenticate,
  requireRole(["admin", "superadmin"]),
  async (req, res, next) => {
    try {
      await classService.deleteClass(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
