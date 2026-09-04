import { api } from "./api";
import { User } from "../types/models";

export const classUserService = {
  getByClassId: (classId: number): Promise<User[]> =>
    api.get(`/classes/${classId}/users`),
  assign: (
    class_id: number,
    user_id: string,
    is_principal: boolean = false,
  ): Promise<void> =>
    api.post("/classes/users", { class_id, user_id, is_principal }),
  remove: (class_id: number, user_id: string): Promise<void> =>
    api.delete(`/classes/${class_id}/users/${user_id}`),
};
