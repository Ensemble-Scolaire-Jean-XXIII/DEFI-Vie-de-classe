"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { userService } from "../services/userService";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { ToastProvider, useToast } from "../contexts/ToastContext";

function LoginPageContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [passwordHash, setPasswordHash] = useState("");

  const { t } = useTheme();
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const data = await userService.connexion(email, passwordHash);
      localStorage.setItem("token", data.token);
      router.push("/");
    } catch (err: unknown) {
      if (err instanceof Error) showToast(err.message, "error");
    }
  };

  return (
    <div className={t.wrapper + " items-center justify-center"}>
      <div className={`${t.card} w-full max-w-md p-8 sm:p-10 z-10 shadow-2xl`}>
        <div className="text-center mb-8">
          <Link
            href="/"
            title="Retour à l'accueil"
            className="inline-block transition-opacity hover:opacity-80"
          >
            <h1 className="text-3xl font-bold text-(--text-main) mb-1">
              Défi Vie de Classe
            </h1>
          </Link>
          <p className="text-(--text-muted) text-sm">
            Connexion à l'espace sécurisé
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input
              type="email"
              placeholder="Adresse email"
              className={t.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Mot de passe"
              className={t.input}
              value={passwordHash}
              onChange={(e) => setPasswordHash(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className={`${t.btnPrimary} w-full text-base py-3`}
          >
            Se connecter
          </button>
          <div className="text-center mt-4">
            <span className={`text-xs ${t.textMuted}`}>
              Mot de passe oublié ? Contactez le responsable IT.
            </span>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-(--border-color)">
          <Link
            href="/"
            className={`flex items-center justify-center gap-2 text-sm ${t.textMuted} transition-colors hover:text-(--text-main)`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <LoginPageContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
