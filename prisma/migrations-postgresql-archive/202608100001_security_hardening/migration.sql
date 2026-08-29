-- 登录限流状态只保存不可逆哈希，不保存账号、邮箱或原始 IP。
CREATE TABLE "login_rate_limits" (
  "key" VARCHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "window_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blocked_until" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "login_rate_limits_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "login_rate_limits_blocked_until_idx" ON "login_rate_limits"("blocked_until");

ALTER TABLE "login_rate_limits" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "login_rate_limits" FROM anon, authenticated;
