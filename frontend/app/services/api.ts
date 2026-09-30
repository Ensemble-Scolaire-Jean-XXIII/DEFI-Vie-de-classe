export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const AUTH_ERRORS = ["Unauthorized", "Invalid token", "Session expirée"];

const endSession = () => {
  localStorage.removeItem("token");
  window.location.href = "/connexion";
};

const parseBody = async (res: Response): Promise<any> => {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

const handleResponse = async (res: Response): Promise<any> => {
  if (res.status === 204) return undefined;

  const body = await parseBody(res);
  const message = body?.error as string | undefined;

  if (res.status === 401) {
    if (!message || AUTH_ERRORS.includes(message)) {
      endSession();
      throw new Error("Session expirée");
    }
    throw new Error(message);
  }
  if (!res.ok) {
    throw new Error(message || "Une erreur est survenue");
  }
  return body;
};

const send = async (
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  data?: unknown,
): Promise<any> => {
  const token = localStorage.getItem("token");
  const isForm = data instanceof FormData;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      ...(data !== undefined && !isForm
        ? { "Content-Type": "application/json" }
        : {}),
      Authorization: `Bearer ${token}`,
    },
    body: data === undefined ? undefined : isForm ? data : JSON.stringify(data),
  });

  return handleResponse(res);
};

export const api = {
  get: (endpoint: string) => send(endpoint, "GET"),
  post: (endpoint: string, data: unknown) => send(endpoint, "POST", data),
  put: (endpoint: string, data: unknown) => send(endpoint, "PUT", data),
  delete: (endpoint: string) => send(endpoint, "DELETE"),
};
