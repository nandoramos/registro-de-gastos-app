CREATE TABLE "expense_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"user_id" text NOT NULL,
	"previous" jsonb NOT NULL,
	"current" jsonb NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_revision" ADD CONSTRAINT "expense_revision_expense_id_expense_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expense"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_revision" ADD CONSTRAINT "expense_revision_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_revision_expense_idx" ON "expense_revision" USING btree ("expense_id","changed_at");--> statement-breakpoint
CREATE INDEX "expense_revision_user_idx" ON "expense_revision" USING btree ("user_id");