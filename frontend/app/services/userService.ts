import { api, BASE_URL } from "./api";
import {
  User,
  CreateUserPayload,
  CreateUserResult,
  UpdateProfilePayload,
} from "../types/models";

export const userService = {
  connexion: async (
    email: string,
    password_hash: string,
  ): Promise<{ token: string; role: string }> => {
    const res = await fetch(`${BASE_URL}/users/connexion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password_hash }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Identifiants invalides");
    }
    return res.json();
  },
  getAll: (): Promise<User[]> => api.get("/users"),
  getMe: (): Promise<User> => api.get("/users/me"),
  create: (data: CreateUserPayload): Promise<CreateUserResult> =>
    api.post("/users", data),
  update: (id: string | number, data: Partial<User>): Promise<void> =>
    api.put(`/users/${id}`, data),
  updateMe: (data: UpdateProfilePayload): Promise<void> =>
    api.put("/users/me", data),
  delete: (id: string | number): Promise<void> => api.delete(`/users/${id}`),
};
