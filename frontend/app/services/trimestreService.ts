import { api } from "./api";
import { Trimestre, CreateTrimestrePayload } from "../types/models";

export const trimestreService = {
  getAll: (): Promise<Trimestre[]> => api.get("/trimestres"),
  create: (data: CreateTrimestrePayload): Promise<{ id: number }> =>
    api.post("/trimestres", data),
  update: (id: string | number, data: Partial<Trimestre>): Promise<void> =>
    api.put(`/trimestres/${id}`, data),
  delete: (id: string | number): Promise<void> =>
    api.delete(`/trimestres/${id}`),
};
