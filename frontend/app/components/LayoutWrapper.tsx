"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
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
  onNavigate,
}: {
  href: string;
  iconSrc: string;
  iconAlt: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  const { t } = useTheme();

  return (
    <Link
      href={href}
      title={String(children)}
      onClick={onNavigate}
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

function AdminDropdown({
  isOpen,
  onToggle,
  dropdownRef,
}: {
  isOpen: boolean;
  onToggle: () => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}) {
  const pathname = usePathname();
  const { t } = useTheme();

  const adminLinks = [
    {
      href: "/classes-trimestres",
      iconSrc: "/icons/formations.webp",
      iconAlt: "Classes & Trimestres",
      label: "Classes & Trimestres",
    },
    {
      href: "/niveaux-items",
      iconSrc: "/icons/levels.webp",
      iconAlt: "Niveaux & Items",
      label: "Niveaux & Items",
    },
    {
      href: "/medailles",
      iconSrc: "/icons/medal.webp",
      iconAlt: "Médailles",
      label: "Médailles",
    },
    {
      href: "/utilisateurs",
      iconSrc: "/icons/users.webp",
      iconAlt: "Utilisateurs",
      label: "Utilisateurs",
    },
  ];

  const isAnyActive = adminLinks.some((link) => pathname === link.href);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`relative px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 font-medium whitespace-nowrap cursor-pointer ${
          isAnyActive ? t.activeNav : t.navHover
        }`}
      >
        <span className="w-5 h-5 relative flex items-center justify-center">
          <Image
            src="/icons/formations.webp"
            alt="Administration"
            width={16}
            height={16}
            className={`object-contain brightness-0 invert transition-all ${
              isAnyActive ? "opacity-100" : "opacity-70"
            }`}
            unoptimized
          />
        </span>
        <span className="text-sm">Administration</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 min-w-55 bg-(--bg-header) backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl py-2 z-50"
          role="menu"
        >
          {adminLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => onToggle()}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="w-5 h-5 relative flex items-center justify-center shrink-0">
                  <Image
                    src={link.iconSrc}
                    alt={link.iconAlt}
                    width={16}
                    height={16}
                    className={`object-contain brightness-0 invert transition-all ${
                      isActive ? "opacity-100" : "opacity-70"
                    }`}
                    unoptimized
                  />
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
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
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const adminDropdownRef = useRef<HTMLDivElement>(null);

  const { t } = useTheme();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        adminDropdownRef.current &&
        !adminDropdownRef.current.contains(e.target as Node)
      ) {
        setIsAdminDropdownOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsAdminDropdownOpen(false);
    }
    if (isAdminDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isAdminDropdownOpen]);

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

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const mql = window.matchMedia("(min-width: 1600px)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setIsMobileMenuOpen(false);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [isMobileMenuOpen]);

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
      <header className={`${t.header} relative z-50`}>
        <Link
          href="/"
          title="Retour à l'accueil"
          className="flex items-center gap-3 shrink-0 transition-opacity hover:opacity-90"
        >
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
            <span className="xl:hidden font-black text-lg tracking-wider text-white">
              JEAN 23
            </span>
            <span className="hidden xl:inline font-black text-lg tracking-wider text-white">
              ENSEMBLE SCOLAIRE JEAN 23
            </span>
            <span className="hidden min-[555px]:block bg-[#e84e1b]/20 text-[#e84e1b] text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-[#e84e1b]/30 uppercase tracking-widest">
              DÉFI - Vie de classe
            </span>
          </div>
        </Link>

        <nav className="hidden desktop:flex items-center gap-2 mx-auto">
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
            <AdminDropdown
              isOpen={isAdminDropdownOpen}
              onToggle={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
              dropdownRef={adminDropdownRef}
            />
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="desktop:hidden p-2 text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
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

      <div
        className={`desktop:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div
          className={`absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-(--bg-header) border-r border-white/10 p-6 flex flex-col gap-6 transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center">
            <span className="font-bold text-white uppercase tracking-widest text-sm">
              Menu
            </span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-white bg-white/10 rounded-full transition-colors cursor-pointer hover:bg-white/20"
              aria-label="Fermer le menu"
            >
              <svg
                className="w-5 h-5"
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
          <nav className="flex flex-col gap-4 overflow-y-auto">
            <NavLink
              href="/"
              iconSrc="/icons/leaderboard.webp"
              iconAlt="leaderboard"
              onNavigate={() => setIsMobileMenuOpen(false)}
            >
              Progression par classe
            </NavLink>
            {isProf && (
              <NavLink
                href="/ajout-points"
                iconSrc="/icons/submitAlt.webp"
                iconAlt="Attribuer"
                onNavigate={() => setIsMobileMenuOpen(false)}
              >
                Attribuer des points
              </NavLink>
            )}
            {isPrincipal && (
              <NavLink
                href="/ma-classe"
                iconSrc="/icons/dashboard.webp"
                iconAlt="Ma classe"
                onNavigate={() => setIsMobileMenuOpen(false)}
              >
                Ma classe
              </NavLink>
            )}
            {isAdmin && (
              <>
                <span className="text-xs font-bold uppercase tracking-widest text-white/40 mt-2 px-4">
                  Administration
                </span>
                <NavLink
                  href="/classes-trimestres"
                  iconSrc="/icons/formations.webp"
                  iconAlt="Classes & Trimestres"
                  onNavigate={() => setIsMobileMenuOpen(false)}
                >
                  Classes & Trimestres
                </NavLink>
                <NavLink
                  href="/niveaux-items"
                  iconSrc="/icons/levels.webp"
                  iconAlt="Niveaux & Items"
                  onNavigate={() => setIsMobileMenuOpen(false)}
                >
                  Niveaux & Items
                </NavLink>
                <NavLink
                  href="/medailles"
                  iconSrc="/icons/medal.webp"
                  iconAlt="Médailles"
                  onNavigate={() => setIsMobileMenuOpen(false)}
                >
                  Médailles
                </NavLink>
                <NavLink
                  href="/utilisateurs"
                  iconSrc="/icons/users.webp"
                  iconAlt="Users"
                  onNavigate={() => setIsMobileMenuOpen(false)}
                >
                  Utilisateurs
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </div>

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
