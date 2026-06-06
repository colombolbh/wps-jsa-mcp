# JSA-MCP

WPS 表格 JSA 宏远程编辑工具 —— 通过 MCP（Model Context Protocol）在 AI 编码助手中直接读写 WPS 工作簿的 JSA 宏代码。

---

## 📦 安装 WPS 加载项

进入 `JSA-mcp/dist/` 目录，选择以下任一方式安装：

- **方式一：** 双击 `install.bat`
- **方式二：** 在 `JSA-mcp/dist/` 目录下，右键 → 在终端中打开，执行：

  ```powershell
  powershell -ExecutionPolicy Bypass -File .\install.ps1
  ```

安装完成后打开 WPS 表格，即可在功能区看到 **JSA-MCP** 选项卡。

---

## 🔌 配置 MCP 服务端

### 获取 MCP 服务路径

MCP 服务端入口文件位于 `JSA-mcp/mcp-dist/index.js`，请先记下该文件的**完整绝对路径**，例如：

```
C:\Users\colom\OneDrive\桌面\wps_jsa_plugin\JSA-mcp\mcp-dist\index.js
```

### VS Code / VS Code Insiders

在 VS Code 设置中搜索 `mcp`，或在 `settings.json` 中添加：

```json
{
  "mcp.servers": {
    "wpsjsa-mcp": {
      "command": "node",
      "args": ["C:\\Users\\你的用户名\\OneDrive\\桌面\\wps_jsa_plugin\\JSA-mcp\\mcp-dist\\index.js"],
      "env": {}
    }
  }
}
```

### Codex（OpenAI Codex CLI）

在 Codex 配置文件（`~/.codex/config.toml` 或项目根目录 `.codex.toml`）中添加：

```toml
[mcp_servers.wpsjsa-mcp]
command = "node"
args = ["C:\\Users\\你的用户名\\OneDrive\\桌面\\wps_jsa_plugin\\JSA-mcp\\mcp-dist\\index.js"]
```

### OpenCloud / Claude Code

在 Claude Code 的 MCP 配置（`~/.claude/claude_desktop_config.json` 或 `~/.claude/mcp.json`）中添加：

```json
{
  "mcpServers": {
    "wpsjsa-mcp": {
      "command": "node",
      "args": ["C:\\Users\\你的用户名\\OneDrive\\桌面\\wps_jsa_plugin\\JSA-mcp\\mcp-dist\\index.js"]
    }
  }
}
```

### Cursor

在 Cursor 设置中（`~/.cursor/mcp.json`）添加：

```json
{
  "mcpServers": {
    "wpsjsa-mcp": {
      "command": "node",
      "args": ["C:\\Users\\你的用户名\\OneDrive\\桌面\\wps_jsa_plugin\\JSA-mcp\\mcp-dist\\index.js"]
    }
  }
}
```

### 通用 JSON 配置（其他 MCP 客户端）

大多数支持 MCP 的客户端使用类似结构：

```json
{
  "mcpServers": {
    "wpsjsa-mcp": {
      "command": "node",
      "args": ["<替换为你的 mcp-dist/index.js 绝对路径>"]
    }
  }
}
```

> ⚠️ **注意：** 请将路径中的 `你的用户名` 替换为你的实际 Windows 用户名，路径中的反斜杠需写为 `\\`。

---

## 🚀 使用

1. 打开 WPS 表格，确保 JSA-MCP 加载项已加载
2. 在 AI 助手中确认 `wpsjsa-mcp` MCP 服务已连接
3. 即可通过 AI 直接读写当前 WPS 工作簿中的 JSA 宏代码
