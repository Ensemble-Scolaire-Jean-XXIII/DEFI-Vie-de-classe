import { api } from "./api";
import { GlobalMedal, CreateGlobalMedalPayload } from "../types/models";

const toFormData = (data: Record<string, any>) => {
  const fd = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      fd.append(key, value);
    }
  });
  return fd;
};

export const globalMedalService = {
  getAll: (): Promise<GlobalMedal[]> => api.get("/global-medals"),
  create: (data: CreateGlobalMedalPayload): Promise<{ id: number }> =>
    api.post(
      "/global-medals",
      toFormData(data as unknown as Record<string, any>),
    ),
  update: (id: string | number, data: Partial<GlobalMedal>): Promise<void> =>
    api.put(
      `/global-medals/${id}`,
      toFormData(data as unknown as Record<string, any>),
    ),
  delete: (id: string | number): Promise<void> =>
    api.delete(`/global-medals/${id}`),
};
