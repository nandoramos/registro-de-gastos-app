CREATE TABLE "movement_status_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"movement_type" text NOT NULL,
	"movement_id" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movement_status_event_type_allowed" CHECK ("movement_status_event"."movement_type" in ('expense', 'transfer', 'conversion')),
	CONSTRAINT "movement_status_event_action_allowed" CHECK ("movement_status_event"."action" in ('voided', 'restored'))
);
--> statement-breakpoint
ALTER TABLE "currency_conversion" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "own_transfer" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "movement_status_event" ADD CONSTRAINT "movement_status_event_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movement_status_event_user_movement_idx" ON "movement_status_event" USING btree ("user_id","movement_type","movement_id","created_at");