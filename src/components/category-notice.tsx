"use client";

import type { useCategories } from "@/components/category-cache";

export function CategoryNotice({
  categories,
  loading,
  error,
  refresh,
}: ReturnType<typeof useCategories>) {
  if (error)
    return (
      <div
        role={categories ? "status" : "alert"}
        className="mb-4 rounded-xl border p-4 text-sm"
      >
        <p>
          {categories
            ? "No pudimos actualizar las categorías. Se conserva la lista anterior."
            : "No pudimos cargar las categorías. Podés seguir completando el formulario."}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-2 min-h-11 font-semibold underline"
        >
          Reintentar categorías
        </button>
      </div>
    );
  if (!categories || loading)
    return (
      <p role="status" className="mb-4 text-sm">
        {categories ? "Actualizando categorías…" : "Cargando categorías…"}
      </p>
    );
  return null;
}
