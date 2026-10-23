ALTER TABLE "pending_entry" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_entry" ADD COLUMN "discarded_at" timestamp with time zone;