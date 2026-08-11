/** Read-only shortcut catalog for Settings display. Keys use Windows Ctrl labels. */

export type ShortcutGroup = {
  id: string
  title: string
  description: string
  items: Array<{ keys: string[]; action: string }>
}

export const APP_SHORTCUTS: ShortcutGroup[] = [
  {
    id: "workspace",
    title: "工作区",
    description: "全局常用操作",
    items: [
      { keys: ["Ctrl", "S"], action: "保存当前文件" },
      { keys: ["Ctrl", "\\"], action: "在「仅编辑」与「分栏」间切换" },
      { keys: ["Ctrl", "B"], action: "展开 / 折叠侧栏" },
      { keys: ["Ctrl", "N"], action: "快速新建笔记" },
      { keys: ["Ctrl", "Shift", "N"], action: "新建文件（输入名称）" },
      { keys: ["F5"], action: "刷新资源管理器" },
    ],
  },
  {
    id: "editor",
    title: "编辑器",
    description: "查找、替换与编辑辅助",
    items: [
      { keys: ["Ctrl", "F"], action: "打开查找" },
      { keys: ["Ctrl", "R"], action: "打开替换" },
      { keys: ["Ctrl", "D"], action: "复制当前行" },
      { keys: ["Ctrl", "J"], action: "选中下一个相同匹配" },
      { keys: ["Ctrl", "Shift", "L"], action: "选中全部相同匹配" },
      { keys: ["F3"], action: "下一个匹配" },
      { keys: ["Shift", "F3"], action: "上一个匹配" },
      { keys: ["Ctrl", "G"], action: "跳转到指定行" },
      { keys: ["Esc"], action: "关闭查找 / 跳转面板" },
      { keys: ["Ctrl", "滚轮"], action: "缩放编辑区字号" },
    ],
  },
  {
    id: "explorer",
    title: "资源管理器",
    description: "侧栏文件树（焦点在资源区时）",
    items: [
      { keys: ["Ctrl", "C"], action: "复制选中项" },
      { keys: ["Ctrl", "V"], action: "粘贴到目标目录" },
      { keys: ["Ctrl", "A"], action: "全选可见项" },
      { keys: ["Delete"], action: "删除选中项" },
      { keys: ["F2"], action: "重命名" },
      { keys: ["Enter"], action: "打开选中文件 / 文件夹" },
    ],
  },
]
