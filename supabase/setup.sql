-- 在 Supabase Dashboard → SQL Editor 中执行一次。
-- 附件通过服务端 service role 上传；桶保持私有，下载使用 60 秒签名 URL。

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-attachments',
  'product-attachments',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 业务表只允许 Next.js 服务端的 PostgreSQL 连接访问。
-- 前端 Publishable Key 不能绕过 Route Handler / RBAC 直接查询这些表。
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.review_rounds enable row level security;
alter table public.objections enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_log enable row level security;
alter table public.notification_log enable row level security;

revoke all on table public.users from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.review_rounds from anon, authenticated;
revoke all on table public.objections from anon, authenticated;
revoke all on table public.attachments from anon, authenticated;
revoke all on table public.audit_log from anon, authenticated;
revoke all on table public.notification_log from anon, authenticated;
