import { api } from "./api";
import { Level, CreateLevelPayload } from "../types/models";

export const levelService = {
  getAll: (): Promise<Level[]> => api.get("/levels"),
  create: (data: CreateLevelPayload): Promise<{ id: number }> =>
    api.post("/levels", data),
  update: (id: string | number, data: Partial<Level>): Promise<void> =>
    api.put(`/levels/${id}`, data),
  delete: (id: string | number): Promise<void> => api.delete(`/levels/${id}`),
};