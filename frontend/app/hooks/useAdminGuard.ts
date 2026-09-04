"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseJwt } from "../lib/auth";

export function useAdminGuard() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const decoded = token ? parseJwt(token) : null;
    const role = decoded?.role || null;
    if (role !== "admin" && role !== "superadmin") {
      router.replace("/");
    }
  }, [router]);
}
