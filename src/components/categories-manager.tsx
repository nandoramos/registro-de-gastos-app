"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CategoryView } from "@/modules/categories/domain";

type ApiError = { error?: string };

function message(error?: string) {
  return error === "INVALID_NAME"
    ? "Ingresá un nombre de hasta 80 caracteres."
    : "No pudimos guardar el cambio. Intentá nuevamente.";
}

export function CategoriesManager({
  initialCategories,
}: {
  initialCategories: CategoryView[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [editingName, setEditingName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [showArchived, setShowArchived] = useState(false);

  async function create(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = (await response.json()) as CategoryView & ApiError;
      if (!response.ok) throw new Error(body.error);
      setCategories((current) =>
        [...current, body].sort((a, b) => a.name.localeCompare(b.name, "es")),
      );
      setName("");
    } catch (caught) {
      setError(message(caught instanceof Error ? caught.message : undefined));
    } finally {
      setPending(false);
    }
  }

  async function rename(event: FormEvent, category: CategoryView) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: editingName }),
      });
      const body = (await response.json()) as CategoryView & ApiError;
      if (!response.ok) throw new Error(body.error);
      setCategories((current) =>
        current
          .map((item) => (item.id === body.id ? body : item))
          .sort((a, b) => a.name.localeCompare(b.name, "es")),
      );
      setEditingId(undefined);
      setEditingName("");
    } catch (caught) {
      setError(message(caught instanceof Error ? caught.message : undefined));
    } finally {
      setPending(false);
    }
  }
  async function archive(category: CategoryView) {
    setPending(true); setError(undefined);
    try {
      const response = await fetch(`/api/categories/${category.id}/archive`, { method: "POST" });
      const archived = await response.json() as CategoryView & ApiError;
      if (!response.ok) throw new Error(archived.error);
      setCategories((current) => current.map((item) => item.id === category.id ? archived : item));
    } catch (caught) { setError(message(caught instanceof Error ? caught.message : undefined)); } finally { setPending(false); }
  }

  async function unarchive(category: CategoryView) {
    setPending(true); setError(undefined);
    try {
      const response = await fetch(`/api/categories/${category.id}/unarchive`, { method: "POST" });
      const restored = await response.json() as CategoryView & ApiError;
      if (!response.ok) throw new Error(restored.error);
      setCategories((current) => current.map((item) => item.id === category.id ? restored : item));
    } catch (caught) { setError(message(caught instanceof Error ? caught.message : undefined)); } finally { setPending(false); }
  }

  const archivedCount = categories.filter((category) => category.archivedAt).length;
  const visibleCategories = categories.filter((category) => showArchived || !category.archivedAt);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="categories-title">
        <h2 id="categories-title" className="text-xl font-semibold">
          Tus categorías
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Son categorías de un solo nivel. Podés cambiar sus nombres sin perder
          los gastos asociados.
        </p>
        {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
        <ul className="mt-6 flex flex-col gap-2">
          {visibleCategories.map((category) => (
            <li
              key={category.id}
              className={`rounded-lg border border-stone-200 bg-white px-3 py-2.5 ${category.archivedAt ? "opacity-75" : ""}`}
            >
              {editingId === category.id ? (
                <form
                  className="space-y-3"
                  onSubmit={(event) => rename(event, category)}
                >
                  <label
                    className="sr-only"
                    htmlFor={`rename-category-${category.id}`}
                  >
                    Nuevo nombre
                  </label>
                  <input
                    id={`rename-category-${category.id}`}
                    className="min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none"
                    value={editingName}
                    maxLength={80}
                    required
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button disabled={pending}>Guardar</Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => setEditingId(undefined)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{category.name}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {category.archivedAt ? "Archivada" : category.systemKey ? "Inicial" : "Personalizada"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {category.archivedAt ? (
                      <Button type="button" variant="outline" disabled={pending} aria-label={`Desarchivar ${category.name}`} onClick={() => unarchive(category)} className="min-h-9 rounded-md px-3 py-1 text-xs">
                        Desarchivar
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          aria-label={`Renombrar ${category.name}`}
                          title={`Renombrar ${category.name}`}
                          className="!min-h-11 !w-11 !px-0 rounded-md"
                          onClick={() => {
                            setEditingId(category.id);
                            setEditingName(category.name);
                            setError(undefined);
                          }}
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 2.651 2.651M4 20l4.5-.9L19.6 8a1.875 1.875 0 0 0-2.65-2.65L5.85 16.45 4 20Z" /></svg>
                        </Button>
                        <Button type="button" variant="outline" disabled={pending} aria-label={`Archivar ${category.name}`} title={`Archivar ${category.name}`} onClick={() => archive(category)} className="!min-h-11 !w-11 !px-0 rounded-md">
                          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v6m6-6v6" /></svg>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        {archivedCount > 0 && <Button type="button" variant="outline" onClick={() => setShowArchived((value) => !value)} className="mt-3 min-h-10 rounded-md px-3 py-2 text-xs">{showArchived ? "Ocultar" : "Mostrar"} archivadas ({archivedCount})</Button>}
      </section>

      <section
        aria-labelledby="new-category-title"
        className="h-fit rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <h2 id="new-category-title" className="text-xl font-semibold">
          Agregar categoría
        </h2>
        <form className="mt-6 space-y-5" onSubmit={create}>
          <label className="block text-sm font-medium">
            Nombre
            <input
              className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none"
              value={name}
              maxLength={80}
              required
              placeholder="Ej. Mascotas"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <Button className="w-full" disabled={pending}>
            {pending ? "Guardando…" : "Agregar categoría"}
          </Button>
        </form>
        <p className="mt-4 text-xs leading-5 text-stone-500">
          «Otros» queda disponible como elección explícita; la app no la asigna
          automáticamente.
        </p>
      </section>
    </div>
  );
}
