"use client";

import type { ComponentProps } from "react";
import { useCategories } from "@/components/category-cache";
import { CategoryNotice } from "@/components/category-notice";
import { ExpenseEditForm } from "@/components/expense-edit-form";
import { ExpenseRevisionList } from "@/components/expense-revision-list";
import { EmailIngestionForm } from "@/components/email-ingestion-form";
import { PendingEntryForm } from "@/components/pending-entry-form";
import { EmailTransferChoiceForm } from "@/components/email-transfer-choice-form";
import type { ExpenseDetail } from "@/modules/expenses/domain";
import type { AccountView } from "@/modules/accounts/domain";

export function CachedCategoryName({ userId, category }: { userId: string; category: { id: string; name: string } }) {
  const state = useCategories(userId);
  return state.categories?.find(item => item.id === category.id)?.name ?? category.name;
}

export function CachedExpenseEditor({ userId, expense, accounts }: { userId: string; expense: ExpenseDetail; accounts: AccountView[] }) {
  const state = useCategories(userId);
  return <>
    <CategoryNotice {...state} />
    {!expense.voidedAt && <section className="mt-8">
      <h2 className="text-xl font-semibold">Corregir gasto</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">Los cambios válidos se aplican al gasto. La evidencia original no se modifica.</p>
      <ExpenseEditForm key={`${userId}:${expense.id}`} expense={expense} accounts={accounts} categories={state.categories ?? []} categoriesReady={!!state.categories} onCategoryRejected={() => void state.refresh(true)} />
    </section>}
    <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Historial de correcciones</h2>
      {state.categories && <ExpenseRevisionList history={expense.history} accounts={accounts} categories={state.categories} />}
    </section>
  </>;
}

export function CachedEmailIngestionForm({ userId, ...props }: Omit<ComponentProps<typeof EmailIngestionForm>, "categories"> & { userId: string }) {
  const state = useCategories(userId);
  return <><CategoryNotice {...state} /><EmailIngestionForm key={userId} {...props} categories={state.categories ?? []} categoriesReady={!!state.categories} onCategoryRejected={() => void state.refresh(true)} /></>;
}

export function CachedPendingEntryForm({ userId, ...props }: Omit<ComponentProps<typeof PendingEntryForm>, "categories"> & { userId: string }) {
  const state = useCategories(userId);
  return <><CategoryNotice {...state} /><PendingEntryForm key={`${userId}:${props.entry.id}`} {...props} categories={state.categories ?? []} categoriesReady={!!state.categories} onCategoryRejected={() => void state.refresh(true)} /></>;
}

export function CachedEmailTransferChoiceForm({ userId, ...props }: Omit<ComponentProps<typeof EmailTransferChoiceForm>, "categories"> & { userId: string }) {
  const state = useCategories(userId);
  return <><CategoryNotice {...state} /><EmailTransferChoiceForm key={`${userId}:${props.entryId}`} {...props} categories={state.categories ?? []} categoriesReady={!!state.categories} onCategoryRejected={() => void state.refresh(true)} /></>;
}
