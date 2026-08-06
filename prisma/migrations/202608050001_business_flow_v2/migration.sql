-- 选品审核业务流程 v2：草稿、产品分析、利润核算、审核结论与附件分类
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending_assign';

CREATE TYPE "AttachmentType" AS ENUM ('product_image', 'competitor_screenshot', 'data_screenshot', 'supplier_info');

ALTER TABLE "products"
  ADD COLUMN "competitor_link" VARCHAR(1000),
  ADD COLUMN "competitor_asins" VARCHAR(1000),
  ADD COLUMN "core_keyword" VARCHAR(300),
  ADD COLUMN "price_range" VARCHAR(100),
  ADD COLUMN "top_competitor_link" VARCHAR(1000),
  ADD COLUMN "seasonality" TEXT,
  ADD COLUMN "usage_scenario" TEXT,
  ADD COLUMN "iteration_plan" TEXT,
  ADD COLUMN "target_audience" TEXT,
  ADD COLUMN "certification" TEXT,
  ADD COLUMN "patent_status" TEXT,
  ADD COLUMN "trademark_status" TEXT,
  ADD COLUMN "competitor_reviews_analysis" TEXT,
  ADD COLUMN "visual_upgrade_direction" TEXT,
  ADD COLUMN "copyright_check" TEXT,
  ADD COLUMN "tro_check" TEXT,
  ADD COLUMN "phrase_trademark_check" TEXT,
  ADD COLUMN "packaging" TEXT,
  ADD COLUMN "supply_chain_advantage" TEXT,
  ADD COLUMN "suggested_quantity" INTEGER,
  ADD COLUMN "suggested_price" DECIMAL(10,2),
  ADD COLUMN "min_price" DECIMAL(10,2),
  ADD COLUMN "product_cost_cny" DECIMAL(10,2),
  ADD COLUMN "supplier_name" VARCHAR(200),
  ADD COLUMN "moq" INTEGER,
  ADD COLUMN "unit_price" VARCHAR(300),
  ADD COLUMN "production_time" VARCHAR(200),
  ADD COLUMN "supplier_link" VARCHAR(1000),
  ADD COLUMN "supplier_remark" TEXT,
  ADD COLUMN "length_cm" DECIMAL(10,2),
  ADD COLUMN "width_cm" DECIMAL(10,2),
  ADD COLUMN "height_cm" DECIMAL(10,2),
  ADD COLUMN "weight_g" DECIMAL(10,2),
  ADD COLUMN "volumetric_weight_kg" DECIMAL(10,3),
  ADD COLUMN "billing_weight_lb" DECIMAL(10,3),
  ADD COLUMN "fba_size_tier" VARCHAR(80),
  ADD COLUMN "fba_fee" DECIMAL(10,2),
  ADD COLUMN "commission_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.15,
  ADD COLUMN "exchange_rate" DECIMAL(10,4) NOT NULL DEFAULT 7.2,
  ADD COLUMN "shipping_cost" DECIMAL(10,2),
  ADD COLUMN "profit_margin" DECIMAL(8,2),
  ADD COLUMN "profit_amount" DECIMAL(10,2),
  ADD COLUMN "inventory_quantity" INTEGER,
  ADD COLUMN "inventory_value" DECIMAL(12,2),
  ADD COLUMN "final_decision" "Decision",
  ADD COLUMN "launch_date" DATE,
  ADD COLUMN "rejection_reason" TEXT,
  ADD COLUMN "first_batch_quantity" INTEGER,
  ADD COLUMN "market_analysis" TEXT,
  ADD COLUMN "competitiveness_analysis" TEXT,
  ADD COLUMN "alternative_suggestions" TEXT;

-- 兼容旧版基础数据：将旧链接与售价同步到 v2 字段。
UPDATE "products" SET
  "competitor_link" = COALESCE("competitor_link", "source_url"),
  "suggested_price" = COALESCE("suggested_price", "expected_price");

ALTER TABLE "review_rounds"
  ADD COLUMN "launch_date" DATE,
  ADD COLUMN "first_batch_quantity" INTEGER,
  ADD COLUMN "market_analysis" TEXT,
  ADD COLUMN "competitiveness_analysis" TEXT,
  ADD COLUMN "alternative_suggestions" TEXT,
  ADD COLUMN "improvement_suggestions" TEXT;

ALTER TABLE "objections" ADD COLUMN "has_objection" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "attachments" ADD COLUMN "attachment_type" "AttachmentType" NOT NULL DEFAULT 'data_screenshot';

CREATE INDEX "products_created_at_idx" ON "products"("created_at");
CREATE INDEX "review_rounds_product_id_created_at_idx" ON "review_rounds"("product_id", "created_at");
CREATE INDEX "attachments_product_id_attachment_type_idx" ON "attachments"("product_id", "attachment_type");
