import SortHeader from "./SortHeader";
import { useTheme } from "../contexts/ThemeContext";
import { TableSkeleton } from "./Skeleton";
import { DataTableProps } from "../types/models";
import Image from "next/image";

export default function DataTable<T>({
  data,
  columns,
  keyExtractor,
  editingId,
  editForm,
  setEditForm,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  sortField,
  sortDirection,
  onSort,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Rechercher...",
  isLoading = false,
  hideActions = false,
  emptyMessage = "Aucun résultat trouvé.",
  actionsAllowed,
  wrapColsClass = "grid-cols-1 sm:grid-cols-2",
}: DataTableProps<T> & {
  emptyMessage?: string;
}) {
  const { t } = useTheme();

  const Actions = ({ id, item }: { id: string | number; item?: T }) => {
    if (editingId === id) {
      return (
        <div className="flex gap-1.5 justify-end">
          <button
            onClick={() => onSave(id, editForm)}
            className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 px-2.5 py-1 rounded-[calc(var(--radius-box)/2)] text-xs font-semibold cursor-pointer transition-all h-7.5 flex items-center justify-center gap-1.5"
            title="Valider"
          >
            <Image
              src="/icons/approved.webp"
              alt="Valider"
              width={14}
              height={14}
              className="object-contain brightness-0 invert shrink-0"
              unoptimized
            />
          </button>
          <button
            onClick={onCancel}
            className="bg-white/5 border border-(--border-color) text-(--text-main) hover:bg-white/10 px-2.5 py-1 rounded-[calc(var(--radius-box)/2)] text-xs font-semibold cursor-pointer transition-all h-7.5 flex items-center justify-center gap-1.5"
            title="Annuler"
          >
            <Image
              src="/icons/cancel.webp"
              alt="Annuler"
              width={14}
              height={14}
              className="object-contain brightness-0 invert shrink-0"
              unoptimized
            />
          </button>
        </div>
      );
    }
    return (
      <div className="flex justify-end gap-1.5 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity duration-200">
        {(!actionsAllowed || actionsAllowed(item as T).canEdit !== false) && (
          <button
            onClick={() => item && onEdit(item)}
            className="bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 px-2 py-1 rounded-[calc(var(--radius-box)/2)] text-xs font-semibold cursor-pointer transition-all h-7.5 w-7.5 flex items-center justify-center"
            title="Modifier"
          >
            <Image
              src="/icons/edit.webp"
              alt="Modifier"
              width={14}
              height={14}
              className="object-contain brightness-0 invert shrink-0"
              unoptimized
            />
          </button>
        )}
        {(!actionsAllowed || actionsAllowed(item as T).canDelete !== false) && (
          <button
            onClick={() => onDelete(id)}
            className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded-[calc(var(--radius-box)/2)] text-xs font-semibold cursor-pointer transition-all h-7.5 w-7.5 flex items-center justify-center"
            title="Supprimer"
          >
            <Image
              src="/icons/trash.webp"
              alt="Supprimer"
              width={14}
              height={14}
              className="object-contain brightness-0 invert shrink-0"
              unoptimized
            />
          </button>
        )}
      </div>
    );
  };

  const hasActions = !hideActions;
  const totalColumns = columns.length + (hasActions ? 1 : 0);

  const SearchBar = () =>
    onSearchChange ? (
      <div className="shrink-0">
        <input
          type="text"
          className={`${t.input} w-full`}
          placeholder={searchPlaceholder}
          value={searchQuery || ""}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    ) : null;

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      <div className="hidden lg:flex flex-col flex-1 min-h-0">
        {onSearchChange && (
          <div className="shrink-0 flex justify-end px-3 py-2 border-b border-(--border-color)">
            <input
              type="text"
              className={`${t.input} w-64 py-1! text-xs!`}
              placeholder={searchPlaceholder}
              value={searchQuery || ""}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm table-fixed">
            <thead>
              <tr className="border-b border-(--border-color)">
                {columns.map((col, i) =>
                  col.sortable && onSort ? (
                    <SortHeader
                      key={i}
                      field={col.field}
                      label={col.label as string}
                      sortField={sortField || ""}
                      sortDirection={sortDirection || "asc"}
                      onSort={onSort}
                      className={col.className}
                    />
                  ) : (
                    <th
                      key={i}
                      className={`sticky top-0 z-30 px-3 py-3 font-semibold ${t.tableHeader} ${col.className || ""}`}
                    >
                      {col.label as string}
                    </th>
                  ),
                )}
                {hasActions && (
                  <th
                    className={`sticky top-0 z-30 px-3 py-3 font-semibold text-right ${t.tableHeader}`}
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-color)">
              {isLoading ? (
                <TableSkeleton columns={totalColumns} rows={10} />
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalColumns}
                    className={`p-6 text-center break-words whitespace-normal ${t.textMuted}`}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const id = keyExtractor(item);
                  const isEditing = editingId === id;
                  return (
                    <tr
                      key={id}
                      className={`group transition-colors ${t.tableRow} ${isEditing ? "bg-white/5" : ""}`}
                    >
                      {columns.map((col, i) => (
                        <td
                          key={i}
                          className={`px-3 py-3.5 truncate ${col.className || ""}`}
                        >
                          {isEditing && col.renderEdit
                            ? col.renderEdit(editForm, (val) =>
                                setEditForm((prev) => ({ ...prev, ...val })),
                              )
                            : col.render(item)}
                        </td>
                      ))}
                      {hasActions && (
                        <td className="px-3 py-3.5 text-right">
                          <Actions id={id} item={item} />
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="lg:hidden flex flex-col gap-2 flex-1 min-h-0">
        <SearchBar />
        {isLoading ? (
          <div className={`p-4 text-center ${t.textMuted}`}>Chargement...</div>
        ) : data.length === 0 ? (
          <div className={`p-4 text-center break-words ${t.textMuted}`}>{emptyMessage}</div>
        ) : (
          <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 grid ${wrapColsClass} gap-3 content-start`}>
            {data.map((item) => {
              const id = keyExtractor(item);
              return (
                <div key={id} className={`${t.card} p-4 h-fit`}>
                  <dl className="space-y-3">
                    {columns.map((col, i) => (
                      <div key={i} className="min-w-0">
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                          {typeof col.label === "string" ? col.label : "Champ"}
                        </dt>
                        <dd className="mt-0.5 text-sm leading-snug break-words">
                          {editingId === id && col.renderEdit
                            ? col.renderEdit(editForm, (val) =>
                                setEditForm((prev) => ({ ...prev, ...val })),
                              )
                            : col.render(item)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {hasActions && (
                    <div className="mt-3 pt-3 border-t border-(--border-color)">
                      <Actions id={id} item={item} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
