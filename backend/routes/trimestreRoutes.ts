import { Router } from "express";
import * as trimestreService from "../services/trimestreService";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const trimestres = await trimestreService.getAllTrimestres();
    res.json(trimestres);
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
      const id = await trimestreService.createTrimestre(req.body);
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
      await trimestreService.updateTrimestre(Number(req.params.id), req.body);
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
      await trimestreService.deleteTrimestre(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/archive",
  authenticate,
  requireRole(["admin", "superadmin"]),
  async (req, res, next) => {
    try {
      await trimestreService.archiveTrimestre(Number(req.params.id));
      res.status(200).json({ message: "Trimestre archivé avec succès." });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
