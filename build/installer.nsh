; Auto-included by electron-builder (nsis.include default = build/installer.nsh).
; Replaces the stock "close the running app" step, which runs right before the old version is uninstalled.
;
; 1. Close every running POS process (tasklist/taskkill see the 64-bit app; nsProcess may not).
;    Manual install asks first; an in-app update (--updated) closes it straight away.
; 2. Upgrade fix: builds up to 1.0.6 shipped Android-only plugin files (Sunmi scanhead build output)
;    under resources\app.asar.unpacked with paths over the 260-char Windows limit. The old uninstaller
;    run during an upgrade must move every file to %TEMP%, can't move those, and aborts with
;    "Failed to uninstall old application files ... : 2". Delete that folder with the \\?\ long-path
;    prefix (plain NSIS can't) before the old uninstaller runs. The Windows app never uses those files.
!macro customCheckAppRunning
  nsExec::Exec `"$SYSDIR\cmd.exe" /c tasklist /FI "IMAGENAME eq ${APP_EXECUTABLE_FILENAME}" /FO csv | "$SYSDIR\find.exe" "${APP_EXECUTABLE_FILENAME}"`
  Pop $R0
  ${if} $R0 == 0
    ${ifNot} ${isUpdated}
      MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK +2
      Quit
    ${endIf}
    nsExec::Exec `"$SYSDIR\cmd.exe" /c taskkill /f /t /im "${APP_EXECUTABLE_FILENAME}"`
    Pop $R0
    Sleep 2000
  ${endIf}

  ReadRegStr $R1 SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${if} $R1 != ""
  ${andIf} ${FileExists} "$R1\resources\app.asar.unpacked\*.*"
    nsExec::Exec `"$SYSDIR\cmd.exe" /c rd /s /q "\\?\$R1\resources\app.asar.unpacked"`
    Pop $R1
  ${endIf}
!macroend
