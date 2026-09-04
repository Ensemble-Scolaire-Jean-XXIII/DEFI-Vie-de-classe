import { Router } from "express";
import * as userService from "../services/userService";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.post("/connexion", async (req, res, next) => {
  try {
    const { email, password_hash } = req.body;
    const result = await userService.login(email, password_hash);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/",
  authenticate,
  requireRole(["admin", "superadmin"]),
  async (req, res, next) => {
    try {
      const users = await userService.getAllUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  },
);

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const user = await userService.getMe(userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put("/me", authenticate, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    await userService.updateSelf(userId, req.body);
    res.status(204).send();
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
      const actorRole = (req as any).user.role;
      const { id, generatedPassword } = await userService.createUser(
        req.body,
        actorRole,
      );
      res.status(201).json({ id, generatedPassword });
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
      const actorRole = (req as any).user.role;
      await userService.updateUser(String(req.params.id), req.body, actorRole);
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
      const actorRole = (req as any).user.role;
      await userService.deleteUser(String(req.params.id), actorRole);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
