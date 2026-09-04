"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { globalMedalService } from "../services/globalMedalService";
import { GlobalMedal, CreateGlobalMedalPayload, Column } from "../types/models";
import { useCrud } from "../hooks/useCrud";
import { useSearch } from "../hooks/useSearch";
import { useSort } from "../hooks/useSort";
import { useAdminGuard } from "../hooks/useAdminGuard";
import PageHeader from "../components/PageHeader";
import FormCard from "../components/FormCard";
import ScrollableTableCard from "../components/ScrollableTableCard";
import DataTable from "../components/DataTable";
import PageActions from "../components/PageActions";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { assetUrl } from "../lib/assetUrl";
import ImageUploadButton from "../components/ImageUploadButton";

function GlobalMedalsContent() {
  const { t } = useTheme();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  useAdminGuard();

  const {
    data: medals,
    isLoading,
    error,
    success,
    editingId,
    editForm,
    createForm,
    undoAction,
    setError,
    setSuccess,
    setEditingId,
    setEditForm,
    setCreateForm,
    setUndoAction,
    loadData,
    startEdit,
    create,
    updateWithUndo,
    deleteWithUndo,
  } = useCrud<GlobalMedal, CreateGlobalMedalPayload>(globalMedalService, {
    name: "",
    points_required: 0,
    image: "",
  });

  const [showForm, setShowForm] = useState(
    searchParams.get("action") === "create",
  );

  useEffect(() => {
    if (error) {
      showToast(error, "error");
      setError("");
    }
  }, [error, showToast, setError]);

  useEffect(() => {
    if (success) {
      showToast(success, "success");
      setSuccess("");
    }
  }, [success, showToast, setSuccess]);

  useEffect(() => {
    if (undoAction) {
      showToast(
        undoAction.message,
        "undo",
        undoAction.duration,
        undoAction.onUndo,
      );
      setUndoAction(null);
    }
  }, [undoAction, showToast, setUndoAction]);

  const { sortField, sortDirection, handleSort } = useSort("name", "asc");

  const {
    searchQuery,
    setSearchQuery,
    filteredData: filteredMedals,
  } = useSearch(medals, (m, query) => {
    return (m.name || "").toLowerCase().includes(query);
  });

  const handleCreateChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setCreateForm((prev: CreateGlobalMedalPayload) => ({
      ...prev,
      [name]: name === "points_required" ? Number(value) : value,
    }));
  };

  const handleCreateImage = (file: File) => {
    setCreateForm((prev) => ({
      ...prev,
      image: file as unknown as string,
    }));
  };

  const handleDelete = (id: string | number) => {
    const numId = Number(id);
    const medal = medals.find((m) => m.id === numId);
    if (medal && medal.assigned_levels && medal.assigned_levels > 0) {
      showToast(
        "Impossible de supprimer cette médaille : elle est attribuée à un ou plusieurs niveaux.",
        "error",
      );
      return;
    }
    deleteWithUndo(numId);
  };

  const sortedMedals = [...filteredMedals].sort((a, b) => {
    let compareResult = 0;
    switch (sortField) {
      case "points_required":
        compareResult = (a.points_required || 0) - (b.points_required || 0);
        break;
      case "name":
      default:
        compareResult = (a.name || "").localeCompare(b.name || "");
        break;
    }
    return sortDirection === "asc" ? compareResult : -compareResult;
  });

  const columns: Column<GlobalMedal>[] = [
    {
      field: "image",
      label: "Image",
      render: (item) =>
        item.image && typeof item.image === "string" ? (
          <img
            src={assetUrl(item.image)}
            alt={item.name}
            className="w-10 h-10 object-contain rounded-lg bg-white/5"
          />
        ) : (
          <span className={`text-xs ${t.textMuted}`}>—</span>
        ),
      renderEdit: (form, update) => (
        <div className="flex items-center gap-2">
          <ImageUploadButton
            onChange={(file) => update({ image: file as unknown as string })}
            previewUrl={
              form.image && typeof form.image === "string"
                ? assetUrl(form.image)
                : undefined
            }
          />
        </div>
      ),
    },
    {
      field: "name",
      label: "Nom",
      sortable: true,
      render: (item) => (
        <span className="block w-full truncate font-medium">{item.name}</span>
      ),
      renderEdit: (form, update) => (
        <input
          className={`${t.input} py-1! px-2! text-xs! truncate`}
          value={form.name || ""}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Nom"
        />
      ),
    },
    {
      field: "points_required",
      label: "Points requis",
      sortable: true,
      render: (item) =>
        item.is_level_medal ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-(--text-muted) border border-(--border-color) rounded-md px-2 py-0.5">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            N/A (débloquée par niveau)
          </span>
        ) : (
          <span className="block truncate">{item.points_required} pts</span>
        ),
      renderEdit: (form, update) =>
        form.is_level_medal ? (
          <div className="flex items-center gap-2 text-xs text-(--text-muted)">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            <span>Débloquée quand tous les items du niveau sont complétés</span>
          </div>
        ) : (
          <input
            type="number"
            className={`${t.input} py-1! px-2! text-xs! truncate`}
            value={form.points_required || 0}
            onChange={(e) =>
              update({ points_required: Number(e.target.value) })
            }
            placeholder="Points requis"
          />
        ),
    },
    {
      field: "is_level_medal",
      label: "Type",
      render: (item) => (
        <span
          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${
            item.is_level_medal
              ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
          }`}
        >
          {item.is_level_medal ? "Niveau" : "Points"}
        </span>
      ),
      renderEdit: (form, update) => (
        <label className="flex items-center gap-2 text-xs text-(--text-muted) cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.is_level_medal}
            onChange={(e) => update({ is_level_medal: e.target.checked })}
            className="accent-(--accent)"
          />
          Médaille de niveau
        </label>
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <PageHeader
        title="Médailles Globales"
        description="Gérez les récompenses basées sur le score total cumulé des classes"
      >
        <PageActions
          onRefresh={loadData}
          showNew={true}
          isNewOpen={showForm}
          onToggleNew={() => setShowForm(!showForm)}
          newLabel="Nouvelle médaille"
        />
      </PageHeader>

      {showForm && (
        <FormCard title="Nouvelle médaille globale">
          <form
            onSubmit={(e) => create(e, createForm)}
            className="flex flex-col gap-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="w-full">
                <label className={`block text-xs mb-1 ${t.textMuted}`}>
                  Nom de la médaille
                </label>
                <input
                  name="name"
                  type="text"
                  className={`${t.input} w-full py-1.5`}
                  value={(createForm.name as string) || ""}
                  onChange={handleCreateChange}
                  required
                />
              </div>

              {!createForm.is_level_medal && (
                <div className="w-full">
                  <label className={`block text-xs mb-1 ${t.textMuted}`}>
                    Points requis
                  </label>
                  <input
                    name="points_required"
                    type="number"
                    className={`${t.input} w-full py-1.5`}
                    value={createForm.points_required || ""}
                    onChange={handleCreateChange}
                    placeholder="Points requis"
                  />
                </div>
              )}

              <div className="w-full">
                <label className={`block text-xs mb-1 ${t.textMuted}`}>
                  Image (upload)
                </label>
                <ImageUploadButton
                  onChange={handleCreateImage}
                  previewUrl={
                    typeof createForm.image === "string"
                      ? assetUrl(createForm.image)
                      : undefined
                  }
                />
              </div>
            </div>

            <div className="w-full">
              <label className="flex items-center gap-2 text-xs text-(--text-muted) cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!createForm.is_level_medal}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      is_level_medal: e.target.checked,
                      ...(e.target.checked
                        ? { points_required: 0 }
                        : {}),
                    }))
                  }
                  className="accent-(--accent)"
                />
                Médaille de niveau : débloquée quand tous les items du niveau
                sont complétés (aucun point requis, affichée dans le choix
                d'un niveau)
              </label>
            </div>

            <div className="w-full flex justify-end">
              <button type="submit" className={t.btnPrimary}>
                Ajouter la médaille
              </button>
            </div>
          </form>
        </FormCard>
      )}

      <ScrollableTableCard>
        <DataTable
          data={sortedMedals}
          columns={columns}
          keyExtractor={(item) => item.id}
          editingId={editingId}
          editForm={editForm}
          setEditForm={setEditForm}
          onEdit={startEdit}
          onSave={updateWithUndo}
          onCancel={() => setEditingId(null)}
          onDelete={handleDelete}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isLoading={isLoading}
          emptyMessage="Aucune médaille trouvée."
        />
      </ScrollableTableCard>
    </div>
  );
}

export default function GlobalMedalsPage() {
  return (
    <Suspense>
      <GlobalMedalsContent />
    </Suspense>
  );
}
