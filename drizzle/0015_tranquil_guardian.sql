CREATE TABLE "income" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_event_id" text NOT NULL,
	"account_id" text NOT NULL,
	"operation_date" date NOT NULL,
	"operation_time" time,
	"title" text NOT NULL,
	"note" text,
	"amount" numeric(18, 2) NOT NULL,
	"currency" text NOT NULL,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "income_title_not_blank" CHECK (btrim("income"."title") <> ''),
	CONSTRAINT "income_amount_positive" CHECK ("income"."amount" > 0),
	CONSTRAINT "income_currency_allowed" CHECK ("income"."currency" in ('UYU', 'USD'))
);
--> statement-breakpoint
ALTER TABLE "movement_status_event" DROP CONSTRAINT "movement_status_event_type_allowed";--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_source_event_id_source_event_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."source_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_account_id_financial_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "income_user_date_idx" ON "income" USING btree ("user_id","operation_date");--> statement-breakpoint
CREATE UNIQUE INDEX "income_source_event_unique" ON "income" USING btree ("source_event_id");--> statement-breakpoint
ALTER TABLE "movement_status_event" ADD CONSTRAINT "movement_status_event_type_allowed" CHECK ("movement_status_event"."movement_type" in ('expense', 'income', 'transfer', 'conversion'));