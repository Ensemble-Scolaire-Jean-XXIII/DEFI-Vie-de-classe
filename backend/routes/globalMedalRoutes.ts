import { Router } from "express";
import * as globalMedalService from "../services/globalMedalService";
import { authenticate, requireRole } from "../middleware/auth";
import { uploadImage } from "../middleware/upload";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const medals = await globalMedalService.getAllGlobalMedals();
    res.json(medals);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  authenticate,
  requireRole(["admin", "superadmin"]),
  uploadImage,
  async (req, res, next) => {
    try {
      const body = req.body as Record<string, string>;
      const image = req.file ? `/uploads/${req.file.filename}` : undefined;
      const id = await globalMedalService.createGlobalMedal({
        name: body.name,
        points_required: body.is_level_medal === "true" ? 0 : Number(body.points_required ?? 0),
        image,
        is_level_medal: body.is_level_medal === "true",
      });
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
  uploadImage,
  async (req, res, next) => {
    try {
      const body = req.body as Record<string, string>;
      const data: Record<string, any> = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.points_required !== undefined)
        data.points_required = Number(body.points_required);
      if (req.file) data.image = `/uploads/${req.file.filename}`;
      data.is_level_medal = body.is_level_medal === "true";
      await globalMedalService.updateGlobalMedal(Number(req.params.id), data);
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
      await globalMedalService.deleteGlobalMedal(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
