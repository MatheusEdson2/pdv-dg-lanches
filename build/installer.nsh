!include LogicLib.nsh

!macro customUnInstall
  RMDir /r "$APPDATA\DG Lanches PDV"
  RMDir /r "$LOCALAPPDATA\Programs\DG Lanches PDV"
  Delete "$DESKTOP\DG Lanches PDV.lnk"
  Delete "$STARTMENU\DG Lanches PDV\*"
  RMDir "$STARTMENU\DG Lanches PDV"
!macroend

!macro customInstall
  ${ifNot} ${isNoDesktopShortcut}
    CreateShortCut "$newDesktopLink" "$appExe" "" "$INSTDIR\\uninstallerIcon.ico" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
  ${endIf}

  !ifndef DO_NOT_CREATE_START_MENU_SHORTCUT
    CreateShortCut "$newStartMenuLink" "$appExe" "" "$INSTDIR\\uninstallerIcon.ico" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
  !endif
!macroend
