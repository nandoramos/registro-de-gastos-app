import {
  boolean,
  check,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { InitialCategoryKey } from "@/modules/categories/domain";
import type { ExpenseInput } from "@/modules/expenses/domain";

export const user = pgTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const session = pgTable(
  "auth_session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("auth_session_user_idx").on(table.userId)],
);
export const account = pgTable(
  "auth_account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("auth_account_provider_subject_idx").on(
      table.providerId,
      table.accountId,
    ),
    index("auth_account_user_idx").on(table.userId),
  ],
);
export const verification = pgTable(
  "auth_verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("auth_verification_identifier_idx").on(table.identifier)],
);

export const financialAccount = pgTable(
  "financial_account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").$type<"bank" | "cash">().notNull(),
    currency: text("currency").$type<"UYU" | "USD">().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("financial_account_user_idx").on(table.userId),
    check("financial_account_name_not_blank", sql`btrim(${table.name}) <> ''`),
    check(
      "financial_account_kind_allowed",
      sql`${table.kind} in ('bank', 'cash')`,
    ),
    check(
      "financial_account_currency_allowed",
      sql`${table.currency} in ('UYU', 'USD')`,
    ),
  ],
);

export const expenseCategory = pgTable(
  "expense_category",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    systemKey: text("system_key").$type<InitialCategoryKey>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("expense_category_user_idx").on(table.userId),
    uniqueIndex("expense_category_user_system_key_unique").on(
      table.userId,
      table.systemKey,
    ),
    check("expense_category_name_not_blank", sql`btrim(${table.name}) <> ''`),
  ],
);

export const sourceEvent = pgTable(
  "source_event",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceType: text("source_type").$type<"manual" | "email">().notNull(),
    originalPayload: jsonb("original_payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("source_event_user_idx").on(table.userId),
    check(
      "source_event_type_allowed",
      sql`${table.sourceType} in ('manual', 'email')`,
    ),
  ],
);

export const pendingEntry = pgTable(
  "pending_entry",
  {
    sourceEventId: text("source_event_id")
      .primaryKey()
      .references(() => sourceEvent.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<"pending" | "discarded">()
      .notNull()
      .default("pending"),
    interpretation: jsonb("interpretation")
      .$type<Record<string, unknown>>()
      .notNull(),
    issues: jsonb("issues").$type<string[]>().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    discardedAt: timestamp("discarded_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("pending_entry_user_idx").on(table.userId),
    check(
      "pending_entry_status_allowed",
      sql`${table.status} in ('pending', 'discarded')`,
    ),
    check(
      "pending_entry_discard_state_valid",
      sql`(${table.status} = 'discarded' and ${table.discardedAt} is not null) or (${table.status} = 'pending' and ${table.discardedAt} is null)`,
    ),
  ],
);

export const sourceEventReview = pgTable(
  "source_event_review",
  {
    id: text("id").primaryKey(),
    sourceEventId: text("source_event_id")
      .notNull()
      .references(() => sourceEvent.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    interpretation: jsonb("interpretation")
      .$type<Record<string, unknown>>()
      .notNull(),
    issues: jsonb("issues").$type<string[]>().notNull(),
    outcome: text("outcome")
      .$type<"pending" | "registered" | "discarded" | "recovered">()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("source_event_review_event_idx").on(table.sourceEventId),
    index("source_event_review_user_idx").on(table.userId),
  ],
);

export const expense = pgTable(
  "expense",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceEventId: text("source_event_id")
      .notNull()
      .references(() => sourceEvent.id),
    accountId: text("account_id")
      .notNull()
      .references(() => financialAccount.id),
    categoryId: text("category_id")
      .notNull()
      .references(() => expenseCategory.id),
    operationDate: date("operation_date", { mode: "string" }).notNull(),
    operationTime: time("operation_time"),
    title: text("title").notNull(),
    note: text("note"),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    currency: text("currency").$type<"UYU" | "USD">().notNull(),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("expense_user_date_idx").on(table.userId, table.operationDate),
    uniqueIndex("expense_source_event_unique").on(table.sourceEventId),
    check("expense_title_not_blank", sql`btrim(${table.title}) <> ''`),
    check("expense_amount_positive", sql`${table.amount} > 0`),
    check("expense_currency_allowed", sql`${table.currency} in ('UYU', 'USD')`),
  ],
);

export const expenseRevision = pgTable(
  "expense_revision",
  {
    id: text("id").primaryKey(),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expense.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    previous: jsonb("previous").$type<ExpenseInput>().notNull(),
    current: jsonb("current").$type<ExpenseInput>().notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("expense_revision_expense_idx").on(table.expenseId, table.changedAt),
    index("expense_revision_user_idx").on(table.userId),
  ],
);

export const ownTransfer = pgTable(
  "own_transfer",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceEventId: text("source_event_id")
      .notNull()
      .references(() => sourceEvent.id),
    kind: text("kind").$type<"transfer" | "withdrawal">().notNull(),
    operationDate: date("operation_date", { mode: "string" }).notNull(),
    title: text("title").notNull(),
    note: text("note"),
    sourceAccountId: text("source_account_id")
      .notNull()
      .references(() => financialAccount.id),
    destinationAccountId: text("destination_account_id")
      .notNull()
      .references(() => financialAccount.id),
    sourceAmount: numeric("source_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    destinationAmount: numeric("destination_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    currency: text("currency").$type<"UYU" | "USD">().notNull(),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("own_transfer_user_date_idx").on(table.userId, table.operationDate),
    uniqueIndex("own_transfer_source_event_unique").on(table.sourceEventId),
    check("own_transfer_title_not_blank", sql`btrim(${table.title}) <> ''`),
    check(
      "own_transfer_kind_allowed",
      sql`${table.kind} in ('transfer', 'withdrawal')`,
    ),
    check(
      "own_transfer_currency_allowed",
      sql`${table.currency} in ('UYU', 'USD')`,
    ),
    check(
      "own_transfer_source_amount_positive",
      sql`${table.sourceAmount} > 0`,
    ),
    check(
      "own_transfer_destination_amount_positive",
      sql`${table.destinationAmount} > 0`,
    ),
    check(
      "own_transfer_accounts_different",
      sql`${table.sourceAccountId} <> ${table.destinationAccountId}`,
    ),
    check(
      "own_transfer_amounts_equal",
      sql`${table.sourceAmount} = ${table.destinationAmount}`,
    ),
  ],
);

export const currencyConversion = pgTable(
  "currency_conversion",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceEventId: text("source_event_id")
      .notNull()
      .references(() => sourceEvent.id),
    operationDate: date("operation_date", { mode: "string" }).notNull(),
    title: text("title").notNull(),
    note: text("note"),
    sourceAccountId: text("source_account_id")
      .notNull()
      .references(() => financialAccount.id),
    destinationAccountId: text("destination_account_id")
      .notNull()
      .references(() => financialAccount.id),
    sourceAmount: numeric("source_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    destinationAmount: numeric("destination_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    sourceCurrency: text("source_currency").$type<"UYU" | "USD">().notNull(),
    destinationCurrency: text("destination_currency")
      .$type<"UYU" | "USD">()
      .notNull(),
    effectiveRate: numeric("effective_rate", {
      precision: 30,
      scale: 12,
    }).notNull(),
    institutionKind: text("institution_kind").$type<
      "itau" | "prex" | "other"
    >(),
    institutionName: text("institution_name"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("currency_conversion_user_date_idx").on(
      table.userId,
      table.operationDate,
    ),
    uniqueIndex("currency_conversion_source_event_unique").on(
      table.sourceEventId,
    ),
    check(
      "currency_conversion_title_not_blank",
      sql`btrim(${table.title}) <> ''`,
    ),
    check(
      "currency_conversion_source_positive",
      sql`${table.sourceAmount} > 0`,
    ),
    check(
      "currency_conversion_destination_positive",
      sql`${table.destinationAmount} > 0`,
    ),
    check("currency_conversion_rate_positive", sql`${table.effectiveRate} > 0`),
    check(
      "currency_conversion_currencies_different",
      sql`${table.sourceCurrency} <> ${table.destinationCurrency}`,
    ),
    check(
      "currency_conversion_currencies_allowed",
      sql`${table.sourceCurrency} in ('UYU', 'USD') and ${table.destinationCurrency} in ('UYU', 'USD')`,
    ),
    check(
      "currency_conversion_accounts_different",
      sql`${table.sourceAccountId} <> ${table.destinationAccountId}`,
    ),
    check(
      "currency_conversion_institution_allowed",
      sql`${table.institutionKind} is null or ${table.institutionKind} in ('itau', 'prex', 'other')`,
    ),
    check(
      "currency_conversion_institution_name_valid",
      sql`(${table.institutionKind} is null and ${table.institutionName} is null) or (${table.institutionKind} in ('itau', 'prex') and ${table.institutionName} is not null) or (${table.institutionKind} = 'other' and ${table.institutionName} is not null and btrim(${table.institutionName}) <> '')`,
    ),
  ],
);

export const movementStatusEvent = pgTable(
  "movement_status_event",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    movementType: text("movement_type")
      .$type<"expense" | "transfer" | "conversion">()
      .notNull(),
    movementId: text("movement_id").notNull(),
    action: text("action").$type<"voided" | "restored">().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("movement_status_event_user_movement_idx").on(
      table.userId,
      table.movementType,
      table.movementId,
      table.createdAt,
    ),
    check(
      "movement_status_event_type_allowed",
      sql`${table.movementType} in ('expense', 'transfer', 'conversion')`,
    ),
    check(
      "movement_status_event_action_allowed",
      sql`${table.action} in ('voided', 'restored')`,
    ),
  ],
);
