"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { classService } from "../services/classService";
import { trimestreService } from "../services/trimestreService";
import {
  ClassEntity,
  Trimestre,
  CreateClassPayload,
  CreateTrimestrePayload,
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
import { classUserService } from "../services/classUserService";
import { userService } from "../services/userService";
import { parseJwt } from "../lib/auth";
import ConfirmDialog from "../components/ConfirmDialog";

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

function ClassesPanel({
  searchParams,
}: {
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const { t } = useTheme();
  const { showToast } = useToast();

  const crud = useCrud<ClassEntity, CreateClassPayload>(classService, {
    name: "",
  });

  const [showForm, setShowForm] = useState(
    searchParams.get("action") === "create",
  );

  const [selectedClass, setSelectedClass] = useState<ClassEntity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [classUsers, setClassUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedIsPrincipal, setSelectedIsPrincipal] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [isPhone, setIsPhone] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = parseJwt(token);
      if (decoded?.role) setCurrentRole(decoded.role);
    }
  }, []);

  const canManage = currentRole === "admin" || currentRole === "superadmin";

  const noop = () => {};

  useToastEffects({
    error: crud.error,
    success: crud.success,
    undoAction: crud.undoAction,
    setError: crud.setError,
    setSuccess: crud.setSuccess,
    setUndoAction: crud.setUndoAction,
  });

  const { sortField, sortDirection, handleSort } = useSort("name", "asc");

  const {
    searchQuery,
    setSearchQuery,
    filteredData: filteredClasses,
  } = useSearch(crud.data, (c, query) =>
    (c.name || "").toLowerCase().includes(query),
  );

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    crud.setCreateForm((prev: CreateClassPayload) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReset = async () => {
    try {
      await classService.reset();
      showToast("Toutes les classes ont été réinitialisées.", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la réinitialisation", "error");
    } finally {
      setShowResetConfirm(false);
    }
  };

  const openProfessors = async (cls: ClassEntity) => {
    setSelectedClass(cls);
    setDrawerMounted(true);
    requestAnimationFrame(() => setDrawerOpen(true));
    setSelectedUserId("");
    setSelectedIsPrincipal(false);
    setLoadingUsers(true);
    try {
      const [cu, au] = await Promise.all([
        classUserService.getByClassId(cls.id),
        userService.getAll(),
      ]);
      setClassUsers(cu);
      setAllUsers(au);
    } catch (e: any) {
      showToast(e.message || "Erreur de chargement", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  const closeProfessors = () => {
    setDrawerOpen(false);
    setTimeout(() => {
      setDrawerMounted(false);
      setSelectedClass(null);
    }, 300);
  };

  const handleAssignProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedUserId) {
      showToast("Sélectionnez un professeur.", "error");
      return;
    }
    if (selectedIsPrincipal) {
      const classAsPrincipal = crud.data.find(
        (c) => c.pp_user_id === selectedUserId,
      );
      if (classAsPrincipal && classAsPrincipal.id !== selectedClass.id) {
        showToast(
          `Ce professeur est déjà principal de la classe « ${classAsPrincipal.name} ».`,
          "error",
        );
        return;
      }
    }
    try {
      await classUserService.assign(
        selectedClass.id,
        selectedUserId,
        selectedIsPrincipal,
      );
      showToast("Professeur assigné.", "success");
      setSelectedUserId("");
      setSelectedIsPrincipal(false);
      const cu = await classUserService.getByClassId(selectedClass.id);
      setClassUsers(cu);
    } catch (err: any) {
      showToast(err.message || "Erreur lors de l'assignation", "error");
    }
  };

  const handleRemoveProfessor = async (userId: string) => {
    if (!selectedClass) return;
    const removed = classUsers.find((cu: any) => cu.id === userId);
    const wasPrincipal = removed?.is_principal || false;
    try {
      await classUserService.remove(selectedClass.id, userId);
      setClassUsers((prev) => prev.filter((cu: any) => cu.id !== userId));
      const refresh = async () => {
        const cu = await classUserService.getByClassId(selectedClass.id);
        setClassUsers(cu);
      };
      showToast("Professeur retiré de la classe.", "undo", 5000, async () => {
        try {
          await classUserService.assign(selectedClass.id, userId, wasPrincipal);
          await refresh();
          showToast("Professeur réassigné.", "success");
        } catch (e: any) {
          showToast(e.message || "Erreur lors de la réassignation", "error");
        }
      });
      setTimeout(refresh, 5000);
    } catch (err: any) {
      showToast(err.message || "Erreur lors du retrait", "error");
    }
  };

  const sortedClasses = [...filteredClasses].sort((a, b) =>
    sortDirection === "asc"
      ? (a.name || "").localeCompare(b.name || "")
      : (b.name || "").localeCompare(a.name || ""),
  );

  const columns: Column<ClassEntity>[] = [
    {
      field: "name",
      label: "Nom de la classe",
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
      field: "pp",
      label: "Professeur principal",
      render: (item) => (
        <span className="block truncate text-xs">
          {item.pp_first_name && item.pp_last_name
            ? `${item.pp_first_name} ${item.pp_last_name}`
            : "—"}
        </span>
      ),
    },
    {
      field: "profs",
      label: "",
      render: (item) => (
        <button
          onClick={() => openProfessors(item)}
          className={`${t.btnGhost} text-xs px-2 py-1`}
        >
          Professeurs
        </button>
      ),
    },
  ];

  const profColumns: Column<any>[] = [
    {
      field: "name",
      label: "Professeur",
      render: (cu: any) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {cu.first_name} {cu.last_name}
          </span>
        </div>
      ),
    },
    {
      field: "role",
      label: "Rôle",
      render: (cu: any) =>
        cu.role === "admin" ? (
          <span className={`text-sky-400 font-medium`}>Admin</span>
        ) : cu.is_principal ? (
          <span className={`text-emerald-400 font-medium`}>Principal</span>
        ) : (
          <span className={t.textMuted}>Professeur</span>
        ),
    },
    {
      field: "email",
      label: "Email",
      render: (cu: any) => (
        <span className={t.textMuted}>{cu.email || "—"}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-0 gap-3 overflow-hidden">
      <div className="shrink-0 flex justify-between items-center gap-2">
        <h2 className={`${t.title} text-xl tracking-tight drop-shadow-md`}>
          Classes
        </h2>
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className={`${t.btnGhost} p-2.5 flex items-center justify-center cursor-pointer text-amber-400 border border-amber-400/30 hover:bg-amber-400/10`}
              title="Réinitialiser toutes les classes"
            >
              <Image
                src="/icons/clear.webp"
                alt="Réinitialiser"
                width={16}
                height={16}
                className="object-contain brightness-0 invert shrink-0"
                unoptimized
              />
            </button>
          )}
          <PageActions
            onRefresh={crud.loadData}
            showNew={true}
            isNewOpen={showForm}
            onToggleNew={() => setShowForm(!showForm)}
            newLabel="Nouvelle classe"
          />
        </div>
      </div>

      {showForm && (
        <FormCard title="Nouvelle classe" badge="">
          <form
            onSubmit={(e) => crud.create(e, crud.createForm)}
            className="grid grid-cols-1 gap-3"
          >
            <div className="w-full">
              <label className={`block text-xs mb-1 ${t.textMuted}`}>
                Nom de la classe
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

            <div className="flex justify-end">
              <button type="submit" className={t.btnPrimary}>
                Ajouter la classe
              </button>
            </div>
          </form>
        </FormCard>
      )}

      <ScrollableTableCard>
        <DataTable
          data={sortedClasses}
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
          emptyMessage="Aucune classe trouvée."
          cardActionsInline
          centerCardContent
        />
        {drawerMounted && selectedClass && (() => {
          const veil = (
              <div
                className={`${isPhone ? "fixed" : "absolute"} inset-0 z-10 transition-opacity duration-300 ${
                  drawerOpen ? "opacity-100" : "opacity-0"
                }`}
                onClick={closeProfessors}
                style={{
                  backgroundColor: "#000",
                  backdropFilter: "blur(3px)",
                  WebkitBackdropFilter: "blur(3px)",
                  maskImage: isPhone
                    ? "linear-gradient(to right, black 0%, black 90%, transparent 100%)"
                    : "linear-gradient(to right, black 0%, black 55%, rgba(0,0,0,0.5) 82%, transparent 100%)",
                  WebkitMaskImage: isPhone
                    ? "linear-gradient(to right, black 0%, black 90%, transparent 100%)"
                    : "linear-gradient(to right, black 0%, black 55%, rgba(0,0,0,0.5) 82%, transparent 100%)",
                }}
              />
          );
          const panel = (
              <div
                className={`${isPhone ? "fixed inset-y-0 left-0 w-[90%]" : "absolute inset-y-0 left-0 w-[85%] max-w-[520px]"} z-20 bg-(--bg-card) border-r border-(--border-color) shadow-2xl overflow-hidden p-3 sm:p-5 flex flex-col gap-3 transition-transform duration-300 ease-in-out ${
                  drawerOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start gap-2 shrink-0">
                  <div className="min-w-0">
                    <h3 className={`${t.title} text-lg tracking-tight truncate`}>
                      Professeurs — {selectedClass.name}
                    </h3>
                    <p className={`text-xs ${t.textMuted} mt-1`}>
                      Assignez les professeurs et désignez le professeur
                      principal.
                    </p>
                  </div>
                  <button
                    onClick={closeProfessors}
                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 cursor-pointer shrink-0"
                    title="Fermer"
                  >
                    <Image
                      src="/icons/back.webp"
                      alt="Fermer"
                      width={18}
                      height={18}
                      className="object-contain brightness-0 invert"
                      unoptimized
                    />
                  </button>
                </div>

                <form
                  onSubmit={handleAssignProfessor}
                  className="flex flex-col gap-3 p-3 rounded-xl border border-(--border-color) bg-white/5 shrink-0"
                >
                  <div>
                    <label className={`block text-xs mb-1 ${t.textMuted}`}>
                      Professeur
                    </label>
                    <select
                      className={`${t.input} w-full py-1.5`}
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                      <option value="">Sélectionner un professeur</option>
                      {allUsers
                        .filter(
                          (u) => u.role === "professeur" || u.role === "admin",
                        )
                        .filter((u) => !classUsers.some((cu) => cu.id === u.id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.first_name} {u.last_name} ({u.email}) —{" "}
                            {u.role === "admin" ? "Admin" : "Professeur"}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex items-stretch gap-3">
                    <label className="w-2/5 flex items-center gap-2 px-3 rounded-[calc(var(--radius-box)/2)] border border-(--border-color) bg-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-(--accent) shrink-0"
                        checked={selectedIsPrincipal}
                        onChange={(e) =>
                          setSelectedIsPrincipal(e.target.checked)
                        }
                      />
                      <span className={`text-xs ${t.textMuted}`}>
                        Professeur principal
                      </span>
                    </label>
                    <button type="submit" className={`${t.btnPrimary} w-3/5`}>
                      Assigner
                    </button>
                  </div>
                </form>

                <div className="flex-1 min-h-0 flex flex-col">
                  <h4 className={`text-sm font-semibold mb-2 shrink-0 ${t.textMuted}`}>
                    Professeurs assignés
                  </h4>
                  <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-(--border-color) overflow-hidden">
                    <DataTable
                      data={classUsers}
                      columns={profColumns}
                      keyExtractor={(cu: any) => cu.id}
                      editingId={null}
                      editForm={{}}
                      setEditForm={noop as any}
                      onEdit={noop}
                      onSave={noop}
                      onCancel={noop}
                      onDelete={(id) => handleRemoveProfessor(String(id))}
                      actionsAllowed={() => ({ canEdit: false })}
                      isLoading={loadingUsers}
                      emptyMessage="Aucun professeur assigné."
                      cardActionsInHeader
                    />
                  </div>
                </div>
              </div>
          );
          const content = (
            <>
              {veil}
              {panel}
            </>
          );
          return isPhone ? createPortal(content, document.body) : content;
        })()}
      </ScrollableTableCard>

      <ConfirmDialog
        open={showResetConfirm}
        title="Réinitialiser toutes les classes"
        message="Cette action supprimera tous les points attribués et les affectations de professeurs. Continuer ?"
        confirmLabel="Réinitialiser"
        confirmClassName="bg-amber-500 border border-amber-400/50 text-white hover:bg-amber-600"
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}

function TrimestresPanel({
  searchParams,
}: {
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const { t } = useTheme();
  const { showToast } = useToast();

  const crud = useCrud<Trimestre, CreateTrimestrePayload>(trimestreService, {
    name: "",
    start_date: "",
    end_date: "",
    is_active: false,
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

  const {
    searchQuery,
    setSearchQuery,
    filteredData: filteredTrimestres,
  } = useSearch(crud.data, (tr, query) =>
    (tr.name || "").toLowerCase().includes(query),
  );

  const handleCreateChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    crud.setCreateForm((prev: CreateTrimestrePayload) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const sortedTrimestres = [...filteredTrimestres].sort((a, b) => {
    let compareResult = 0;
    switch (sortField) {
      case "start_date":
        compareResult = (a.start_date || "").localeCompare(b.start_date || "");
        break;
      case "end_date":
        compareResult = (a.end_date || "").localeCompare(b.end_date || "");
        break;
      case "name":
      default:
        compareResult = (a.name || "").localeCompare(b.name || "");
        break;
    }
    return sortDirection === "asc" ? compareResult : -compareResult;
  });

  const toISODate = (val?: string | null): string => {
    if (!val) return "";
    const s = String(val);
    return s.length >= 10 ? s.slice(0, 10) : s;
  };

  const columns: Column<Trimestre>[] = [
    {
      field: "name",
      label: "Nom",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="block truncate font-medium">{item.name}</span>
          {!!item.is_active && (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ACTIF
            </span>
          )}
        </div>
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
      field: "start_date",
      label: "Début",
      sortable: true,
      render: (item) => (
        <span className="block truncate">
          {item.start_date
            ? new Date(item.start_date).toLocaleDateString("fr-FR")
            : "—"}
        </span>
      ),
      renderEdit: (form, update) => (
        <input
          type="date"
          className={`${t.input} py-1! px-2! text-xs!`}
          value={toISODate(form.start_date)}
          onChange={(e) => update({ start_date: e.target.value })}
        />
      ),
    },
    {
      field: "end_date",
      label: "Fin",
      sortable: true,
      render: (item) => (
        <span className="block truncate">
          {item.end_date
            ? new Date(item.end_date).toLocaleDateString("fr-FR")
            : "—"}
        </span>
      ),
      renderEdit: (form, update) => (
        <input
          type="date"
          className={`${t.input} py-1! px-2! text-xs!`}
          value={toISODate(form.end_date)}
          onChange={(e) => update({ end_date: e.target.value })}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-0 gap-3 overflow-hidden">
      <div className="shrink-0 flex justify-between items-center gap-2">
        <h2 className={`${t.title} text-xl tracking-tight drop-shadow-md`}>
          Trimestres
        </h2>
        <PageActions
          onRefresh={crud.loadData}
          showNew={true}
          isNewOpen={showForm}
          onToggleNew={() => setShowForm(!showForm)}
          newLabel="Nouveau trimestre"
        />
      </div>

      {showForm && (
        <FormCard title="Nouveau trimestre" badge="">
          <form
            onSubmit={(e) => crud.create(e, crud.createForm)}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <div className="w-full">
              <label className={`block text-xs mb-1 ${t.textMuted}`}>
                Nom du trimestre
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
                Date de début
              </label>
              <input
                name="start_date"
                type="date"
                className={`${t.input} w-full py-1.5`}
                value={crud.createForm.start_date || ""}
                onChange={handleCreateChange}
                required
              />
            </div>

            <div className="w-full">
              <label className={`block text-xs mb-1 ${t.textMuted}`}>
                Date de fin
              </label>
              <input
                name="end_date"
                type="date"
                className={`${t.input} w-full py-1.5`}
                value={crud.createForm.end_date || ""}
                onChange={handleCreateChange}
                required
              />
            </div>

            <div className="w-full flex items-center gap-2 pt-5">
              <input
                name="is_active"
                type="checkbox"
                className="accent-(--accent)"
                checked={!!crud.createForm.is_active}
                onChange={handleCreateChange}
              />
              <label className={`text-xs ${t.textMuted}`}>
                Activer ce trimestre
              </label>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className={t.btnPrimary}>
                Ajouter le trimestre
              </button>
            </div>
          </form>
        </FormCard>
      )}

      <ScrollableTableCard>
        <DataTable
          data={sortedTrimestres}
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
          emptyMessage="Aucun trimestre trouvé."
          centerCardContent
        />
      </ScrollableTableCard>
    </div>
  );
}

function ClassesTrimestresContent() {
  const searchParams = useSearchParams();
  useAdminGuard();

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <PageHeader
        title="Classes & Trimestres"
        description="Gérez les classes (à gauche) et les trimestres (à droite)"
      />

      <div className="grid grid-cols-1 auto-rows-[minmax(32rem,80vh)] desktop:grid-cols-2 desktop:grid-rows-[minmax(0,1fr)] desktop:auto-rows-auto desktop:flex-1 desktop:min-h-0 gap-4">
        <ClassesPanel searchParams={searchParams} />
        <TrimestresPanel searchParams={searchParams} />
      </div>
    </div>
  );
}

export default function ClassesTrimestresPage() {
  return (
    <Suspense>
      <ClassesTrimestresContent />
    </Suspense>
  );
}
