"use client";

import { useState } from "react";
import { Alert, Button, Card, Typography } from "antd";

const STORAGE_KEY = "ors-review-system-v1";

export default function ExportDemoPage() {
  const [message, setMessage] = useState("");
  const download = () => {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) { setMessage("当前浏览器没有找到旧版演示数据。"); return; }
    try { JSON.parse(value); } catch { setMessage("旧版演示数据已损坏，无法导出。"); return; }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([value], { type: "application/json" }));
    link.download = `ors-demo-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setMessage("导出完成。请将文件交给管理员，在服务器运行 migrate:demo。");
  };
  return <main style={{ maxWidth: 720, margin: "80px auto", padding: 24 }}><Card><Typography.Title level={3}>一次性导出旧版演示数据</Typography.Title><Typography.Paragraph>此工具只读取当前浏览器中旧 ORS 演示模式留下的数据，不会上传到服务器。</Typography.Paragraph>{message && <Alert showIcon type="info" message={message} style={{ marginBottom: 16 }} />}<Button type="primary" onClick={download}>导出 JSON</Button></Card></main>;
}
