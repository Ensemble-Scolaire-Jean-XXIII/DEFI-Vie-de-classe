"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { parseJwt } from "../lib/auth";
import Image from "next/image";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { ToastProvider } from "../contexts/ToastContext";
import { userService } from "../services/userService";

function NavLink({
  href,
  iconSrc,
  iconAlt,
  children,
}: {
  href: string;
  iconSrc: string;
  iconAlt: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  const { t } = useTheme();

  return (
    <Link
      href={href}
      title={String(children)}
      className={`relative px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 font-medium whitespace-nowrap ${
        isActive ? t.activeNav : t.navHover
      }`}
    >
      <span className="w-5 h-5 relative flex items-center justify-center">
        <Image
          src={iconSrc}
          alt={iconAlt}
          width={16}
          height={16}
          className={`object-contain brightness-0 invert transition-all ${
            isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"
          }`}
          unoptimized
        />
      </span>
      <span className="text-sm">{children}</span>
    </Link>
  );
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/connexion";

  const [role, setRole] = useState<string | null>(null);
  const [isPrincipal, setIsPrincipal] = useState(false);
  const [isLoading, setIsLoading] = useState(!isLoginPage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { t } = useTheme();

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    setRole(null);
    setIsPrincipal(false);
    router.push("/");
  }, [router]);

  useEffect(() => {
    if (isLoginPage) {
      setTimeout(() => setIsLoading(false), 0);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setRole(null);
      setIsPrincipal(false);
      setIsLoading(false);
      return;
    }

    const decoded = parseJwt(token);
    if (!decoded) {
      handleLogout();
    } else {
      setRole(decoded.role);
      if (decoded.role === "professeur") {
        userService
          .getMe()
          .then((me) => {
            const hasPrincipalClass =
              Array.isArray(me.classes) &&
              me.classes.some((c: any) => c.is_principal);
            setIsPrincipal(hasPrincipalClass);
          })
          .catch(() => setIsPrincipal(false))
          .finally(() => setIsLoading(false));
      } else {
        setTimeout(() => setIsLoading(false), 0);
      }
    }
  }, [isLoginPage, handleLogout]);

  if (isLoginPage) return <>{children}</>;

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-(--bg-card) backdrop-blur-xl font-medium text-(--text-main)">
        Chargement...
      </div>
    );

  const isGuest = !role;
  const isAdmin = role === "admin" || role === "superadmin";
  const isAdminOrPP = isAdmin || isPrincipal;
  const isProf = isAdminOrPP || role === "professeur";

  return (
    <div className={t.wrapper}>
      <header className={t.header}>
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-9 w-auto relative flex items-center shrink-0">
            <Image
              src="/defiVDC.webp"
              alt="Logo"
              width={36}
              height={36}
              className="h-full w-auto object-contain rounded-lg"
              priority
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black text-lg tracking-wider text-white hidden xl:block">
              ENSEMBLE SCOLAIRE JEAN XXIII
            </span>
            <span className="bg-[#e84e1b]/20 text-[#e84e1b] text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-[#e84e1b]/30 uppercase tracking-widest">
              DÉFI - Vie de classe
            </span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-2">
          <NavLink
            href="/"
            iconSrc="/icons/leaderboard.webp"
            iconAlt="Leaderboard"
          >
            Progression par classe
          </NavLink>

          {isProf && (
            <NavLink
              href="/ajout-points"
              iconSrc="/icons/submitAlt.webp"
              iconAlt="Attribuer"
            >
              Attribuer des points
            </NavLink>
          )}

          {isPrincipal && (
            <NavLink
              href="/ma-classe"
              iconSrc="/icons/dashboard.webp"
              iconAlt="Ma classe"
            >
              Ma classe
            </NavLink>
          )}

          {isAdmin && (
            <>
              <NavLink
                href="/classes-trimestres"
                iconSrc="/icons/formations.webp"
                iconAlt="Classes & Trimestres"
              >
                Classes & Trimestres
              </NavLink>
              <NavLink
                href="/niveaux-items"
                iconSrc="/icons/levels.webp"
                iconAlt="Niveaux & Items"
              >
                Niveaux & Items
              </NavLink>
              <NavLink
                href="/medailles"
                iconSrc="/icons/medal.webp"
                iconAlt="Médailles"
              >
                Médailles
              </NavLink>
            </>
          )}

          {isAdmin && (
            <NavLink
              href="/utilisateurs"
              iconSrc="/icons/users.webp"
              iconAlt="Users"
            >
              Utilisateurs
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {!isGuest && (
            <Link
              href="/profil"
              className={`${t.btnGhost} p-2! rounded-full`}
              title="Mon profil"
            >
              <Image
                src="/icons/profile.webp"
                alt="Profile"
                width={16}
                height={16}
                className="object-contain brightness-0 invert"
                unoptimized
              />
            </Link>
          )}

          <button
            onClick={isGuest ? () => router.push("/connexion") : handleLogout}
            className={`${t.btnGhost} text-xs flex items-center gap-2`}
          >
            <Image
              src="/icons/logout.webp"
              alt="Connexion/Déconnexion"
              width={16}
              height={16}
              className="object-contain brightness-0 invert shrink-0"
              unoptimized
            />
            <span className="hidden sm:inline-block">
              {isGuest ? "Connexion" : "Déconnexion"}
            </span>
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-6 gap-6">
          <div className="flex justify-end">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-white bg-white/10 rounded-full"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col gap-4">
            <NavLink
              href="/"
              iconSrc="/icons/leaderboard.webp"
              iconAlt="leaderboard"
            >
              Progression par classe
            </NavLink>
            {isProf && (
              <NavLink
                href="/ajout-points"
                iconSrc="/icons/submitAlt.webp"
                iconAlt="Attribuer"
              >
                Attribuer des points
              </NavLink>
            )}
            {isPrincipal && (
              <NavLink
                href="/ma-classe"
                iconSrc="/icons/dashboard.webp"
                iconAlt="Ma classe"
              >
                Ma classe
              </NavLink>
            )}
            {isAdmin && (
              <>
                <NavLink
                  href="/classes-trimestres"
                  iconSrc="/icons/formations.webp"
                  iconAlt="Classes & Trimestres"
                >
                  Classes & Trimestres
                </NavLink>
                <NavLink
                  href="/niveaux-items"
                  iconSrc="/icons/levels.webp"
                  iconAlt="Niveaux & Items"
                >
                  Niveaux & Items
                </NavLink>
                <NavLink
                  href="/medailles"
                  iconSrc="/icons/medal.webp"
                  iconAlt="Médailles"
                >
                  Médailles
                </NavLink>
              </>
            )}
            {isAdmin && (
              <NavLink
                href="/utilisateurs"
                iconSrc="/icons/users.webp"
                iconAlt="Users"
              >
                Utilisateurs
              </NavLink>
            )}
          </nav>
        </div>
      )}

      <main className={`${t.main} custom-scrollbar`}>{children}</main>
    </div>
  );
}

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <LayoutInner>{children}</LayoutInner>
      </ToastProvider>
    </ThemeProvider>
  );
}
