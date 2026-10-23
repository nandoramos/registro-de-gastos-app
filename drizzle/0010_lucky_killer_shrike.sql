CREATE TABLE "currency_conversion" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_event_id" text NOT NULL,
	"operation_date" date NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"source_account_id" text NOT NULL,
	"destination_account_id" text NOT NULL,
	"source_amount" numeric(18, 2) NOT NULL,
	"destination_amount" numeric(18, 2) NOT NULL,
	"source_currency" text NOT NULL,
	"destination_currency" text NOT NULL,
	"effective_rate" numeric(30, 12) NOT NULL,
	"institution_kind" text,
	"institution_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "currency_conversion_title_not_blank" CHECK (btrim("currency_conversion"."title") <> ''),
	CONSTRAINT "currency_conversion_source_positive" CHECK ("currency_conversion"."source_amount" > 0),
	CONSTRAINT "currency_conversion_destination_positive" CHECK ("currency_conversion"."destination_amount" > 0),
	CONSTRAINT "currency_conversion_rate_positive" CHECK ("currency_conversion"."effective_rate" > 0),
	CONSTRAINT "currency_conversion_currencies_different" CHECK ("currency_conversion"."source_currency" <> "currency_conversion"."destination_currency"),
	CONSTRAINT "currency_conversion_currencies_allowed" CHECK ("currency_conversion"."source_currency" in ('UYU', 'USD') and "currency_conversion"."destination_currency" in ('UYU', 'USD')),
	CONSTRAINT "currency_conversion_accounts_different" CHECK ("currency_conversion"."source_account_id" <> "currency_conversion"."destination_account_id"),
	CONSTRAINT "currency_conversion_institution_allowed" CHECK ("currency_conversion"."institution_kind" is null or "currency_conversion"."institution_kind" in ('itau', 'prex', 'other')),
	CONSTRAINT "currency_conversion_institution_name_valid" CHECK (("currency_conversion"."institution_kind" is null and "currency_conversion"."institution_name" is null) or ("currency_conversion"."institution_kind" in ('itau', 'prex') and "currency_conversion"."institution_name" is not null) or ("currency_conversion"."institution_kind" = 'other' and "currency_conversion"."institution_name" is not null and btrim("currency_conversion"."institution_name") <> ''))
);
--> statement-breakpoint
ALTER TABLE "currency_conversion" ADD CONSTRAINT "currency_conversion_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_conversion" ADD CONSTRAINT "currency_conversion_source_event_id_source_event_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."source_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_conversion" ADD CONSTRAINT "currency_conversion_source_account_id_financial_account_id_fk" FOREIGN KEY ("source_account_id") REFERENCES "public"."financial_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_conversion" ADD CONSTRAINT "currency_conversion_destination_account_id_financial_account_id_fk" FOREIGN KEY ("destination_account_id") REFERENCES "public"."financial_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "currency_conversion_user_date_idx" ON "currency_conversion" USING btree ("user_id","operation_date");--> statement-breakpoint
CREATE UNIQUE INDEX "currency_conversion_source_event_unique" ON "currency_conversion" USING btree ("source_event_id");
