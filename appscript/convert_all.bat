@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo  Excel ^-^> AcroForm PDF Batch Converter
echo ============================================
echo.

set ERRORS=0
set COUNT=0

:: ── Loop through every .xlsx in this folder ──────────────────────────────
for %%F in (*.xlsx) do (
    set "INPUT=%%F"
    set "BASE=%%~nF"
    set "OUTPUT=%%~nF_form.pdf"

    echo [%%F] ^-^> [!OUTPUT!]
    py convert_sheet_to_form.py "%%F" "!OUTPUT!"

    if errorlevel 1 (
        echo    ERROR converting %%F
        set /a ERRORS+=1
    ) else (
        set /a COUNT+=1
    )
    echo.
)

if %COUNT%==0 (
    echo No files were converted successfully.
    goto :end
)

echo ============================================
echo  Converted: %COUNT% file(s)
if %ERRORS% GTR 0 echo  Errors:    %ERRORS% file(s)
echo ============================================
echo.

:: ── Optional: upload all generated _form.pdf files to R2 ─────────────────
set /p UPLOAD="Upload all *_form.pdf to R2 now? (y/n): "
if /i "%UPLOAD%"=="y" (
    echo.
    echo Uploading...
    py upload_template.py
)

:end
echo.
pause
