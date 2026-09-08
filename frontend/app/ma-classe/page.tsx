"use client";

import { useEffect, useState, Suspense } from "react";
import { userService } from "../services/userService";
import { classService } from "../services/classService";
import PageHeader from "../components/PageHeader";
import ScrollableTableCard from "../components/ScrollableTableCard";
import DataTable from "../components/DataTable";
import type { Column } from "../types/models";
import { useTheme } from "../contexts/ThemeContext";
import { assetUrl } from "../lib/assetUrl";
import StatusIcon from "../components/StatusIcon";

function MaClasseContent() {
  const { t } = useTheme();
  const [classId, setClassId] = useState<number | null>(null);
  const [className, setClassName] = useState("");
  const [details, setDetails] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const me = await userService.getMe();
        const ppClass =
          Array.isArray(me.classes) &&
          me.classes.find((c: any) => c.is_principal);
        if (ppClass) {
          setClassId(ppClass.id);
          setClassName(ppClass.name);

          const [clsDetails, clsTeachers] = await Promise.all([
            classService.getById(ppClass.id),
            classService.getTeachers(ppClass.id),
          ]);
          setDetails(clsDetails);
          setTeachers(clsTeachers);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadMe();
  }, []);

  const noop = () => {};

  const LOCK_IMG = "/medalLock.webp";

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
      className: "w-16 text-center",
      render: (item) =>
        item.validated ? (
          <span className="inline-flex items-center justify-center text-emerald-400">
            <StatusIcon src="/icons/approved.webp" />
          </span>
        ) : (
          <span className="inline-flex items-center justify-center text-(--text-muted)">
            <StatusIcon src="/icons/cancel.webp" />
          </span>
        ),
    },
  ];

  const levelColumns: Column<any>[] = [
    {
      field: "medal",
      label: "Médaille",
      className: "w-20",
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
      className: "w-16 text-center",
      render: (item) =>
        item.validated ? (
          <span className="inline-flex items-center justify-center text-emerald-400">
            <StatusIcon src="/icons/approved.webp" />
          </span>
        ) : (
          <span className="inline-flex items-center justify-center text-(--text-muted)">
            <StatusIcon src="/icons/cancel.webp" />
          </span>
        ),
    },
  ];

  const medalColumns: Column<any>[] = [
    {
      field: "image",
      label: "Médaille",
      className: "w-16",
      render: (medal) =>
        medal.unlocked ? (
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
      className: "w-28",
      render: (medal) =>
        medal.is_level_medal ? (
          <span className="text-xs text-(--text-muted)">N/A</span>
        ) : (
          <span className="block truncate">{medal.points_required} pts</span>
        ),
    },
    {
      field: "status",
      label: "Statut",
      className: "w-16 text-center",
      render: (medal) =>
        medal.unlocked ? (
          <span className="inline-flex items-center justify-center text-emerald-400">
            <StatusIcon src="/icons/approved.webp" />
          </span>
        ) : (
          <span className="inline-flex items-center justify-center text-(--text-muted)">
            <StatusIcon src="/icons/cancel.webp" />
          </span>
        ),
    },
  ];

  const teachersColumns: Column<any>[] = [
    {
      field: "name",
      label: "Professeur",
      render: (item) => (
        <span className="font-medium">
          {item.first_name} {item.last_name}
        </span>
      ),
    },
    {
      field: "email",
      label: "Email",
      render: (item) => (
        <span className="text-(--text-muted)">{item.email}</span>
      ),
    },
    {
      field: "points",
      label: "Points attribués",
      render: (item) => (
        <span className="text-right font-bold text-(--accent)">
          {item.total_points_attributed} pts
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col flex-1 gap-4">
        <PageHeader title="Ma classe" description="Chargement des données..." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`${t.card} p-4 flex flex-col gap-2`}>
            <div className="animate-pulse bg-white/10 rounded h-8 w-16" />
            <div className="animate-pulse bg-white/5 rounded h-3 w-28" />
          </div>
          <div className={`${t.card} p-4 flex flex-col gap-2`}>
            <div className="animate-pulse bg-white/10 rounded h-8 w-16" />
            <div className="animate-pulse bg-white/5 rounded h-3 w-28" />
          </div>
          <div className={`${t.card} p-4 flex flex-col gap-2`}>
            <div className="animate-pulse bg-white/10 rounded h-8 w-16" />
            <div className="animate-pulse bg-white/5 rounded h-3 w-28" />
          </div>
        </div>
        <div className={`${t.card} space-y-6 min-h-40`}>
          <div className="animate-pulse bg-white/10 rounded h-5 w-48" />
          <div className="flex gap-3 flex-wrap">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 min-w-40 p-3 bg-white/5 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!classId) {
    return (
      <div className="flex flex-col flex-1 gap-4">
        <PageHeader title="Ma classe" description="Aucune classe associée" />
        <div className={`${t.card} p-6`}>
          <p className={`text-sm ${t.textMuted}`}>
            Aucune classe ne vous est associée en tant que professeur principal.
            Contactez un administrateur pour vous assigner une classe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <PageHeader
        title={`Ma classe : ${className}`}
        description="Suivi de la progression et des points attribués"
      />

      {details && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <div className={`${t.card} p-4 text-center`}>
              <span className="block text-2xl font-black text-(--accent)">
                {details.total_points || 0}
              </span>
              <span className={`text-xs ${t.textMuted}`}>Points remportés</span>
            </div>
            <div className={`${t.card} p-4 text-center`}>
              <span className="block text-2xl font-black text-white">
                {details.completed_items?.length || 0}
              </span>
              <span className={`text-xs ${t.textMuted}`}>Items validés</span>
            </div>
            <div className={`${t.card} p-4 text-center`}>
              <span className="block text-2xl font-black text-white">
                {details.completed_levels?.length || 0}
              </span>
              <span className={`text-xs ${t.textMuted}`}>Niveaux validés</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-2 sm:auto-rows-fr sm:flex-1 sm:min-h-0 gap-4 desktop:grid-cols-3!">
            <div className="flex flex-col h-75 sm:h-auto! overflow-hidden">
              <h4 className="text-sm font-semibold text-(--text-muted) mb-2 shrink-0">
                Items (validés / bloqueés)
              </h4>
              <div className="flex flex-col flex-1 min-h-0">
                <ScrollableTableCard>
                  <DataTable
                    data={details.items || []}
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
                    emptyMessage="Aucun item défini."
                    wrapColsClass="grid-cols-1"
                  />
                </ScrollableTableCard>
              </div>
            </div>

            <div className="flex flex-col h-75 sm:h-auto! overflow-hidden">
              <h4 className="text-sm font-semibold text-(--text-muted) mb-2 shrink-0">
                Niveaux (validés / bloqués)
              </h4>
              <div className="flex flex-col flex-1 min-h-0">
                <ScrollableTableCard>
                  <DataTable
                    data={details.levels || []}
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
                    wrapColsClass="grid-cols-1"
                  />
                </ScrollableTableCard>
              </div>
            </div>

            <div className="flex flex-col h-75 sm:h-auto! overflow-hidden">
              <h4 className="text-sm font-semibold text-(--text-muted) mb-2 shrink-0">
                Médailles (débloquées / bloquées)
              </h4>
              <div className="flex flex-col flex-1 min-h-0">
                <ScrollableTableCard>
                  <DataTable
                    data={details.all_medals || []}
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
                    emptyMessage="Aucune médaille définie."
                    wrapColsClass="grid-cols-1"
                  />
                </ScrollableTableCard>
              </div>
            </div>

            <div className="flex flex-col h-75 sm:h-auto! overflow-hidden">
              <h4 className="text-sm font-semibold text-(--text-muted) mb-2 shrink-0">
                Professeur(s) et points attribués
              </h4>
              <div className="flex flex-col flex-1 min-h-0">
                <ScrollableTableCard>
                  <DataTable
                    data={teachers}
                    columns={teachersColumns}
                    keyExtractor={(item) => item.id}
                    editingId={null}
                    editForm={{}}
                    setEditForm={noop as any}
                    onEdit={noop}
                    onSave={noop}
                    onCancel={noop}
                    onDelete={noop}
                    hideActions
                    emptyMessage="Aucun professeur assigné à cette classe."
                    wrapColsClass="grid-cols-1"
                  />
                </ScrollableTableCard>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function MaClassePage() {
  return (
    <Suspense>
      <MaClasseContent />
    </Suspense>
  );
}
