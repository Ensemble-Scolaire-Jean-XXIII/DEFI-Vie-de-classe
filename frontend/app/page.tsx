"use client";

import { useEffect, useState, Suspense } from "react";
import { classService } from "./services/classService";
import { ClassEntity, Column } from "./types/models";
import PageHeader from "./components/PageHeader";
import ScrollableTableCard from "./components/ScrollableTableCard";
import DataTable from "./components/DataTable";
import { useTheme } from "./contexts/ThemeContext";
import { assetUrl } from "./lib/assetUrl";
import { parseJwt } from "./lib/auth";

const noop = () => {};
const LOCK_IMG = "/medalLock.webp";

function SkeletonRows({
  rows,
  className = "",
}: {
  rows: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-9 rounded-lg bg-white/5 animate-pulse shrink-0"
        />
      ))}
    </div>
  );
}

function HomeContent() {
  const { t } = useTheme();
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | "">("");
  const [classDetails, setClassDetails] = useState<any>(null);
  const [globalStats, setGlobalStats] = useState({
    totalPoints: 0,
    totalItems: 0,
    totalLevels: 0,
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [teacherPoints, setTeacherPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTeacher, setLoadingTeacher] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const decoded = token ? parseJwt(token) : null;
    const role = decoded?.role || null;
    const admin = role === "admin" || role === "superadmin";
    setIsAdmin(admin);

    if (admin) {
      setLoadingTeacher(true);
      classService
        .getPointsByTeacherAndClass()
        .then((res) => setTeacherPoints(res.rows || []))
        .catch((err) => console.error(err))
        .finally(() => setLoadingTeacher(false));
    }
  }, []);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const leaderboard: ClassEntity[] = await classService.getLeaderboard();
        setClasses(leaderboard);

        let pSum = 0;
        let iSum = 0;
        let lSum = 0;
        leaderboard.forEach((c: any) => {
          pSum += c.total_points || 0;
          iSum += c.completed_items || 0;
          lSum += c.completed_levels || 0;
        });
        setGlobalStats({
          totalPoints: pSum,
          totalItems: iSum,
          totalLevels: lSum,
        });

        if (leaderboard.length > 0 && selectedClassId === "") {
          setSelectedClassId(leaderboard[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    const fetchClassDetails = async () => {
      try {
        const details = await classService.getById(selectedClassId);
        setClassDetails(details);
      } catch (err) {
        console.error(err);
      }
    };
    fetchClassDetails();
  }, [selectedClassId]);

  const bestClass =
    classes.length > 0
      ? [...classes].sort(
          (a, b) => (b.total_points || 0) - (a.total_points || 0),
        )[0]
      : null;

  const filteredTeacherPoints =
    selectedClassId !== ""
      ? teacherPoints.filter((r) => r.class_id === selectedClassId)
      : [];

  const itemColumns: Column<any>[] = [
    {
      field: "item_name",
      label: "Item",
      render: (item) => (
        <span className="block truncate font-medium text-(--text-main)">
          {item.item_name}
        </span>
      ),
    },
    {
      field: "status",
      label: "Statut",
      render: () => (
        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          Validé
        </span>
      ),
    },
  ];

  const levelColumns: Column<any>[] = [
    {
      field: "medal",
      label: "Médaille",
      render: (level) =>
        level.validated ? (
          level.medal ? (
            <img
              src={assetUrl(level.medal)}
              alt={level.name}
              className="w-10 h-10 object-contain"
            />
          ) : (
            <span className="w-10 h-10 rounded-lg bg-(--accent)/20 flex items-center justify-center text-lg">
              🏆
            </span>
          )
        ) : (
          <img
            src={LOCK_IMG}
            alt="Verrouillé"
            className="w-10 h-10 object-contain opacity-40 grayscale"
          />
        ),
    },
    {
      field: "name",
      label: "Niveau",
      render: (item) => (
        <span className="block truncate font-medium text-(--text-main)">
          {item.name}
        </span>
      ),
    },
    {
      field: "status",
      label: "Statut",
      render: (item) =>
        item.validated ? (
          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Débloqué
          </span>
        ) : (
          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-md bg-white/5 text-(--text-muted) border border-(--border-color)">
            Verrouillé
          </span>
        ),
    },
  ];

  const medalColumns: Column<any>[] = [
    {
      field: "image",
      label: "Médaille",
      render: (medal) =>
        medal.image ? (
          <img
            src={assetUrl(medal.image)}
            alt={medal.name}
            className="w-10 h-10 object-contain"
          />
        ) : (
          <span className="w-10 h-10 rounded-lg bg-(--accent)/20 flex items-center justify-center text-lg">
            🏅
          </span>
        ),
    },
    {
      field: "name",
      label: "Médaille",
      render: (medal) => (
        <span className="block truncate font-medium text-(--text-main)">
          {medal.name}
        </span>
      ),
    },
    {
      field: "points_required",
      label: "Points requis",
      render: (medal) =>
        medal.is_level_medal ? (
          <span className="text-xs text-(--text-muted)">N/A</span>
        ) : (
          <span className="block truncate">{medal.points_required} pts</span>
        ),
    },
  ];

  const teacherColumns: Column<any>[] = [
    {
      field: "teacher",
      label: "Professeur",
      render: (r) => (
        <span className="block truncate text-(--text-main)">
          {r.teacher_first_name} {r.teacher_last_name}
          <span className="ml-2 text-[10px] uppercase tracking-wide text-(--text-muted)">
            {r.teacher_role === "admin" ? "Admin" : "Professeur"}
          </span>
        </span>
      ),
    },
    {
      field: "total_points",
      label: "Points",
      render: (r) => (
        <span className="font-semibold text-(--accent)">
          {r.total_points} pts
        </span>
      ),
    },
  ];

  const detailCell =
    "flex flex-col flex-1 min-h-0 overflow-hidden";

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <PageHeader
        title="Défi Vie de Classe"
        description="Tableau de bord général et suivi des classes"
      />

      <div className="flex flex-1 min-h-0 gap-4">
        {/* === Colonne gauche (15%) : stats totales + meilleure classe === */}
        <div className="flex flex-col gap-4 w-[15%] min-w-0 shrink-0">
          <div className={`${t.card} flex flex-col gap-4`}>
            <h3 className="text-lg font-bold text-(--text-main)">
              Statistiques totales
            </h3>
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-white/5 rounded-xl border border-(--border-color) flex flex-col items-center text-center gap-1">
                <span className="block text-2xl font-black text-(--accent)">
                  {loading ? (
                    <span className="inline-block w-14 h-7 bg-white/10 animate-pulse rounded" />
                  ) : (
                    globalStats.totalPoints
                  )}
                </span>
                <span className="text-xs text-(--text-muted)">
                  Points remportés
                </span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-(--border-color) flex flex-col items-center text-center gap-1">
                <span className="block text-2xl font-black text-(--text-main)">
                  {loading ? (
                    <span className="inline-block w-14 h-7 bg-white/10 animate-pulse rounded" />
                  ) : (
                    globalStats.totalItems
                  )}
                </span>
                <span className="text-xs text-(--text-muted)">Items validés</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-(--border-color) flex flex-col items-center text-center gap-1">
                <span className="block text-2xl font-black text-(--text-main)">
                  {loading ? (
                    <span className="inline-block w-14 h-7 bg-white/10 animate-pulse rounded" />
                  ) : (
                    globalStats.totalLevels
                  )}
                </span>
                <span className="text-xs text-(--text-muted)">
                  Niveaux validés
                </span>
              </div>
            </div>
          </div>

          <div className={`${t.card} flex flex-1 flex-col`}>
            <h3 className="text-lg font-bold mb-4 text-(--text-main)">
              Meilleure classe
            </h3>
            {loading ? (
              <div className="flex flex-col gap-1.5 p-4 bg-(--accent)/10 border border-(--accent)/30 rounded-xl">
                <div className="animate-pulse bg-white/10 rounded h-6 w-2/3" />
                <div className="animate-pulse bg-white/10 rounded h-4 w-1/2" />
              </div>
            ) : bestClass ? (
              <div className="flex flex-col gap-1.5 p-4 bg-(--accent)/10 border border-(--accent)/30 rounded-xl">
                <span className="text-xl font-black text-(--text-main)">
                  {bestClass.name}
                </span>
                <p className="text-xs text-(--text-muted)">
                  {bestClass.total_points || 0} points gagnés !
                </p>
              </div>
            ) : (
              <p className={`text-sm ${t.textMuted}`}>
                Aucune classe classée pour le moment.
              </p>
            )}
          </div>
        </div>

        {/* === Colonne droite (75%) : Récapitulatif par classe === */}
        <div className={`${t.card} flex flex-col flex-1 min-h-0 overflow-y-auto space-y-4`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
            <h3 className="text-lg font-bold text-(--text-main)">
              Récapitulatif par classe
            </h3>
            <div className="w-full sm:w-72">
              <select
                className={t.input}
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
              >
                {classes.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    className="bg-slate-900 text-white"
                  >
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {classDetails && !classDetails.trimestreId && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center shrink-0">
              <p className="text-sm text-amber-400 font-medium">
                Aucun trimestre actif. Créez et activez un trimestre pour
                commencer à attribuer des points.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 text-center shrink-0">
            <div className="p-3 bg-white/5 rounded-xl border border-(--border-color)">
              <span className="block text-xl font-bold text-(--accent)">
                {classDetails?.total_points || 0}
              </span>
              <span className="text-xs text-(--text-muted)">
                Points remportés
              </span>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-(--border-color)">
              <span className="block text-xl font-bold text-(--text-main)">
                {classDetails?.completed_items?.length || 0}
              </span>
              <span className="text-xs text-(--text-muted)">Items validés</span>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-(--border-color)">
              <span className="block text-xl font-bold text-(--text-main)">
                {classDetails?.completed_levels?.length || 0}
              </span>
              <span className="text-xs text-(--text-muted)">
                Niveaux validés
              </span>
            </div>
          </div>

          <div
            className={`grid gap-4 flex-1 min-h-0 ${isAdmin ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
          >
            <div className={detailCell}>
              <h4 className="text-sm font-semibold text-(--text-muted) mb-2 shrink-0">
                Items validés
              </h4>
              <div className="flex flex-col flex-1 min-h-0">
                {loading || !classDetails ? (
                  <SkeletonRows rows={6} className="flex-1 overflow-hidden" />
                ) : (
                  <ScrollableTableCard>
                    <DataTable
                      data={classDetails.completed_items || []}
                      columns={itemColumns}
                      keyExtractor={(item) => item.id}
                      editingId={null}
                      editForm={{}}
                      setEditForm={noop as any}
                      onEdit={noop}
                      onSave={noop}
                      onCancel={noop}
                      onDelete={noop}
                      hideActions
                      emptyMessage="Aucun item validé pour le moment."
                    />
                  </ScrollableTableCard>
                )}
              </div>
            </div>

            <div className={detailCell}>
              <h4 className="text-sm font-semibold text-(--text-muted) mb-2 shrink-0">
                Niveaux
              </h4>
              <div className="flex flex-col flex-1 min-h-0">
                {loading || !classDetails ? (
                  <SkeletonRows rows={6} className="flex-1 overflow-hidden" />
                ) : (
                  <ScrollableTableCard>
                    <DataTable
                      data={classDetails.levels || []}
                      columns={levelColumns}
                      keyExtractor={(level) => level.id}
                      editingId={null}
                      editForm={{}}
                      setEditForm={noop as any}
                      onEdit={noop}
                      onSave={noop}
                      onCancel={noop}
                      onDelete={noop}
                      hideActions
                      emptyMessage="Aucun niveau défini."
                    />
                  </ScrollableTableCard>
                )}
              </div>
            </div>

            <div className={detailCell}>
              <h4 className="text-sm font-semibold text-(--text-muted) mb-2 shrink-0">
                Médailles débloquées
              </h4>
              <div className="flex flex-col flex-1 min-h-0">
                {loading || !classDetails ? (
                  <SkeletonRows rows={6} className="flex-1 overflow-hidden" />
                ) : (
                  <ScrollableTableCard>
                    <DataTable
                      data={classDetails.medals || []}
                      columns={medalColumns}
                      keyExtractor={(medal) => medal.id}
                      editingId={null}
                      editForm={{}}
                      setEditForm={noop as any}
                      onEdit={noop}
                      onSave={noop}
                      onCancel={noop}
                      onDelete={noop}
                      hideActions
                      emptyMessage="Aucune médaille débloquée pour le moment."
                    />
                  </ScrollableTableCard>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className={detailCell}>
                <h4 className="text-sm font-semibold text-(--text-muted) mb-2 shrink-0">
                  Points attribués par professeur
                </h4>
                <div className="flex flex-col flex-1 min-h-0">
                  {loadingTeacher ? (
                    <SkeletonRows rows={6} className="flex-1 overflow-hidden" />
                  ) : (
                    <ScrollableTableCard>
                      <DataTable
                        data={filteredTeacherPoints}
                        columns={teacherColumns}
                        keyExtractor={(r) => `${r.class_id}-${r.teacher_id}`}
                        editingId={null}
                        editForm={{}}
                        setEditForm={noop as any}
                        onEdit={noop}
                        onSave={noop}
                        onCancel={noop}
                        onDelete={noop}
                        hideActions
                        emptyMessage="Aucun point attribué pour cette classe."
                      />
                    </ScrollableTableCard>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
