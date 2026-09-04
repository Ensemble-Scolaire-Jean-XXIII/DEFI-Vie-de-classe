import { api } from "./api";
import { AddPointPayload } from "../types/models";

export const pointService = {
  add: (data: AddPointPayload): Promise<{ id: string }> =>
    api.post("/points", data),
  getMine: (): Promise<any[]> => api.get("/points/mine"),
};
