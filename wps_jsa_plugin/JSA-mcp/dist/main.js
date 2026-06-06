/**
 * WPS 加载项 - 脚本加载器（由 index.html 引入）
 * 作用：按顺序动态加载加载项所需的所有 JS 业务文件。
 *
 * 加载顺序说明：
 *   1. util.js   — 工具函数
 *   2. ribbon.js — 功能区回调 + MCP WebSocket 连接核心逻辑
 */
document.write("<script language='javascript' src='js/util.js'></script>");
document.write("<script language='javascript' src='js/ribbon.js'></script>");
