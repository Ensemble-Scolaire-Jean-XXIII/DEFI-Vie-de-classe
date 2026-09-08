export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: "superadmin" | "admin" | "professeur";
  created_at?: string;
  classes?: {
    id: number;
    name: string;
    is_principal: boolean;
  }[];
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
  pp_first_name?: string;
  pp_last_name?: string;
  total_points?: number;
  completed_items?: number;
  completed_levels?: number;
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
  global_medal_id?: number | null;
}

export interface Item {
  id: number;
  level_id: number;
  name: string;
  points_required: number;
  image?: string | null;
  level_name?: string;
}

export interface GlobalMedal {
  id: number;
  name: string;
  points_required: number;
  image?: string | null;
  assigned_levels?: number;
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  role: "superadmin" | "admin" | "professeur";
}

export interface CreateUserResult {
  id: string;
  generatedPassword: string;
}

export interface CreateClassPayload {
  name: string;
}

export interface CreateLevelPayload {
  name: string;
  global_medal_id?: number | null;
}

export interface CreateItemPayload {
  level_id: number;
  name: string;
  points_required: number;
  image?: string;
}

export interface CreateGlobalMedalPayload {
  name: string;
  points_required: number;
  image?: string;
  is_level_medal?: boolean;
}

export interface AddPointPayload {
  class_id: number;
  item_id: number;
  trimestre_id: number;
}

export interface UpdateProfilePayload {
  first_name: string;
  last_name: string;
  email: string;
  password_hash?: string;
  old_password?: string;
}

export interface CreateTrimestrePayload {
  name: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}

export interface SortHeaderProps {
  field: string;
  label: string;
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
}

export type ToastType = "success" | "error" | "undo" | "info";

export interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
  onUndo?: () => void;
}

export interface Column<T> {
  field: string;
  label: string | React.ReactNode;
  sortable?: boolean;
  className?: string;
  render: (item: T) => React.ReactNode;
  renderEdit?: (
    editForm: Partial<T>,
    updateForm: (val: Partial<T>) => void,
  ) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  editingId?: string | number | null;
  editForm: Partial<T>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<T>>>;
  onEdit: (item: T) => void;
  onSave: (id: string | number, payload: Partial<T>) => void;
  onCancel: () => void;
  onDelete: (id: string | number) => void;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (field: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  isLoading?: boolean;
  hideActions?: boolean;
  emptyMessage?: string;
  wrapColsClass?: string;
  actionsAllowed?: (item: T) => { canEdit?: boolean; canDelete?: boolean };
}

export interface CrudService<T, CreatePayload, UpdatePayload = Partial<T>> {
  getAll: () => Promise<T[]>;
  create: (data: CreatePayload) => Promise<unknown>;
  update: (
    id: string | number,
    data: UpdatePayload | Record<string, unknown>,
  ) => Promise<unknown>;
  delete: (id: string | number) => Promise<unknown>;
}

export interface UndoAction {
  message: string;
  duration: number;
  timerId: NodeJS.Timeout;
  onUndo: () => void;
}

export type ThemeName = "shadowIslands" | "glass" | "institution" | "solid";

export type ThemeContextType = {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  t: {
    wrapper: string;
    sidebar: string;
    header: string;
    main: string;
    card: string;
    tableHeader: string;
    tableRow: string;
    input: string;
    btnPrimary: string;
    btnGhost: string;
    textMuted: string;
    title: string;
    activeNav: string;
    navHover: string;
  };
};

export interface ToastContextType {
  showToast: (
    message: string,
    type: ToastType,
    duration?: number,
    onUndo?: () => void,
  ) => void;
  hideToast: () => void;
}

export interface FormCardProps {
  title: string;
  badge?: string;
  children: React.ReactNode;
}

export interface PageHeaderProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export interface PageActionsProps {
  showLogs?: boolean;
  showSettings?: boolean;
  showForm?: boolean;
  onRefresh?: () => Promise<void> | void;
  onToggleForm?: () => void;
  onToggleSettings?: (val: boolean) => void;
  onToggleLogs?: (val: boolean) => void;
  showNew?: boolean;
  isNewOpen?: boolean;
  onToggleNew?: () => void;
  newLabel?: string;
}
