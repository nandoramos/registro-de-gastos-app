CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"usd_buy_rate" numeric(18, 2) DEFAULT '40.00' NOT NULL,
	"usd_sell_rate" numeric(18, 2) DEFAULT '40.00' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_buy_rate_positive" CHECK ("user_settings"."usd_buy_rate" > 0),
	CONSTRAINT "user_settings_sell_rate_positive" CHECK ("user_settings"."usd_sell_rate" > 0)
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;