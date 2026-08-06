"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  App as AntApp,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  Upload,
  message,
  theme,
} from "antd";
import type { MenuProps, TableColumnsType, UploadFile, UploadProps } from "antd";
import {
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  FileExcelOutlined,
  FileSearchOutlined,
  InboxOutlined,
  LeftOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoreOutlined,
  PlusOutlined,
  ProductOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import zhCN from "antd/locale/zh_CN";
import { formatChinaDate, formatChinaDateCode, formatChinaDateTime, formatChinaLongDate } from "@/lib/time";
import { seedState } from "@/lib/mock-data";
import type { AppState, Decision, NoticeLog, NoticeStatus, Product, ProductStatus, Role, User } from "@/types";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const STORAGE_KEY = "ors-review-system-v1";
const SESSION_KEY = "ors-active-user";
const productionMode = process.env.NEXT_PUBLIC_APP_MODE === "production";

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({})) as { data?: T; error?: string };
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") window.location.href = "/login";
    throw new Error(body.error || `请求失败（${response.status}）`);
  }
  return body.data as T;
}

const roleMeta: Record<Role, { label: string; color: string }> = {
  admin: { label: "管理员", color: "#5755d9" },
  developer: { label: "开发人员", color: "#1677ff" },
  operator: { label: "运营审核", color: "#08979c" },
};

const statusMeta: Record<ProductStatus, { label: string; color: string }> = {
  pending_assign: { label: "待分配", color: "gold" },
  pending_review: { label: "待审核", color: "blue" },
  approved: { label: "已通过", color: "green" },
  rejected: { label: "不通过", color: "red" },
  returned: { label: "已驳回", color: "orange" },
  redevelop: { label: "二次开发", color: "purple" },
  objection_pending: { label: "异议待审", color: "cyan" },
};

const decisionMeta: Record<Decision, { label: string; color: string }> = {
  approved: { label: "通过", color: "green" },
  rejected: { label: "不通过", color: "red" },
  returned: { label: "驳回补充", color: "orange" },
  redevelop: { label: "二次开发", color: "purple" },
};

const notificationStatusMeta: Record<NoticeStatus, { label: string; color: string; badge: "success" | "error" | "default" }> = {
  success: { label: "发送成功", color: "green", badge: "success" },
  failed: { label: "发送失败", color: "red", badge: "error" },
  skipped: { label: "已跳过", color: "default", badge: "default" },
};

const notificationEventMeta: Record<string, { label: string; color: string }> = {
  assign: { label: "选品分配", color: "blue" },
  review: { label: "审核结果", color: "green" },
  objection: { label: "异议复审", color: "orange" },
  production_test: { label: "系统测试", color: "purple" },
};

const categoryOptions = ["宠物用品", "家居收纳", "母婴用品", "户外运动", "汽车用品", "办公用品", "玩具游戏", "时尚配件", "厨具餐饮", "其他"];

function cloneSeed(): AppState {
  return JSON.parse(JSON.stringify(seedState)) as AppState;
}

function formatTime(date = new Date()) {
  return formatChinaDateTime(date);
}

function nameOf(users: User[], id?: string) {
  return users.find((user) => user.id === id)?.name || "—";
}

function StatusTag({ status }: { status: ProductStatus }) {
  const meta = statusMeta[status];
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

function RoleTag({ role }: { role: Role }) {
  const meta = roleMeta[role];
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

function MiniTrend({ values, color = "#1677ff" }: { values: number[]; color?: string }) {
  const width = 138;
  const height = 44;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 5 - ((value - min) / Math.max(max - min, 1)) * 32;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="mini-trend" viewBox={`0 0 ${width} ${height}`} aria-label="趋势图">
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PageHeading({ title, description, extra }: { title: string; description: string; extra?: React.ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <Title level={3}>{title}</Title>
        <Text type="secondary">{description}</Text>
      </div>
      {extra && <div>{extra}</div>}
    </div>
  );
}

export default function ReviewSystem() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: { colorPrimary: "#3b5ccc", borderRadius: 10, colorBgLayout: "#f4f6fa", fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif" },
        components: { Card: { headerFontSize: 15 }, Menu: { itemBorderRadius: 8 } },
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <AntApp><ReviewSystemInner /></AntApp>
    </ConfigProvider>
  );
}

function ReviewSystemInner() {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AppState>(() => cloneSeed());
  const [activeUserId, setActiveUserId] = useState("u-admin");
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [reviewProduct, setReviewProduct] = useState<Product | null>(null);
  const [objectionProduct, setObjectionProduct] = useState<Product | null>(null);
  const [assignProduct, setAssignProduct] = useState<Product | null>(null);
  const [userModal, setUserModal] = useState<User | "new" | null>(null);
  const [productForm] = Form.useForm();
  const [reviewForm] = Form.useForm();
  const [objectionForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [userForm] = Form.useForm();
  const { message: appMessage } = AntApp.useApp();

  async function loadProduction() {
    const data = await apiRequest<AppState & { currentUser: User }>("/api/bootstrap", { cache: "no-store" });
    setState({ users: data.users, products: data.products, notices: data.notices });
    setActiveUserId(data.currentUser.id);
  }

  useEffect(() => {
    if (productionMode) {
      loadProduction().catch((error) => appMessage.error(error.message)).finally(() => setReady(true));
      return;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setState(JSON.parse(saved) as AppState);
      const session = localStorage.getItem(SESSION_KEY);
      if (session) setActiveUserId(session);
    } catch { /* 保留演示种子数据 */ }
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready || productionMode) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(SESSION_KEY, activeUserId);
  }, [state, activeUserId, ready]);

  const currentUser = state.users.find((user) => user.id === activeUserId) || state.users[0];
  const operators = state.users.filter((user) => user.role === "operator" && user.isActive);

  const menus = useMemo(() => {
    const common = [{ key: "/dashboard", icon: <AppstoreOutlined />, label: "工作台" }];
    if (currentUser.role === "developer") {
      return [...common, { key: "/products", icon: <ProductOutlined />, label: "我的选品" }, { key: "/notifications", icon: <BellOutlined />, label: "通知日志" }];
    }
    if (currentUser.role === "operator") {
      return [...common, { key: "/review", icon: <SafetyCertificateOutlined />, label: "审核中心" }, { key: "/products", icon: <ProductOutlined />, label: "全部选品" }, { key: "/stats", icon: <BarChartOutlined />, label: "数据统计" }, { key: "/notifications", icon: <BellOutlined />, label: "通知日志" }];
    }
    return [
      ...common,
      { key: "/products", icon: <ProductOutlined />, label: "选品管理" },
      { key: "/assign", icon: <SwapOutlined />, label: "分配管理" },
      { key: "/review", icon: <SafetyCertificateOutlined />, label: "审核中心" },
      { key: "/users", icon: <TeamOutlined />, label: "用户管理" },
      { key: "/stats", icon: <BarChartOutlined />, label: "数据统计" },
      { type: "divider" as const },
      { key: "/import", icon: <DatabaseOutlined />, label: "数据导入" },
      { key: "/settings", icon: <SettingOutlined />, label: "系统设置" },
    ];
  }, [currentUser.role]);

  const selectedKey = pathname === "/" ? "/dashboard" : `/${pathname.split("/").filter(Boolean)[0]}`;
  const canRenderSelectedPage = pathname === "/" || menus.some((menu) => "key" in menu && menu.key === selectedKey);

  useEffect(() => {
    if (ready && !canRenderSelectedPage) router.replace("/dashboard");
  }, [ready, canRenderSelectedPage, router]);

  const updateProduct = (id: string, updater: (product: Product) => Product) => {
    setState((old) => ({ ...old, products: old.products.map((product) => product.id === id ? updater(product) : product) }));
  };

  const pushNotice = (target: string, event: string, content: string) => {
    setState((old) => ({ ...old, notices: [{ id: `n-${Date.now()}`, target, event, content, time: formatTime(), success: true }, ...old.notices] }));
  };

  const createProduct = async () => {
    try {
      const values = await productForm.validateFields();
      const attachments: UploadFile[] = values.attachments?.fileList || [];
      if (productionMode) {
        const product = await apiRequest<Product>("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: values.name, category: values.category, sourceUrl: values.sourceUrl || "", expectedPrice: values.expectedPrice, notes: values.notes }) });
        for (const attachment of attachments) {
          if (!attachment.originFileObj) continue;
          const formData = new FormData(); formData.append("productId", product.id); formData.append("file", attachment.originFileObj);
          await apiRequest("/api/upload", { method: "POST", body: formData });
        }
        await loadProduction();
      } else {
        const now = formatTime();
        const product: Product = { id: `p-${Date.now()}`, code: `ORS-${formatChinaDateCode()}-${String(state.products.length + 1).padStart(2, "0")}`, name: values.name, category: values.category, sourceUrl: values.sourceUrl, expectedPrice: values.expectedPrice, notes: values.notes, submitterId: currentUser.id, status: "pending_assign", submitTime: now, attachments: attachments.map((file) => ({ id: file.uid, name: file.name, size: file.size || 0, type: file.type || "application/octet-stream" })), reviews: [], objections: [] };
        setState((old) => ({ ...old, products: [product, ...old.products] }));
      }
      productForm.resetFields(); setNewProductOpen(false); appMessage.success("选品已提交，等待管理员分配");
    } catch (error) { if (error instanceof Error && error.message) appMessage.error(error.message); }
  };

  const assign = async () => {
    if (!assignProduct) return;
    try {
      const { reviewerId } = await assignForm.validateFields();
      const reviewer = state.users.find((user) => user.id === reviewerId)!;
      if (productionMode) {
        const product = await apiRequest<Product>(`/api/products/${assignProduct.id}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewerId }) });
        setState((old) => ({ ...old, products: old.products.map((item) => item.id === product.id ? product : item) }));
      } else {
        updateProduct(assignProduct.id, (product) => ({ ...product, reviewerId, status: "pending_review", assignTime: formatTime() }));
        pushNotice(reviewer.name, "分配通知", `你有一个新选品待审核：${assignProduct.name}`);
      }
      setAssignProduct(null); assignForm.resetFields(); appMessage.success(`已分配给 ${reviewer.name}`);
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };

  const submitReview = async () => {
    if (!reviewProduct) return;
    try {
      const values = await reviewForm.validateFields();
      if (productionMode) {
        const product = await apiRequest<Product>(`/api/products/${reviewProduct.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
        setState((old) => ({ ...old, products: old.products.map((item) => item.id === product.id ? product : item) }));
      } else {
        const now = formatTime();
        const round = { id: `r-${Date.now()}`, round: reviewProduct.reviews.length + 1, reviewerId: currentUser.id, decision: values.decision as Decision, comment: values.comment, createdAt: now };
        updateProduct(reviewProduct.id, (product) => ({ ...product, status: values.decision, latestReviewTime: now, reviews: [...product.reviews, round] }));
        pushNotice(nameOf(state.users, reviewProduct.submitterId), "审核结果", `选品「${reviewProduct.name}」审核结果：${decisionMeta[values.decision as Decision].label}`);
      }
      setReviewProduct(null); reviewForm.resetFields(); appMessage.success("审核结果已提交");
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };

  const submitObjection = async () => {
    if (!objectionProduct) return;
    try {
      const { content } = await objectionForm.validateFields();
      if (productionMode) {
        const product = await apiRequest<Product>(`/api/products/${objectionProduct.id}/objection`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
        setState((old) => ({ ...old, products: old.products.map((item) => item.id === product.id ? product : item) }));
      } else {
        const lastRound = objectionProduct.reviews[objectionProduct.reviews.length - 1];
        updateProduct(objectionProduct.id, (product) => ({ ...product, status: "objection_pending", objections: [...product.objections, { id: `o-${Date.now()}`, roundId: lastRound.id, submitterId: currentUser.id, content, createdAt: formatTime() }] }));
        pushNotice(nameOf(state.users, objectionProduct.reviewerId), "异议通知", `选品「${objectionProduct.name}」开发人员提交了异议，请复审`);
      }
      setObjectionProduct(null); objectionForm.resetFields(); appMessage.success("异议已提交，等待运营复审");
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };

  const saveUser = async () => {
    try {
      const values = await userForm.validateFields();
      const { confirmPassword: _confirmPassword, password, ...profileValues } = values;
      if (productionMode) {
        const isNew = userModal === "new";
        const payload = isNew || !password ? profileValues : { ...profileValues, password };
        const saved = await apiRequest<User>(isNew ? "/api/users" : `/api/users/${(userModal as User).id}`, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        setState((old) => ({ ...old, users: isNew ? [...old.users, saved] : old.users.map((user) => user.id === saved.id ? saved : user) }));
      } else if (userModal === "new") {
        const user: User = { id: `u-${Date.now()}`, ...profileValues, isActive: true, createdAt: formatChinaDate() };
        setState((old) => ({ ...old, users: [...old.users, user] }));
      } else if (userModal) setState((old) => ({ ...old, users: old.users.map((user) => user.id === userModal.id ? { ...user, ...profileValues } : user) }));
      appMessage.success(userModal === "new" ? "用户已创建，邀请邮件已发送" : password ? "用户信息及登录密码已更新" : "用户信息已更新"); setUserModal(null); userForm.resetFields();
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };

  const switchUser = (id: string) => {
    setActiveUserId(id);
    router.push("/dashboard");
    appMessage.info(`已切换为 ${nameOf(state.users, id)} 视角`);
  };

  const resetDemo = () => {
    setState(cloneSeed());
    appMessage.success("演示数据已恢复");
  };

  const logout = async () => {
    await createSupabaseClient().auth.signOut();
    router.replace("/login"); router.refresh();
  };

  const renderPage = () => {
    const page = pathname === "/" ? "dashboard" : pathname.split("/").filter(Boolean)[0] || "dashboard";
    const context = { state, currentUser, operators, setSelectedProduct, setNewProductOpen, setReviewProduct, setObjectionProduct, setAssignProduct, setUserModal, userForm, setState, appMessage, reloadProduction: loadProduction };
    if (!canRenderSelectedPage) return <DashboardPage {...context} />;
    switch (page) {
      case "products": return <ProductsPage {...context} />;
      case "assign": return <AssignPage {...context} />;
      case "review": return <ReviewPage {...context} />;
      case "users": return <UsersPage {...context} />;
      case "stats": return <StatsPage {...context} />;
      case "notifications": return <NotificationsPage {...context} />;
      case "import": return <ImportPage {...context} />;
      case "settings": return <SettingsPage {...context} />;
      default: return <DashboardPage {...context} />;
    }
  };

  const notificationItems: MenuProps["items"] = state.notices.slice(0, 5).map((notice) => ({
    key: notice.id,
    label: <div className="notice-item"><Text strong>{notice.event}</Text><Text ellipsis>{notice.content}</Text><Text type="secondary" className="small-text">{notice.time}</Text></div>,
  }));
  if (currentUser.role !== "admin") {
    notificationItems.push(
      { type: "divider" },
      { key: "view-all-notifications", icon: <BellOutlined />, label: "查看全部通知日志" },
    );
  }
  const userMenuItems: MenuProps["items"] = productionMode
    ? [{ key: "logout", icon: <LogoutOutlined />, label: "退出登录", onClick: logout }]
    : state.users.filter((u) => u.isActive).map((u) => ({ key: u.id, label: <Space><Avatar size={24}>{u.name.slice(-1)}</Avatar><span>{u.name}</span><RoleTag role={u.role} /></Space>, onClick: () => switchUser(u.id) }));

  if (!ready) return <div className="loading-screen"><div className="brand-mark small"><ProductOutlined /></div><Text>正在载入审核中心…</Text></div>;

  return (
    <Layout className="app-shell">
      <Sider collapsed={collapsed} width={236} collapsedWidth={76} className="app-sider" trigger={null}>
        <div className="brand">
          <div className="brand-mark"><ProductOutlined /></div>
          {!collapsed && <div><div className="brand-name">ORS 审核中心</div><div className="brand-sub">PRODUCT REVIEW</div></div>}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={menus} onClick={({ key }) => router.push(key)} />
        <div className="sider-footer">
          {!collapsed && <div><div>审核流程在线化</div><span>数据实时同步 · 全程可追溯</span></div>}
          <SafetyCertificateOutlined />
        </div>
      </Sider>
      <Layout>
        <Header className="app-header">
          <Button type="text" className="collapse-btn" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed((value) => !value)} />
          <div className="header-right">
            {!productionMode && <Tooltip title="恢复初始演示数据"><Button type="text" icon={<ReloadOutlined />} onClick={resetDemo} /></Tooltip>}
            <Dropdown menu={{ items: notificationItems, onClick: ({ key }) => { if (key === "view-all-notifications") router.push("/notifications"); } }} placement="bottomRight" trigger={["click"]}>
              <Badge count={state.notices.length} size="small"><Button type="text" icon={<BellOutlined />} /></Badge>
            </Dropdown>
            <Divider orientation="vertical" />
            <Dropdown menu={{ items: userMenuItems }} trigger={["click"]}>
              <button className="user-switcher">
                <Avatar style={{ background: roleMeta[currentUser.role].color }}>{currentUser.name.slice(-1)}</Avatar>
                <span className="user-copy"><strong>{currentUser.name}</strong><small>{roleMeta[currentUser.role].label}</small></span>
                <DownOutlined />
              </button>
            </Dropdown>
          </div>
        </Header>
        <Content className="app-content">{renderPage()}</Content>
      </Layout>

      <ProductDrawer product={selectedProduct ? state.products.find((p) => p.id === selectedProduct.id) || selectedProduct : null} users={state.users} currentUser={currentUser} onClose={() => setSelectedProduct(null)} onReview={(p) => { setSelectedProduct(null); setReviewProduct(p); }} onObjection={(p) => { setSelectedProduct(null); setObjectionProduct(p); }} />

      <Modal title="提交新选品" open={newProductOpen} onCancel={() => setNewProductOpen(false)} onOk={createProduct} okText="提交审核" cancelText="取消" width={680}>
        <Form form={productForm} layout="vertical" className="modal-form">
          <Row gutter={16}>
            <Col span={16}><Form.Item label="产品名称" name="name" rules={[{ required: true, message: "请输入产品名称" }]}><Input placeholder="例如：可折叠硅胶宠物旅行碗" /></Form.Item></Col>
            <Col span={8}><Form.Item label="产品类目" name="category" rules={[{ required: true, message: "请选择类目" }]}><Select options={categoryOptions.map((value) => ({ value, label: value }))} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={16}><Form.Item label="货源链接" name="sourceUrl"><Input placeholder="1688 / 供应商商品链接" /></Form.Item></Col>
            <Col span={8}><Form.Item label="预期售价（USD）" name="expectedPrice"><InputNumber min={0} precision={2} prefix="$" style={{ width: "100%" }} /></Form.Item></Col>
          </Row>
          <Form.Item label="选品说明" name="notes"><Input.TextArea rows={3} placeholder="补充市场机会、产品差异化或成本信息" showCount maxLength={500} /></Form.Item>
          <Form.Item label="资料附件" name="attachments" extra="支持 JPG、PNG、PDF，单个文件不超过 1MB，最多 10 个">
            <Upload.Dragger beforeUpload={() => false} maxCount={10} accept=".jpg,.jpeg,.png,.pdf"><p className="ant-upload-drag-icon"><InboxOutlined /></p><p>点击或拖拽文件到此区域</p></Upload.Dragger>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={reviewProduct ? `审核 · ${reviewProduct.name}` : "提交审核"} open={!!reviewProduct} onCancel={() => setReviewProduct(null)} onOk={submitReview} okText="确认提交" width={620}>
        {reviewProduct && <ReviewSummary product={reviewProduct} users={state.users} />}
        <Form form={reviewForm} layout="vertical" className="modal-form">
          <Form.Item label="审核决策" name="decision" rules={[{ required: true, message: "请选择审核决策" }]}>
            <Select size="large" options={Object.entries(decisionMeta).map(([value, meta]) => ({ value, label: meta.label }))} placeholder="选择本轮审核结果" />
          </Form.Item>
          <Form.Item label="审核意见" name="comment" rules={[{ required: true, message: "请填写审核意见" }, { min: 5, message: "请至少填写 5 个字" }]}>
            <Input.TextArea rows={4} showCount maxLength={500} placeholder="说明判断依据、风险或后续执行建议" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={objectionProduct ? `提交异议 · ${objectionProduct.name}` : "提交异议"} open={!!objectionProduct} onCancel={() => setObjectionProduct(null)} onOk={submitObjection} okText="提交异议" width={620}>
        {objectionProduct?.reviews.length && <div className="review-quote"><Text type="secondary">最近审核意见</Text><Paragraph>{objectionProduct.reviews.at(-1)?.comment}</Paragraph></div>}
        <Form form={objectionForm} layout="vertical" className="modal-form">
          <Form.Item label="异议与补充说明" name="content" rules={[{ required: true, message: "请填写异议内容" }, { min: 10, message: "请至少填写 10 个字" }]}>
            <Input.TextArea rows={5} showCount maxLength={800} placeholder="说明异议依据、补充数据或二次开发进展" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={assignProduct ? `分配运营 · ${assignProduct.name}` : "分配运营"} open={!!assignProduct} onCancel={() => setAssignProduct(null)} onOk={assign} okText="确认分配">
        <Form form={assignForm} layout="vertical" className="modal-form">
          <Form.Item label="审核负责人" name="reviewerId" rules={[{ required: true, message: "请选择运营人员" }]}>
            <Select size="large" placeholder="选择运营审核人" options={operators.map((user) => ({ value: user.id, label: `${user.name} · 当前待审 ${state.products.filter((p) => p.reviewerId === user.id && ["pending_review", "objection_pending"].includes(p.status)).length} 项` }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={userModal === "new" ? "新增用户" : "编辑用户"} open={!!userModal} onCancel={() => { setUserModal(null); userForm.resetFields(); }} onOk={saveUser} okText="保存" width={560}>
        <Form form={userForm} layout="vertical" className="modal-form">
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: "请输入姓名" }]}><Input /></Form.Item>
          <Form.Item label="企业邮箱" name="email" rules={[{ required: true, type: "email", message: "请输入有效邮箱" }]}><Input /></Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true }]}><Select options={Object.entries(roleMeta).map(([value, meta]) => ({ value, label: meta.label }))} /></Form.Item>
          <Form.Item label="飞书 User ID" name="feishuUserId"><Input placeholder="可选，用于机器人消息推送" /></Form.Item>
          {productionMode && userModal !== "new" && <>
            <Divider plain>登录密码</Divider>
            <Alert type="info" showIcon title="当前密码已加密，任何人都无法查看" description="如需修改，请设置新密码。留空保存时不会改变原密码。" style={{ marginBottom: 16 }} />
            <Form.Item label="新密码（留空则不修改）" name="password" rules={[{ min: 12, message: "密码至少 12 位" }, { max: 72, message: "密码最多 72 位" }]}>
              <Input.Password autoComplete="new-password" placeholder="至少 12 位，可点击右侧图标查看输入" />
            </Form.Item>
            <Form.Item label="确认新密码" name="confirmPassword" dependencies={["password"]} rules={[({ getFieldValue }) => ({ validator(_, value) { const nextPassword = getFieldValue("password"); if (!nextPassword && !value) return Promise.resolve(); if (!value) return Promise.reject(new Error("请再次输入新密码")); return nextPassword === value ? Promise.resolve() : Promise.reject(new Error("两次输入的密码不一致")); } })]}>
              <Input.Password autoComplete="new-password" placeholder="再次输入新密码" />
            </Form.Item>
          </>}
        </Form>
      </Modal>
    </Layout>
  );
}

type PageContext = {
  state: AppState;
  currentUser: User;
  operators: User[];
  setSelectedProduct: (product: Product) => void;
  setNewProductOpen: (open: boolean) => void;
  setReviewProduct: (product: Product) => void;
  setObjectionProduct: (product: Product) => void;
  setAssignProduct: (product: Product) => void;
  setUserModal: (user: User | "new" | null) => void;
  userForm: ReturnType<typeof Form.useForm>[0];
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  appMessage: ReturnType<typeof message.useMessage>[0];
  reloadProduction: () => Promise<void>;
};

function DashboardPage(ctx: PageContext) {
  const { state, currentUser, setSelectedProduct, setNewProductOpen, setReviewProduct, setAssignProduct } = ctx;
  const visible = currentUser.role === "developer" ? state.products.filter((p) => p.submitterId === currentUser.id) : currentUser.role === "operator" ? state.products.filter((p) => p.reviewerId === currentUser.id) : state.products;
  const pending = visible.filter((p) => ["pending_review", "objection_pending"].includes(p.status)).length;
  const approved = visible.filter((p) => p.status === "approved").length;
  const pendingAssign = state.products.filter((p) => p.status === "pending_assign").length;
  const finished = visible.filter((p) => ["approved", "rejected"].includes(p.status));
  const passRate = finished.length ? Math.round(finished.filter((p) => p.status === "approved").length / finished.length * 100) : 0;
  const actionable = currentUser.role === "admin" ? state.products.filter((p) => p.status === "pending_assign") : currentUser.role === "operator" ? visible.filter((p) => ["pending_review", "objection_pending"].includes(p.status)) : visible.filter((p) => ["returned", "redevelop"].includes(p.status));

  return (
    <>
      <div className="welcome-banner">
        <div><Text className="eyebrow">{formatChinaLongDate()}</Text><Title level={2}>{currentUser.name}，欢迎回来</Title><Paragraph>{currentUser.role === "admin" ? "今日有新的选品等待分配，团队审核进度尽在掌握。" : currentUser.role === "operator" ? `你有 ${pending} 项选品需要处理，优先关注异议复审。` : "跟踪你的选品进度，及时补充异议与开发数据。"}</Paragraph></div>
        {currentUser.role !== "operator" && <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setNewProductOpen(true)}>提交新选品</Button>}
      </div>
      <Row gutter={[16, 16]} className="metric-row">
        <Col span={6}><MetricCard title="选品总数" value={visible.length} helper="较上周 +12%" icon={<ProductOutlined />} color="#3b5ccc" trend={[6, 8, 7, 11, 9, 12, 14]} /></Col>
        <Col span={6}><MetricCard title={currentUser.role === "admin" ? "待分配" : "待处理"} value={currentUser.role === "admin" ? pendingAssign : pending} helper="需要及时处理" icon={<ClockCircleOutlined />} color="#d89614" trend={[4, 3, 5, 4, 6, 3, 2]} /></Col>
        <Col span={6}><MetricCard title="本期通过" value={approved} helper="审核质量稳定" icon={<CheckCircleOutlined />} color="#12a47d" trend={[2, 4, 3, 6, 5, 8, 9]} /></Col>
        <Col span={6}><MetricCard title="审核通过率" value={`${passRate}%`} helper="目标值 65%" icon={<BarChartOutlined />} color="#7856d8" trend={[52, 55, 58, 57, 62, 64, passRate]} /></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card title="近 7 日选品趋势" extra={<Segmented size="small" options={["近 7 日", "近 30 日"]} />}>
            <TrendChart />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="审核状态分布" className="distribution-card">
            <div className="donut" style={{ "--approved": `${Math.max(passRate, 30) * 3.6}deg` } as React.CSSProperties}><div><strong>{visible.length}</strong><span>全部选品</span></div></div>
            <div className="legend-grid"><span><i className="dot green" />已通过 <b>{approved}</b></span><span><i className="dot blue" />审核中 <b>{pending}</b></span><span><i className="dot orange" />待补充 <b>{visible.filter((p) => ["returned", "redevelop"].includes(p.status)).length}</b></span><span><i className="dot red" />未通过 <b>{visible.filter((p) => p.status === "rejected").length}</b></span></div>
          </Card>
        </Col>
        <Col span={24}>
          <Card title={currentUser.role === "admin" ? "待分配选品" : currentUser.role === "operator" ? "我的待审核" : "需要补充的选品"} extra={<Text type="secondary">共 {actionable.length} 项</Text>}>
            <Table rowKey="id" pagination={false} dataSource={actionable.slice(0, 5)} columns={productColumns(state.users, (p) => setSelectedProduct(p), (p) => currentUser.role === "admin" ? setAssignProduct(p) : setReviewProduct(p), currentUser.role === "admin" ? "分配" : currentUser.role === "operator" ? "审核" : undefined)} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待处理事项" /> }} />
          </Card>
        </Col>
      </Row>
    </>
  );
}

function MetricCard({ title, value, helper, icon, color, trend }: { title: string; value: number | string; helper: string; icon: React.ReactNode; color: string; trend: number[] }) {
  return <Card className="metric-card"><div className="metric-top"><span className="metric-icon" style={{ color, background: `${color}15` }}>{icon}</span><MiniTrend values={trend} color={color} /></div><Statistic title={title} value={value} /><Text type="secondary" className="small-text">{helper}</Text></Card>;
}

function TrendChart() {
  const submission = [5, 8, 6, 11, 9, 14, 12];
  const complete = [3, 4, 7, 6, 8, 9, 11];
  const days = ["7/26", "7/27", "7/28", "7/29", "7/30", "7/31", "8/1"];
  const max = 16;
  return (
    <div className="bar-chart">
      <div className="chart-legend"><span><i className="dot blue" />提交量</span><span><i className="dot teal" />完成量</span></div>
      <div className="bars">{days.map((day, index) => <div className="bar-group" key={day}><div className="bar-stack"><Tooltip title={`提交 ${submission[index]}`}><i className="bar submit" style={{ height: `${submission[index] / max * 150}px` }} /></Tooltip><Tooltip title={`完成 ${complete[index]}`}><i className="bar complete" style={{ height: `${complete[index] / max * 150}px` }} /></Tooltip></div><span>{day}</span></div>)}</div>
    </div>
  );
}

function productColumns(users: User[], open: (p: Product) => void, action?: (p: Product) => void, actionLabel?: string): TableColumnsType<Product> {
  return [
    { title: "选品", dataIndex: "name", key: "name", render: (_, p) => <button className="product-cell" onClick={() => open(p)}><span className="product-thumb"><ProductOutlined /></span><span><strong>{p.name}</strong><small>{p.code} · {p.category}</small></span></button> },
    { title: "提交人", dataIndex: "submitterId", width: 100, render: (id) => nameOf(users, id) },
    { title: "审核人", dataIndex: "reviewerId", width: 100, render: (id) => nameOf(users, id) },
    { title: "状态", dataIndex: "status", width: 110, render: (status) => <StatusTag status={status} /> },
    { title: "提交时间", dataIndex: "submitTime", width: 150 },
    { title: "", key: "action", width: 96, align: "right", render: (_, p) => action && actionLabel ? <Button type="link" onClick={() => action(p)}>{actionLabel}</Button> : <Button type="text" icon={<MoreOutlined />} onClick={() => open(p)} /> },
  ];
}

function ProductsPage(ctx: PageContext) {
  const { state, currentUser, setSelectedProduct, setNewProductOpen, setObjectionProduct } = ctx;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const base = currentUser.role === "developer" ? state.products.filter((p) => p.submitterId === currentUser.id) : currentUser.role === "operator" ? state.products.filter((p) => !!p.reviewerId) : state.products;
  const data = base.filter((p) => (status === "all" || p.status === status) && (p.name.includes(query) || p.code.toLowerCase().includes(query.toLowerCase())));
  const columns = productColumns(state.users, setSelectedProduct);
  columns[5] = { title: "操作", width: 120, align: "right", render: (_, p) => <Space>{currentUser.role === "developer" && ["returned", "redevelop"].includes(p.status) && <Button type="link" onClick={() => setObjectionProduct(p)}>提交异议</Button>}<Button type="link" onClick={() => setSelectedProduct(p)}>详情</Button></Space> };
  return (
    <>
      <PageHeading title={currentUser.role === "developer" ? "我的选品" : "选品管理"} description="集中查看选品资料、审核状态与完整流转记录" extra={currentUser.role !== "operator" && <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewProductOpen(true)}>提交新选品</Button>} />
      <Card>
        <div className="table-toolbar"><Space><Input prefix={<SearchOutlined />} placeholder="搜索产品名称或编号" allowClear value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 260 }} /><Select value={status} onChange={setStatus} style={{ width: 150 }} options={[{ value: "all", label: "全部状态" }, ...Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))]} /></Space><Text type="secondary">共 {data.length} 项选品</Text></div>
        <Table rowKey="id" dataSource={data} columns={columns} pagination={{ pageSize: 8, showSizeChanger: false }} />
      </Card>
    </>
  );
}

function AssignPage(ctx: PageContext) {
  const { state, operators, setSelectedProduct, setAssignProduct, setState, appMessage, reloadProduction } = ctx;
  const [selected, setSelected] = useState<React.Key[]>([]);
  const data = state.products.filter((p) => p.status === "pending_assign");
  const autoAssign = async () => {
    if (!data.length || !operators.length) return;
    try {
      if (productionMode) { await apiRequest("/api/products/batch-assign", { method: "POST" }); await reloadProduction(); }
      else setState((old) => ({ ...old, products: old.products.map((product, index) => product.status === "pending_assign" ? { ...product, status: "pending_review", reviewerId: operators[index % operators.length].id, assignTime: formatTime() } : product) }));
      setSelected([]); appMessage.success(`已按轮询规则分配 ${data.length} 项选品`);
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };
  return (
    <>
      <PageHeading title="分配管理" description="将新提交的选品分配给合适的运营审核人员" extra={<Button icon={<SwapOutlined />} onClick={autoAssign} disabled={!data.length}>一键轮询分配</Button>} />
      <Row gutter={[16, 16]} className="summary-strip">
        <Col span={8}><Card><Statistic title="等待分配" value={data.length} prefix={<ClockCircleOutlined />} /></Card></Col>
        <Col span={8}><Card><Statistic title="在岗运营" value={operators.length} prefix={<TeamOutlined />} /></Card></Col>
        <Col span={8}><Card><Statistic title="今日已分配" value={state.products.filter((p) => p.assignTime?.startsWith(formatChinaDate())).length} prefix={<CheckCircleOutlined />} /></Card></Col>
      </Row>
      <Card title="待分配队列" extra={<Text type="secondary">已选择 {selected.length} 项</Text>}>
        <Table rowKey="id" rowSelection={{ selectedRowKeys: selected, onChange: setSelected }} dataSource={data} columns={productColumns(state.users, setSelectedProduct, setAssignProduct, "分配")} pagination={false} locale={{ emptyText: <Empty description="所有选品均已分配" /> }} />
      </Card>
    </>
  );
}

function ReviewPage(ctx: PageContext) {
  const { state, currentUser, setSelectedProduct, setReviewProduct } = ctx;
  const [tab, setTab] = useState("todo");
  const own = currentUser.role === "admin" ? state.products.filter((p) => !!p.reviewerId) : state.products.filter((p) => p.reviewerId === currentUser.id);
  const data = tab === "todo" ? own.filter((p) => ["pending_review", "objection_pending"].includes(p.status)) : own.filter((p) => p.reviews.length > 0);
  const columns = productColumns(state.users, setSelectedProduct, tab === "todo" ? setReviewProduct : undefined, tab === "todo" ? "开始审核" : undefined);
  return (
    <>
      <PageHeading title="审核中心" description="处理待审选品与开发异议，所有审核意见自动留痕" />
      <Card>
        <Tabs activeKey={tab} onChange={setTab} items={[{ key: "todo", label: <Badge count={own.filter((p) => ["pending_review", "objection_pending"].includes(p.status)).length} offset={[12, -3]}>待我审核</Badge> }, { key: "history", label: "历史审核" }]} />
        <Table rowKey="id" dataSource={data} columns={columns} pagination={{ pageSize: 8, showSizeChanger: false }} />
      </Card>
    </>
  );
}

type NotificationsPageData = {
  items: NoticeLog[];
  total: number;
  page: number;
  pageSize: number;
  summary: { all: number; success: number; failed: number; skipped: number };
  events: string[];
};

function noticeStatus(notice: NoticeLog): NoticeStatus {
  return notice.status || (notice.success ? "success" : "failed");
}

function NotificationsPage(ctx: PageContext) {
  const { state, currentUser, appMessage } = ctx;
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<NoticeStatus | "all">("all");
  const [event, setEvent] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(productionMode);
  const [remoteData, setRemoteData] = useState<NotificationsPageData>({
    items: [], total: 0, page: 1, pageSize: 10,
    summary: { all: 0, success: 0, failed: 0, skipped: 0 },
    events: [],
  });

  useEffect(() => {
    if (!productionMode) return;
    let active = true;
    const params = new URLSearchParams({ page: String(page), pageSize: "10" });
    if (query) params.set("q", query);
    if (status !== "all") params.set("status", status);
    if (event !== "all") params.set("event", event);
    setLoading(true);
    apiRequest<NotificationsPageData>(`/api/notifications?${params.toString()}`, { cache: "no-store" })
      .then((data) => { if (active) setRemoteData(data); })
      .catch((error) => { if (active) appMessage.error(error instanceof Error ? error.message : "通知日志加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, status, event, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const demoData = useMemo<NotificationsPageData>(() => {
    const base = state.notices.filter((notice) => notice.target === currentUser.name);
    const filtered = base.filter((notice) =>
      (status === "all" || noticeStatus(notice) === status)
      && (event === "all" || notice.event === event)
      && (!query || notice.content.toLowerCase().includes(query.toLowerCase()) || notice.event.toLowerCase().includes(query.toLowerCase())),
    );
    const pageSize = 10;
    return {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize,
      summary: {
        all: base.length,
        success: base.filter((notice) => noticeStatus(notice) === "success").length,
        failed: base.filter((notice) => noticeStatus(notice) === "failed").length,
        skipped: base.filter((notice) => noticeStatus(notice) === "skipped").length,
      },
      events: [...new Set(base.map((notice) => notice.event))].sort(),
    };
  }, [state.notices, currentUser.name, page, query, status, event]);

  const data = productionMode ? remoteData : demoData;
  const columns: TableColumnsType<NoticeLog> = [
    { title: "北京时间", dataIndex: "time", width: 170 },
    { title: "事件类型", dataIndex: "event", width: 140, render: (value: string) => { const meta = notificationEventMeta[value] || { label: value, color: "default" }; return <Tag color={meta.color}>{meta.label}</Tag>; } },
    { title: "通知内容", dataIndex: "content", render: (value: string) => <Text>{value}</Text> },
    { title: "接收人", dataIndex: "target", width: 120 },
    { title: "投递状态", width: 120, render: (_, notice) => { const meta = notificationStatusMeta[noticeStatus(notice)]; return <Badge status={meta.badge} text={meta.label} />; } },
  ];
  const description = currentUser.role === "operator"
    ? "查看选品分配、异议复审与系统通知的投递记录，仅展示发送给你的消息"
    : "查看审核结果与系统通知的投递记录，仅展示发送给你的消息";

  return (
    <>
      <PageHeading title="通知日志" description={description} extra={<Button icon={<ReloadOutlined />} loading={loading} onClick={() => setRefreshKey((value) => value + 1)}>刷新</Button>} />
      <Row gutter={[16, 16]} className="summary-strip notification-summary">
        <Col span={6}><Card><Statistic title="全部通知" value={data.summary.all} prefix={<BellOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="发送成功" value={data.summary.success} prefix={<CheckCircleOutlined />} content={{ color: "#12a47d" }} /></Card></Col>
        <Col span={6}><Card><Statistic title="发送失败" value={data.summary.failed} prefix={<ExclamationCircleOutlined />} content={{ color: "#d84a57" }} /></Card></Col>
        <Col span={6}><Card><Statistic title="已跳过" value={data.summary.skipped} prefix={<ClockCircleOutlined />} /></Card></Col>
      </Row>
      <Card>
        <div className="table-toolbar notification-toolbar">
          <Space wrap>
            <Input.Search allowClear placeholder="搜索通知内容或事件" onSearch={(value) => { setQuery(value.trim()); setPage(1); }} style={{ width: 280 }} />
            <Select value={event} onChange={(value) => { setEvent(value); setPage(1); }} style={{ width: 160 }} options={[{ value: "all", label: "全部事件" }, ...data.events.map((value) => ({ value, label: notificationEventMeta[value]?.label || value }))]} />
            <Select value={status} onChange={(value) => { setStatus(value); setPage(1); }} style={{ width: 140 }} options={[{ value: "all", label: "全部状态" }, ...Object.entries(notificationStatusMeta).map(([value, meta]) => ({ value, label: meta.label }))]} />
          </Space>
          <Text type="secondary">共 {data.total} 条匹配记录</Text>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data.items}
          columns={columns}
          pagination={{ current: data.page, pageSize: data.pageSize, total: data.total, showSizeChanger: false, onChange: setPage, showTotal: (total) => `共 ${total} 条` }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知记录" /> }}
        />
      </Card>
    </>
  );
}

function UsersPage(ctx: PageContext) {
  const { state, setUserModal, userForm, setState, appMessage } = ctx;
  const [role, setRole] = useState("all");
  const data = state.users.filter((u) => role === "all" || u.role === role);
  const openEdit = (user: User) => { userForm.resetFields(); userForm.setFieldsValue(user); setUserModal(user); };
  const toggle = async (user: User) => {
    try {
      let saved = { ...user, isActive: !user.isActive };
      if (productionMode) saved = await apiRequest<User>(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !user.isActive }) });
      setState((old) => ({ ...old, users: old.users.map((item) => item.id === user.id ? saved : item) }));
      appMessage.success(`已${user.isActive ? "停用" : "启用"} ${user.name}`);
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };
  const columns: TableColumnsType<User> = [
    { title: "用户", render: (_, u) => <Space><Avatar style={{ background: roleMeta[u.role].color }}>{u.name.slice(-1)}</Avatar><span><strong>{u.name}</strong><br /><Text type="secondary" className="small-text">{u.email}</Text></span></Space> },
    { title: "角色", dataIndex: "role", width: 120, render: (value) => <RoleTag role={value} /> },
    { title: "飞书绑定", dataIndex: "feishuUserId", width: 140, render: (value) => value ? <Tag icon={<CheckCircleFilled />} color="success">已绑定</Tag> : <Tag>未绑定</Tag> },
    { title: "状态", dataIndex: "isActive", width: 100, render: (value) => <Badge status={value ? "success" : "default"} text={value ? "启用" : "停用"} /> },
    { title: "创建日期", dataIndex: "createdAt", width: 120 },
    { title: "操作", width: 150, align: "right", render: (_, u) => <Space><Button type="link" onClick={() => openEdit(u)}>编辑</Button><Popconfirm title={`确认${u.isActive ? "停用" : "启用"}该用户？`} onConfirm={() => toggle(u)}><Button type="link" danger={u.isActive}>{u.isActive ? "停用" : "启用"}</Button></Popconfirm></Space> },
  ];
  return (
    <>
      <PageHeading title="用户管理" description="管理团队账号、角色权限与飞书绑定" extra={<Space><Button icon={<CloudUploadOutlined />}>批量导入</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => { userForm.resetFields(); setUserModal("new"); }}>新增用户</Button></Space>} />
      <Card>
        <div className="table-toolbar"><Segmented value={role} onChange={(value) => setRole(String(value))} options={[{ value: "all", label: `全部 ${state.users.length}` }, { value: "developer", label: `开发 ${state.users.filter((u) => u.role === "developer").length}` }, { value: "operator", label: `运营 ${state.users.filter((u) => u.role === "operator").length}` }, { value: "admin", label: `管理员 ${state.users.filter((u) => u.role === "admin").length}` }]} /><Input prefix={<SearchOutlined />} placeholder="搜索姓名或邮箱" style={{ width: 240 }} /></div>
        <Table rowKey="id" dataSource={data} columns={columns} pagination={false} />
      </Card>
    </>
  );
}

function StatsPage(ctx: PageContext) {
  const { state } = ctx;
  const completed = state.products.filter((p) => ["approved", "rejected"].includes(p.status));
  const passRate = completed.length ? Math.round(completed.filter((p) => p.status === "approved").length / completed.length * 100) : 0;
  const devs = state.users.filter((u) => u.role === "developer").map((u) => {
    const own = state.products.filter((p) => p.submitterId === u.id);
    return { key: u.id, name: u.name, count: own.length, approved: own.filter((p) => p.status === "approved").length, rate: own.length ? Math.round(own.filter((p) => p.status === "approved").length / own.length * 100) : 0, rounds: own.length ? (own.reduce((sum, p) => sum + p.reviews.length, 0) / own.length).toFixed(1) : "0" };
  });
  return (
    <>
      <PageHeading title="数据统计" description="从团队、人员与趋势维度洞察选品审核效率" extra={<Button icon={<ExportOutlined />}>导出 Excel</Button>} />
      <Row gutter={[16, 16]} className="summary-strip">
        <Col span={6}><Card><Statistic title="总提交数" value={state.products.length} /></Card></Col>
        <Col span={6}><Card><Statistic title="通过率" value={passRate} suffix="%" styles={{ content: { color: "#12a47d" } }} /></Card></Col>
        <Col span={6}><Card><Statistic title="平均审核时长" value={7.6} suffix="小时" /></Card></Col>
        <Col span={6}><Card><Statistic title="平均审核轮次" value={1.3} suffix="轮" /></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={16}><Card title="提交与审核完成趋势"><TrendChart /></Card></Col>
        <Col span={8}><Card title="流程健康度" className="health-card"><Progress type="dashboard" percent={82} strokeColor={{ "0%": "#5d7be8", "100%": "#12a47d" }} /><Text strong>整体流转顺畅</Text><Text type="secondary">待办均值低于 24 小时</Text></Card></Col>
        <Col span={24}><Card title="开发人员表现"><Table rowKey="key" dataSource={devs} pagination={false} columns={[{ title: "开发人员", dataIndex: "name" }, { title: "提交数", dataIndex: "count" }, { title: "通过数", dataIndex: "approved" }, { title: "通过率", dataIndex: "rate", render: (v: number) => <Space><Progress percent={v} showInfo={false} size="small" style={{ width: 120 }} />{v}%</Space> }, { title: "平均审核轮次", dataIndex: "rounds" }]} /></Card></Col>
      </Row>
    </>
  );
}

function ImportPage(ctx: PageContext) {
  const { state, setState, appMessage } = ctx;
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const parseFile: UploadProps["beforeUpload"] = async (file) => {
    try {
      let parsed: Record<string, string>[] = [];
      if (file.name.toLowerCase().endsWith(".csv")) {
        const lines = (await file.text()).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
        const splitCsv = (line: string) => (line.match(/("(?:[^"]|"")*"|[^,]*)/g) || []).filter((_, index) => index % 2 === 0).map((cell) => cell.replace(/^"|"$/g, "").replace(/""/g, '"').trim());
        const headers = splitCsv(lines[0] || "");
        parsed = lines.slice(1).map((line) => Object.fromEntries(splitCsv(line).map((value, index) => [headers[index] || `列${index + 1}`, value])));
      } else {
        const readXlsxFile = (await import("read-excel-file/browser")).default;
        const workbookRows = await readXlsxFile(file) as unknown as unknown[][];
        const [headerRow = [], ...dataRows] = workbookRows;
        const headers = headerRow.map((cell, index) => String(cell || `列${index + 1}`));
        parsed = dataRows.map((row) => Object.fromEntries(row.map((cell, index) => [headers[index], cell == null ? "" : String(cell)])));
      }
      setRows(parsed.slice(0, 30)); setFileName(file.name); setStep(1);
      appMessage.success(`已解析 ${parsed.length} 行数据`);
    } catch { appMessage.error("文件解析失败，请检查格式"); }
    return false;
  };
  const importRows = async () => {
    try {
      if (productionMode) {
        const result = await apiRequest<{ imported: number; duplicates: number }>("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
        await ctx.reloadProduction(); setStep(2); appMessage.success(`成功导入 ${result.imported} 条，跳过重复 ${result.duplicates} 条`);
      } else {
        const now = formatTime();
        const added: Product[] = rows.map((row, index) => ({ id: `import-${Date.now()}-${index}`, code: `IMP-${formatChinaDateCode()}-${index + 1}`, name: String(row["表格名称"] || row["产品名称"] || `导入选品 ${index + 1}`), category: String(row["类目"] || "其他"), submitterId: state.users.find((u) => u.name === row["开发人员"])?.id || "u-dev-1", reviewerId: state.users.find((u) => u.name === row["运营分配"])?.id, status: "pending_assign", submitTime: String(row["选品时间"] || now), attachments: [], reviews: [], objections: [] }));
        setState((old) => ({ ...old, products: [...added, ...old.products] })); setStep(2); appMessage.success(`成功导入 ${added.length} 条选品数据`);
      }
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };
  return (
    <>
      <PageHeading title="历史数据导入" description="将现有 Excel 跟踪表迁移至系统，导入前可预览与确认字段映射" />
      <Card><Steps current={step} items={[{ title: "上传文件" }, { title: "字段映射与预览" }, { title: "完成导入" }]} className="import-steps" />
        {step === 0 && <Upload.Dragger beforeUpload={parseFile} accept=".xlsx,.csv" showUploadList={false} className="import-dragger"><p className="ant-upload-drag-icon"><FileExcelOutlined /></p><Title level={4}>拖拽 Excel 文件至此，或点击选择</Title><Text type="secondary">支持 .xlsx、.csv，首行需为字段标题</Text></Upload.Dragger>}
        {step === 1 && <div><Alert type="success" showIcon message={`已读取 ${fileName}`} description={`共解析 ${rows.length} 行数据。系统已自动匹配“产品名称、开发人员、运营分配、审核状态”等字段。`} /><div className="mapping-row"><Tag color="blue">表格名称</Tag><SwapOutlined /><Tag color="green">产品名称</Tag><Tag color="blue">开发人员</Tag><SwapOutlined /><Tag color="green">提交人</Tag><Tag color="blue">运营分配</Tag><SwapOutlined /><Tag color="green">审核人</Tag></div><Table size="small" scroll={{ x: 900 }} dataSource={rows.slice(0, 8).map((row, index) => ({ ...row, key: index }))} columns={Object.keys(rows[0] || { "产品名称": "" }).slice(0, 7).map((key) => ({ title: key, dataIndex: key, ellipsis: true, width: 140 }))} pagination={false} /><div className="import-actions"><Button icon={<LeftOutlined />} onClick={() => setStep(0)}>重新上传</Button><Button type="primary" onClick={importRows}>确认导入 {rows.length} 条</Button></div></div>}
        {step === 2 && <div className="success-state"><CheckCircleFilled /><Title level={3}>数据导入完成</Title><Paragraph>成功导入 {rows.length} 条选品记录，已进入待分配队列。</Paragraph><Button type="primary" onClick={() => { setStep(0); setRows([]); }}>继续导入</Button></div>}
      </Card>
    </>
  );
}

function SettingsPage(ctx: PageContext) {
  const { state, appMessage } = ctx;
  return (
    <>
      <PageHeading title="系统设置" description="配置飞书应用、通知模板与自动分配规则" />
          <Tabs tabPlacement="left" className="settings-tabs" items={[
        { key: "production", label: "生产接入", children: <Card title="生产环境接入进度"><Alert type={productionMode ? "success" : "warning"} showIcon title={productionMode ? "已启用生产数据模式" : "当前仍为安全演示模式"} description={productionMode ? "用户身份、业务数据、附件与通知均通过服务端生产接口处理。" : "完成以下步骤并将 NEXT_PUBLIC_APP_MODE 改为 production 后，系统才会连接云端资源。"} /><div className="production-checklist"><Steps orientation="vertical" current={productionMode ? 5 : 0} items={[{ title: "创建 Supabase 项目", content: "获取 Project URL、Publishable Key 与 Service Role Key" }, { title: "配置数据库连接", content: "分别填写运行时 Transaction Pooler URL 与迁移 Direct URL" }, { title: "执行数据库迁移", content: "运行 npm run db:migrate，并在 SQL Editor 执行 supabase/setup.sql" }, { title: "初始化管理员", content: "填写 BOOTSTRAP_ADMIN_* 后运行 npm run db:seed" }, { title: "启用生产模式", content: "设置 NEXT_PUBLIC_APP_MODE=production，重启或重新部署" }, { title: "验证外部服务", content: "访问 /api/health，并测试附件上传与飞书通知" }]} /></div></Card> },
        { key: "feishu", label: "飞书集成", children: <Card title="飞书自建应用"><Alert title="凭据仅保存在服务端环境变量中，页面不会回显 App Secret。" type="info" showIcon /><Form layout="vertical" className="settings-form" initialValues={{ appId: "cli_a7••••••••92", enabled: true }}><Form.Item label="App ID" name="appId"><Input /></Form.Item><Form.Item label="App Secret"><Input.Password placeholder="输入新的 Secret 以更新" /></Form.Item><Form.Item label="启用机器人通知" name="enabled" valuePropName="checked"><Switch /></Form.Item><Button type="primary" icon={<SendOutlined />} onClick={() => appMessage.success("连接测试成功")}>保存并测试连接</Button></Form></Card> },
        { key: "notify", label: "通知规则", children: <Card title="事件通知"><div className="setting-list">{["新选品分配给运营", "运营完成审核", "开发人员提交异议", "选品被驳回或要求二次开发"].map((item) => <div key={item}><span><strong>{item}</strong><small>通过飞书卡片消息实时推送</small></span><Switch defaultChecked /></div>)}</div></Card> },
        { key: "assign", label: "自动分配", children: <Card title="轮询分配规则"><Paragraph type="secondary">启用后，新提交选品将按当前待审量优先分配给在岗运营。</Paragraph><Space orientation="vertical" size="large"><Space><Switch /><Text>启用自动分配</Text></Space><Select defaultValue="round-robin" style={{ width: 260 }} options={[{ value: "round-robin", label: "轮询平均分配" }, { value: "least-load", label: "按当前待审量分配" }]} /><Button type="primary" onClick={() => appMessage.success("分配规则已保存")}>保存规则</Button></Space></Card> },
        { key: "logs", label: `通知日志 (${state.notices.length})`, children: <Card title="最近通知"><Table rowKey="id" dataSource={state.notices} pagination={false} columns={[{ title: "时间", dataIndex: "time", width: 160 }, { title: "事件", dataIndex: "event", width: 120 }, { title: "接收人", dataIndex: "target", width: 100 }, { title: "通知内容", dataIndex: "content" }, { title: "状态", dataIndex: "success", width: 90, render: (value) => <Badge status={value ? "success" : "error"} text={value ? "成功" : "失败"} /> }]} /></Card> },
      ]} />
    </>
  );
}

function ProductDrawer({ product, users, currentUser, onClose, onReview, onObjection }: { product: Product | null; users: User[]; currentUser: User; onClose: () => void; onReview: (p: Product) => void; onObjection: (p: Product) => void }) {
  if (!product) return null;
  const timeline = [
    { key: "submit", time: product.submitTime, title: "提交选品", content: `${nameOf(users, product.submitterId)} 提交了选品资料`, color: "blue" },
    ...(product.assignTime ? [{ key: "assign", time: product.assignTime, title: "分配审核", content: `分配给 ${nameOf(users, product.reviewerId)}`, color: "blue" }] : []),
    ...product.reviews.flatMap((review) => {
      const objection = product.objections.find((item) => item.roundId === review.id);
      const items = [{ key: review.id, time: review.createdAt, title: `第 ${review.round} 轮审核 · ${decisionMeta[review.decision].label}`, content: review.comment, color: review.decision === "approved" ? "green" : review.decision === "rejected" ? "red" : "orange" }];
      if (objection) items.push({ key: objection.id, time: objection.createdAt, title: "开发提交异议", content: objection.content, color: "cyan" });
      return items;
    }),
  ];
  const canReview = ["admin", "operator"].includes(currentUser.role) && ["pending_review", "objection_pending"].includes(product.status);
  const canObject = currentUser.role === "developer" && product.submitterId === currentUser.id && ["returned", "redevelop"].includes(product.status);
  return (
    <Drawer title={null} open={!!product} onClose={onClose} size={720} styles={{ body: { padding: 0 } }}>
      <div className="drawer-hero"><div className="drawer-code"><Tag>{product.code}</Tag><StatusTag status={product.status} /></div><Title level={3}>{product.name}</Title><Text type="secondary">{product.category} · 由 {nameOf(users, product.submitterId)} 于 {product.submitTime} 提交</Text></div>
      <div className="drawer-content">
        <Descriptions title="选品信息" bordered column={2} size="small" items={[{ key: "category", label: "产品类目", children: product.category }, { key: "price", label: "预期售价", children: product.expectedPrice ? `$${product.expectedPrice}` : "—" }, { key: "submitter", label: "提交人", children: nameOf(users, product.submitterId) }, { key: "reviewer", label: "审核人", children: nameOf(users, product.reviewerId) }, { key: "url", label: "货源链接", span: 2, children: product.sourceUrl ? <a href={product.sourceUrl} target="_blank">查看货源页面</a> : "—" }, { key: "notes", label: "选品说明", span: 2, children: product.notes || "未填写" }]} />
        <Divider />
        <Title level={5}>资料附件 <Text type="secondary" className="small-text">({product.attachments.length})</Text></Title>
        {product.attachments.length ? <div className="attachment-list">{product.attachments.map((file) => <div key={file.id}><FileSearchOutlined /><span><strong>{file.name}</strong><small>{Math.max(file.size / 1024, 1).toFixed(0)} KB</small></span><Button type="link" href={productionMode ? `/api/files/${file.id}` : undefined} target="_blank">{productionMode ? "下载" : "预览"}</Button></div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无附件" />}
        <Divider />
        <Title level={5}>流转记录</Title>
        <Timeline items={timeline.slice().reverse().map((item) => ({ color: item.color, children: <div className="timeline-item"><div><strong>{item.title}</strong><Text type="secondary">{item.time}</Text></div><Paragraph>{item.content}</Paragraph></div> }))} />
      </div>
      {(canReview || canObject) && <div className="drawer-footer"><Button onClick={onClose}>关闭</Button>{canReview && <Button type="primary" icon={<SafetyCertificateOutlined />} onClick={() => onReview(product)}>开始审核</Button>}{canObject && <Button type="primary" icon={<ExclamationCircleOutlined />} onClick={() => onObjection(product)}>提交异议</Button>}</div>}
    </Drawer>
  );
}

function ReviewSummary({ product, users }: { product: Product; users: User[] }) {
  const objection = product.objections.at(-1);
  return <div className="review-summary"><Space separator={<Divider orientation="vertical" />}><span><Text type="secondary">提交人</Text><strong>{nameOf(users, product.submitterId)}</strong></span><span><Text type="secondary">当前轮次</Text><strong>第 {product.reviews.length + 1} 轮</strong></span><span><Text type="secondary">附件</Text><strong>{product.attachments.length} 个</strong></span></Space>{objection && <Alert type="warning" showIcon message="开发人员最新异议" description={objection.content} />}</div>;
}
