@echo off
chcp 65001 >nul
title JSA-MCP Addon Installer
echo.
echo   ====================================
echo    JSA-MCP WPS Addon - One-Click Install
echo   ====================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"
