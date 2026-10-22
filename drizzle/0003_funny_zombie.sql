CREATE TABLE "expense" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_event_id" text NOT NULL,
	"account_id" text NOT NULL,
	"category_id" text NOT NULL,
	"operation_date" date NOT NULL,
	"operation_time" time,
	"title" text NOT NULL,
	"note" text,
	"amount" numeric(18, 2) NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_title_not_blank" CHECK (btrim("expense"."title") <> ''),
	CONSTRAINT "expense_amount_positive" CHECK ("expense"."amount" > 0),
	CONSTRAINT "expense_currency_allowed" CHECK ("expense"."currency" in ('UYU', 'USD'))
);
--> statement-breakpoint
CREATE TABLE "source_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_type" text NOT NULL,
	"original_payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_event_type_allowed" CHECK ("source_event"."source_type" in ('manual'))
);
--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_source_event_id_source_event_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."source_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_account_id_financial_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_category_id_expense_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_event" ADD CONSTRAINT "source_event_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_user_date_idx" ON "expense" USING btree ("user_id","operation_date");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_source_event_unique" ON "expense" USING btree ("source_event_id");--> statement-breakpoint
CREATE INDEX "source_event_user_idx" ON "source_event" USING btree ("user_id");