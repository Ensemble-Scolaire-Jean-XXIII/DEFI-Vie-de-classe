import { Router } from "express";
import * as levelService from "../services/levelService";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const levels = await levelService.getAllLevels();
    res.json(levels);
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
      const id = await levelService.createLevel(req.body);
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
      await levelService.updateLevel(Number(req.params.id), req.body);
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
      await levelService.deleteLevel(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
