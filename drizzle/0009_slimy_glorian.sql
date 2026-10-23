CREATE TABLE "own_transfer" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_event_id" text NOT NULL,
	"kind" text NOT NULL,
	"operation_date" date NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"source_account_id" text NOT NULL,
	"destination_account_id" text NOT NULL,
	"source_amount" numeric(18, 2) NOT NULL,
	"destination_amount" numeric(18, 2) NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "own_transfer_title_not_blank" CHECK (btrim("own_transfer"."title") <> ''),
	CONSTRAINT "own_transfer_kind_allowed" CHECK ("own_transfer"."kind" in ('transfer', 'withdrawal')),
	CONSTRAINT "own_transfer_currency_allowed" CHECK ("own_transfer"."currency" in ('UYU', 'USD')),
	CONSTRAINT "own_transfer_source_amount_positive" CHECK ("own_transfer"."source_amount" > 0),
	CONSTRAINT "own_transfer_destination_amount_positive" CHECK ("own_transfer"."destination_amount" > 0),
	CONSTRAINT "own_transfer_accounts_different" CHECK ("own_transfer"."source_account_id" <> "own_transfer"."destination_account_id"),
	CONSTRAINT "own_transfer_amounts_equal" CHECK ("own_transfer"."source_amount" = "own_transfer"."destination_amount")
);
--> statement-breakpoint
ALTER TABLE "own_transfer" ADD CONSTRAINT "own_transfer_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "own_transfer" ADD CONSTRAINT "own_transfer_source_event_id_source_event_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."source_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "own_transfer" ADD CONSTRAINT "own_transfer_source_account_id_financial_account_id_fk" FOREIGN KEY ("source_account_id") REFERENCES "public"."financial_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "own_transfer" ADD CONSTRAINT "own_transfer_destination_account_id_financial_account_id_fk" FOREIGN KEY ("destination_account_id") REFERENCES "public"."financial_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "own_transfer_user_date_idx" ON "own_transfer" USING btree ("user_id","operation_date");--> statement-breakpoint
CREATE UNIQUE INDEX "own_transfer_source_event_unique" ON "own_transfer" USING btree ("source_event_id");