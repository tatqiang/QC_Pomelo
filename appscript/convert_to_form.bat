@echo off
:: ─────────────────────────────────────────────────────────────────────────────
::  convert_to_form.bat
::  Drag any PDF onto this bat file → converts {{tag}} to AcroForm fields
::
::  Output: same folder as input, filename = original_name_FORM.pdf
:: ─────────────────────────────────────────────────────────────────────────────

if "%~1"=="" (
    echo.
    echo  USAGE: Drag a PDF file onto this bat file
    echo.
    pause
    exit /b
)

:: Build output path:  input_FORM.pdf  (same folder as input)
set "INPUT=%~1"
set "OUTPUT=%~dp1%~n1_FORM.pdf"

echo.
echo  Input  : %INPUT%
echo  Output : %OUTPUT%
echo.

:: Use py launcher (works with Python installed via python.org)
where py >nul 2>&1
if %errorlevel%==0 (
    set PYCMD=py
) else (
    where python >nul 2>&1
    if %errorlevel%==0 (
        set PYCMD=python
    ) else (
        echo  ERROR: Python not found. Install from https://www.python.org
        pause
        exit /b 1
    )
)

:: Run converter (script lives next to this bat file)
%PYCMD% "%~dp0pdf_to_form.py" "%INPUT%" "%OUTPUT%" --show-borders

if %errorlevel%==0 (
    echo.
    echo  Done! Saved to: %OUTPUT%
) else (
    echo.
    echo  Failed. Check errors above.
)

pause
