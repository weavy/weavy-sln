@echo off
pushd %~dp0

for /f "usebackq tokens=1* delims=: " %%i in (`tools\vswhere -latest -requires Microsoft.Component.MSBuild`) do (
  if /i "%%i"=="installationPath" set InstallDir=%%j
)
if not exist "%InstallDir%\MSBuild\15.0\Bin\MSBuild.exe" goto :MSBuildMissing

if "%1" == "" goto BuildDefault

:BuildCustom
"%InstallDir%\MSBuild\15.0\Bin\MSBuild.exe" build.proj %*
if %ERRORLEVEL% neq 0 goto BuildFail
goto BuildSuccess

:BuildDefault
"%InstallDir%\MSBuild\15.0\Bin\MSBuild.exe" build.proj /v:m
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