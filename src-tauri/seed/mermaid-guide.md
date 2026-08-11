# Mermaid 图表入门

Caelum 支持在 Markdown 中用 `mermaid` 代码块绘制流程图、时序图、类图等。预览区即时渲染，并可单独或批量导出为 SVG / PNG。

> 设置 → 编辑器 →「Mermaid 主题」可切换图表配色（跟随外观 / default / dark 等）。

---

## 1. 基本写法

在 Markdown 中加入 fenced 代码块，语言标记为 `mermaid`：

````md
```mermaid
flowchart TD
    A[开始] --> B[结束]
```
````

保存或切换到预览即可看到图表。图表右上角可单独导出；文档含多张图时，预览顶栏可批量导出。

---

## 2. 流程图 Flowchart

```mermaid
flowchart TD
    A[开始] --> B{是否登录}
    B -->|是| C[进入系统]
    B -->|否| D[跳转登录页]
    C --> E[加载数据]
    D --> F[输入账号密码]
    F --> B
    E --> G[结束]
```

常用形状：

- `A[矩形]` 处理步骤
- `B{菱形}` 判断
- `C((圆角))` / `D[(数据库)]` 等

方向：`TD`（上→下）、`LR`（左→右）、`BT`、`RL`。

---

## 3. 时序图 Sequence Diagram

```mermaid
sequenceDiagram
    participant User as 用户
    participant Frontend as 前端
    participant API as 后端接口
    participant DB as 数据库

    User->>Frontend: 点击登录
    Frontend->>API: 提交账号密码
    API->>DB: 查询用户
    DB-->>API: 返回用户信息
    API-->>Frontend: 返回 Token
    Frontend-->>User: 登录成功
```

`->>` 实线请求，`-->>` 虚线返回。

---

## 4. 类图 Class Diagram

```mermaid
classDiagram
    class User {
        +Long id
        +String username
        +String password
        +login()
    }
    class Order {
        +Long id
        +Date createTime
        +pay()
    }
    User "1" --> "*" Order
```

---

## 5. 状态图 State Diagram

```mermaid
stateDiagram-v2
    [*] --> 创建
    创建 --> 审核中
    审核中 --> 已通过
    审核中 --> 已拒绝
    已通过 --> 完成
    已拒绝 --> [*]
    完成 --> [*]
```

---

## 6. 甘特图 Gantt

```mermaid
gantt
    title 项目开发计划
    dateFormat YYYY-MM-DD
    section 前端开发
    页面开发       :done, frontend1, 2026-01-01, 10d
    接口联调       :frontend2, after frontend1, 7d
    section 后端开发
    接口设计       :backend1, 2026-01-01, 5d
    接口开发       :backend2, after backend1, 15d
    section 测试
    功能测试       :test1, after backend2, 10d
```

---

## 7. Git 分支图

```mermaid
gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
```

---

## 8. 饼图

```mermaid
pie title 技术栈占比
    "Vue" : 40
    "React" : 30
    "Spring Boot" : 20
    "其他" : 10
```

---

## 9. 导出建议

| 场景 | 建议 |
| --- | --- |
| 插入文档 / 再编辑 | 导出 **SVG** |
| 发聊天 / 贴幻灯片 | 导出 **PNG**（可设透明底、2x/3x 清晰度） |
| 多张图一次导出 | 预览顶栏「导出图表」→ 勾选需要的图 |

若某张图预览失败，多半是语法问题（例如 flowchart 连线被拆成多行）。把源码对照上面示例微调即可。
