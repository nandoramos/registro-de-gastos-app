"use client";

import { CategoryNotice } from "@/components/category-notice";
import { useCategories } from "@/components/category-cache";
import { CategoriesManager } from "@/components/categories-manager";
import { ExpenseForm } from "@/components/expense-form";
import type { AccountView } from "@/modules/accounts/domain";

export function CachedCategoriesManager({ userId }: { userId: string }) {
  const state = useCategories(userId);
  return (
    <>
      <CategoryNotice {...state} />
      <CategoriesManager
        key={userId}
        categories={state.categories ?? []}
        saveCategory={state.save}
        disabled={!state.categories}
      />
    </>
  );
}

export function CachedExpenseForm({
  userId,
  accounts,
}: {
  userId: string;
  accounts: AccountView[];
}) {
  const state = useCategories(userId);
  return (
    <>
      <CategoryNotice {...state} />
      <ExpenseForm
        key={userId}
        accounts={accounts}
        categories={state.categories ?? []}
        categoriesReady={!!state.categories}
        onCategoryRejected={() => void state.refresh(true)}
      />
    </>
  );
}
