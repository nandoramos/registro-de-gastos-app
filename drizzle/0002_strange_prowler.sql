CREATE TABLE "expense_category" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"system_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_category_name_not_blank" CHECK (btrim("expense_category"."name") <> '')
);
--> statement-breakpoint
ALTER TABLE "expense_category" ADD CONSTRAINT "expense_category_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_category_user_idx" ON "expense_category" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_category_user_system_key_unique" ON "expense_category" USING btree ("user_id","system_key");