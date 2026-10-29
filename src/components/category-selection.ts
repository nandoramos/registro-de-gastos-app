"use client";

import { useState } from "react";
import type { CategoryView } from "@/modules/categories/domain";

export function useCategorySelection(categories: CategoryView[], selectedId: string, ready: boolean, retainedId?: string) {
  const [rejectedId, setRejectedId] = useState<string>();
  const valid = ready && rejectedId !== selectedId && categories.some(category => category.id === selectedId && (!category.archivedAt || category.id === retainedId));
  return {
    valid,
    invalid: !!selectedId && ready && !valid,
    options: categories.filter(category => !category.archivedAt || category.id === selectedId || category.id === retainedId),
    disabled: (category: CategoryView) => !!category.archivedAt && category.id !== retainedId,
    reject: () => setRejectedId(selectedId),
    change: () => setRejectedId(undefined),
  };
}
