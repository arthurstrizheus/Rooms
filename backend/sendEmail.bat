@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ---------------- CONFIG ----------------
set MAX_TIME=60
set RETRIES=3
set RETRY_DELAY=3
set LOGDIR=C:\Logs\MatterManager

:: ---------------- PREP ----------------
if not exist "%LOGDIR%" mkdir "%LOGDIR%" >nul 2>&1

REM Timestamp safe across locales via PowerShell
for /f "usebackq delims=" %%T in (`powershell -NoP -C "(Get-Date).ToString('yyyyMMdd_HHmmss')"`) do set TS=%%T
set SCRIPT_DIR=%~dp0
set LOG=%LOGDIR%\full_%TS%.log

(
	echo [!date! !time!] START Script at "%~f0" (RunAs=%USERNAME%)
	echo [!date! !time!] MAX_TIME=%MAX_TIME%  RETRIES=%RETRIES%  RETRY_DELAY=%RETRY_DELAY%
	echo [!date! !time!] LOGDIR=%LOGDIR%  LOG=%LOG%
	echo [!date! !time!] WORKDIR=%CD%
) > "%LOG%" 2>&1

:: Resolve node path
set "NODE_EXE="
for /f "usebackq delims=" %%N in (`where node 2^>nul`) do set "NODE_EXE=%%N"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "C:\Program Files\nodejs\node.exe" set "NODE_EXE=C:\Program Files\nodejs\node.exe"

if not defined NODE_EXE (
	echo [!date! !time!] ERROR node.exe not found in PATH or Program Files >> "%LOG%"
	echo node.exe not found. See %LOG%
	exit /b 2
)

echo [!date! !time!] Using node: "%NODE_EXE%" >> "%LOG%"

:: --- Diagnostics: dump environment and files to help debug server runs ---
echo [!date! !time!] DIAG: USER=%USERNAME% DOMAIN=%USERDOMAIN% >> "%LOG%"
echo [!date! !time!] DIAG: CD=%CD% SCRIPT_DIR=%SCRIPT_DIR% >> "%LOG%"
echo [!date! !time!] DIAG: NODE VERSION >> "%LOG%"
"%NODE_EXE%" -v >> "%LOG%" 2>&1 || echo [!date! !time!] DIAG: node -v failed >> "%LOG%"
echo [!date! !time!] DIAG: LIST SCRIPT_DIR >> "%LOG%"
dir "%SCRIPT_DIR%" >> "%LOG%" 2>&1 || echo [!date! !time!] DIAG: dir failed >> "%LOG%"
if exist "%SCRIPT_DIR%\.env" (
	echo [!date! !time!] DIAG: .env found at %SCRIPT_DIR%\.env (contents are NOT logged for security) >> "%LOG%"
) else (
	echo [!date! !time!] DIAG: .env not found at %SCRIPT_DIR%\.env >> "%LOG%"
)

echo [!date! !time!] DIAG: About to invoke node on %SCRIPT_DIR%sendMonthlyEmails.js >> "%LOG%"

:: --- Ensure LDAP env vars are available to the scheduled task ---
:: If a .env file exists next to this script, extract LDAP_* vars using findstr (avoids PowerShell quoting issues)
if exist "%SCRIPT_DIR%\.env" (
	echo [!date! !time!] Loading LDAP variables from %SCRIPT_DIR%\.env >> "%LOG%"
	for %%V in (LDAP_URL LDAP_BASE_DN LDAP_USER LDAP_PASS LDAP_CA_PATH) do (
		for /f "tokens=1* delims==" %%A in ('findstr /R /C:"^%%V[ ]*=" "%SCRIPT_DIR%\.env"') do (
			set "VAL=%%B"
			if defined VAL (
				:: Trim leading spaces
				for /f "tokens=* delims= " %%Z in ("!VAL!") do set "VAL=%%Z"
				:: Remove surrounding single quotes if present
				if "!VAL:~0,1!"=="'" set "VAL=!VAL:~1!"
				if "!VAL:~-1!"=="'" set "VAL=!VAL:~0,-1!"
				:: Remove surrounding double quotes if present
				if "!VAL:~0,1!"=="\"" set "VAL=!VAL:~1!"
				if "!VAL:~-1!"=="\"" set "VAL=!VAL:~0,-1!"
				set "%%A=!VAL!"
				REM Do not log sensitive environment variable values. Only record that the variable was set.
				echo [!date! !time!] Set %%A=(value hidden) >> "%LOG%"
			)
		)
	)
)

:: If LDAP_CA_PATH still not defined, default to ca.pem next to the script
if not defined LDAP_CA_PATH (
	if exist "%SCRIPT_DIR%ca.pem" (
		set "LDAP_CA_PATH=%SCRIPT_DIR%ca.pem"
		echo [!date! !time!] Defaulted LDAP_CA_PATH to %LDAP_CA_PATH% >> "%LOG%"
	)
)

:: Ensure LDAP_CA_PATH is set explicitly (helps scheduled tasks where file checks may behave differently)
set "LDAP_CA_PATH=%SCRIPT_DIR%ca.pem"
if exist "%LDAP_CA_PATH%" (
    echo [!date! !time!] LDAP CA file exists at %LDAP_CA_PATH% >> "%LOG%"
) else (
    echo [!date! !time!] WARNING: LDAP CA file not found at %LDAP_CA_PATH% >> "%LOG%"
)



set SUCCESS=0
:: Try up to %RETRIES% times. Prefer curl if available; fall back to PowerShell if curl missing or fails.
for /l %%I in (1,1,%RETRIES%) do (
	echo [!date! !time!] ATTEMPT %%I/%RETRIES% >> "%LOG%"

	:: Detect curl: prefer the System32 curl (bundled on recent Windows) then PATH
	set "CURL_EXE="
	if exist "%SYSTEMROOT%\System32\curl.exe" set "CURL_EXE=%SYSTEMROOT%\System32\curl.exe"
	if not defined CURL_EXE (
		for /f "usebackq delims=" %%C in (`where curl 2^>nul`) do set "CURL_EXE=%%C" & goto :CURL_FOUND
	)
:CURL_FOUND

	if defined CURL_EXE (
		echo [!date! !time!] Using curl: "%CURL_EXE%" >> "%LOG%"
		:: Use --max-time to limit runtime, --silent/--show-error to keep output clean, and --write-out to append HTTP status
		"%CURL_EXE%" --max-time %MAX_TIME% --silent --show-error -X POST "http://127.0.0.1:5000/api/mattermanager/full" --write-out "HTTP_STATUS=%{http_code}\n" >> "%LOG%" 2>&1
		set ERRLVL=!ERRORLEVEL!
		echo [!date! !time!] curl exitlevel=!ERRLVL! >> "%LOG%"

		if !ERRLVL! EQU 0 (
			echo [!date! !time!] ATTEMPT %%I SUCCESS (curl) >> "%LOG%"
			set SUCCESS=1
			goto :DONE
		) else (
			echo [!date! !time!] ATTEMPT %%I FAILED (curl) >> "%LOG%"
		)
	) else (
		echo [!date! !time!] curl not found in System32 or PATH; will use PowerShell fallback >> "%LOG%"
	)

	:: Fallback: PowerShell Invoke-WebRequest wrapper (used previously)
	set "PSWRAP=%TEMP%\call_api_%TS%_%%I.ps1"
	> "%PSWRAP%" echo try {
	>> "%PSWRAP%" echo   $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5000/api/mattermanager/full' -UseBasicParsing -TimeoutSec %MAX_TIME% -ErrorAction Stop
	>> "%PSWRAP%" echo   Write-Output ('HTTP_STATUS=' + $r.StatusCode)
	>> "%PSWRAP%" echo   exit 0
	>> "%PSWRAP%" echo } catch {
	>> "%PSWRAP%" echo   Write-Error $_.Exception.Message
	>> "%PSWRAP%" echo   exit 1
	>> "%PSWRAP%" echo }

	powershell -NoProfile -ExecutionPolicy Bypass -File "%PSWRAP%" >> "%LOG%" 2>&1
	del "%PSWRAP%" >nul 2>&1

	set ERRLVL=!ERRORLEVEL!
	echo [!date! !time!] fallback (powershell) exitlevel=!ERRLVL! >> "%LOG%"

	if !ERRLVL! EQU 0 (
		echo [!date! !time!] ATTEMPT %%I SUCCESS (powershell) >> "%LOG%"
		set SUCCESS=1
		goto :DONE
	) else (
		echo [!date! !time!] ATTEMPT %%I FAILED; sleeping %RETRY_DELAY%s >> "%LOG%"
		if %%I lss %RETRIES% timeout /t %RETRY_DELAY% /nobreak >nul
	)
)

:DONE
if "%SUCCESS%"=="1" (
	echo [!date! !time!] COMPLETED exit=0 >> "%LOG%"
	exit /b 0
) else (
	echo [!date! !time!] FAILED_ALL_ATTEMPTS exit=1 >> "%LOG%"
	exit /b 1
)

