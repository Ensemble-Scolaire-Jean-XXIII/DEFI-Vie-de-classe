"use client";

import { useState, useEffect } from "react";
import { pointService } from "../services/pointService";
import { classService } from "../services/classService";
import { itemService } from "../services/itemService";
import { trimestreService } from "../services/trimestreService";
import { userService } from "../services/userService";
import { parseJwt } from "../lib/auth";
import {
  ClassEntity,
  Item,
  Trimestre,
  AddPointPayload,
  Column,
} from "../types/models";
import PageHeader from "../components/PageHeader";
import PageActions from "../components/PageActions";
import FormCard from "../components/FormCard";
import ScrollableTableCard from "../components/ScrollableTableCard";
import DataTable from "../components/DataTable";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";

interface MyPoint {
  class_id: number;
  class_name: string;
  item_id: number;
  item_name: string;
  trimestre_id: number;
  trimestre_name: string | null;
  points_awarded: number;
  created_at?: string;
}

const noop = () => {};

export default function AjoutPointsPage() {
  const { t } = useTheme();
  const { showToast } = useToast();

  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [trimestres, setTrimestres] = useState<Trimestre[]>([]);
  const [myPoints, setMyPoints] = useState<MyPoint[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<AddPointPayload>({
    class_id: 0,
    item_id: 0,
    trimestre_id: 0,
  });

  const loadMyPoints = async () => {
    setLoadingPoints(true);
    try {
      const points = await pointService.getMine();
      setMyPoints(points || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPoints(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const decoded = token ? parseJwt(token) : null;
        const isProf = decoded?.role === "professeur";

        const [allClasses, allItems, allTrimestres, me] = await Promise.all([
          classService.getAll(),
          itemService.getAll(),
          trimestreService.getAll(),
          isProf ? userService.getMe() : Promise.resolve(null),
        ]);

        const myClassIds =
          isProf && me?.classes ? new Set(me.classes.map((c) => c.id)) : null;
        const classList = myClassIds
          ? allClasses.filter((c) => myClassIds.has(c.id))
          : allClasses;

        setClasses(classList);
        setItems(allItems);
        setTrimestres(allTrimestres);

        const active =
          allTrimestres.find((tr) => tr.is_active) || allTrimestres[0];
        if (active) {
          setFormData((prev) => ({ ...prev, trimestre_id: active.id }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
    loadMyPoints();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trimestre_id) {
      showToast("Sélectionnez un trimestre.", "error");
      return;
    }
    try {
      await pointService.add(formData);
      showToast("Point ajouté avec succès", "success");
      setFormData((prev) => ({ ...prev, item_id: 0 }));
      loadMyPoints();
    } catch (error: any) {
      showToast(error.message || "Erreur lors de l'ajout du point", "error");
    }
  };

  const columns: Column<MyPoint>[] = [
    {
      field: "class_name",
      label: "Classe",
      className: "w-28",
      render: (item) => (
        <span className="block truncate font-medium">{item.class_name}</span>
      ),
    },
    {
      field: "item_name",
      label: "Comportement",
      render: (item) => (
        <span className="block truncate">{item.item_name}</span>
      ),
    },
    {
      field: "trimestre_name",
      label: "Trimestre",
      className: "w-28",
      render: (item) => (
        <span className="block truncate">{item.trimestre_name || "—"}</span>
      ),
    },
    {
      field: "created_at",
      label: "Date",
      className: "w-36",
      render: (item) => (
        <span className="block truncate">
          {item.created_at
            ? new Date(item.created_at).toLocaleString("fr-FR")
            : "—"}
        </span>
      ),
    },
    {
      field: "points_awarded",
      label: "Points",
      className: "w-16",
      render: (item) => (
        <span className="font-semibold text-(--accent)">
          +{item.points_awarded}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <PageHeader
        title="Attribuer des points"
        description="Valoriser un comportement positif (1 point max. par item et par classe sur 2 heures)"
      >
        <PageActions
          onRefresh={loadMyPoints}
          showNew={true}
          isNewOpen={showForm}
          onToggleNew={() => setShowForm(!showForm)}
          newLabel="Nouveau point"
        />
      </PageHeader>

      {showForm && (
        <FormCard title="Nouveau point" badge="">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
          >
            <div>
              <label className={`block text-xs mb-1 ${t.textMuted}`}>
                Classe
              </label>
              <select
                className={`${t.input} w-full py-2`}
                value={formData.class_id}
                onChange={(e) =>
                  setFormData({ ...formData, class_id: Number(e.target.value) })
                }
                required
              >
                <option value="">Sélectionner une classe</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs mb-1 ${t.textMuted}`}>
                Comportement (Item)
              </label>
              <select
                className={`${t.input} w-full py-2`}
                value={formData.item_id}
                onChange={(e) =>
                  setFormData({ ...formData, item_id: Number(e.target.value) })
                }
                required
              >
                <option value="">Sélectionner un item</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <button type="submit" className={t.btnPrimary}>
                Valider le point
              </button>
            </div>
          </form>
        </FormCard>
      )}

      <div className="flex flex-col min-h-0 flex-1">
        <h2
          className={`${t.title} text-xl tracking-tight drop-shadow-md shrink-0 mb-2`}
        >
          Mes points attribués
        </h2>
        <ScrollableTableCard>
          <DataTable
            data={myPoints}
            columns={columns}
            keyExtractor={(item) =>
              `${item.class_id}-${item.item_id}-${item.trimestre_id}-${item.created_at || ""}`
            }
            editingId={null}
            editForm={{}}
            setEditForm={noop as any}
            onEdit={noop}
            onSave={noop}
            onCancel={noop}
            onDelete={noop}
            hideActions
            isLoading={loadingPoints}
            emptyMessage="Vous n'avez encore attribué aucun point."
          />
        </ScrollableTableCard>
      </div>
    </div>
  );
}
