-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "login_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "password_changed_at" DATETIME,
    "role" TEXT NOT NULL,
    "feishu_user_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "source_url" TEXT,
    "expected_price" DECIMAL,
    "notes" TEXT,
    "competitor_link" TEXT,
    "competitor_asins" TEXT,
    "core_keyword" TEXT,
    "price_range" TEXT,
    "top_competitor_link" TEXT,
    "seasonality" TEXT,
    "usage_scenario" TEXT,
    "iteration_plan" TEXT,
    "target_audience" TEXT,
    "certification" TEXT,
    "patent_status" TEXT,
    "trademark_status" TEXT,
    "competitor_reviews_analysis" TEXT,
    "visual_upgrade_direction" TEXT,
    "copyright_check" TEXT,
    "tro_check" TEXT,
    "phrase_trademark_check" TEXT,
    "packaging" TEXT,
    "supply_chain_advantage" TEXT,
    "suggested_quantity" INTEGER,
    "suggested_price" DECIMAL,
    "min_price" DECIMAL,
    "product_cost_cny" DECIMAL,
    "supplier_name" TEXT,
    "moq" INTEGER,
    "unit_price" TEXT,
    "production_time" TEXT,
    "supplier_link" TEXT,
    "supplier_remark" TEXT,
    "length_cm" DECIMAL,
    "width_cm" DECIMAL,
    "height_cm" DECIMAL,
    "weight_g" DECIMAL,
    "volumetric_weight_kg" DECIMAL,
    "billing_weight_lb" DECIMAL,
    "fba_size_tier" TEXT,
    "fba_fee" DECIMAL,
    "commission_rate" DECIMAL NOT NULL DEFAULT 0.15,
    "exchange_rate" DECIMAL NOT NULL DEFAULT 7.2,
    "shipping_cost" DECIMAL,
    "profit_margin" DECIMAL,
    "profit_amount" DECIMAL,
    "inventory_quantity" INTEGER,
    "inventory_value" DECIMAL,
    "final_decision" TEXT,
    "launch_date" DATETIME,
    "rejection_reason" TEXT,
    "first_batch_quantity" INTEGER,
    "market_analysis" TEXT,
    "competitiveness_analysis" TEXT,
    "alternative_suggestions" TEXT,
    "submitter_id" TEXT NOT NULL,
    "reviewer_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_assign',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "submit_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assign_time" DATETIME,
    "latest_review_time" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "products_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "products_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "review_rounds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "launch_date" DATETIME,
    "first_batch_quantity" INTEGER,
    "market_analysis" TEXT,
    "competitiveness_analysis" TEXT,
    "alternative_suggestions" TEXT,
    "improvement_suggestions" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "edit_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "review_rounds_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "review_rounds_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "objections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "submitter_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "has_objection" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "objections_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "objections_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "review_rounds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "objections_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "round_id" TEXT,
    "objection_id" TEXT,
    "attachment_type" TEXT NOT NULL DEFAULT 'data_screenshot',
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploader_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attachments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attachments_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "review_rounds" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "attachments_objection_id_fkey" FOREIGN KEY ("objection_id") REFERENCES "objections" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "attachments_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_log_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipient_id" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'internal',
    "event" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_log_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "login_rate_limits" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "window_start" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocked_until" DATETIME,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" JSONB NOT NULL,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "file_cleanup_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "relative_path" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_name_key" ON "users"("login_name");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_submitter_id_idx" ON "products"("submitter_id");

-- CreateIndex
CREATE INDEX "products_reviewer_id_idx" ON "products"("reviewer_id");

-- CreateIndex
CREATE INDEX "products_created_at_idx" ON "products"("created_at");

-- CreateIndex
CREATE INDEX "review_rounds_product_id_created_at_idx" ON "review_rounds"("product_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "review_rounds_product_id_round_number_key" ON "review_rounds"("product_id", "round_number");

-- CreateIndex
CREATE INDEX "attachments_product_id_attachment_type_idx" ON "attachments"("product_id", "attachment_type");

-- CreateIndex
CREATE INDEX "notification_log_created_at_idx" ON "notification_log"("created_at");

-- CreateIndex
CREATE INDEX "login_rate_limits_blocked_until_idx" ON "login_rate_limits"("blocked_until");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "file_cleanup_tasks_created_at_idx" ON "file_cleanup_tasks"("created_at");
