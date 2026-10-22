CREATE TABLE "financial_account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_account_name_not_blank" CHECK (btrim("financial_account"."name") <> ''),
	CONSTRAINT "financial_account_kind_allowed" CHECK ("financial_account"."kind" in ('bank', 'cash')),
	CONSTRAINT "financial_account_currency_allowed" CHECK ("financial_account"."currency" in ('UYU', 'USD'))
);
--> statement-breakpoint
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_account_user_idx" ON "financial_account" USING btree ("user_id");