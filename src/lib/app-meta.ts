/** App version — keep in sync with package.json / tauri.conf.json / Cargo.toml */
export const APP_VERSION = '1.2.2'

export const APP_FEATURES = [
    '本地优先：笔记与资源保存在本机目录，无需账号',
    'Markdown / TXT / JSON / XML / INI 编辑，实时预览与 GFM 语法支持',
    '分屏、仅编辑、仅预览三种视图，可选滚动联动',
    '多标签页：拖拽排序、中键关闭、右键批量关闭',
    '资源管理器：单击选中 / 双击打开，Shift·Ctrl 多选，Del / F2，Ctrl+C/V 复制粘贴',
    '图片与 SVG 预览：编辑后即时刷新，工具栏 / 粘贴 / 拖放插入图片',
    '预览代码块：一键复制、行号、折叠；可切换 highlight.js 高亮主题',
    '多标签页脏标记：未保存文件在标签上显示圆点',
    '大纲面板、窗口尺寸与阅读位置记忆',
    '导出解析后 HTML、源码、纯文本与 PDF',
    'Ctrl + 滚轮缩放编辑区字号，主题与强调色可切换'
] as const

export const APP_CHANGELOG: Array<{ version: string; date: string; notes: string[] }> = [
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
