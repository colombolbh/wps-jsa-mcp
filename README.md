# JSA-MCP

WPS 表格 JSA 宏远程编辑工具 —— 通过 MCP（Model Context Protocol）在 AI 编码助手中直接读写 WPS 工作簿的 JSA 宏代码。

---

## � 快速开始

```bash
git clone https://github.com/colombolbh/wps-jsa-mcp.git
cd wps-jsa-mcp/wps_jsa_plugin
```

### 一键安装

双击 `install.bat`，或在终端中运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

脚本会自动：
1. **安装 WPS 加载项** — 部署到 WPS 插件目录
2. **配置 MCP 服务端** — 选择平台后自动写入配置

### 支持的平台

| 平台 | MCP 配置文件路径 |
|------|-----------------|
| VS Code | `%APPDATA%\Code\User\mcp.json` |
| VS Code Insiders | `%APPDATA%\Code - Insiders\User\mcp.json` |
| Cursor | `%USERPROFILE%\.cursor\mcp.json` |
| Claude Desktop | `%APPDATA%\Claude\claude_desktop_config.json` |
| Claude Code (CLI) | `%USERPROFILE%\.claude.json` |
| OpenAI Codex CLI | `%USERPROFILE%\.codex\config.toml` |
| Windsurf | `%USERPROFILE%\.windsurf\mcp.json` |

---

## 📁 项目结构

```
├── README.md
├── wps_jsa_plugin/          # WPS 加载项 + 安装脚本
│   ├── install.bat
│   ├── install.ps1
│   └── JSA-mcp/
│       ├── dist/             # 加载项发布文件
│       └── mcp-dist/         # MCP 服务端（Node.js）
└── wpsjsa-mcp/              # MCP 工具链
    └── dist/
```
