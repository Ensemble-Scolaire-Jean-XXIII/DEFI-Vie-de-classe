import { useState } from "react";
import { useRouter } from "next/navigation";
import { userService } from "../services/userService";

export function useAuth() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (
    e: React.FormEvent,
    email: string,
    password_hash: string,
  ) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await userService.connexion(email, password_hash);
      localStorage.setItem("token", data.token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Identifiants invalides");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleLogin,
    isLoading,
    error,
    setError,
  };
}
