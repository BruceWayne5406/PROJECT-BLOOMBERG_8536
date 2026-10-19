CREATE TYPE "public"."ack_status" AS ENUM('accepted', 'split', 'rejected', 'date_change');--> statement-breakpoint
CREATE TYPE "public"."change_order_status" AS ENUM('proposed', 'accepted', 'rejected', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."commit_grade" AS ENUM('planning', 'firming', 'frozen');--> statement-breakpoint
CREATE TYPE "public"."commit_status" AS ENUM('offered', 'accepted', 'rejected', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."contract_document_type" AS ENUM('nda', 'msa', 'cra', 'qaa', 'tpa');--> statement-breakpoint
CREATE TYPE "public"."demand_type" AS ENUM('base', 'upside', 'npi', 'last_time_buy');--> statement-breakpoint
CREATE TYPE "public"."execution_event_type" AS ENUM('asn', 'receipt', 'invoice');--> statement-breakpoint
CREATE TYPE "public"."forecast_status" AS ENUM('draft', 'published', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."horizon_zone" AS ENUM('strategic', 'planning', 'firm', 'frozen');--> statement-breakpoint
CREATE TYPE "public"."ingestion_channel" AS ENUM('portal', 'excel', 'edi');--> statement-breakpoint
CREATE TYPE "public"."need_by_convention" AS ENUM('dock_date', 'ship_date', 'wafer_start_week');--> statement-breakpoint
CREATE TYPE "public"."party_type" AS ENUM('buyer', 'supplier', 'system');--> statement-breakpoint
CREATE TYPE "public"."reason_code" AS ENUM('CAPACITY', 'MATERIAL', 'YIELD', 'PACK', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."site_role" AS ENUM('ship_to', 'ship_from');--> statement-breakpoint
CREATE TYPE "public"."uom" AS ENUM('units', 'wafers', 'die');--> statement-breakpoint
CREATE TABLE "actors" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"party_type" "party_type" NOT NULL,
	"partner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyers_partner_id_unique" UNIQUE("partner_id")
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"buyer_part_number" text NOT NULL,
	"mpn" text NOT NULL,
	"revision" text NOT NULL,
	"mask_set" text,
	"por_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parts_buyer_pn_rev_uq" UNIQUE("buyer_id","buyer_part_number","revision")
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_type" "party_type" NOT NULL,
	"buyer_id" uuid,
	"supplier_id" uuid,
	"site_code" text NOT NULL,
	"role" "site_role" NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_party_code_role_uq" UNIQUE("site_code","role","party_type")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_partner_id_unique" UNIQUE("partner_id")
);
--> statement-breakpoint
CREATE TABLE "contract_refs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_partner_setup_id" uuid NOT NULL,
	"document_type" "contract_document_type" NOT NULL,
	"clm_document_id" text NOT NULL,
	"clm_url" text,
	"clause_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flexibility_bands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_partner_setup_id" uuid NOT NULL,
	"weeks_to_need_by_min" integer,
	"weeks_to_need_by_max" integer,
	"buyer_qty_variance_pct" numeric(6, 2) NOT NULL,
	"commit_grade" "commit_grade" NOT NULL,
	"horizon_zone" "horizon_zone" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_partner_setups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"strategic_horizon_months" integer NOT NULL,
	"planning_fence_weeks" integer NOT NULL,
	"firm_fence_weeks" integer NOT NULL,
	"frozen_fence_weeks" integer NOT NULL,
	"response_sla_business_days" integer NOT NULL,
	"need_by_convention" "need_by_convention" NOT NULL,
	"uom" "uom" NOT NULL,
	"incoterms" text NOT NULL,
	"currency" text NOT NULL,
	"channel" "ingestion_channel" NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tpa_buyer_supplier_uq" UNIQUE("buyer_id","supplier_id")
);
--> statement-breakpoint
CREATE TABLE "uom_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_partner_setup_id" uuid NOT NULL,
	"part_id" uuid,
	"from_uom" "uom" NOT NULL,
	"to_uom" "uom" NOT NULL,
	"factor" numeric(18, 8) NOT NULL,
	CONSTRAINT "uom_conv_tpa_part_from_to_uq" UNIQUE("trading_partner_setup_id","part_id","from_uom","to_uom")
);
--> statement-breakpoint
CREATE TABLE "forecast_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"forecast_id" text NOT NULL,
	"version" integer NOT NULL,
	"published_at" timestamp with time zone,
	"horizon_bucket" date NOT NULL,
	"requested_qty" numeric(18, 4) NOT NULL,
	"requested_date" date NOT NULL,
	"demand_type" "demand_type" NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"program" text,
	"status" "forecast_status" DEFAULT 'draft' NOT NULL,
	"buyer_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"trading_partner_setup_id" uuid NOT NULL,
	"ship_to_site_id" uuid NOT NULL,
	"uom" "uom" NOT NULL,
	"need_by_convention" "need_by_convention" NOT NULL,
	"published_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forecast_lines_id_version_uq" UNIQUE("forecast_id","version")
);
--> statement-breakpoint
CREATE TABLE "forecast_commits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commit_id" text NOT NULL,
	"parent_forecast_id" text NOT NULL,
	"parent_forecast_line_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"committed_qty" numeric(18, 4) NOT NULL,
	"committed_date" date,
	"commit_grade" "commit_grade",
	"uncommitted_qty" numeric(18, 4) NOT NULL,
	"reason_code" "reason_code",
	"comment" text,
	"committed_by" text NOT NULL,
	"committed_at" timestamp with time zone NOT NULL,
	"status" "commit_status" DEFAULT 'offered' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forecast_commits_id_version_uq" UNIQUE("commit_id","version")
);
--> statement-breakpoint
CREATE TABLE "po_acknowledgements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"ack_status" "ack_status" NOT NULL,
	"promise_qty" numeric(18, 4) NOT NULL,
	"promise_date" date NOT NULL,
	"change_reason" "reason_code",
	"acknowledged_by" text NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_number" text NOT NULL,
	"line" text NOT NULL,
	"schedule_line" text NOT NULL,
	"source_commit_id" text NOT NULL,
	"source_commit_version" integer NOT NULL,
	"firm_qty" numeric(18, 4) NOT NULL,
	"firm_date" date NOT NULL,
	"price" numeric(18, 6),
	"contract_ref_id" uuid,
	"buyer_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "po_number_line_schedule_uq" UNIQUE("po_number","line","schedule_line")
);
--> statement-breakpoint
CREATE TABLE "change_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_order_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"proposed_qty" numeric(18, 4),
	"proposed_date" date,
	"reason_code" "reason_code" NOT NULL,
	"status" "change_order_status" DEFAULT 'proposed' NOT NULL,
	"initiated_by_party" "party_type" NOT NULL,
	"initiated_by" text NOT NULL,
	"buyer_accepted_at" timestamp with time zone,
	"supplier_accepted_at" timestamp with time zone,
	"msa_clause_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "change_orders_id_version_uq" UNIQUE("change_order_id","version")
);
--> statement-breakpoint
CREATE TABLE "execution_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"event_type" "execution_event_type" NOT NULL,
	"external_id" text NOT NULL,
	"qty" numeric(18, 4),
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"reason_code" "reason_code",
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"aggregate_version" text NOT NULL,
	"actor_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_refs" ADD CONSTRAINT "contract_refs_trading_partner_setup_id_trading_partner_setups_id_fk" FOREIGN KEY ("trading_partner_setup_id") REFERENCES "public"."trading_partner_setups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flexibility_bands" ADD CONSTRAINT "flexibility_bands_trading_partner_setup_id_trading_partner_setups_id_fk" FOREIGN KEY ("trading_partner_setup_id") REFERENCES "public"."trading_partner_setups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_partner_setups" ADD CONSTRAINT "trading_partner_setups_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_partner_setups" ADD CONSTRAINT "trading_partner_setups_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uom_conversions" ADD CONSTRAINT "uom_conversions_trading_partner_setup_id_trading_partner_setups_id_fk" FOREIGN KEY ("trading_partner_setup_id") REFERENCES "public"."trading_partner_setups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uom_conversions" ADD CONSTRAINT "uom_conversions_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_lines" ADD CONSTRAINT "forecast_lines_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_lines" ADD CONSTRAINT "forecast_lines_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_lines" ADD CONSTRAINT "forecast_lines_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_lines" ADD CONSTRAINT "forecast_lines_trading_partner_setup_id_trading_partner_setups_id_fk" FOREIGN KEY ("trading_partner_setup_id") REFERENCES "public"."trading_partner_setups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_lines" ADD CONSTRAINT "forecast_lines_ship_to_site_id_sites_id_fk" FOREIGN KEY ("ship_to_site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_lines" ADD CONSTRAINT "forecast_lines_published_by_actors_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_commits" ADD CONSTRAINT "forecast_commits_parent_forecast_line_id_forecast_lines_id_fk" FOREIGN KEY ("parent_forecast_line_id") REFERENCES "public"."forecast_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_commits" ADD CONSTRAINT "forecast_commits_committed_by_actors_id_fk" FOREIGN KEY ("committed_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_acknowledgements" ADD CONSTRAINT "po_acknowledgements_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_acknowledgements" ADD CONSTRAINT "po_acknowledgements_acknowledged_by_actors_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_contract_ref_id_contract_refs_id_fk" FOREIGN KEY ("contract_ref_id") REFERENCES "public"."contract_refs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_actors_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_initiated_by_actors_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_events" ADD CONSTRAINT "execution_events_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;