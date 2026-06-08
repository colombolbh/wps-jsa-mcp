/**
 * WPS 加载项 - MCP WebSocket 连接核心模块
 *
 * 功能概述：
 *   1. 功能区只保留一个切换开关按钮，控制 MCP 服务的启停
 *   2. 开关打开 → 每 500ms HTTP 轮询 http://127.0.0.1:45220
 *   3. 服务器响应后 → 建立 WebSocket 连接到 ws://127.0.0.1:45220
 *   4. 连接成功后停止轮询，连接断开后自动重新轮询
 *   5. 接收 JSON 消息并处理 getcode / updatecode / insertcode 三种操作
 *
 * WebSocket 消息格式：
 *   请求：[{"type":"getcode|updatecode|insertcode","data":"..."}]
 *   响应：[{"status":"ok|error","result":"..."}]
 */

// ======================== 配置常量 ========================

/** MCP 服务器 HTTP 轮询地址 */
var MCP_SERVER_URL = "http://127.0.0.1:45220";

/** MCP WebSocket 连接地址 */
var MCP_WS_URL = "ws://127.0.0.1:45220";

/** HTTP 轮询间隔（毫秒） */
var MCP_POLL_INTERVAL = 500;

// ======================== 运行时状态 ========================

/** 轮询定时器 ID（null 表示未在轮询） */
var mcpPollingTimer = null;

/** WebSocket 实例（null 表示未连接） */
var mcpWebSocket = null;

/** WebSocket 是否处于已连接状态 */
var mcpConnected = false;

/** 轮询超时定时器 ID（10 分钟后自动停止） */
var mcpPollTimeoutTimer = null;

// ======================== Ribbon 功能区回调 ========================

/**
 * 加载项初始化回调（ribbon.xml 的 onLoad 触发）
 * 这是整个加载项中最先执行的函数
 * @param {object} ribbonUI - WPS 传入的 Ribbon UI 对象
 * @returns {boolean}
 */
function OnAddinLoad(ribbonUI) {
    // 保存 ribbonUI 引用，用于后续 InvalidateControl 刷新按钮
    if (typeof (window.Application.ribbonUI) != "object") {
        window.Application.ribbonUI = ribbonUI;
    }

    // 初始化 MCP 开关状态为"关闭"
    window.Application.PluginStorage.setItem("McpEnabled", true);
    startMcpService(); // 加载项启动时默认开启 MCP 服务
    return true;
}

/**
 * 返回切换按钮的按下/弹起状态
 * WPS 在需要刷新按钮外观时调用此函数
 * @param {object} control
 * @returns {boolean} true=按钮按下（开启），false=按钮弹起（关闭）
 */
function OnGetPressed(control) {
    return window.Application.PluginStorage.getItem("McpEnabled") === true;
}

/**
 * 动态返回按钮的显示标签文字
 * @param {object} control
 * @returns {string}
 */
function OnGetLabel(control) {
    var enabled = window.Application.PluginStorage.getItem("McpEnabled");
    if (enabled && mcpConnected) {
        return "MCP 已连接";
    } else if (enabled && mcpPollTimeoutTimer) {
        return "MCP 连接中…（10分钟超时）";
    } else if (enabled) {
        return "MCP 连接中...";
    } else {
        return "MCP 未连接";
    }
}

/**
 * 按钮是否始终可用
 * @param {object} control
 * @returns {boolean}
 */
function OnGetEnabled(control) {
    return true;
}

/**
 * 返回按钮图标路径
 * @param {object} control
 * @returns {string} 图标文件路径
 */
function GetImage(control) {
    var enabled = window.Application.PluginStorage.getItem("McpEnabled");
    return enabled ? "images/1.svg" : "images/newFromTemp.svg";
}

/**
 * 切换按钮点击事件处理
 * 用户点击按钮时，翻转开关状态并启动/停止 MCP 服务
 * @param {object} control
 * @returns {boolean}
 */
function OnToggleAction(control) {
    var currentState = window.Application.PluginStorage.getItem("McpEnabled");
    var newState = !currentState;
    window.Application.PluginStorage.setItem("McpEnabled", newState);

    if (newState) {
        // 开关打开 → 启动 MCP 服务（开始轮询）
        startMcpService();
    } else {
        // 开关关闭 → 停止 MCP 服务（停止轮询 + 断开 WebSocket）
        stopMcpService();
    }

    // 通知 WPS 刷新按钮的标签、图标、按下状态
    window.Application.ribbonUI.InvalidateControl("btnMcpToggle");
    return true;
}

// ======================== MCP 服务启停 ========================

/**
 * 启动 MCP 服务：立即执行一次轮询，之后每 500ms 轮询一次
 * 同时设置 10 分钟超时——超时后自动停止轮询，需重新点击按钮
 */
function startMcpService() {
    console.log("[MCP] 服务启动，开始轮询服务器 " + MCP_SERVER_URL + "（10分钟后超时）");
    // 立即执行一次轮询，减少等待时间
    pollServer();
    // 设置定时器，每 500ms 轮询一次
    mcpPollingTimer = setInterval(pollServer, MCP_POLL_INTERVAL);

    // 设置 10 分钟超时 — 超时后自动停止轮询
    mcpPollTimeoutTimer = setTimeout(function () {
        if (!mcpConnected) {
            console.log("[MCP] 轮询超时（10分钟），自动停止。请重新点击按钮。");
            stopMcpService();
            // 更新开关状态为关闭
            window.Application.PluginStorage.setItem("McpEnabled", false);
            window.Application.ribbonUI.InvalidateControl("btnMcpToggle");
        }
    }, 10 * 60 * 1000); // 10 分钟 = 600000 毫秒
}

/**
 * 停止 MCP 服务：清除轮询定时器 + 超时定时器 + 断开 WebSocket 连接
 */
function stopMcpService() {
    console.log("[MCP] 服务停止");

    // 停止 HTTP 轮询
    if (mcpPollingTimer) {
        clearInterval(mcpPollingTimer);
        mcpPollingTimer = null;
    }

    // 清除超时定时器
    if (mcpPollTimeoutTimer) {
        clearTimeout(mcpPollTimeoutTimer);
        mcpPollTimeoutTimer = null;
    }

    // 断开 WebSocket
    disconnectWebSocket();
}

// ======================== HTTP 轮询 ========================

/**
 * 单次 HTTP 轮询：向 MCP 服务器发送 GET 请求检测可用性
 * 如果 WebSocket 尚未连接且服务器可用，则尝试建立 WebSocket 连接
 */
function pollServer() {
    // 如果 WebSocket 已连接，跳过本次轮询
    if (mcpConnected) {
        return;
    }

    // 创建 XHR：优先使用 WpsInvoke（WPS 调试 SDK），不可用时降级为原生 XMLHttpRequest
    var xhr;
    if (typeof WpsInvoke !== "undefined" && WpsInvoke.CreateXHR) {
        xhr = WpsInvoke.CreateXHR();
    } else {
        xhr = new XMLHttpRequest();
    }

    xhr.open("GET", MCP_SERVER_URL, true);
    xhr.timeout = 3000; // 3 秒超时

    xhr.onload = function () {
        // 服务器响应 200 表示可用，且 WebSocket 尚未连接 → 尝试连接
        if (xhr.status === 200 && !mcpConnected) {
            console.log("[MCP] 服务器可用，尝试建立 WebSocket 连接...");
            connectWebSocket();
        }
    };

    xhr.onerror = function () {
        // 服务器不可达，静默等待下次轮询
    };

    xhr.ontimeout = function () {
        // 请求超时，静默等待下次轮询
    };

    try {
        xhr.send();
    } catch (e) {
        // 发送失败（如网络不可用），静默等待下次轮询
    }
}

// ======================== WebSocket 连接管理 ========================

/**
 * 建立 WebSocket 连接到 MCP 服务器
 * 绑定 onopen / onmessage / onclose / onerror 事件处理
 */
function connectWebSocket() {
    // 防止重复连接
    if (mcpWebSocket) {
        disconnectWebSocket();
    }

    try {
        mcpWebSocket = new WebSocket(MCP_WS_URL);

        mcpWebSocket.onopen = function () {
            console.log("[MCP] WebSocket 连接成功！");
            mcpConnected = true;

            // 连接成功后停止 HTTP 轮询（节省资源）
            if (mcpPollingTimer) {
                clearInterval(mcpPollingTimer);
                mcpPollingTimer = null;
            }

            // 清除超时定时器（已连接成功，不需要了）
            if (mcpPollTimeoutTimer) {
                clearTimeout(mcpPollTimeoutTimer);
                mcpPollTimeoutTimer = null;
            }

            // 刷新按钮显示为"已连接"
            window.Application.ribbonUI.InvalidateControl("btnMcpToggle");
        };

        mcpWebSocket.onmessage = function (event) {
            // 收到消息 → 交给消息处理函数
            handleWebSocketMessage(event.data);
        };

        mcpWebSocket.onclose = function (event) {
            console.log("[MCP] WebSocket 连接断开 (code: " + event.code + ")");
            mcpConnected = false;
            mcpWebSocket = null;

            // 清除旧的超时定时器
            if (mcpPollTimeoutTimer) {
                clearTimeout(mcpPollTimeoutTimer);
                mcpPollTimeoutTimer = null;
            }

            // 刷新按钮显示为"连接中..."
            window.Application.ribbonUI.InvalidateControl("btnMcpToggle");

            // 如果 MCP 开关仍然开启 → 重新启动轮询，尝试重连
            if (window.Application.PluginStorage.getItem("McpEnabled")) {
                console.log("[MCP] 开关仍开启，稍后重新开始轮询...");
                setTimeout(function () {
                    if (!mcpConnected && window.Application.PluginStorage.getItem("McpEnabled")) {
                        console.log("[MCP] 重新开始轮询...");
                        pollServer(); // 立即执行一次
                        mcpPollingTimer = setInterval(pollServer, MCP_POLL_INTERVAL);
                        // 重连后重新设置 10 分钟超时
                        mcpPollTimeoutTimer = setTimeout(function () {
                            if (!mcpConnected) {
                                console.log("[MCP] 轮询超时（10分钟），自动停止。请重新点击按钮。");
                                stopMcpService();
                                window.Application.PluginStorage.setItem("McpEnabled", false);
                                window.Application.ribbonUI.InvalidateControl("btnMcpToggle");
                            }
                        }, 10 * 60 * 1000);
                    }
                }, 1000);
            }
        };

        mcpWebSocket.onerror = function (error) {
            console.log("[MCP] WebSocket 发生错误");
            // onerror 之后通常会触发 onclose，所以这里只做标记
            mcpConnected = false;
        };

    } catch (e) {
        console.log("[MCP] WebSocket 创建失败: " + e.message);
        mcpConnected = false;
    }
}

/**
 * 断开 WebSocket 连接
 */
function disconnectWebSocket() {
    if (mcpWebSocket) {
        try {
            // 正常关闭（code 1000 = Normal Closure）
            mcpWebSocket.close(1000, "用户关闭");
        } catch (e) {
            // 关闭失败忽略
        }
        mcpWebSocket = null;
    }
    mcpConnected = false;

    // 刷新按钮状态
    window.Application.ribbonUI.InvalidateControl("btnMcpToggle");
}

// ======================== 消息处理 ========================

/**
 * 处理 WebSocket 收到的消息
 * 消息格式：[{"type":"getcode|updatecode|insertcode","data":"..."}]
 *
 * @param {string} rawMessage - WebSocket 收到的原始字符串
 */
function handleWebSocketMessage(rawMessage) {
    console.log("[MCP] 收到消息: " + rawMessage);

    // 解析 JSON
    var messages;
    try {
        messages = JSON.parse(rawMessage);
    } catch (e) {
        sendResponse("error", "JSON 解析失败: " + e.message);
        return;
    }

    // 兼容单个对象和数组两种格式
    if (!Array.isArray(messages)) {
        messages = [messages];
    }

    // 逐条处理消息
    for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        var msgType = msg.type;

        switch (msgType) {
            case "getcode":
                // 读取当前工作簿 JSA IDE 中的全部代码
                handleGetCode();
                break;

            case "updatecode":
                // 清空原有代码，写入新代码
                handleUpdateCode(msg.data || "");
                break;

            case "insertcode":
                // 在现有代码末尾追加新代码
                handleInsertCode(msg.data || "");
                break;

            default:
                sendResponse("error", "未知消息类型: " + msgType);
                break;
        }
    }
}

// ======================== 操作处理函数 ========================

/**
 * 处理 getcode：读取 JSA 代码并返回
 */
function handleGetCode() {
    try {
        var code = getWorkbookJsaCode();
        sendResponse("ok", code);
    } catch (e) {
        sendResponse("error", "获取代码失败: " + e.message);
    }
}

/**
 * 处理 updatecode：清空原有代码后写入新代码
 * @param {string} data - 要写入的新代码
 */
function handleUpdateCode(data) {
    try {
        setWorkbookJsaCode(data);
        sendResponse("ok", "");
    } catch (e) {
        sendResponse("error", "更新代码失败: " + e.message);
    }
}

/**
 * 处理 insertcode：在现有代码末尾追加新代码
 * @param {string} data - 要追加的代码
 */
function handleInsertCode(data) {
    try {
        appendWorkbookJsaCode(data);
        sendResponse("ok", "");
    } catch (e) {
        sendResponse("error", "插入代码失败: " + e.message);
    }
}

// ======================== 响应发送 ========================

/**
 * 通过 WebSocket 发送响应消息
 * 响应格式：[{"status":"ok|error","result":"..."}]
 *
 * @param {string} status - "ok" 或 "error"
 * @param {string} result - 结果内容（getcode 时返回代码文本，updatecode/insertcode 时为空字符串）
 */
function sendResponse(status, result) {
    if (!mcpConnected || !mcpWebSocket) {
        console.log("[MCP] 无法发送响应：WebSocket 未连接");
        return;
    }

    var response = [{
        status: status,
        result: result || ""
    }];

    try {
        var jsonStr = JSON.stringify(response);
        mcpWebSocket.send(jsonStr);
        console.log("[MCP] 发送响应: " + jsonStr);
    } catch (e) {
        console.log("[MCP] 发送响应失败: " + e.message);
    }
}

// ======================== WPS JSA 代码读写 ========================

/**
 * 获取当前工作簿中 JSA IDE 的全部代码
 * 通过 Application.JSIDE 接口读取（WPS 较新版本特性）
 *
 * API 结构（模仿 VBA CodeModule）：
 *   Application.JSIDE.SelectedJSComponent.CodeModule
 *     .Lines(startLine, count)   — 读取指定行范围内的代码
 *     .CountOfLines              — 代码总行数
 *
 * @returns {string} JSA 模块的全部代码文本
 */
function getWorkbookJsaCode() {
    var wb = window.Application.ActiveWorkbook;
    if (!wb) {
        throw new Error("当前没有打开任何文档");
    }

    try {
        var cm = window.Application.JSIDE.SelectedJSComponent.CodeModule;
        var totalLines = cm.CountOfLines;
        if (totalLines > 0) {
            return cm.Lines(1, totalLines);
        }
        return ""; // 空模块
    } catch (e) {
        throw new Error(
            "读取 JSA 代码失败。请确认已在 WPS 中勾选：" +
            "工具 → 宏安全性 → 可靠发行商 → 「信任对于'wpsjs 项目'的访问」。" +
            "错误详情: " + (e.message || e)
        );
    }
}

/**
 * 替换当前工作簿中 JSA IDE 的全部代码（清空后写入新代码）
 * 通过 Application.JSIDE 接口写入（WPS 较新版本特性）
 *
 * @param {string} code - 要写入的新代码内容
 */
function setWorkbookJsaCode(code) {
    var wb = window.Application.ActiveWorkbook;
    if (!wb) {
        throw new Error("当前没有打开任何文档");
    }

    try {
        var cm = window.Application.JSIDE.SelectedJSComponent.CodeModule;
        // 先删除所有现有代码行
        var totalLines = cm.CountOfLines;
        if (totalLines > 0) {
            cm.DeleteLines(1, totalLines);
        }
        // 写入新代码
        if (code) {
            cm.AddFromString(code);
        }
    } catch (e) {
        throw new Error(
            "写入 JSA 代码失败。请确认已在 WPS 中勾选：" +
            "工具 → 宏安全性 → 可靠发行商 → 「信任对于'wpsjs 项目'的访问」。" +
            "错误详情: " + (e.message || e)
        );
    }
}

/**
 * 在当前工作簿 JSA IDE 代码末尾追加新代码
 * 通过 Application.JSIDE 接口追加（WPS 较新版本特性）
 *
 * @param {string} code - 要追加的代码内容
 */
function appendWorkbookJsaCode(code) {
    var wb = window.Application.ActiveWorkbook;
    if (!wb) {
        throw new Error("当前没有打开任何文档");
    }

    try {
        var cm = window.Application.JSIDE.SelectedJSComponent.CodeModule;
        // 在最后一行之后插入新代码
        var totalLines = cm.CountOfLines;
        cm.InsertLines(totalLines + 1, code);
    } catch (e) {
        throw new Error(
            "追加 JSA 代码失败。请确认已在 WPS 中勾选：" +
            "工具 → 宏安全性 → 可靠发行商 → 「信任对于'wpsjs 项目'的访问」。" +
            "错误详情: " + (e.message || e)
        );
    }
}
