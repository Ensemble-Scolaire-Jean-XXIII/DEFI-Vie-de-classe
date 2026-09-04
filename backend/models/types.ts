export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: "superadmin" | "admin" | "professeur";
  created_at?: string;
}

export interface Trimestre {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface ClassEntity {
  id: number;
  name: string;
}

export interface ClassUser {
  class_id: number;
  user_id: string;
  is_principal: boolean;
}

export interface Level {
  id: number;
  name: string;
  medal_image?: string | null;
}

export interface Item {
  id: number;
  level_id: number;
  name: string;
  points_required: number;
  image?: string | null;
}

export interface GlobalMedal {
  id: number;
  name: string;
  points_required: number;
  image?: string | null;
  is_level_medal?: boolean;
}

export interface PointsLog {
  id: string;
  class_id: number;
  item_id: number;
  user_id: string;
  trimestre_id: number;
  points_awarded: number;
  created_at?: string;
}

export interface ClassArchive {
  id: number;
  class_id: number;
  trimestre_id: number;
  total_points: number;
  levels_validated: any;
  global_medal_id?: number | null;
  archived_at?: string;
}
