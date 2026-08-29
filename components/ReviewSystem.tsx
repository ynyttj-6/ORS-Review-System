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
import AppstoreOutlined from "@ant-design/icons/AppstoreOutlined";
import BarChartOutlined from "@ant-design/icons/BarChartOutlined";
import BellOutlined from "@ant-design/icons/BellOutlined";
import CheckCircleFilled from "@ant-design/icons/CheckCircleFilled";
import CheckCircleOutlined from "@ant-design/icons/CheckCircleOutlined";
import ClockCircleOutlined from "@ant-design/icons/ClockCircleOutlined";
import CloudUploadOutlined from "@ant-design/icons/CloudUploadOutlined";
import DatabaseOutlined from "@ant-design/icons/DatabaseOutlined";
import DownOutlined from "@ant-design/icons/DownOutlined";
import ExclamationCircleOutlined from "@ant-design/icons/ExclamationCircleOutlined";
import ExportOutlined from "@ant-design/icons/ExportOutlined";
import FileExcelOutlined from "@ant-design/icons/FileExcelOutlined";
import FileSearchOutlined from "@ant-design/icons/FileSearchOutlined";
import InboxOutlined from "@ant-design/icons/InboxOutlined";
import LeftOutlined from "@ant-design/icons/LeftOutlined";
import LogoutOutlined from "@ant-design/icons/LogoutOutlined";
import MenuFoldOutlined from "@ant-design/icons/MenuFoldOutlined";
import MenuUnfoldOutlined from "@ant-design/icons/MenuUnfoldOutlined";
import MoreOutlined from "@ant-design/icons/MoreOutlined";
import PlusOutlined from "@ant-design/icons/PlusOutlined";
import ProductOutlined from "@ant-design/icons/ProductOutlined";
import ReloadOutlined from "@ant-design/icons/ReloadOutlined";
import SafetyCertificateOutlined from "@ant-design/icons/SafetyCertificateOutlined";
import SearchOutlined from "@ant-design/icons/SearchOutlined";
import SendOutlined from "@ant-design/icons/SendOutlined";
import SettingOutlined from "@ant-design/icons/SettingOutlined";
import SwapOutlined from "@ant-design/icons/SwapOutlined";
import TeamOutlined from "@ant-design/icons/TeamOutlined";
import UserOutlined from "@ant-design/icons/UserOutlined";
import zhCN from "antd/locale/zh_CN";
import { formatChinaDate, formatChinaLongDate } from "@/lib/time";
import type { AppState, Decision, NoticeLog, NoticeStatus, Product, ProductStatus, Role, User } from "@/types";
import { calculateProductEconomics } from "@/lib/product-calculations";

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

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
  draft: { label: "草稿", color: "default" },
  pending_assign: { label: "待分配", color: "gold" },
  pending_review: { label: "待审核", color: "blue" },
  approved: { label: "已通过", color: "green" },
  rejected: { label: "不通过", color: "red" },
  returned: { label: "异议待审（旧）", color: "orange" },
  redevelop: { label: "二次开发", color: "purple" },
  objection_pending: { label: "异议待审", color: "cyan" },
};

const decisionMeta: Record<Decision, { label: string; color: string }> = {
  approved: { label: "通过-上架", color: "green" },
  rejected: { label: "不通过", color: "red" },
  returned: { label: "驳回补充（旧）", color: "orange" },
  redevelop: { label: "驳回-二次开发", color: "purple" },
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

const requiredRule = { required: true, message: "此项为提交审核必填项" };
const textArea = (placeholder: string, rows = 3) => <Input.TextArea rows={rows} placeholder={placeholder} showCount maxLength={5000} />;
const productAttachmentGroups = [
  ["productImages", "product_image"],
  ["competitorScreenshots", "competitor_screenshot"],
  ["supportingFiles", "data_screenshot"],
  ["supplierFiles", "supplier_info"],
] as const;

function normalizeUploadFiles(event: UploadFile[] | { fileList?: UploadFile[] }) {
  return Array.isArray(event) ? event : event?.fileList || [];
}

function ProductWizardFields({ step, economics, values }: { step: number; economics: ReturnType<typeof calculateProductEconomics>; values: Record<string, unknown> }) {
  const upload = (hint: string) => <Upload.Dragger beforeUpload={() => false} maxCount={5} accept=".jpg,.jpeg,.png,.pdf"><p className="ant-upload-drag-icon"><InboxOutlined /></p><p>{hint}</p><Text type="secondary">JPG / PNG / PDF，单文件不超过 10MB</Text></Upload.Dragger>;
  return <>
    <div style={{ display: step === 0 ? "block" : "none" }}>
      <Alert type="info" showIcon title="第一步先建立市场锚点" description="竞品链接、核心关键词和价格带将决定后续竞争分析口径。" />
      <Row gutter={16} className="wizard-fields"><Col span={16}><Form.Item label="产品名称" name="name" rules={[requiredRule]}><Input /></Form.Item></Col><Col span={8}><Form.Item label="产品类目" name="category"><Select options={categoryOptions.map((value) => ({ value, label: value }))} /></Form.Item></Col></Row>
      <Form.Item label="竞品链接" name="competitorLink" rules={[requiredRule, { type: "url", message: "请输入有效链接" }]}><Input placeholder="Amazon 对标竞品链接" /></Form.Item>
      <Row gutter={16}><Col span={12}><Form.Item label="其他竞品 ASIN" name="competitorAsins"><Input placeholder="多个 ASIN 用逗号分隔" /></Form.Item></Col><Col span={12}><Form.Item label="核心关键词" name="coreKeyword" rules={[requiredRule]}><Input /></Form.Item></Col></Row>
      <Row gutter={16}><Col span={10}><Form.Item label="市场价格区间" name="priceRange" rules={[requiredRule]}><Input placeholder="如 3.29-13.99" /></Form.Item></Col><Col span={14}><Form.Item label="市场最高价链接" name="topCompetitorLink" rules={[{ type: "url", warningOnly: true }]}><Input /></Form.Item></Col></Row>
    </div>
    <div style={{ display: step === 1 ? "block" : "none" }} className="analysis-grid">
      <Form.Item label="季节性产品判断" name="seasonality" rules={[requiredRule]}>{textArea("结合 Keepa 全年 BSR 走势判断旺淡季")}</Form.Item>
      <Form.Item label="产品主要使用场景" name="usageScenario" rules={[requiredRule]}>{textArea("谁在什么场景下使用")}</Form.Item>
      <Form.Item label="迭代方案及卖点分析" name="iterationPlan" rules={[requiredRule]}>{textArea("改了什么配置、补了什么短板、卖多少钱以及抢单依据", 5)}</Form.Item>
      <Form.Item label="目标人群（选填）" name="targetAudience">{textArea("如有明确受众请填写")}</Form.Item>
      <Form.Item label="认证及审核资料" name="certification" rules={[requiredRule]}>{textArea("证书清单；无需认证请填“无”")}</Form.Item>
      <Form.Item label="产品专利情况查询" name="patentStatus" rules={[requiredRule]}>{textArea("查询渠道、结果与风险结论")}</Form.Item>
      <Form.Item label="产品商标情况查询" name="trademarkStatus" rules={[requiredRule]}>{textArea("品牌及核心关键词商标排查")}</Form.Item>
      <Form.Item label="现有竞品差评分析" name="competitorReviewsAnalysis" rules={[requiredRule]}>{textArea("至少覆盖 4 个以上竞品的主要差评", 5)}</Form.Item>
      <Form.Item label="新图案视觉升级方向（选填）" name="visualUpgradeDirection">{textArea("参考图、色彩、核心元素、避开盲区")}</Form.Item>
      <Form.Item label="视觉与素材版权排查" name="copyrightCheck" rules={[requiredRule]}>{textArea("素材来源及版权风险结论")}</Form.Item>
      <Form.Item label="TRO 钓鱼排查" name="troCheck" rules={[requiredRule]}>{textArea("关键词、图案特征和高危图排查结果")}</Form.Item>
      <Form.Item label="短句/标语商标排查（选填）" name="phraseTrademarkCheck">{textArea("USPTO 排查结果")}</Form.Item>
      <Form.Item label="包装形态与开箱体验" name="packaging" rules={[requiredRule]}>{textArea("OPP 袋/彩盒及节日氛围设计")}</Form.Item>
      <Form.Item label="供应链优势（选填）" name="supplyChainAdvantage">{textArea("没有可填“无”")}</Form.Item>
    </div>
    <div style={{ display: step === 2 ? "block" : "none" }}>
      <Row gutter={16}><Col span={8}><Form.Item label="建议发货数量" name="suggestedQuantity" rules={[requiredRule]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={8}><Form.Item label="建议售价（USD）" name="suggestedPrice" rules={[requiredRule]}><InputNumber min={0.01} precision={2} prefix="$" style={{ width: "100%" }} /></Form.Item></Col><Col span={8}><Form.Item label="建议最低售价（USD）" name="minPrice" dependencies={["suggestedPrice"]} rules={[requiredRule, ({ getFieldValue }) => ({ validator(_, value) { return !value || !getFieldValue("suggestedPrice") || value <= getFieldValue("suggestedPrice") ? Promise.resolve() : Promise.reject(new Error("不能高于建议售价")); } })]}><InputNumber min={0.01} precision={2} prefix="$" style={{ width: "100%" }} /></Form.Item></Col></Row>
      <Row gutter={16}><Col span={8}><Form.Item label="产品成本（CNY）" name="productCostCny" rules={[requiredRule]}><InputNumber min={0} precision={2} prefix="¥" style={{ width: "100%" }} /></Form.Item></Col><Col span={16}><Form.Item label="工厂名称" name="supplierName" rules={[requiredRule]}><Input /></Form.Item></Col></Row>
      <Row gutter={16}><Col span={8}><Form.Item label="起订数量" name="moq" rules={[requiredRule]}><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={8}><Form.Item label="单价（材质+工艺）" name="unitPrice" rules={[requiredRule]}><Input /></Form.Item></Col><Col span={8}><Form.Item label="做货时间" name="productionTime" rules={[requiredRule]}><Input placeholder="如 48h" /></Form.Item></Col></Row>
      <Form.Item label="1688 采购链接" name="supplierLink" rules={[requiredRule, { type: "url", message: "请输入有效链接" }]}><Input /></Form.Item>
      <Form.Item label="供应商备注" name="supplierRemark">{textArea("报价条件、打样与补充说明")}</Form.Item>
    </div>
    <div style={{ display: step === 3 ? "block" : "none" }}>
      <Alert type="warning" showIcon title="FBA 费用为系统估算" description="按 Amazon.com US 2026 非服装费率分段并计入 3.5% 附加费；采购前请用 Seller Central Revenue Calculator 复核。" />
      <Row gutter={16} className="wizard-fields"><Col span={6}><Form.Item label="长（cm）" name="lengthCm" rules={[requiredRule]}><InputNumber min={0.01} style={{ width: "100%" }} /></Form.Item></Col><Col span={6}><Form.Item label="宽（cm）" name="widthCm" rules={[requiredRule]}><InputNumber min={0.01} style={{ width: "100%" }} /></Form.Item></Col><Col span={6}><Form.Item label="高（cm）" name="heightCm" rules={[requiredRule]}><InputNumber min={0.01} style={{ width: "100%" }} /></Form.Item></Col><Col span={6}><Form.Item label="重量（g）" name="weightG" rules={[requiredRule]}><InputNumber min={0.01} style={{ width: "100%" }} /></Form.Item></Col></Row>
      <Row gutter={16}><Col span={8}><Form.Item label="佣金比例" name="commissionRate"><InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} /></Form.Item></Col><Col span={8}><Form.Item label="人民币/美元汇率" name="exchangeRate"><InputNumber min={0.01} precision={4} style={{ width: "100%" }} /></Form.Item></Col><Col span={8}><Form.Item label="头程费用（USD/件）" name="shippingCost"><InputNumber min={0} precision={2} prefix="$" style={{ width: "100%" }} /></Form.Item></Col></Row>
      <Row gutter={16}><Col span={8}><Form.Item label="库存数量" name="inventoryQuantity" extra="留空时按建议发货数量计算"><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={16}><Alert type="info" showIcon title={`库存货值：¥${economics.inventoryValue ?? 0}`} description="库存数量 × 产品成本；用于评估首批备货资金占用。" /></Col></Row>
      <Row gutter={[12, 12]} className="calculation-panel"><Col span={8}><Statistic title="尺寸分段" value={economics.fbaSizeTier || "待计算"} /></Col><Col span={8}><Statistic title="体积重" value={economics.volumetricWeightKg ?? 0} suffix="kg" precision={3} /></Col><Col span={8}><Statistic title="计费重" value={economics.billingWeightLb ?? 0} suffix="lb" precision={3} /></Col><Col span={8}><Statistic title="FBA 配送费" value={economics.fbaFee ?? 0} prefix="$" precision={2} /></Col><Col span={8}><Statistic title="单件利润" value={economics.profitAmount ?? 0} prefix="$" precision={2} styles={{ content: { color: (economics.profitAmount ?? 0) >= 0 ? "#12a47d" : "#cf1322" } }} /></Col><Col span={8}><Statistic title="利润率" value={economics.profitMargin ?? 0} suffix="%" precision={2} styles={{ content: { color: (economics.profitMargin ?? 0) >= 20 ? "#12a47d" : "#d48806" } }} /></Col></Row>
    </div>
    <div style={{ display: step === 4 ? "block" : "none" }}>
      <Row gutter={[16, 16]}><Col span={12}><Form.Item label="产品主图" name="productImages" valuePropName="fileList" getValueFromEvent={normalizeUploadFiles}>{upload("上传自己的产品主图")}</Form.Item></Col><Col span={12}><Form.Item label="卖家精灵/竞品截图" name="competitorScreenshots" valuePropName="fileList" getValueFromEvent={normalizeUploadFiles}>{upload("上传市场与竞品数据截图")}</Form.Item></Col><Col span={12}><Form.Item label="其他支撑数据" name="supportingFiles" valuePropName="fileList" getValueFromEvent={normalizeUploadFiles}>{upload("上传支撑结论的数据截图")}</Form.Item></Col><Col span={12}><Form.Item label="供应商资料" name="supplierFiles" valuePropName="fileList" getValueFromEvent={normalizeUploadFiles}>{upload("上传报价或供应商信息")}</Form.Item></Col></Row>
    </div>
    <div style={{ display: step === 5 ? "block" : "none" }}>
      <Alert type="success" showIcon title="资料已准备完成" description="请核对关键数据。提交后将进入待分配状态，开发端不可再编辑。" />
      <Descriptions bordered column={2} className="preview-descriptions" items={[
        { key: "name", label: "产品名称", children: String(values.name || "—") }, { key: "keyword", label: "核心关键词", children: String(values.coreKeyword || "—") },
        { key: "price", label: "建议/最低售价", children: `$${values.suggestedPrice || 0} / $${values.minPrice || 0}` }, { key: "cost", label: "产品成本", children: `¥${values.productCostCny || 0}` },
        { key: "fba", label: "FBA 费用", children: `$${economics.fbaFee ?? 0}` }, { key: "profit", label: "利润率", children: `${economics.profitMargin ?? 0}%` },
        { key: "supplier", label: "供应商", children: String(values.supplierName || "—") }, { key: "qty", label: "建议发货量", children: String(values.suggestedQuantity || "—") },
        { key: "inventory", label: "库存数量", children: String(values.inventoryQuantity || values.suggestedQuantity || "—") }, { key: "inventoryValue", label: "库存货值", children: `¥${economics.inventoryValue ?? 0}` },
      ]} />
    </div>
  </>;
}

function ProductWizardContent({ form, step }: { form: ReturnType<typeof Form.useForm>[0]; step: number }) {
  const values = (Form.useWatch([], form) || {}) as Record<string, unknown>;
  const economics = useMemo(() => calculateProductEconomics(values), [values]);
  return <ProductWizardFields step={step} economics={economics} values={values} />;
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
  const [state, setState] = useState<AppState>({ users: [], products: [], notices: [] });
  const [activeUserId, setActiveUserId] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productStep, setProductStep] = useState(0);
  const [draftSavedVersion, setDraftSavedVersion] = useState(0);
  const [reviewProduct, setReviewProduct] = useState<Product | null>(null);
  const [editingReviewRoundId, setEditingReviewRoundId] = useState<string | null>(null);
  const [objectionProduct, setObjectionProduct] = useState<Product | null>(null);
  const [assignProduct, setAssignProduct] = useState<Product | null>(null);
  const [userModal, setUserModal] = useState<User | "new" | null>(null);
  const [productForm] = Form.useForm();
  const [reviewForm] = Form.useForm();
  const [objectionForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [userForm] = Form.useForm();
  const reviewDecision = Form.useWatch("decision", reviewForm) as Decision | undefined;
  const hasObjection = Form.useWatch("hasObjection", objectionForm);
  const { message: appMessage } = AntApp.useApp();

  async function loadProduction() {
    const data = await apiRequest<AppState & { currentUser: User }>("/api/bootstrap", { cache: "no-store" });
    setState({ users: data.users, products: data.products, notices: data.notices });
    setActiveUserId(data.currentUser.id);
  }

  useEffect(() => {
    loadProduction().catch((error) => {
      appMessage.error(error instanceof Error ? error.message : "系统加载失败");
    }).finally(() => setReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentUser = state.users.find((user) => user.id === activeUserId) || state.users[0] || { id: "", name: "加载中", account: "", role: "admin" as const, isActive: false, createdAt: "" };
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

  const openProductEditor = (product?: Product) => {
    setEditingProduct(product || null);
    setProductStep(0);
    productForm.resetFields();
    const values: Record<string, unknown> = product ? { ...product } : { category: "其他", commissionRate: 0.15, exchangeRate: 7.2, shippingCost: 0 };
    if (product) {
      for (const [field, attachmentType] of productAttachmentGroups) {
        values[field] = product.attachments
          .filter((attachment) => (attachment.attachmentType || "data_screenshot") === attachmentType)
          .map((attachment) => ({ uid: attachment.id, name: attachment.name, status: "done", size: attachment.size, type: attachment.type, url: `/api/files/${attachment.id}` } satisfies UploadFile));
      }
    }
    productForm.setFieldsValue(values);
    setNewProductOpen(true);
  };

  const startReview = (product: Product) => {
    setEditingReviewRoundId(null);
    reviewForm.resetFields();
    setReviewProduct(product);
  };

  const openAssignment = (product: Product) => {
    setAssignProduct(product);
    assignForm.resetFields();
    assignForm.setFieldsValue({ reviewerId: product.reviewerId });
  };

  const editLatestReview = (product: Product) => {
    const latest = product.reviews.at(-1);
    if (!latest) return;
    setEditingReviewRoundId(latest.id);
    reviewForm.resetFields();
    reviewForm.setFieldsValue({
      decision: latest.decision,
      comment: latest.comment,
      launchDate: latest.launchDate,
      firstBatchQuantity: latest.firstBatchQuantity,
      marketAnalysis: latest.marketAnalysis,
      competitivenessAnalysis: latest.competitivenessAnalysis,
      alternativeSuggestions: latest.alternativeSuggestions,
      improvementSuggestions: latest.improvementSuggestions,
    });
    setReviewProduct(product);
  };

  const reopenProductForEdit = async (product: Product) => {
    try {
      const reopened = await apiRequest<Product>(`/api/products/${product.id}/reopen`, { method: "POST" });
      setState((old) => ({ ...old, products: old.products.map((item) => item.id === reopened.id ? reopened : item) }));
      setSelectedProduct(null);
      openProductEditor(reopened);
      appMessage.success(`已创建第 ${reopened.revision || 1} 版草稿，修改后请重新提交审核`);
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };

  const createProduct = async (action: "draft" | "submit") => {
    try {
      const values = action === "submit" ? await productForm.validateFields() : productForm.getFieldsValue(true);
      if (!values.name || String(values.name).trim().length < 2) throw new Error("请至少填写产品名称后再保存草稿");
      const groups = productAttachmentGroups;
      const payload = Object.fromEntries(Object.entries(values).filter(([key]) => !groups.some(([field]) => field === key)));
      let product: Product;
      if (editingProduct) {
        product = await apiRequest<Product>(`/api/products/${editingProduct.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (action === "submit") product = await apiRequest<Product>(`/api/products/${editingProduct.id}/submit`, { method: "POST" });
      } else {
        product = await apiRequest<Product>("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, action }) });
      }
      for (const [field, attachmentType] of groups) {
        const attachments: UploadFile[] = values[field] || [];
        for (const attachment of attachments) {
          if (!attachment.originFileObj) continue;
          const formData = new FormData(); formData.append("productId", product.id); formData.append("attachmentType", attachmentType); formData.append("file", attachment.originFileObj);
          await apiRequest("/api/upload", { method: "POST", body: formData });
        }
      }
      await loadProduction();
      productForm.resetFields(); setNewProductOpen(false); setEditingProduct(null);
      if (action === "draft") { setDraftSavedVersion((version) => version + 1); router.push("/products"); }
      appMessage.success(action === "draft" ? "草稿已保存，可在草稿箱继续编辑" : "选品已提交，等待管理员分配");
    } catch (error) { if (error instanceof Error && error.message) appMessage.error(error.message); }
  };

  const assign = async () => {
    if (!assignProduct) return;
    try {
      const { reviewerId } = await assignForm.validateFields();
      const reviewer = state.users.find((user) => user.id === reviewerId)!;
      const previousReviewer = assignProduct.reviewerId ? state.users.find((user) => user.id === assignProduct.reviewerId) : undefined;
      const isReassignment = Boolean(previousReviewer);
      const product = await apiRequest<Product>(`/api/products/${assignProduct.id}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewerId }) });
      setState((old) => ({ ...old, products: old.products.map((item) => item.id === product.id ? product : item) }));
      setAssignProduct(null); assignForm.resetFields(); appMessage.success(isReassignment ? `审核人已由 ${previousReviewer?.name} 更改为 ${reviewer.name}` : `已分配给 ${reviewer.name}`);
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };

  const submitReview = async () => {
    if (!reviewProduct) return;
    try {
      const values = await reviewForm.validateFields();
      const url = editingReviewRoundId ? `/api/products/${reviewProduct.id}/review/${editingReviewRoundId}` : `/api/products/${reviewProduct.id}/review`;
      const product = await apiRequest<Product>(url, { method: editingReviewRoundId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      setState((old) => ({ ...old, products: old.products.map((item) => item.id === product.id ? product : item) }));
      const wasEditing = Boolean(editingReviewRoundId);
      setReviewProduct(null); setEditingReviewRoundId(null); reviewForm.resetFields(); appMessage.success(wasEditing ? "历史审核结果已修改并留痕" : "审核结果已提交");
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };

  const submitObjection = async () => {
    if (!objectionProduct) return;
    try {
      const values = await objectionForm.validateFields();
      const { content } = values;
      const product = await apiRequest<Product>(`/api/products/${objectionProduct.id}/objection`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hasObjection: values.hasObjection, content }) });
      const objection = product.objections.at(-1);
      const files: UploadFile[] = values.dataScreenshots?.fileList || [];
      if (values.hasObjection && objection) for (const file of files) if (file.originFileObj) { const formData = new FormData(); formData.append("productId", product.id); formData.append("objectionId", objection.id); formData.append("attachmentType", "data_screenshot"); formData.append("file", file.originFileObj); await apiRequest("/api/upload", { method: "POST", body: formData }); }
      if (files.length) await loadProduction();
      else setState((old) => ({ ...old, products: old.products.map((item) => item.id === product.id ? product : item) }));
      setObjectionProduct(null); objectionForm.resetFields(); appMessage.success(values.hasObjection ? "异议已提交，等待运营复审" : "已确认无异议，选品已结束");
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };

  const saveUser = async () => {
    try {
      const values = await userForm.validateFields();
      const { confirmPassword: _confirmPassword, password, ...profileValues } = values;
      const isNew = userModal === "new";
      const payload = password ? { ...profileValues, password } : profileValues;
      const saved = await apiRequest<User>(isNew ? "/api/users" : `/api/users/${(userModal as User).id}`, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setState((old) => ({ ...old, users: isNew ? [...old.users, saved] : old.users.map((user) => user.id === saved.id ? saved : user) }));
      appMessage.success(userModal === "new" ? "用户账号已创建，可直接发放登录信息" : password ? "用户信息及登录密码已更新" : "用户信息已更新"); setUserModal(null); userForm.resetFields();
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };

  const logout = async () => {
    await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login"); router.refresh();
  };

  const renderPage = () => {
    const page = pathname === "/" ? "dashboard" : pathname.split("/").filter(Boolean)[0] || "dashboard";
    const context = { state, currentUser, operators, setSelectedProduct, setNewProductOpen, openProductEditor, reopenProductForEdit, setReviewProduct: startReview, editLatestReview, setObjectionProduct, setAssignProduct: openAssignment, setUserModal, userForm, setState, appMessage, reloadProduction: loadProduction, draftSavedVersion };
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
  const userMenuItems: MenuProps["items"] = [
    { key: "password", icon: <SafetyCertificateOutlined />, label: "修改密码", onClick: () => router.push("/set-password") },
    { type: "divider" },
    { key: "logout", icon: <LogoutOutlined />, label: "退出登录", onClick: logout },
  ];

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

      <ProductDrawer product={selectedProduct ? state.products.find((p) => p.id === selectedProduct.id) || selectedProduct : null} users={state.users} currentUser={currentUser} onClose={() => setSelectedProduct(null)} onEdit={(p) => { setSelectedProduct(null); openProductEditor(p); }} onReopen={reopenProductForEdit} onReview={(p) => { setSelectedProduct(null); startReview(p); }} onObjection={(p) => { setSelectedProduct(null); setObjectionProduct(p); }} />

      <Modal title={editingProduct ? `继续编辑 · ${editingProduct.name}` : "新建选品"} open={newProductOpen} onCancel={() => { setNewProductOpen(false); setEditingProduct(null); productForm.resetFields(); }} width={980} footer={<div className="wizard-footer"><Button onClick={() => createProduct("draft")}>保存草稿</Button><span className="wizard-footer-spacer" />{productStep > 0 && <Button onClick={() => setProductStep((value) => value - 1)}>上一步</Button>}{productStep < 5 ? <Button type="primary" onClick={() => setProductStep((value) => value + 1)}>下一步</Button> : <Button type="primary" icon={<SendOutlined />} onClick={() => createProduct("submit")}>确认提交审核</Button>}</div>}>
        <Steps size="small" current={productStep} onChange={setProductStep} items={[{ title: "基本信息" }, { title: "产品分析" }, { title: "成本供应商" }, { title: "规格与利润" }, { title: "附件" }, { title: "预览提交" }]} />
        <Form form={productForm} layout="vertical" className="modal-form product-wizard"><ProductWizardContent form={productForm} step={productStep} /></Form>
      </Modal>

      <Modal title={reviewProduct ? `${editingReviewRoundId ? "修改审核结果" : "审核"} · ${reviewProduct.name}` : "提交审核"} open={!!reviewProduct} onCancel={() => { setReviewProduct(null); setEditingReviewRoundId(null); reviewForm.resetFields(); }} onOk={submitReview} okText={editingReviewRoundId ? "保存修改" : "确认提交"} width={620}>
        {editingReviewRoundId && <Alert type="warning" showIcon title="正在修改最新一轮审核结果" description="保存后会同步更新选品状态和最终结论，并在审计日志中保留修改前后的内容。" style={{ marginBottom: 14 }} />}
        {reviewProduct && <ReviewSummary product={reviewProduct} users={state.users} editing={Boolean(editingReviewRoundId)} />}
        <Form form={reviewForm} layout="vertical" className="modal-form">
          <Form.Item label="运营选择" name="decision" rules={[{ required: true, message: "请选择审核决策" }]}>
            <Select size="large" options={(["approved", "rejected", "redevelop"] as Decision[]).filter((value) => value !== "redevelop" || (editingReviewRoundId ? (reviewProduct?.reviews.at(-1)?.round || 0) : (reviewProduct?.reviews.length || 0) + 1) < 3).map((value) => ({ value, label: decisionMeta[value].label }))} placeholder="通过-上架 / 不通过 / 驳回-二次开发" />
          </Form.Item>
          <Form.Item label={reviewDecision === "approved" ? "审核意见" : reviewDecision === "rejected" ? "不上架原因" : "驳回原因"} name="comment" rules={[{ required: true, message: "请填写具体审核意见" }, { min: 5, message: "请至少填写 5 个字" }]}>
            <Input.TextArea rows={4} showCount maxLength={2000} placeholder="说明判断依据、风险或决策理由" />
          </Form.Item>
          {reviewDecision === "approved" && <Row gutter={16}><Col span={12}><Form.Item label="计划上架日期" name="launchDate" rules={[requiredRule]}><Input type="date" /></Form.Item></Col><Col span={12}><Form.Item label="首批发货数量" name="firstBatchQuantity" rules={[requiredRule]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item></Col></Row>}
          {reviewDecision === "redevelop" && <Form.Item label="改进建议（选填）" name="improvementSuggestions"><Input.TextArea rows={3} /></Form.Item>}
          {reviewDecision && <><Form.Item label="市场体量和切入难度（选填）" name="marketAnalysis"><Input.TextArea rows={3} /></Form.Item><Form.Item label="现+1分方案竞争力分析（选填）" name="competitivenessAnalysis"><Input.TextArea rows={3} /></Form.Item><Form.Item label="其他方案设想（选填）" name="alternativeSuggestions"><Input.TextArea rows={3} /></Form.Item></>}
        </Form>
      </Modal>

      <Modal title={objectionProduct ? `提交异议 · ${objectionProduct.name}` : "提交异议"} open={!!objectionProduct} onCancel={() => setObjectionProduct(null)} onOk={submitObjection} okText="提交异议" width={620}>
        {objectionProduct?.reviews.length && <div className="review-quote"><Text type="secondary">最近审核意见</Text><Paragraph>{objectionProduct.reviews.at(-1)?.comment}</Paragraph></div>}
        <Form form={objectionForm} layout="vertical" className="modal-form" initialValues={{ hasObjection: true }}>
          <Form.Item label="是否有异议" name="hasObjection" rules={[requiredRule]}><Segmented block options={[{ label: "有异议，申请复审", value: true }, { label: "无异议，放弃选品", value: false }]} /></Form.Item>
          <Form.Item label={hasObjection === false ? "放弃说明（选填）" : "异议点详细说明"} name="content" rules={hasObjection === false ? [] : [{ required: true, message: "请填写异议内容" }, { min: 10, message: "请至少填写 10 个字" }]}>
            <Input.TextArea rows={5} showCount maxLength={800} placeholder="说明异议依据、补充数据或二次开发进展" />
          </Form.Item>
          {hasObjection !== false && <Form.Item label="数据截图" name="dataScreenshots"><Upload.Dragger beforeUpload={() => false} maxCount={5} accept=".jpg,.jpeg,.png,.pdf"><p className="ant-upload-drag-icon"><CloudUploadOutlined /></p><p>上传支撑异议的数据截图</p></Upload.Dragger></Form.Item>}
        </Form>
      </Modal>

      <Modal title={assignProduct ? `${assignProduct.reviewerId ? "更改审核人" : "分配运营"} · ${assignProduct.name}` : "分配运营"} open={!!assignProduct} onCancel={() => { setAssignProduct(null); assignForm.resetFields(); }} onOk={assign} okText={assignProduct?.reviewerId ? "确认更改" : "确认分配"}>
        {assignProduct?.reviewerId && <Alert type="warning" showIcon title={`当前审核人：${nameOf(state.users, assignProduct.reviewerId)}`} description="更改后，该选品会从原审核人的待办中移除并转入新审核人的队列；已有审核记录不会改变。" style={{ marginBottom: 16 }} />}
        <Form form={assignForm} layout="vertical" className="modal-form">
          <Form.Item label="审核负责人" name="reviewerId" rules={[{ required: true, message: "请选择运营人员" }, { validator: (_, value) => assignProduct?.reviewerId && value === assignProduct.reviewerId ? Promise.reject(new Error("请选择不同于当前审核人的运营人员")) : Promise.resolve() }]}>
            <Select size="large" placeholder="选择运营审核人" options={operators.map((user) => ({ value: user.id, label: `${user.name} · 当前待审 ${state.products.filter((p) => p.reviewerId === user.id && ["pending_review", "objection_pending"].includes(p.status)).length} 项` }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={userModal === "new" ? "新增用户" : "编辑用户"} open={!!userModal} onCancel={() => { setUserModal(null); userForm.resetFields(); }} onOk={saveUser} okText="保存" width={560}>
        <Form form={userForm} layout="vertical" className="modal-form">
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: "请输入姓名" }]}><Input /></Form.Item>
          <Form.Item label="登录账号" name="account" rules={[{ required: true, message: "请输入登录账号" }, { min: 3, message: "登录账号至少 3 位" }, { max: 100, message: "登录账号最多 100 位" }, { pattern: /^[A-Za-z0-9][A-Za-z0-9._@-]*$/, message: "账号只能包含字母、数字、点、下划线、短横线或 @" }]}><Input autoComplete="off" placeholder="例如：zhangsan 或员工编号" /></Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true }]}><Select options={Object.entries(roleMeta).map(([value, meta]) => ({ value, label: meta.label }))} /></Form.Item>
          <Form.Item label="飞书 User ID" name="feishuUserId"><Input placeholder="可选，用于机器人消息推送" /></Form.Item>
          <>
            <Divider plain>登录密码</Divider>
            <Alert type="info" showIcon title={userModal === "new" ? "由管理员设置初始密码并安全发放" : "当前密码已加密，任何人都无法查看"} description={userModal === "new" ? "账号创建后无需邮箱确认，可立即使用账号和密码登录。" : "如需修改，请设置新密码；留空保存时不会改变原密码。"} style={{ marginBottom: 16 }} />
            <Form.Item label={userModal === "new" ? "初始密码" : "新密码（留空则不修改）"} name="password" rules={[{ required: userModal === "new", message: "请设置初始密码" }, { min: 12, message: "密码至少 12 位" }, { max: 72, message: "密码最多 72 位" }]}>
              <Input.Password autoComplete="new-password" placeholder="至少 12 位，可点击右侧图标查看输入" />
            </Form.Item>
            <Form.Item label="确认新密码" name="confirmPassword" dependencies={["password"]} rules={[({ getFieldValue }) => ({ validator(_, value) { const nextPassword = getFieldValue("password"); if (!nextPassword && !value) return Promise.resolve(); if (!value) return Promise.reject(new Error("请再次输入新密码")); return nextPassword === value ? Promise.resolve() : Promise.reject(new Error("两次输入的密码不一致")); } })]}>
              <Input.Password autoComplete="new-password" placeholder="再次输入新密码" />
            </Form.Item>
          </>
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
  openProductEditor: (product?: Product) => void;
  reopenProductForEdit: (product: Product) => Promise<void>;
  setReviewProduct: (product: Product) => void;
  editLatestReview: (product: Product) => void;
  setObjectionProduct: (product: Product) => void;
  setAssignProduct: (product: Product) => void;
  setUserModal: (user: User | "new" | null) => void;
  userForm: ReturnType<typeof Form.useForm>[0];
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  appMessage: ReturnType<typeof message.useMessage>[0];
  reloadProduction: () => Promise<void>;
  draftSavedVersion: number;
};

function DashboardPage(ctx: PageContext) {
  const { state, currentUser, setSelectedProduct, openProductEditor, setReviewProduct, setAssignProduct } = ctx;
  const visible = currentUser.role === "developer" ? state.products.filter((p) => p.submitterId === currentUser.id) : currentUser.role === "operator" ? state.products.filter((p) => p.reviewerId === currentUser.id) : state.products;
  const pending = visible.filter((p) => p.status === "pending_review").length;
  const approved = visible.filter((p) => p.status === "approved").length;
  const pendingAssign = state.products.filter((p) => p.status === "pending_assign").length;
  const finished = visible.filter((p) => ["approved", "rejected"].includes(p.status));
  const passRate = finished.length ? Math.round(finished.filter((p) => p.status === "approved").length / finished.length * 100) : 0;
  const actionable = currentUser.role === "admin" ? state.products.filter((p) => p.status === "pending_assign") : currentUser.role === "operator" ? visible.filter((p) => p.status === "pending_review") : visible.filter((p) => p.status === "objection_pending");

  return (
    <>
      <div className="welcome-banner">
        <div><Text className="eyebrow">{formatChinaLongDate()}</Text><Title level={2}>{currentUser.name}，欢迎回来</Title><Paragraph>{currentUser.role === "admin" ? "今日有新的选品等待分配，团队审核进度尽在掌握。" : currentUser.role === "operator" ? `你有 ${pending} 项选品需要处理，优先关注异议复审。` : "跟踪你的选品进度，及时补充异议与开发数据。"}</Paragraph></div>
        {currentUser.role !== "operator" && <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => openProductEditor()}>提交新选品</Button>}
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

function parseBusinessDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function TrendChart({ products, monthly = false }: { products?: Product[]; monthly?: boolean } = {}) {
  let submission = [5, 8, 6, 11, 9, 14, 12];
  let complete = [3, 4, 7, 6, 8, 9, 11];
  let labels = ["7/26", "7/27", "7/28", "7/29", "7/30", "7/31", "8/1"];
  let keys = labels;
  if (monthly && products) {
    const anchor = new Date();
    const periods = Array.from({ length: 6 }, (_, index) => new Date(anchor.getFullYear(), anchor.getMonth() - 5 + index, 1));
    keys = periods.map((date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    labels = periods.map((date) => `${date.getMonth() + 1}月`);
    const dateKey = (value?: string) => { const date = parseBusinessDate(value); return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : ""; };
    submission = keys.map((key) => products.filter((product) => product.status !== "draft" && dateKey(product.submitTime) === key).length);
    complete = keys.map((key) => products.filter((product) => ["approved", "rejected"].includes(product.status) && dateKey(product.latestReviewTime || product.reviews.at(-1)?.createdAt) === key).length);
  }
  const max = Math.max(...submission, ...complete, 1);
  return (
    <div className="bar-chart">
      <div className="chart-legend"><span><i className="dot blue" />提交量</span><span><i className="dot teal" />完成量</span></div>
      <div className="bars">{labels.map((label, index) => <div className="bar-group" key={keys[index]}><div className="bar-stack"><Tooltip title={`${label}提交 ${submission[index]}`}><i className="bar submit" style={{ height: `${submission[index] / max * 150}px` }} /></Tooltip><Tooltip title={`${label}完成 ${complete[index]}`}><i className="bar complete" style={{ height: `${complete[index] / max * 150}px` }} /></Tooltip></div><span>{label}</span></div>)}</div>
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
    { title: "", key: "action", width: 120, align: "right", render: (_, p) => action && actionLabel ? <Button type="link" onClick={() => action(p)}>{actionLabel}</Button> : <Button type="text" icon={<MoreOutlined />} onClick={() => open(p)} /> },
  ];
}

function ProductsPage(ctx: PageContext) {
  const { state, currentUser, setSelectedProduct, openProductEditor, reopenProductForEdit, setObjectionProduct, setState, appMessage, draftSavedVersion } = ctx;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(currentUser.role === "developer" ? "submitted" : "all");
  useEffect(() => {
    if (draftSavedVersion > 0) setStatus("draft");
  }, [draftSavedVersion]);
  const base = currentUser.role === "developer" ? state.products.filter((p) => p.submitterId === currentUser.id) : currentUser.role === "operator" ? state.products.filter((p) => p.reviewerId === currentUser.id) : state.products;
  const statusMatch = (product: Product) => status === "all" || (status === "draft" ? product.status === "draft" : status === "approved_tab" ? product.status === "approved" : status === "submitted" ? product.status !== "draft" : product.status === status);
  const normalizedQuery = query.trim().toLowerCase();
  const data = base.filter((p) => statusMatch(p) && (!normalizedQuery || p.name.toLowerCase().includes(normalizedQuery) || p.code.toLowerCase().includes(normalizedQuery) || p.coreKeyword?.toLowerCase().includes(normalizedQuery) || p.competitorLink?.toLowerCase().includes(normalizedQuery)));
  const removeDraft = async (product: Product) => {
    try {
      await apiRequest(`/api/products/${product.id}`, { method: "DELETE" });
      setState((old) => ({ ...old, products: old.products.filter((item) => item.id !== product.id) }));
      appMessage.success("草稿已删除");
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };
  const columns: TableColumnsType<Product> = [
    { title: "选品", dataIndex: "name", key: "name", render: (_, p) => <button className="product-cell" onClick={() => setSelectedProduct(p)}><span className="product-thumb"><ProductOutlined /></span><span><strong>{p.name}</strong><small>{p.code} · {p.category} · 第 {p.revision || 1} 版</small></span></button> },
    { title: "竞品链接", key: "competitorLink", width: 110, render: (_, p) => { const link = p.competitorLink || p.sourceUrl; return link ? <a href={link} target="_blank" rel="noreferrer">打开竞品</a> : "—"; } },
    { title: "提交人", dataIndex: "submitterId", width: 90, render: (id) => nameOf(state.users, id) },
    { title: "审核人", dataIndex: "reviewerId", width: 90, render: (id) => nameOf(state.users, id) },
    { title: "建议售价", width: 100, render: (_, p) => p.suggestedPrice == null ? "—" : `$${p.suggestedPrice.toFixed(2)}` },
    { title: "利润率", width: 90, render: (_, p) => p.profitMargin == null ? "—" : <Text style={{ color: p.profitMargin >= 20 ? "#12a47d" : "#d48806" }}>{p.profitMargin.toFixed(1)}%</Text> },
    ...(currentUser.role === "developer" && status === "approved_tab" ? [
      { title: "上架日期", dataIndex: "launchDate", width: 120, render: (value: string | undefined) => value || "—" },
      { title: "首批发货数量", dataIndex: "firstBatchQuantity", width: 120, render: (value: number | undefined) => value ?? "—" },
    ] : []),
    { title: "状态", dataIndex: "status", width: 110, render: (value) => <StatusTag status={value} /> },
    { title: "提交时间", dataIndex: "submitTime", width: 150 },
    { title: "操作", key: "action", width: 250, align: "right", render: (_, p) => <Space size={2}>{p.status === "draft" && (currentUser.role === "admin" || (currentUser.role === "developer" && p.submitterId === currentUser.id)) && <><Button type="link" onClick={() => openProductEditor(p)}>继续编辑</Button>{(p.revision || 1) === 1 && !p.reviews.length && <Popconfirm title="删除这份草稿？" onConfirm={() => removeDraft(p)}><Button type="link" danger>删除</Button></Popconfirm>}</>}{currentUser.role === "developer" && p.submitterId === currentUser.id && p.status !== "draft" && <Popconfirm title="将该历史选品撤回修改？" description="当前审核状态和分配将清空，历史审核记录会保留；修改后需要重新提交。" onConfirm={() => reopenProductForEdit(p)}><Button type="link">修改并重提</Button></Popconfirm>}{currentUser.role === "developer" && p.status === "objection_pending" && <Button type="link" onClick={() => setObjectionProduct(p)}>提交异议</Button>}<Button type="link" onClick={() => setSelectedProduct(p)}>详情</Button></Space> },
  ];
  return (
    <>
      <PageHeading title={currentUser.role === "developer" ? "我的选品" : "选品管理"} description="集中查看选品资料、利润结果、审核状态与完整流转记录" extra={currentUser.role !== "operator" && <Button type="primary" icon={<PlusOutlined />} onClick={() => openProductEditor()}>新建选品</Button>} />
      <Card>
        {currentUser.role === "developer" && <Tabs activeKey={status} onChange={setStatus} items={[{ key: "draft", label: `草稿箱 ${base.filter((p) => p.status === "draft").length}` }, { key: "submitted", label: `已提交 ${base.filter((p) => p.status !== "draft").length}` }, { key: "approved_tab", label: `已通过 ${base.filter((p) => p.status === "approved").length}` }]} />}
        <div className="table-toolbar"><Space><Input prefix={<SearchOutlined />} placeholder="搜索产品、编号或核心词" allowClear value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 280 }} />{currentUser.role !== "developer" && <Select value={status} onChange={setStatus} style={{ width: 150 }} options={[{ value: "all", label: "全部状态" }, ...Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))]} />}</Space><Text type="secondary">共 {data.length} 项选品</Text></div>
        <Table rowKey="id" dataSource={data} columns={columns} pagination={{ pageSize: 8, showSizeChanger: false }} />
      </Card>
    </>
  );
}

function AssignPage(ctx: PageContext) {
  const { state, operators, setSelectedProduct, setAssignProduct, setState, appMessage, reloadProduction } = ctx;
  const [selected, setSelected] = useState<React.Key[]>([]);
  const [queue, setQueue] = useState("pending");
  const pending = state.products.filter((p) => p.status === "pending_assign");
  const assigned = state.products.filter((p) => Boolean(p.reviewerId) && ["pending_review", "objection_pending"].includes(p.status));
  const data = queue === "pending" ? pending : assigned;
  const autoAssign = async () => {
    if (!pending.length || !operators.length) return;
    try {
      await apiRequest("/api/products/batch-assign", { method: "POST" }); await reloadProduction();
      setSelected([]); appMessage.success(`已按轮询规则分配 ${pending.length} 项选品`);
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };
  return (
    <>
      <PageHeading title="分配管理" description="分配新提交的选品，并管理处理中选品的审核负责人" extra={<Button icon={<SwapOutlined />} onClick={autoAssign} disabled={!pending.length}>一键轮询分配</Button>} />
      <Row gutter={[16, 16]} className="summary-strip">
        <Col span={6}><Card><Statistic title="等待分配" value={pending.length} prefix={<ClockCircleOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="已分配处理中" value={assigned.length} prefix={<SafetyCertificateOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="在岗运营" value={operators.length} prefix={<TeamOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="今日分配/调整" value={state.products.filter((p) => p.assignTime?.startsWith(formatChinaDate())).length} prefix={<CheckCircleOutlined />} /></Card></Col>
      </Row>
      <Card>
        <Tabs activeKey={queue} onChange={(value) => { setQueue(value); setSelected([]); }} items={[{ key: "pending", label: <Badge count={pending.length} offset={[10, -2]}>待分配队列</Badge> }, { key: "assigned", label: <Badge count={assigned.length} offset={[10, -2]}>已分配队列</Badge> }]} />
        {queue === "pending" && <div className="table-toolbar"><Text type="secondary">选择待分配选品后可使用一键轮询分配</Text><Text type="secondary">已选择 {selected.length} 项</Text></div>}
        <Table rowKey="id" rowSelection={queue === "pending" ? { selectedRowKeys: selected, onChange: setSelected } : undefined} dataSource={data} columns={productColumns(state.users, setSelectedProduct, setAssignProduct, queue === "pending" ? "分配" : "更改审核人")} pagination={{ pageSize: 8, showSizeChanger: false }} locale={{ emptyText: <Empty description={queue === "pending" ? "所有选品均已分配" : "暂无已分配且处理中的选品"} /> }} />
      </Card>
    </>
  );
}

function ReviewPage(ctx: PageContext) {
  const { state, currentUser, setSelectedProduct, setReviewProduct, editLatestReview } = ctx;
  const [tab, setTab] = useState("todo");
  const todo = currentUser.role === "admin" ? state.products.filter((p) => p.status === "pending_review") : state.products.filter((p) => p.status === "pending_review" && p.reviewerId === currentUser.id);
  const history = currentUser.role === "admin" ? state.products.filter((p) => p.reviews.length > 0) : state.products.filter((p) => p.reviews.some((review) => review.reviewerId === currentUser.id));
  const data = tab === "todo" ? todo : history;
  const columns: TableColumnsType<Product> = [
    { title: "选品", dataIndex: "name", key: "name", render: (_, p) => <button className="product-cell" onClick={() => setSelectedProduct(p)}><span className="product-thumb"><ProductOutlined /></span><span><strong>{p.name}</strong><small>{p.code} · {p.category}</small></span></button> },
    { title: "开发人", dataIndex: "submitterId", width: 90, render: (id) => nameOf(state.users, id) },
    { title: "建议售价", width: 100, render: (_, p) => p.suggestedPrice == null ? "—" : `$${p.suggestedPrice.toFixed(2)}` },
    { title: "利润率", width: 90, render: (_, p) => p.profitMargin == null ? "—" : <Text style={{ color: p.profitMargin >= 20 ? "#12a47d" : "#d48806" }}>{p.profitMargin.toFixed(1)}%</Text> },
    { title: "当前轮次", width: 90, render: (_, p) => `第 ${p.reviews.length + (p.status === "pending_review" ? 1 : 0)} 轮` },
    { title: "状态", dataIndex: "status", width: 110, render: (value) => <StatusTag status={value} /> },
    { title: "提交时间", dataIndex: "submitTime", width: 150 },
    { title: "操作", key: "action", width: 170, align: "right", render: (_, p) => {
      const latest = p.reviews.at(-1);
      const hasObjection = Boolean(latest && p.objections.some((item) => item.roundId === latest.id));
      const canEditResult = Boolean(latest && !["draft", "pending_assign"].includes(p.status) && !hasObjection && (currentUser.role === "admin" || latest.reviewerId === currentUser.id));
      return tab === "todo" ? <Button type="link" onClick={() => setReviewProduct(p)}>开始审核</Button> : <Space size={2}>{canEditResult && <Button type="link" onClick={() => editLatestReview(p)}>修改结果</Button>}<Button type="link" onClick={() => setSelectedProduct(p)}>详情</Button></Space>;
    } },
  ];
  return (
    <>
      <PageHeading title="审核中心" description="处理待审选品与开发异议，所有审核意见自动留痕" />
      <Card>
        <Tabs activeKey={tab} onChange={setTab} items={[{ key: "todo", label: <Badge count={todo.length} offset={[12, -3]}>待我审核</Badge> }, { key: "history", label: "历史审核" }]} />
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
  const [loading, setLoading] = useState(true);
  const [remoteData, setRemoteData] = useState<NotificationsPageData>({
    items: [], total: 0, page: 1, pageSize: 10,
    summary: { all: 0, success: 0, failed: 0, skipped: 0 },
    events: [],
  });

  useEffect(() => {
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

  const data = remoteData;
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
        <Col span={6}><Card><Statistic title="发送成功" value={data.summary.success} prefix={<CheckCircleOutlined />} styles={{ content: { color: "#12a47d" } }} /></Card></Col>
        <Col span={6}><Card><Statistic title="发送失败" value={data.summary.failed} prefix={<ExclamationCircleOutlined />} styles={{ content: { color: "#d84a57" } }} /></Card></Col>
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
      const saved = await apiRequest<User>(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !user.isActive }) });
      setState((old) => ({ ...old, users: old.users.map((item) => item.id === user.id ? saved : item) }));
      appMessage.success(`已${user.isActive ? "停用" : "启用"} ${user.name}`);
    } catch (error) { if (error instanceof Error) appMessage.error(error.message); }
  };
  const columns: TableColumnsType<User> = [
    { title: "用户", render: (_, u) => <Space><Avatar style={{ background: roleMeta[u.role].color }}>{u.name.slice(-1)}</Avatar><span><strong>{u.name}</strong><br /><Text type="secondary" className="small-text">{u.account}</Text></span></Space> },
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
  const submitted = state.products.filter((p) => p.status !== "draft");
  const completed = submitted.filter((p) => ["approved", "rejected"].includes(p.status));
  const passRate = completed.length ? Math.round(completed.filter((p) => p.status === "approved").length / completed.length * 100) : 0;
  const rejectionRate = completed.length ? Math.round(completed.filter((p) => p.status === "rejected").length / completed.length * 100) : 0;
  const reviewedProducts = submitted.filter((p) => p.reviews.length > 0);
  const reviewDurations = reviewedProducts.flatMap((product) => {
    const start = parseBusinessDate(product.assignTime || product.submitTime)?.getTime();
    const end = parseBusinessDate(product.reviews[0]?.createdAt)?.getTime();
    return start != null && end != null ? [Math.max(0, (end - start) / 3_600_000)] : [];
  });
  const averageReviewHours = reviewDurations.length ? reviewDurations.reduce((sum, value) => sum + value, 0) / reviewDurations.length : 0;
  const averageReviewRounds = reviewedProducts.length ? reviewedProducts.reduce((sum, product) => sum + product.reviews.length, 0) / reviewedProducts.length : 0;
  const pendingProducts = submitted.filter((p) => ["pending_assign", "pending_review", "objection_pending"].includes(p.status));
  const pendingHours = pendingProducts.flatMap((product) => { const start = parseBusinessDate(product.assignTime || product.submitTime)?.getTime(); return start == null ? [] : [Math.max(0, (Date.now() - start) / 3_600_000)]; });
  const averagePendingHours = pendingHours.length ? pendingHours.reduce((sum, value) => sum + value, 0) / pendingHours.length : 0;
  const healthScore = pendingProducts.length ? Math.max(0, Math.round(100 - Math.min(100, averagePendingHours / 72 * 100))) : 100;
  const healthLabel = healthScore >= 80 ? "整体流转顺畅" : healthScore >= 60 ? "存在部分超时" : "待办积压需处理";
  const devs = state.users.filter((u) => u.role === "developer").map((u) => {
    const own = state.products.filter((p) => p.submitterId === u.id);
    const margins = own.filter((p) => p.profitMargin != null).map((p) => p.profitMargin!);
    return { key: u.id, name: u.name, count: own.length, approved: own.filter((p) => p.status === "approved").length, rate: own.length ? Math.round(own.filter((p) => p.status === "approved").length / own.length * 100) : 0, avgMargin: margins.length ? (margins.reduce((sum, value) => sum + value, 0) / margins.length).toFixed(1) : "—", rounds: own.length ? (own.reduce((sum, p) => sum + p.reviews.length, 0) / own.length).toFixed(1) : "0" };
  });
  const operators = state.users.filter((u) => u.role === "operator").map((u) => {
    const reviewed = state.products.filter((p) => p.reviews.some((review) => review.reviewerId === u.id));
    const durations = reviewed.flatMap((product) => { const review = product.reviews.find((item) => item.reviewerId === u.id); if (!review) return []; const start = new Date(product.assignTime || product.submitTime).getTime(); const end = new Date(review.createdAt).getTime(); return Number.isFinite(start) && Number.isFinite(end) ? [Math.max(0, (end - start) / 3_600_000)] : []; });
    return { key: u.id, name: u.name, count: reviewed.length, approved: reviewed.filter((p) => p.finalDecision === "approved" || p.status === "approved").length, avgHours: durations.length ? (durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1) : "—", pending: state.products.filter((p) => p.reviewerId === u.id && p.status === "pending_review").length };
  });
  return (
    <>
      <PageHeading title="数据统计" description="从团队、人员与趋势维度洞察选品审核效率" extra={<Button icon={<ExportOutlined />}>导出 Excel</Button>} />
      <Row gutter={[16, 16]} className="summary-strip">
        <Col span={5}><Card><Statistic title="总提交数" value={submitted.length} /></Card></Col>
        <Col span={5}><Card><Statistic title="通过率" value={passRate} suffix="%" styles={{ content: { color: "#12a47d" } }} /></Card></Col>
        <Col span={5}><Card><Statistic title="驳回率" value={rejectionRate} suffix="%" styles={{ content: { color: rejectionRate > 30 ? "#cf1322" : "#d48806" } }} /></Card></Col>
        <Col span={5}><Card><Statistic title="平均首审时长" value={averageReviewHours} precision={1} suffix="小时" /></Card></Col>
        <Col span={4}><Card><Statistic title="平均审核轮次" value={averageReviewRounds} precision={1} suffix="轮" /></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={16}><Card title="近 6 个月提交与审核完成趋势"><TrendChart products={submitted} monthly /></Card></Col>
        <Col span={8}><Card title="流程健康度" className="health-card"><Progress type="dashboard" percent={healthScore} strokeColor={{ "0%": "#5d7be8", "100%": "#12a47d" }} /><Text strong>{healthLabel}</Text><Text type="secondary">{pendingProducts.length ? `当前 ${pendingProducts.length} 项待办，平均等待 ${averagePendingHours.toFixed(1)} 小时` : "当前没有待处理选品"}</Text></Card></Col>
        <Col span={24}><Card title="开发人员表现"><Table rowKey="key" dataSource={devs} pagination={false} columns={[{ title: "开发人员", dataIndex: "name" }, { title: "提交数", dataIndex: "count" }, { title: "通过数", dataIndex: "approved" }, { title: "通过率", dataIndex: "rate", render: (v: number) => <Space><Progress percent={v} showInfo={false} size="small" style={{ width: 120 }} />{v}%</Space> }, { title: "平均利润率", dataIndex: "avgMargin", render: (v: string) => v === "—" ? v : `${v}%` }, { title: "平均审核轮次", dataIndex: "rounds" }]} /></Card></Col>
        <Col span={24}><Card title="运营审核表现"><Table rowKey="key" dataSource={operators} pagination={false} columns={[{ title: "运营人员", dataIndex: "name" }, { title: "已审核选品", dataIndex: "count" }, { title: "通过选品", dataIndex: "approved" }, { title: "当前待审", dataIndex: "pending" }, { title: "平均首审时长", dataIndex: "avgHours", render: (v: string) => v === "—" ? v : `${v} 小时` }]} /></Card></Col>
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
      const result = await apiRequest<{ imported: number; duplicates: number }>("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
      await ctx.reloadProduction(); setStep(2); appMessage.success(`成功导入 ${result.imported} 条，跳过重复 ${result.duplicates} 条`);
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

type RuntimeStatus = {
  database: string;
  databaseBytes: number;
  uploadsBytes: number;
  freeDiskBytes: number;
  lastBackupAt: string | null;
  singleInstance: boolean;
};

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index > 2 ? 2 : 1)} ${units[index]}`;
}

function SelfHostedStatus() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [error, setError] = useState("");
  const load = () => apiRequest<RuntimeStatus>("/api/system/status", { cache: "no-store" }).then(setStatus).catch((caught) => setError(caught instanceof Error ? caught.message : "状态读取失败"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Card title="本机运行状态" extra={<Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>} loading={!status && !error}>
    {error && <Alert type="error" showIcon message="无法读取运行状态" description={error} />}
    {status && <><Alert type="success" showIcon title="自托管单实例运行正常" description="SQLite、附件与备份均保存在服务器本机目录；请勿启用 PM2 cluster 或多副本。" /><Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col span={8}><Card size="small"><Statistic title="数据库状态" value={status.database === "connected" ? "已连接" : "不可用"} /></Card></Col>
      <Col span={8}><Card size="small"><Statistic title="SQLite 文件" value={formatBytes(status.databaseBytes)} /></Card></Col>
      <Col span={8}><Card size="small"><Statistic title="附件占用" value={formatBytes(status.uploadsBytes)} /></Card></Col>
      <Col span={8}><Card size="small"><Statistic title="剩余磁盘" value={formatBytes(status.freeDiskBytes)} /></Card></Col>
      <Col span={8}><Card size="small"><Statistic title="最近备份" value={status.lastBackupAt ? new Date(status.lastBackupAt).toLocaleString("zh-CN") : "尚无备份"} /></Card></Col>
      <Col span={8}><Card size="small"><Statistic title="运行模式" value={status.singleInstance ? "单实例" : "异常"} /></Card></Col>
    </Row></>}
  </Card>;
}

function SettingsPage(ctx: PageContext) {
  const { state, appMessage } = ctx;
  return (
    <>
      <PageHeading title="系统设置" description="配置飞书应用、通知模板与自动分配规则" />
          <Tabs tabPosition="left" className="settings-tabs" items={[
        { key: "runtime", label: "本机运行状态", children: <SelfHostedStatus /> },
        { key: "feishu", label: "飞书集成", children: <Card title="可选飞书通知"><Alert title="飞书不是核心依赖" description="在服务器环境变量中配置 FEISHU_APP_ID、FEISHU_APP_SECRET 后生效；留空时不访问外网，站内通知仍会完整记录。凭据不会在页面中回显或保存。" type="info" showIcon /><Paragraph style={{ marginTop: 16 }}>管理员可在服务器运行 <Text code>npm run feishu:check</Text> 和 <Text code>npm run feishu:test</Text> 验证连接。</Paragraph></Card> },
        { key: "notify", label: "通知规则", children: <Card title="固定业务通知"><Alert type="success" showIcon message="站内通知始终开启" description="分配、审核、异议和复审事件均写入本机 SQLite；配置飞书后会额外尝试发送卡片消息。" /></Card> },
        { key: "assign", label: "分配规则", children: <Card title="人工与轮询分配"><Paragraph>管理员可逐项选择审核人，也可在“分配管理”中执行一键轮询分配。系统不会在后台自动改变负责人。</Paragraph></Card> },
        { key: "logs", label: `通知日志 (${state.notices.length})`, children: <Card title="最近通知"><Table rowKey="id" dataSource={state.notices} pagination={false} columns={[{ title: "时间", dataIndex: "time", width: 160 }, { title: "事件", dataIndex: "event", width: 120 }, { title: "接收人", dataIndex: "target", width: 100 }, { title: "通知内容", dataIndex: "content" }, { title: "状态", dataIndex: "success", width: 90, render: (value) => <Badge status={value ? "success" : "error"} text={value ? "成功" : "失败"} /> }]} /></Card> },
      ]} />
    </>
  );
}

function ProductDrawer({ product, users, currentUser, onClose, onEdit, onReopen, onReview, onObjection }: { product: Product | null; users: User[]; currentUser: User; onClose: () => void; onEdit: (p: Product) => void; onReopen: (p: Product) => Promise<void>; onReview: (p: Product) => void; onObjection: (p: Product) => void }) {
  if (!product) return null;
  const timeline = [
    { key: "submit", time: product.submitTime, title: "提交选品", content: `${nameOf(users, product.submitterId)} 提交了选品资料`, color: "blue" },
    ...(product.assignTime ? [{ key: "assign", time: product.assignTime, title: "分配审核", content: `分配给 ${nameOf(users, product.reviewerId)}`, color: "blue" }] : []),
    ...product.reviews.flatMap((review) => {
      const objection = product.objections.find((item) => item.roundId === review.id);
      const items = [{ key: review.id, time: review.updatedAt || review.createdAt, title: `第 ${review.round} 轮审核 · ${decisionMeta[review.decision].label}${review.editCount ? ` · 已修改 ${review.editCount} 次` : ""}`, content: review.comment, color: review.decision === "approved" ? "green" : review.decision === "rejected" ? "red" : "orange" }];
      if (objection) items.push({ key: objection.id, time: objection.createdAt, title: "开发提交异议", content: objection.content, color: "cyan" });
      return items;
    }),
  ];
  const canReview = ["admin", "operator"].includes(currentUser.role) && product.status === "pending_review";
  const canObject = currentUser.role === "developer" && product.submitterId === currentUser.id && product.status === "objection_pending";
  const canEdit = product.status === "draft" && (currentUser.role === "admin" || (currentUser.role === "developer" && product.submitterId === currentUser.id));
  const canReopen = currentUser.role === "developer" && product.submitterId === currentUser.id && product.status !== "draft";
  const show = (value: unknown) => value === undefined || value === null || value === "" ? "—" : String(value);
  const analysisItems = [
    ["季节性产品判断", product.seasonality], ["产品主要使用场景", product.usageScenario], ["迭代方案及卖点分析", product.iterationPlan], ["目标人群", product.targetAudience],
    ["认证及审核资料", product.certification], ["产品专利情况查询", product.patentStatus], ["产品商标情况查询", product.trademarkStatus], ["现有竞品差评分析", product.competitorReviewsAnalysis],
    ["新图案视觉升级方向", product.visualUpgradeDirection], ["视觉与素材版权排查", product.copyrightCheck], ["TRO 钓鱼排查", product.troCheck], ["短句/标语商标排查", product.phraseTrademarkCheck],
    ["包装形态与开箱体验", product.packaging], ["供应链优势", product.supplyChainAdvantage],
  ];
  const attachmentLabel = { product_image: "产品主图", competitor_screenshot: "竞品数据", data_screenshot: "支撑数据", supplier_info: "供应商资料" } as const;
  return (
    <Drawer title={null} open={!!product} onClose={onClose} size={980} styles={{ body: { padding: 0 } }}>
      <div className="drawer-hero"><div className="drawer-code"><Tag>{product.code}</Tag><Tag color="blue">第 {product.revision || 1} 版</Tag><StatusTag status={product.status} /></div><Title level={3}>{product.name}</Title><Text type="secondary">{product.category} · 由 {nameOf(users, product.submitterId)} 于 {product.submitTime} 提交</Text></div>
      <div className="drawer-content">
        <Descriptions title="基本信息与竞品" bordered column={2} size="small" items={[{ key: "category", label: "产品类目", children: product.category }, { key: "keyword", label: "核心关键词", children: show(product.coreKeyword) }, { key: "asins", label: "其他竞品 ASIN", children: show(product.competitorAsins) }, { key: "range", label: "市场价格区间", children: show(product.priceRange) }, { key: "url", label: "竞品链接", span: 2, children: product.competitorLink ? <a href={product.competitorLink} target="_blank" rel="noreferrer">打开竞品页面</a> : "—" }, { key: "top", label: "市场最高价链接", span: 2, children: product.topCompetitorLink ? <a href={product.topCompetitorLink} target="_blank" rel="noreferrer">打开对标页面</a> : "—" }]} />
        <Divider />
        <Title level={5}>产品信息分析（14 项）</Title>
        <div className="analysis-detail-grid">{analysisItems.map(([label, value]) => <div key={String(label)}><Text type="secondary">{label}</Text><Paragraph>{show(value)}</Paragraph></div>)}</div>
        <Divider />
        <Descriptions title="成本、定价与供应商" bordered column={3} size="small" items={[
          { key: "suggested", label: "建议售价", children: product.suggestedPrice == null ? "—" : `$${product.suggestedPrice}` }, { key: "min", label: "最低售价", children: product.minPrice == null ? "—" : `$${product.minPrice}` }, { key: "qty", label: "建议发货数量", children: show(product.suggestedQuantity) },
          { key: "cost", label: "产品成本", children: product.productCostCny == null ? "—" : `¥${product.productCostCny}` }, { key: "supplier", label: "工厂名称", children: show(product.supplierName) }, { key: "moq", label: "起订数量", children: show(product.moq) },
          { key: "unit", label: "单价/材质工艺", children: show(product.unitPrice) }, { key: "time", label: "做货时间", children: show(product.productionTime) }, { key: "supplierUrl", label: "1688 链接", children: product.supplierLink ? <a href={product.supplierLink} target="_blank" rel="noreferrer">打开链接</a> : "—" },
          { key: "remark", label: "供应商备注", span: 3, children: show(product.supplierRemark) },
        ]} />
        <Divider />
        <Title level={5}>规格与利润核算</Title>
        <Row gutter={[12, 12]} className="calculation-panel compact"><Col span={6}><Statistic title="包装尺寸" value={`${product.lengthCm || 0} × ${product.widthCm || 0} × ${product.heightCm || 0} cm`} /></Col><Col span={6}><Statistic title="重量" value={product.weightG || 0} suffix="g" /></Col><Col span={6}><Statistic title="FBA 分段" value={product.fbaSizeTier || "—"} /></Col><Col span={6}><Statistic title="FBA 费用" value={product.fbaFee || 0} prefix="$" precision={2} /></Col><Col span={6}><Statistic title="计费重" value={product.billingWeightLb || 0} suffix="lb" precision={3} /></Col><Col span={6}><Statistic title="佣金比例" value={(product.commissionRate || 0) * 100} suffix="%" /></Col><Col span={6}><Statistic title="利润额" value={product.profitAmount || 0} prefix="$" precision={2} /></Col><Col span={6}><Statistic title="利润率" value={product.profitMargin || 0} suffix="%" precision={2} /></Col><Col span={6}><Statistic title="库存数量" value={product.inventoryQuantity ?? product.suggestedQuantity ?? 0} /></Col><Col span={6}><Statistic title="库存货值" value={product.inventoryValue || 0} prefix="¥" precision={2} /></Col></Row>
        <Divider />
        <Title level={5}>资料附件 <Text type="secondary" className="small-text">({product.attachments.length})</Text></Title>
        {product.attachments.length ? <div className="attachment-list">{product.attachments.map((file) => <div key={file.id}><FileSearchOutlined /><span><strong>{file.name}</strong><small>{attachmentLabel[file.attachmentType || "data_screenshot"]} · {Math.max(file.size / 1024, 1).toFixed(0)} KB</small></span><Button type="link" href={`/api/files/${file.id}`} target="_blank">下载</Button></div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无附件" />}
        <Divider />
        <Title level={5}>流转记录</Title>
        <Timeline items={timeline.slice().reverse().map((item) => ({ color: item.color, children: <div className="timeline-item"><div><strong>{item.title}</strong><Text type="secondary">{item.time}</Text></div><Paragraph>{item.content}</Paragraph></div> }))} />
        {product.finalDecision && <><Divider /><Descriptions title="最终审核结果" bordered column={2} items={[{ key: "decision", label: "运营选择", children: <Tag color={decisionMeta[product.finalDecision].color}>{decisionMeta[product.finalDecision].label}</Tag> }, { key: "launch", label: "上架日期", children: show(product.launchDate) }, { key: "batch", label: "首批发货数量", children: show(product.firstBatchQuantity) }, { key: "reason", label: "不上架/决策原因", children: show(product.rejectionReason) }, { key: "market", label: "市场体量和切入难度", span: 2, children: show(product.marketAnalysis) }, { key: "competition", label: "现+1分方案竞争力", span: 2, children: show(product.competitivenessAnalysis) }, { key: "alternative", label: "其他方案设想", span: 2, children: show(product.alternativeSuggestions) }]} /></>}
      </div>
      {(canEdit || canReopen || canReview || canObject) && <div className="drawer-footer"><Button onClick={onClose}>关闭</Button>{canEdit && <Button type="primary" onClick={() => onEdit(product)}>继续编辑</Button>}{canReopen && <Popconfirm title="将该历史选品撤回修改？" description="当前审核状态和分配将清空，历史审核记录会保留；修改后需要重新提交。" onConfirm={() => onReopen(product)}><Button type="primary">修改并重新提交</Button></Popconfirm>}{canReview && <Button type="primary" icon={<SafetyCertificateOutlined />} onClick={() => onReview(product)}>开始审核</Button>}{canObject && <Button type="primary" icon={<ExclamationCircleOutlined />} onClick={() => onObjection(product)}>提交异议</Button>}</div>}
    </Drawer>
  );
}

function ReviewSummary({ product, users, editing = false }: { product: Product; users: User[]; editing?: boolean }) {
  const objection = product.objections.at(-1);
  const round = editing ? product.reviews.at(-1)?.round || product.reviews.length : product.reviews.length + 1;
  return <div className="review-summary"><Space separator={<Divider orientation="vertical" />}><span><Text type="secondary">提交人</Text><strong>{nameOf(users, product.submitterId)}</strong></span><span><Text type="secondary">当前轮次</Text><strong>第 {round} 轮</strong></span><span><Text type="secondary">附件</Text><strong>{product.attachments.length} 个</strong></span></Space>{objection && <Alert type="warning" showIcon message="开发人员最新异议" description={objection.content} />}</div>;
}
