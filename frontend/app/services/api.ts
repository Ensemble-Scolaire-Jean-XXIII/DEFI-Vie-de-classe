export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export const api = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/connexion";
      throw new Error("Session expirée");
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Une erreur est survenue");
    }
    return res.json();
  },

  post: async (endpoint: string, data: unknown) => {
    const token = localStorage.getItem("token");
    const isForm = data instanceof FormData;
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${token}`,
      },
      body: isForm ? data : JSON.stringify(data),
    });
    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/connexion";
      throw new Error("Session expirée");
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Une erreur est survenue");
    }
    return res.json();
  },

  put: async (endpoint: string, data: unknown) => {
    const token = localStorage.getItem("token");
    const isForm = data instanceof FormData;
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${token}`,
      },
      body: isForm ? data : JSON.stringify(data),
    });
    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/connexion";
      throw new Error("Session expirée");
    }
    if (res.status === 204) return;
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Une erreur est survenue");
    }
    return res.json();
  },

  delete: async (endpoint: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/connexion";
      throw new Error("Session expirée");
    }
    if (res.status === 204) return;
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Une erreur est survenue");
    }
    return res.json();
  },
};
