CREATE TYPE "public"."exception_type" AS ENUM('sla_silence', 'gap', 'late');--> statement-breakpoint
CREATE TYPE "public"."exception_status" AS ENUM('open', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."writeback_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exception_type" "exception_type" NOT NULL,
	"status" "exception_status" DEFAULT 'open' NOT NULL,
	"forecast_id" text NOT NULL,
	"forecast_line_id" uuid NOT NULL,
	"forecast_version" integer NOT NULL,
	"commit_id" text,
	"trading_partner_setup_id" uuid NOT NULL,
	"sla_business_days" integer,
	"due_at" timestamp with time zone,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"reason_code" "reason_code",
	"summary" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp_writebacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"status" "writeback_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_forecast_line_id_forecast_lines_id_fk" FOREIGN KEY ("forecast_line_id") REFERENCES "public"."forecast_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_trading_partner_setup_id_trading_partner_setups_id_fk" FOREIGN KEY ("trading_partner_setup_id") REFERENCES "public"."trading_partner_setups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_acknowledged_by_actors_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_resolved_by_actors_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exceptions_type_line_commit_uq" ON "exceptions" USING btree ("exception_type","forecast_line_id",COALESCE("commit_id", ''));
