import { BASE_URL } from "../services/api";

export const assetUrl = (path?: string | null) => {
  if (typeof path !== "string" || !path) return "";
  if (path.startsWith("http")) return path;
  const base = BASE_URL.replace(/\/api\/?$/, "");
  return `${base}${path}`;
};
