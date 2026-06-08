@echo off
chcp 65001 >nul
title JSA-MCP Addon + MCP Installer
echo.
echo   =========================================
echo    JSA-MCP WPS Addon + MCP - One-Click Install
echo   =========================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"
