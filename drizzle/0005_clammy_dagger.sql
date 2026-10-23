CREATE TABLE "pending_entry" (
	"source_event_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"interpretation" jsonb NOT NULL,
	"issues" jsonb NOT NULL,
	"reviewed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_event_review" (
	"id" text PRIMARY KEY NOT NULL,
	"source_event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"interpretation" jsonb NOT NULL,
	"issues" jsonb NOT NULL,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pending_entry" ADD CONSTRAINT "pending_entry_source_event_id_source_event_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."source_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_entry" ADD CONSTRAINT "pending_entry_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_event_review" ADD CONSTRAINT "source_event_review_source_event_id_source_event_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."source_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_event_review" ADD CONSTRAINT "source_event_review_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pending_entry_user_idx" ON "pending_entry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "source_event_review_event_idx" ON "source_event_review" USING btree ("source_event_id");--> statement-breakpoint
CREATE INDEX "source_event_review_user_idx" ON "source_event_review" USING btree ("user_id");--> statement-breakpoint
INSERT INTO "pending_entry" ("source_event_id", "user_id", "interpretation", "issues", "reviewed_at", "updated_at")
SELECT "id", "user_id", "interpretation", "issues", "reviewed_at", COALESCE("reviewed_at", "received_at")
FROM "source_event"
WHERE "status" = 'pending';--> statement-breakpoint
INSERT INTO "source_event_review" ("id", "source_event_id", "user_id", "interpretation", "issues", "outcome", "created_at")
SELECT "id" || ':migration-review', "id", "user_id", "interpretation", "issues", "status", "reviewed_at"
FROM "source_event"
WHERE "reviewed_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "source_event" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "source_event" DROP COLUMN "interpretation";--> statement-breakpoint
ALTER TABLE "source_event" DROP COLUMN "issues";--> statement-breakpoint
ALTER TABLE "source_event" DROP COLUMN "reviewed_at";
