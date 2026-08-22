/** App version — keep in sync with package.json / tauri.conf.json / Cargo.toml */
export const APP_VERSION = '2.0 beta'

/** Public source repository */
export const APP_REPO_URL = 'https://github.com/North-al/caelum'

export const APP_FEATURES = [
    '本地优先：笔记与资源保存在本机目录，无需账号',
    'Markdown 与常见开发配置 / 源码文本编辑预览（yaml、toml、ts、py、Dockerfile 等）',
    '数学公式（KaTeX）与 Mermaid 图表（可配置主题），预览与导出一致',
    'Markdown 导出：规范化 MD、纯文本、离线 HTML、可配置 PDF、Mermaid 单图 / 批量导出',
    '分屏、仅编辑、仅预览三种视图，可选滚动联动',
    '多标签页：拖拽排序、中键关闭、右键批量关闭',
    '资源管理器：单击选中 / 双击打开，Shift·Ctrl 多选，Del / F2，Ctrl+C/V 复制粘贴',
    '图片与 SVG 预览：编辑后即时刷新，工具栏 / 粘贴 / 拖放插入图片',
    '预览代码块：一键复制、行号、折叠；可切换 highlight.js 高亮主题',
    '多标签页脏标记：未保存文件在标签上显示圆点',
    '大纲面板、窗口尺寸与阅读位置记忆',
    '笔记双链 [[名称]]：预览点击跳转；重命名自动同步引用',
    'Ctrl + 滚轮缩放编辑区字号，主题与强调色可切换',
    '快捷便签：全局 Ctrl+Alt+N 唤起轻量纸条，待办 / 长文双模式，便签板整理后再写入正式笔记',
] as const

export const APP_CHANGELOG: Array<{ version: string; date: string; notes: string[] }> = [
    {
        version: '2.0 beta',
        date: '2026-08-22',
        notes: [
            '快捷便签（Beta）：独立浮窗 + 便签板，全局 Ctrl+Alt+N 随时唤起',
            '便签双模式：待办清单（多行勾选、回车 / 双击新增、拖动排序挤位）与便签长文（阅读模式仅长文可用）',
            '便签外观：五种主题预设，透明度 / 圆角可调，支持一键恢复默认',
            '便签板重构：顶栏紧凑工具栏（全部 / 常驻 / 新建），卡片顶栏拖动、右键菜单与删除体验优化',
            '便签浮窗：顶栏大面积可拖窗口；去掉多余成功提示（如复制、删除）',
            '便签可设为常驻置顶；支持从便签板 / 右键写入正式笔记',
        ],
    },
    {
        version: '1.5.0',
        date: '2026-08-11',
        notes: [
            '设置增加 Mermaid 主题（跟随外观 / default / dark / forest / neutral / base）',
            '导出：规范化 MD、纯文本、离线单文件 HTML、可配置 PDF；导出菜单仅对 Markdown 显示',
            'Mermaid 单图导出支持底色 / 边距 / 清晰度；批量导出可勾选图表并配置 PNG 参数',
            '修复 Flowchart / Class Diagram 等含 HTML 标签的图表 PNG 导出黑屏',
            '离线 HTML 内嵌 highlight.js 样式，代码块高亮可离线查看',
            'PDF 导出增强：进度提示、水印、目录页内跳转；公式 / 图表失败时降级为源码',
            '首次安装且笔记目录为空时，生成「数学公式入门」「Mermaid图表入门」两份教程',
            'Ctrl+G 跳转到行：居中悬浮面板，滚动编辑区不被遮挡',
            'Markdown 轻量格式化；查找 / 跳转 / 快捷键说明完善',
            '预览 Mermaid 导出按钮悬停显示；保存成功不再弹窗提示',
            '关于页增加 GitHub 源码地址；完善 README 与 MIT 开源说明'
        ]
    },
    {
        version: '1.4.0',
        date: '2026-08-11',
        notes: [
            'Markdown 支持数学公式（行内 $...$ / 块级 $$...$$，KaTeX 渲染）',
            'Markdown 支持 Mermaid 代码块预览',
            '导出 HTML / PDF 同步包含公式样式与 Mermaid 矢量图'
        ]
    },
    {
        version: '1.3.0',
        date: '2026-08-09',
        notes: [
            '工作区顶栏改为功能栏 + 标签栏双行布局，更接近现代编辑器习惯',
            '查找/替换改为右上角浮层（区分大小写 / 全词 / 正则），交互贴近 Cursor',
            '编辑器快捷键：Ctrl+F 查找、Ctrl+R 替换、Ctrl+D 复制行、Ctrl+J 选中相同',
            '设置页新增「快捷键」一览（只读展示当前可用快捷键）',
            '重命名弹窗支持主体与后缀分区、非法字符校验与无效后缀确认',
            '重命名后同步标签、侧栏树与全文 [[双链]]；修复旧标签关不掉',
            '分栏比例记忆、Ctrl+\\ 隐藏预览；打开大纲后滚动联动仍可用',
            'JSON / XML / INI 一键格式化（JSON 保留重复键，XML 真正缩进）',
            '代码预览去掉多余卡片底；自定义滚动条；行选中跟随主题强调色',
            '标签栏滚轮横向滚动，新建按钮固定在右侧'
        ]
    },
    {
        version: '1.2.2',
        date: '2026-08-06',
        notes: [
            '预览代码块支持一键复制、行号、折叠',
            '标签脏标记，未保存文件在标签上显示圆点',
            '代码高亮主题通过设置 → 编辑器 →「代码高亮主题」可切换'
        ]
    },
    {
        version: '1.2.1',
        date: '2026-08-04',
        notes: [
            '深色模式代码高亮改用 highlight.js 官方 github-dark 主题，修复代码块正文几乎不可见',
            '编辑器深色模式接入 CodeMirror oneDark，语法着色更清晰'
        ]
    },
    {
        version: '1.2.0',
        date: '2026-08-04',
        notes: [
            '资源管理器：单击选中、双击打开；支持 Shift / Ctrl 多选、Del 删除、F2 重命名',
            '资源管理器支持 Ctrl+C / Ctrl+V 复制粘贴文件（含系统剪贴板）',
            'JSON / INI / XML 深色预览背景修正；SVG 编辑后预览即时刷新',
            '设置中的编辑器字体选择生效更可靠',
            '修复资源管理器选中态与滚动条置顶、hover 与选中样式冲突等问题'
        ]
    },
    {
        version: '1.1.0',
        date: '2026-08-03',
        notes: [
            '首页工作区 UI 对齐设置页风格（渐变背景、圆角卡片、浮层侧栏）',
            '标签页支持鼠标中键关闭，拖拽复制到资源管理器更稳定',
            '新增导出：Markdown 解析后 HTML、源码 .md、纯文本、PDF',
            '编辑区支持 Ctrl + 滚轮缩放字号，并显示字号悬浮窗与重置',
            '外部拖入：资源管理器导入笔记，编辑/预览区打开或插入图片',
            '设置页完善：字体选择、路径管理、外观分区与配置文件位置',
            '窗口尺寸、分栏比例、大纲宽度与阅读位置自动记忆'
        ]
    },
    {
        version: '1.0.0',
        date: '2026-08-01',
        notes: [
            '首次发布：本地 Markdown 编辑、预览、大纲与工作区资源管理',
            '自定义无边框窗口、主题模式与强调色',
            'Windows NSIS 安装包，支持 .md / .txt 文件关联'
        ]
    }
]
