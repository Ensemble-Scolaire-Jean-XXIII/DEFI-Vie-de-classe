"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { userService } from "../services/userService";
import {
  User,
  CreateUserPayload,
  CreateUserResult,
  Column,
} from "../types/models";
import { useCrud } from "../hooks/useCrud";
import { useSearch } from "../hooks/useSearch";
import { useSort } from "../hooks/useSort";
import { parseJwt } from "../lib/auth";
import PageHeader from "../components/PageHeader";
import FormCard from "../components/FormCard";
import ScrollableTableCard from "../components/ScrollableTableCard";
import DataTable from "../components/DataTable";
import PageActions from "../components/PageActions";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";

const formInputs: {
  name: keyof CreateUserPayload;
  type: string;
  placeholder: string;
}[] = [
  { name: "first_name", type: "text", placeholder: "Prénom" },
  { name: "last_name", type: "text", placeholder: "Nom" },
  { name: "email", type: "email", placeholder: "Email" },
];

type RoleOption = "superadmin" | "admin" | "professeur";

function UsersContent() {
  const { t } = useTheme();
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  const [currentRole, setCurrentRole] = useState<RoleOption | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = parseJwt(token);
      if (decoded && ["superadmin", "admin", "professeur"].includes(decoded.role)) {
        setCurrentRole(decoded.role as RoleOption);
      }
    }
  }, []);

  const isSuperAdmin = currentRole === "superadmin";

  const {
    data: users,
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
  } = useCrud<User, CreateUserPayload>(userService, {
    first_name: "",
    last_name: "",
    email: "",
    role: "professeur",
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
    filteredData: filteredUsers,
  } = useSearch(users, (u, query) => {
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const email = (u.email || "").toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  const handleCreateChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setCreateForm((prev: CreateUserPayload) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const result: CreateUserResult = await userService.create(createForm);
      setCreateForm({
        first_name: "",
        last_name: "",
        email: "",
        role: "professeur",
      });
      setShowForm(false);
      loadData();
      showToast(
        `Compte créé. Mot de passe généré : ${result.generatedPassword}`,
        "info",
        15000,
      );
    } catch (err: any) {
      setError(err.message || "Erreur de création");
    }
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let compareResult = 0;
    switch (sortField) {
      case "email":
        compareResult = (a.email || "").localeCompare(b.email || "");
        break;
      case "role":
        compareResult = (a.role || "").localeCompare(b.role || "");
        break;
      case "name":
      default:
        compareResult = (a.last_name || "").localeCompare(b.last_name || "");
        break;
    }
    return sortDirection === "asc" ? compareResult : -compareResult;
  });

  const roleOptions: RoleOption[] = isSuperAdmin
    ? ["professeur", "admin", "superadmin"]
    : ["professeur", "admin"];

  const columns: Column<User>[] = [
    {
      field: "name",
      label: "Nom",
      sortable: true,
      render: (item) => (
        <span className="block w-full truncate font-medium">
          {item.first_name} {item.last_name}
        </span>
      ),
      renderEdit: (form, update) => (
        <div className="flex flex-col gap-1">
          <input
            className={`${t.input} py-1! px-2! text-xs! truncate`}
            value={form.first_name || ""}
            onChange={(e) => update({ first_name: e.target.value })}
            placeholder="Prénom"
          />
          <input
            className={`${t.input} py-1! px-2! text-xs! truncate`}
            value={form.last_name || ""}
            onChange={(e) => update({ last_name: e.target.value })}
            placeholder="Nom"
          />
        </div>
      ),
    },
    {
      field: "email",
      label: "Email",
      sortable: true,
      render: (item) => <span className="block truncate">{item.email}</span>,
      renderEdit: (form, update) => (
        <input
          className={`${t.input} py-1! px-2! text-xs! truncate`}
          value={form.email || ""}
          onChange={(e) => update({ email: e.target.value })}
          placeholder="Email"
        />
      ),
    },
    {
      field: "role",
      label: "Rôle",
      sortable: true,
      render: (item) => (
        <span className="block truncate capitalize">{item.role}</span>
      ),
      renderEdit: (form, update) => {
        const targetIsSuperAdmin = form.role === "superadmin";
        const allowed = isSuperAdmin
          ? ["professeur", "admin", "superadmin"]
          : ["professeur", "admin"];
        return (
          <div className="flex flex-col gap-1">
            <select
              className={`${t.input} py-1! px-2! text-xs! cursor-pointer truncate`}
              value={form.role || "professeur"}
              disabled={targetIsSuperAdmin && !isSuperAdmin}
              onChange={(e) =>
                update({
                  role: e.target.value as RoleOption,
                })
              }
            >
              {allowed.map((r) => (
                <option key={r} value={r}>
                  {r === "professeur"
                    ? "Professeur"
                    : r === "admin"
                      ? "Administrateur"
                      : "Superadmin"}
                </option>
              ))}
            </select>
            {isSuperAdmin && (
              <input
                type="password"
                className={`${t.input} py-1! px-2! text-xs! truncate`}
                value={(form as any).password_hash || ""}
                onChange={(e) => update({ password_hash: e.target.value })}
                placeholder="Nouveau mot de passe"
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <PageHeader
        title="Utilisateurs"
        description="Gérez les accès et les rôles des utilisateurs"
      >
        <PageActions
          onRefresh={loadData}
          showNew={true}
          isNewOpen={showForm}
          onToggleNew={() => setShowForm(!showForm)}
          newLabel="Nouvel utilisateur"
        />
      </PageHeader>

      {showForm && (
        <FormCard title="Nouvel utilisateur">
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {formInputs.map((input) => (
              <div key={input.name} className="w-full">
                <label className={`block text-xs mb-1 ${t.textMuted}`}>
                  {input.placeholder}
                </label>
                <input
                  name={input.name}
                  type={input.type}
                  className={`${t.input} w-full py-1.5`}
                  value={
                    (createForm[
                      input.name as keyof CreateUserPayload
                    ] as string) || ""
                  }
                  onChange={handleCreateChange}
                  required
                />
              </div>
            ))}

            <div className="w-full">
              <label className={`block text-xs mb-1 ${t.textMuted}`}>
                Rôle
              </label>
              <select
                name="role"
                className={`${t.input} w-full py-1.5`}
                value={createForm.role}
                onChange={handleCreateChange}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r === "professeur"
                      ? "Professeur"
                      : r === "admin"
                        ? "Administrateur"
                        : "Superadmin"}
                  </option>
                ))}
              </select>
              <p className={`text-[11px] mt-1 ${t.textMuted}`}>
                Un mot de passe sera généré et envoyé par email.
              </p>
            </div>

            <div className="md:col-span-2 lg:col-span-4 flex justify-end">
              <button type="submit" className={t.btnPrimary}>
                Ajouter l&apos;utilisateur
              </button>
            </div>
          </form>
        </FormCard>
      )}

      <ScrollableTableCard>
        <DataTable
          data={sortedUsers}
          columns={columns}
          keyExtractor={(item) => item.id}
          editingId={editingId}
          editForm={editForm}
          setEditForm={setEditForm}
          onEdit={startEdit}
          onSave={updateWithUndo}
          onCancel={() => setEditingId(null)}
          onDelete={deleteWithUndo}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isLoading={isLoading}
          emptyMessage="Aucun utilisateur trouvé."
          actionsAllowed={(item) => {
            const protectedRow = item.role === "superadmin" && !isSuperAdmin;
            return {
              canEdit: !protectedRow,
              canDelete: !protectedRow,
            };
          }}
        />
      </ScrollableTableCard>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense>
      <UsersContent />
    </Suspense>
  );
}
