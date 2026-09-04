import { Router } from "express";
import * as itemService from "../services/itemService";
import { authenticate, requireRole } from "../middleware/auth";
import { uploadImage } from "../middleware/upload";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const items = await itemService.getAllItems();
    res.json(items);
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
      const id = await itemService.createItem({
        level_id: Number(body.level_id),
        name: body.name,
        points_required: Number(body.points_required),
        image,
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
      if (body.level_id !== undefined) data.level_id = Number(body.level_id);
      if (body.name !== undefined) data.name = body.name;
      if (body.points_required !== undefined)
        data.points_required = Number(body.points_required);
      if (req.file) data.image = `/uploads/${req.file.filename}`;
      await itemService.updateItem(Number(req.params.id), data);
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
      await itemService.deleteItem(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
