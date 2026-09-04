import { api } from "./api";
import { Item, CreateItemPayload } from "../types/models";

const toFormData = (data: Record<string, any>) => {
  const fd = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      fd.append(key, value);
    }
  });
  return fd;
};

export const itemService = {
  getAll: (): Promise<Item[]> => api.get("/items"),
  create: (data: CreateItemPayload): Promise<{ id: number }> =>
    api.post("/items", toFormData(data as unknown as Record<string, any>)),
  update: (id: string | number, data: Partial<Item>): Promise<void> =>
    api.put(`/items/${id}`, toFormData(data as unknown as Record<string, any>)),
  delete: (id: string | number): Promise<void> => api.delete(`/items/${id}`),
};
