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
import { levelMedalPlaceholder } from "../lib/levelMedalLock";
import Skeleton from "../components/Skeleton";

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
            Aucune classe ne vous est associée en tant que professeur
            principal. Contactez un administrateur pour vous assigner une
            classe.
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

          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto gap-4 custom-scrollbar">
            <div className={`${t.card} space-y-6`}>
              <h3 className="text-lg font-bold text-(--text-main)">
                Progression de la classe
              </h3>

            <div>
              <h4 className="text-sm font-semibold text-(--text-muted) mb-2">
                Items validés / en cours
              </h4>
              {details.completed_items &&
              details.completed_items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {details.completed_items.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white/5 border text-(--text-main) rounded-xl flex justify-between items-center text-sm"
                    >
                      <span>{item.item_name}</span>
                      <span className="text-xs text-emerald-400 font-medium">
                        Validé
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${t.textMuted}`}>
                  Aucun item validé pour le moment dans cette classe.
                </p>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-(--text-muted) mb-2">
                Niveaux validés (médailles)
              </h4>
              {details.completed_levels &&
              details.completed_levels.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {details.completed_levels.map((level: any) => (
                    <div
                      key={level.id}
                      className="flex items-center gap-2 p-3 bg-white/5 border text-(--text-main) rounded-xl text-sm"
                    >
                      {level.medal ? (
                        <img
                          src={assetUrl(level.medal)}
                          alt={level.name}
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <span className="w-10 h-10 rounded-lg bg-(--accent)/20 flex items-center justify-center text-lg">
                          🏆
                        </span>
                      )}
                      <span className="font-medium">{level.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${t.textMuted}`}>
                  Aucun niveau validé pour le moment dans cette classe.
                </p>
              )}
            </div>

            {(details.levels || []).filter(
              (l: any) => !l.validated && levelMedalPlaceholder(l.name),
            ).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-(--text-muted) mb-2">
                  Niveaux à débloquer
                </h4>
                <div className="flex flex-wrap gap-3">
                  {(details.levels || [])
                    .filter(
                      (l: any) => !l.validated && levelMedalPlaceholder(l.name),
                    )
                    .map((level: any) => (
                      <div
                        key={level.id}
                        className="flex items-center gap-2 p-3 bg-white/5 border text-(--text-main) rounded-xl text-sm"
                      >
                        <img
                          src={levelMedalPlaceholder(level.name) as string}
                          alt={level.name}
                          className="w-10 h-10 object-contain opacity-40 grayscale"
                        />
                        <span className="text-(--text-muted)">{level.name}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-(--text-muted) mb-2">
                Médailles débloquées
              </h4>
              {details.medals && details.medals.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {details.medals.map((medal: any) => (
                    <div
                      key={medal.id}
                      className="flex items-center gap-2 p-3 bg-white/5 border text-(--text-main) rounded-xl text-sm"
                    >
                      {medal.image ? (
                        <img
                          src={assetUrl(medal.image)}
                          alt={medal.name}
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <span className="w-10 h-10 rounded-lg bg-(--accent)/20 flex items-center justify-center text-lg">
                          🏅
                        </span>
                      )}
                      <div>
                        <span className="font-medium block">{medal.name}</span>
                        <span className="text-xs text-(--text-muted)">
                          {medal.is_level_medal
                            ? "Débloquée par niveau"
                            : `${medal.points_required} pts`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${t.textMuted}`}>
                  Aucune médaille débloquée pour le moment dans cette classe.
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-(--text-main) mb-2">
              Professeur(s) et points attribués
            </h3>
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
              />
            </ScrollableTableCard>
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
