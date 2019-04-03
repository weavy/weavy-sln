@echo off
setlocal enabledelayedexpansion
pushd %~dp0
for /f "usebackq tokens=*" %%i in (`tools\vswhere -latest -requires Microsoft.Component.MSBuild -find MSBuild\**\Bin\MSBuild.exe`) do (
  set MSBuildExe="%%i"
)
if not exist %MSBuildExe% goto MSBuildMissing

%MSBuildExe% build.proj /v:m
if %ERRORLEVEL% neq 0 goto BuildFail
goto BuildSuccess

:MSBuildMissing
echo.
echo [93m*** COULD NOT LOCATE MSBUILD ***[0m
goto End

:BuildFail
echo.
echo [91m*** BUILD FAILED WITH ERRORLEVEL %ERRORLEVEL% ***[0m
goto End

:BuildSuccess
echo.
echo [92m*** BUILD SUCCEEDED ***[0m
goto End

:End
popd
exit /b %ERRORLEVEL%
