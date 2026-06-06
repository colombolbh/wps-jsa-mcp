/**
 * WPS 加载项 - 工具函数模块
 * 本文件由 main.js 最先加载，提供基础工具函数。
 */

/**
 * 获取当前加载项页面的根 URL 路径
 * @returns {string} 当前页面所在的目录 URL（以 / 结尾）
 */
function GetUrlPath() {
    let e = document.location.toString()
    return -1 != (e = decodeURI(e)).indexOf("/") && (e = e.substring(0, e.lastIndexOf("/"))), e
}
