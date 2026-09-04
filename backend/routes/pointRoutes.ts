import { Router } from "express";
import { PointService } from "../services/pointService";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole(["professeur", "admin", "superadmin"]),
  async (req, res, next) => {
    try {
      const { class_id: classId, item_id: itemId, trimestre_id: trimestreId } = req.body;
      const userId = (req as any).user.id;
      const actorRole = (req as any).user.role;
      const result = await PointService.addPoint(
        classId,
        itemId,
        userId,
        trimestreId,
        actorRole,
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get("/mine", authenticate, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const points = await PointService.getMyPoints(userId);
    res.json(points);
  } catch (error) {
    next(error);
  }
});

router.get("/progress/:classId", async (req, res, next) => {
  try {
    const classId = Number(req.params.classId);
    const trimestreId = Number(req.query.trimestre_id);
    const progress = await PointService.getClassProgress(classId, trimestreId);
    res.json(progress);
  } catch (error) {
    next(error);
  }
});

export default router;
