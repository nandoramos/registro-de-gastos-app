ALTER TABLE "source_event" ADD COLUMN "status" text DEFAULT 'registered' NOT NULL;--> statement-breakpoint
ALTER TABLE "source_event" ADD COLUMN "interpretation" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "source_event" ADD COLUMN "issues" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "source_event" ADD COLUMN "reviewed_at" timestamp with time zone;