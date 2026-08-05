-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'developer', 'operator');
CREATE TYPE "ProductStatus" AS ENUM ('pending_assign', 'pending_review', 'approved', 'rejected', 'returned', 'redevelop', 'objection_pending');
CREATE TYPE "Decision" AS ENUM ('approved', 'rejected', 'returned', 'redevelop');

-- CreateTable
CREATE TABLE "users" (
  "id" UUID NOT NULL,
  "name" VARCHAR(50) NOT NULL,
  "email" VARCHAR(100) NOT NULL,
  "role" "Role" NOT NULL,
  "feishu_user_id" VARCHAR(100),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
  "id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "category" VARCHAR(50),
  "source_url" VARCHAR(500),
  "expected_price" DECIMAL(10,2),
  "notes" TEXT,
  "submitter_id" UUID NOT NULL,
  "reviewer_id" UUID,
  "status" "ProductStatus" NOT NULL DEFAULT 'pending_assign',
  "submit_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assign_time" TIMESTAMP(3),
  "latest_review_time" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_rounds" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "round_number" INTEGER NOT NULL,
  "reviewer_id" UUID NOT NULL,
  "decision" "Decision" NOT NULL,
  "comment" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_rounds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "objections" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "round_id" UUID NOT NULL,
  "submitter_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "objections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attachments" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "round_id" UUID,
  "objection_id" UUID,
  "file_name" VARCHAR(255) NOT NULL,
  "file_path" VARCHAR(500) NOT NULL,
  "file_size" INTEGER NOT NULL,
  "file_type" VARCHAR(50) NOT NULL,
  "uploader_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_log" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "operator_id" UUID NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "detail" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_log" (
  "id" UUID NOT NULL,
  "recipient_id" UUID,
  "channel" VARCHAR(30) NOT NULL DEFAULT 'feishu',
  "event" VARCHAR(50) NOT NULL,
  "content" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");
CREATE INDEX "products_status_idx" ON "products"("status");
CREATE INDEX "products_submitter_id_idx" ON "products"("submitter_id");
CREATE INDEX "products_reviewer_id_idx" ON "products"("reviewer_id");
CREATE UNIQUE INDEX "review_rounds_product_id_round_number_key" ON "review_rounds"("product_id", "round_number");
CREATE INDEX "notification_log_created_at_idx" ON "notification_log"("created_at");

-- Foreign keys
ALTER TABLE "products" ADD CONSTRAINT "products_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "review_rounds" ADD CONSTRAINT "review_rounds_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_rounds" ADD CONSTRAINT "review_rounds_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "objections" ADD CONSTRAINT "objections_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "objections" ADD CONSTRAINT "objections_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "review_rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "objections" ADD CONSTRAINT "objections_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "review_rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_objection_id_fkey" FOREIGN KEY ("objection_id") REFERENCES "objections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
