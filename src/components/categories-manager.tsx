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
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
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
                      {category.systemKey ? "Inicial" : "Personalizada"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditingName(category.name);
                      setError(undefined);
                    }}
                  >
                    Renombrar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
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
          {error && (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          )}
        </form>
        <p className="mt-4 text-xs leading-5 text-stone-500">
          «Otros» queda disponible como elección explícita; la app no la asigna
          automáticamente.
        </p>
      </section>
    </div>
  );
}
