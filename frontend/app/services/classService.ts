import { api } from "./api";
import { ClassEntity, CreateClassPayload } from "../types/models";

export const classService = {
  getAll: (): Promise<ClassEntity[]> => api.get("/classes"),
  getLeaderboard: async (trimestreId?: number): Promise<ClassEntity[]> => {
    const url = trimestreId
      ? `/classes/leaderboard?trimestre_id=${trimestreId}`
      : "/classes/leaderboard";
    return api.get(url);
  },
  getById: (id: string | number): Promise<any> => api.get(`/classes/${id}`),
  create: (data: CreateClassPayload): Promise<{ id: number }> =>
    api.post("/classes", data),
  update: (id: string | number, data: Partial<ClassEntity>): Promise<void> =>
    api.put(`/classes/${id}`, data),
  delete: (id: string | number): Promise<void> => api.delete(`/classes/${id}`),
  reset: (): Promise<{ message: string }> =>
    api.post("/classes/reset", {}),
  getTeachers: (id: string | number): Promise<any[]> =>
    api.get(`/classes/${id}/teachers`),
  getPointsByTeacherAndClass: (): Promise<{
    trimestreId: number | null;
    rows: {
      teacher_id: string;
      teacher_first_name: string;
      teacher_last_name: string;
      teacher_role: string;
      class_id: number;
      class_name: string;
      total_points: number;
    }[];
  }> => api.get("/classes/points-by-teacher"),
};
