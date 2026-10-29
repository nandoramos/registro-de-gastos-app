CREATE TABLE "manual_adjustment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_event_id" text NOT NULL,
	"account_id" text NOT NULL,
	"category_id" text,
	"operation_date" date NOT NULL,
	"title" text DEFAULT 'Ajuste manual' NOT NULL,
	"note" text,
	"direction" text NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manual_adjustment_title_not_blank" CHECK (btrim("manual_adjustment"."title") <> ''),
	CONSTRAINT "manual_adjustment_direction_allowed" CHECK ("manual_adjustment"."direction" in ('increase', 'decrease')),
	CONSTRAINT "manual_adjustment_amount_positive" CHECK ("manual_adjustment"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "movement_status_event" DROP CONSTRAINT "movement_status_event_type_allowed";--> statement-breakpoint
ALTER TABLE "manual_adjustment" ADD CONSTRAINT "manual_adjustment_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_adjustment" ADD CONSTRAINT "manual_adjustment_source_event_id_source_event_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."source_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_adjustment" ADD CONSTRAINT "manual_adjustment_account_id_financial_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_adjustment" ADD CONSTRAINT "manual_adjustment_category_id_expense_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manual_adjustment_user_date_idx" ON "manual_adjustment" USING btree ("user_id","operation_date");--> statement-breakpoint
CREATE UNIQUE INDEX "manual_adjustment_source_event_unique" ON "manual_adjustment" USING btree ("source_event_id");--> statement-breakpoint
ALTER TABLE "movement_status_event" ADD CONSTRAINT "movement_status_event_type_allowed" CHECK ("movement_status_event"."movement_type" in ('expense', 'income', 'transfer', 'conversion', 'adjustment'));