"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { levelService } from "../services/levelService";
import { itemService } from "../services/itemService";
import { globalMedalService } from "../services/globalMedalService";
import {
  Level,
  Item,
  CreateLevelPayload,
  CreateItemPayload,
  GlobalMedal,
  Column,
} from "../types/models";
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

function useToastEffects(opts: {
  error: string;
  success: any;
  undoAction: any;
  setError: (v: string) => void;
  setSuccess: (v: string) => void;
  setUndoAction: (v: any) => void;
}) {
  const { showToast } = useToast();
  const { error, success, undoAction, setError, setSuccess, setUndoAction } =
    opts;

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
}

function LevelsPanel({
  medals,
  searchParams,
}: {
  medals: GlobalMedal[];
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const { t } = useTheme();

  const crud = useCrud<Level, CreateLevelPayload>(levelService, {
    name: "",
    global_medal_id: null,
  });

  const [showForm, setShowForm] = useState(
    searchParams.get("action") === "create",
  );

  useToastEffects({
    error: crud.error,
    success: crud.success,
    undoAction: crud.undoAction,
    setError: crud.setError,
    setSuccess: crud.setSuccess,
    setUndoAction: crud.setUndoAction,
  });

  const { sortField, sortDirection, handleSort } = useSort("name", "asc");

  const { searchQuery, setSearchQuery, filteredData: filteredLevels } =
    useSearch(crud.data, (l, query) =>
      (l.name || "").toLowerCase().includes(query),
    );

  const handleCreateChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    crud.setCreateForm((prev: CreateLevelPayload) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMedalSelect = (medalId: number | null) => {
    crud.setCreateForm((prev) => ({ ...prev, global_medal_id: medalId }));
  };

  const sortedLevels = [...filteredLevels].sort((a, b) =>
    sortDirection === "asc"
      ? (a.name || "").localeCompare(b.name || "")
      : (b.name || "").localeCompare(a.name || ""),
  );

  const levelMedals = medals.filter((m) => m.is_level_medal);

  const columns: Column<Level>[] = [
    {
      field: "name",
      label: "Nom du niveau",
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
      field: "medal",
      label: "Médaille",
      render: (item) =>
        item.medal_image ? (
          <img
            src={assetUrl(item.medal_image)}
            alt={item.name}
            className="w-10 h-10 object-contain rounded-lg bg-white/5"
          />
        ) : (
          <span className={`text-xs ${t.textMuted}`}>—</span>
        ),
      renderEdit: (form, update) => (
        <select
          className={`${t.input} py-1! px-2! text-xs! cursor-pointer`}
          value={form.global_medal_id || ""}
          onChange={(e) =>
            update({
              global_medal_id: e.target.value ? Number(e.target.value) : null,
            })
          }
        >
          <option value="">Aucune médaille</option>
          {levelMedals.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-0 gap-3">
      <div className="shrink-0 flex justify-between items-center gap-2">
        <h2 className={`${t.title} text-xl tracking-tight drop-shadow-md`}>
          Niveaux
        </h2>
        <PageActions
          onRefresh={crud.loadData}
          showNew={true}
          isNewOpen={showForm}
          onToggleNew={() => setShowForm(!showForm)}
          newLabel="Nouveau niveau"
        />
      </div>

      {showForm && (
        <FormCard title="Nouveau niveau" badge="">
          <form
            onSubmit={(e) => crud.create(e, crud.createForm)}
            className="flex flex-col gap-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <div className="w-full">
                <label className={`block text-xs mb-1 ${t.textMuted}`}>
                  Nom du niveau
                </label>
                <input
                  name="name"
                  type="text"
                  className={`${t.input} w-full py-1.5`}
                  value={crud.createForm.name || ""}
                  onChange={handleCreateChange}
                  required
                />
              </div>

              <div className="w-full">
                <label className={`block text-xs mb-1 ${t.textMuted}`}>
                  Médaille associée
                </label>
                <select
                  className={`${t.input} w-full py-1.5 cursor-pointer`}
                  value={crud.createForm.global_medal_id || ""}
                  onChange={(e) =>
                    handleMedalSelect(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                >
                  <option value="">Aucune médaille</option>
                  {levelMedals.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full flex items-center gap-3">
                <span className={`text-xs ${t.textMuted}`}>Aperçu :</span>
                {(() => {
                  const selected = levelMedals.find(
                    (m) => m.id === crud.createForm.global_medal_id,
                  );
                  return selected?.image ? (
                    <img
                      src={assetUrl(selected.image)}
                      alt={selected.name}
                      className="w-10 h-10 object-contain rounded-lg bg-white/5"
                    />
                  ) : (
                    <span className={`text-xs ${t.textMuted}`}>—</span>
                  );
                })()}
              </div>
            </div>

            {levelMedals.length === 0 && (
              <p className={`text-xs ${t.textMuted}`}>
                Aucune médaille de niveau disponible. Créez-en une avec l'option
                « Médaille de niveau ».
              </p>
            )}

            <div className="w-full flex justify-end">
              <button type="submit" className={t.btnPrimary}>
                Ajouter le niveau
              </button>
            </div>
          </form>
        </FormCard>
      )}

      <ScrollableTableCard>
        <DataTable
          data={sortedLevels}
          columns={columns}
          keyExtractor={(item) => item.id}
          editingId={crud.editingId}
          editForm={crud.editForm}
          setEditForm={crud.setEditForm}
          onEdit={crud.startEdit}
          onSave={crud.updateWithUndo}
          onCancel={() => crud.setEditingId(null)}
          onDelete={crud.deleteWithUndo}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isLoading={crud.isLoading}
          emptyMessage="Aucun niveau trouvé."
        />
      </ScrollableTableCard>
    </div>
  );
}

function ItemsPanel({
  levels,
  searchParams,
}: {
  levels: Level[];
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const { t } = useTheme();

  const crud = useCrud<Item, CreateItemPayload>(itemService, {
    level_id: 0,
    name: "",
    points_required: 1,
    image: "",
  });

  const [showForm, setShowForm] = useState(
    searchParams.get("action") === "create",
  );

  useToastEffects({
    error: crud.error,
    success: crud.success,
    undoAction: crud.undoAction,
    setError: crud.setError,
    setSuccess: crud.setSuccess,
    setUndoAction: crud.setUndoAction,
  });

  const { sortField, sortDirection, handleSort } = useSort("name", "asc");

  const { searchQuery, setSearchQuery, filteredData: filteredItems } =
    useSearch(crud.data, (i, query) =>
      (i.name || "").toLowerCase().includes(query) ||
      (i.level_name || "").toLowerCase().includes(query),
    );

  const handleCreateChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    crud.setCreateForm((prev: CreateItemPayload) => ({
      ...prev,
      [name]:
        name === "level_id" || name === "points_required"
          ? Number(value)
          : value,
    }));
  };

  const handleCreateImage = (file: File) => {
    crud.setCreateForm((prev) => ({
      ...prev,
      image: file as unknown as string,
    }));
  };

  const sortedItems = [...filteredItems].sort((a, b) => {
    let compareResult = 0;
    switch (sortField) {
      case "points_required":
        compareResult = (a.points_required || 0) - (b.points_required || 0);
        break;
      case "level":
        compareResult = (a.level_name || "").localeCompare(b.level_name || "");
        break;
      case "name":
      default:
        compareResult = (a.name || "").localeCompare(b.name || "");
        break;
    }
    return sortDirection === "asc" ? compareResult : -compareResult;
  });

  const columns: Column<Item>[] = [
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
      label: "Nom de l'item",
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
      field: "level",
      label: "Niveau",
      sortable: true,
      render: (item) => (
        <span className="block truncate">{item.level_name}</span>
      ),
      renderEdit: (form, update) => (
        <select
          className={`${t.input} py-1! px-2! text-xs! cursor-pointer truncate`}
          value={form.level_id || 0}
          onChange={(e) => update({ level_id: Number(e.target.value) })}
        >
          {levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      field: "points_required",
      label: "Points requis",
      sortable: true,
      render: (item) => (
        <span className="block truncate">{item.points_required} pts</span>
      ),
      renderEdit: (form, update) => (
        <input
          type="number"
          className={`${t.input} py-1! px-2! text-xs! truncate`}
          value={form.points_required || 1}
          onChange={(e) => update({ points_required: Number(e.target.value) })}
          placeholder="Points"
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-0 gap-3">
      <div className="shrink-0 flex justify-between items-center gap-2">
        <h2 className={`${t.title} text-xl tracking-tight drop-shadow-md`}>
          Items
        </h2>
        <PageActions
          onRefresh={crud.loadData}
          showNew={true}
          isNewOpen={showForm}
          onToggleNew={() => setShowForm(!showForm)}
          newLabel="Nouvel item"
        />
      </div>

      {showForm && (
        <FormCard title="Nouvel item" badge="">
          <form
            onSubmit={(e) => crud.create(e, crud.createForm)}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <div className="w-full">
              <label className={`block text-xs mb-1 ${t.textMuted}`}>
                Niveau
              </label>
              <select
                name="level_id"
                className={`${t.input} w-full py-1.5`}
                value={crud.createForm.level_id}
                onChange={handleCreateChange}
                required
              >
                <option value="">Sélectionner un niveau</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full">
              <label className={`block text-xs mb-1 ${t.textMuted}`}>
                Nom de l'item
              </label>
              <input
                name="name"
                type="text"
                className={`${t.input} w-full py-1.5`}
                value={crud.createForm.name}
                onChange={handleCreateChange}
                required
              />
            </div>

            <div className="w-full">
              <label className={`block text-xs mb-1 ${t.textMuted}`}>
                Points requis
              </label>
              <input
                name="points_required"
                type="number"
                className={`${t.input} w-full py-1.5`}
                value={crud.createForm.points_required}
                onChange={handleCreateChange}
                required
              />
            </div>

            <div className="w-full">
              <label className={`block text-xs mb-1 ${t.textMuted}`}>
                Image (upload)
              </label>
              <ImageUploadButton
                onChange={handleCreateImage}
                previewUrl={
                  typeof crud.createForm.image === "string"
                    ? assetUrl(crud.createForm.image)
                    : undefined
                }
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className={t.btnPrimary}>
                Ajouter l'item
              </button>
            </div>
          </form>
        </FormCard>
      )}

      <ScrollableTableCard>
        <DataTable
          data={sortedItems}
          columns={columns}
          keyExtractor={(item) => item.id}
          editingId={crud.editingId}
          editForm={crud.editForm}
          setEditForm={crud.setEditForm}
          onEdit={crud.startEdit}
          onSave={crud.updateWithUndo}
          onCancel={() => crud.setEditingId(null)}
          onDelete={crud.deleteWithUndo}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isLoading={crud.isLoading}
          emptyMessage="Aucun item trouvé."
        />
      </ScrollableTableCard>
    </div>
  );
}

function NiveauxItemsContent() {
  const searchParams = useSearchParams();
  useAdminGuard();

  const [levels, setLevels] = useState<Level[]>([]);
  const [medals, setMedals] = useState<GlobalMedal[]>([]);

  useEffect(() => {
    levelService
      .getAll()
      .then(setLevels)
      .catch(() => {});
    globalMedalService
      .getAll()
      .then(setMedals)
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <PageHeader
        title="Niveaux & Items"
        description="Gérez les niveaux thématiques (à gauche) et les items qui les composent (à droite)"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <LevelsPanel medals={medals} searchParams={searchParams} />
        <ItemsPanel levels={levels} searchParams={searchParams} />
      </div>
    </div>
  );
}

export default function NiveauxItemsPage() {
  return (
    <Suspense>
      <NiveauxItemsContent />
    </Suspense>
  );
}
