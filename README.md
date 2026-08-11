# Caelum

本地优先的 Markdown 笔记应用（Tauri 2 + React + TypeScript）。

笔记与资源保存在本机目录，无需账号；支持实时预览、数学公式、Mermaid 图表，以及 Markdown / 纯文本 / HTML / PDF 导出。

**仓库：** [https://github.com/North-al/caelum](https://github.com/North-al/caelum)

## 功能概览

- 本地工作区：资源管理器、多标签、大纲面板
- Markdown / TXT / JSON / XML / INI 编辑与预览
- KaTeX 公式、Mermaid 图（可配置主题），单图 / 批量导出 SVG、PNG
- 导出：规范化 Markdown、纯文本、离线单文件 HTML、可配置 PDF
- 分屏 / 仅编辑 / 仅预览，可选滚动联动
- 主题模式与强调色、代码高亮主题、窗口与阅读位置记忆
- 笔记双链 `[[名称]]`，重命名时同步引用

## 环境要求

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Rust](https://www.rust-lang.org/)（Tauri 构建）
- Windows 上还需 [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/)（一般已预装）

## 开发

```bash
pnpm install
pnpm tauri:dev
```

仅前端（无桌面壳）：

```bash
pnpm dev
```

## 构建

```bash
# Windows NSIS 安装包
pnpm tauri:build
```

产物目录：`src-tauri/target/release/bundle/`。

生成应用图标（修改 `app-icon.svg` 后）：

```bash
pnpm icon
```

## 技术栈

| 层 | 选型 |
| --- | --- |
| 桌面壳 | Tauri 2 |
| 前端 | React 19、Vite、TypeScript |
| 编辑器 | CodeMirror 6 |
| 样式 | Tailwind CSS 4、shadcn/ui |
| Markdown | react-markdown、remark-gfm、KaTeX、Mermaid、highlight.js |

## 开源协议

[MIT](./LICENSE) © North
