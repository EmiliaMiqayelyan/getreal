import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/utils/cn";
import { subcategoriesForCategory } from "@/utils/subcategories";

type ManageSubcategoriesModalProps = {
  open: boolean;
  category: string;
  selectedSubcategory: string;
  onClose: () => void;
  onSubcategoryChange: (value: string) => void;
};

export function ManageSubcategoriesModal({
  open,
  category,
  selectedSubcategory,
  onClose,
  onSubcategoryChange,
}: ManageSubcategoriesModalProps) {
  const {
    subcategoriesByCategory,
    addSubcategory,
    renameSubcategory,
    removeSubcategory,
  } = useAppCatalog();
  useScrollLock(open);

  const [draftName, setDraftName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const options = subcategoriesForCategory(subcategoriesByCategory, category);

  useEffect(() => {
    if (!open) return;
    setDraftName("");
    setEditingName(null);
    setEditValue("");
    setError(null);
  }, [open, category]);

  if (!open) return null;

  function handleCreate() {
    const result = addSubcategory(category, draftName);
    if (result) {
      setError(result);
      return;
    }
    const created = draftName.trim();
    setDraftName("");
    setError(null);
    onSubcategoryChange(created);
  }

  function startEdit(name: string) {
    setEditingName(name);
    setEditValue(name);
    setError(null);
  }

  function cancelEdit() {
    setEditingName(null);
    setEditValue("");
    setError(null);
  }

  function handleRename() {
    if (!editingName) return;
    const result = renameSubcategory(category, editingName, editValue);
    if (result) {
      setError(result);
      return;
    }
    const nextName = editValue.trim();
    if (selectedSubcategory === editingName) {
      onSubcategoryChange(nextName);
    }
    cancelEdit();
  }

  function handleRemove(name: string) {
    const confirmed = window.confirm(
      `Remove subcategory "${name}"? Items using it will clear this field.`,
    );
    if (!confirmed) return;

    const result = removeSubcategory(category, name);
    if (result) {
      setError(result);
      return;
    }
    if (selectedSubcategory === name) {
      onSubcategoryChange("");
    }
    if (editingName === name) {
      cancelEdit();
    }
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto overscroll-none p-6 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-[#333333]/55"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-subcategories-title"
        data-scroll-lock-allow
        className="relative z-10 flex max-h-[min(560px,90vh)] w-full max-w-[440px] flex-col overflow-hidden rounded-[14px] bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#ECECEA] px-5 py-4">
          <div>
            <h2
              id="manage-subcategories-title"
              className="text-[18px] font-semibold tracking-tight text-[#111118]"
            >
              Manage Subcategories
            </h2>
            <p className="mt-0.5 text-[12px] font-medium text-[#8A8A8A]">
              {category || "Select a category first"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-[#2E2E2E]">
              Add subcategory
            </label>
            <div className="flex gap-2">
              <Input
                value={draftName}
                onChange={(event) => {
                  setDraftName(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Organ Meat"
                disabled={!category}
                className="min-w-0 flex-1"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreate();
                  }
                }}
              />
              <Button
                variant="dark"
                size="sm"
                disabled={!category || !draftName.trim()}
                onClick={handleCreate}
              >
                <Plus size={14} />
                Add
              </Button>
            </div>
          </div>

          {error ? (
            <p className="text-[11px] text-[#E25B5B]">{error}</p>
          ) : null}

          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              Existing
            </p>
            {options.length === 0 ? (
              <p className="rounded-[10px] border border-dashed border-[#E6E6E3] px-3 py-6 text-center text-[13px] text-[#8A8A8A]">
                No subcategories yet. Add one above.
              </p>
            ) : (
              <ul className="divide-y divide-[#ECECEA] rounded-[10px] border border-[#ECECEA]">
                {options.map((name) => {
                  const isEditing = editingName === name;
                  return (
                    <li
                      key={name}
                      className="flex items-center gap-2 px-3 py-2.5"
                    >
                      {isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(event) => {
                            setEditValue(event.target.value);
                            if (error) setError(null);
                          }}
                          className="min-w-0 flex-1"
                          autoFocus
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleRename();
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelEdit();
                            }
                          }}
                        />
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#111118]">
                          {name}
                        </span>
                      )}

                      <div className="flex shrink-0 items-center gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              variant="dark"
                              size="sm"
                              onClick={handleRename}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              aria-label={`Edit ${name}`}
                              onClick={() => startEdit(name)}
                              className={cn(
                                "cursor-pointer rounded-md p-1.5 text-[#6B6B6B]",
                                "hover:bg-[#F5F5F3] hover:text-[#111118]",
                              )}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${name}`}
                              onClick={() => handleRemove(name)}
                              className={cn(
                                "cursor-pointer rounded-md p-1.5 text-[#6B6B6B]",
                                "hover:bg-[#FDF2F2] hover:text-[#E25B5B]",
                              )}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end border-t border-[#ECECEA] px-5 py-3">
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
