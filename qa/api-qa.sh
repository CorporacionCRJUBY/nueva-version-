#!/usr/bin/env bash
# =============================================================================
# FILE: qa/api-qa.sh
# QA de API end-to-end — ACADEMIX 2.0 (New Direction Academy)
#
# Ejecuta la batería del ingeniero de QA contra el backend REAL
# (Node + Express + MySQL/MariaDB) y escribe un reporte con el resultado de
# cada comprobación: salud, autenticación, RBAC, CRUD, validación, seguridad,
# reportes e i18n.
#
# NOTA DE SEGURIDAD (arquitectura real del sistema):
#   Los tokens de sesión viajan en cookies `httpOnly` (ver
#   backend/src/utils/cookies.js), NO en el body JSON — esa fue una corrección
#   deliberada de la auditoría para que un XSS no pueda robar el JWT desde
#   localStorage. Por eso este QA usa un "cookie jar" de curl en lugar de
#   extraer el token de la respuesta.
#
# Uso:  bash qa/api-qa.sh [BASE_URL]
# =============================================================================
set -uo pipefail

BASE="${1:-http://localhost:5050}"
# Ruta RELATIVA al propio script: una ruta absoluta hardcodeada (antes
# "/workspace/academix_v5/qa/...") rompía la suite en cualquier otro clon.
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/api-qa-results.txt"
JAR=$(mktemp)
TEACHER_JAR=$(mktemp)
TMP=$(mktemp)
PASS=0
FAIL=0

mkdir -p "$(dirname "$OUT")"
: > "$OUT"

cleanup() { rm -f "$JAR" "$TEACHER_JAR" "$TMP"; }
trap cleanup EXIT

# --- utilidades --------------------------------------------------------------
log()  { echo "$*" | tee -a "$OUT"; }
ok()   { PASS=$((PASS+1)); log "  [PASS] $1"; }
bad()  { FAIL=$((FAIL+1)); log "  [FAIL] $1  ->  $2"; }

# status: código HTTP de una petición, opcionalmente guardando cookies.
#   req_status "<jar|->" <curl args...>
req_status() {
  local jar="$1"; shift
  if [ "$jar" = "-" ]; then
    curl -s -o /dev/null -w '%{http_code}' "$@"
  else
    curl -s -o /dev/null -w '%{http_code}' -b "$jar" -c "$jar" "$@"
  fi
}

# expect: comprueba el código HTTP esperado. expect <desc> <esperado> <code>
expect() {
  if [ "$3" = "$2" ]; then ok "$1"; else bad "$1" "código $3, esperado $2"; fi
}

# expect_one_of: acepta varios códigos válidos. expect_one_of <desc> <codes> <code>
expect_one_of() {
  local desc="$1" codes="$2" code="$3"
  case ",$codes," in
    *",$code,"*) ok "$desc" ;;
    *) bad "$desc" "código $code, esperado uno de [$codes]" ;;
  esac
}

log "============================================================================="
log " ACADEMIX 2.0 — QA DE API (end-to-end contra backend real)"
log " Base URL: $BASE"
log " Fecha: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
log " Entorno: Node $(node -v) · $(mariadb --version 2>/dev/null | head -c 40)"
log "============================================================================="

# =============================================================================
log ""
log "1. SALUD DEL SERVICIO (liveness / readiness)"
# =============================================================================
expect "GET /health/live -> 200" 200 "$(req_status - "$BASE/health/live")"
BODY=$(curl -s "$BASE/health/live")
echo "$BODY" | grep -q '"status":"ok"' && ok "Liveness reporta status=ok" || bad "Liveness no reporta ok" "$BODY"

expect "GET /health/ready -> 200" 200 "$(req_status - "$BASE/health/ready")"
BODY=$(curl -s "$BASE/health/ready")
echo "$BODY" | grep -q '"db":"up"' && ok "Readiness confirma base de datos 'up'" || bad "Readiness no ve la BD" "$BODY"

# =============================================================================
log ""
log "2. AUTENTICACIÓN (cookies httpOnly)"
# =============================================================================
CODE=$(req_status - -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@academix.com","password":"CLAVE_INCORRECTA"}')
expect "Login con credenciales inválidas -> 401" 401 "$CODE"

# Login correcto: guarda las cookies en el jar.
BODY=$(curl -s -c "$JAR" -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@academix.com","password":"Academix2026!"}')
echo "$BODY" | grep -q '"success":true' && ok "Login correcto (admin@academix.com)" || bad "Login correcto falló" "$BODY"

grep -qE "accessToken" "$JAR" 2>/dev/null \
  && ok "El token de acceso se entrega como cookie httpOnly" \
  || bad "No se encontró la cookie de access token" "$(grep -v '^#' "$JAR" | head -3)"

grep -qi "HttpOnly" "$JAR" 2>/dev/null \
  && ok "La cookie es HttpOnly (inmune a robo por XSS)" \
  || bad "La cookie no marca HttpOnly" "$(grep -v '^#' "$JAR" | head -2)"

# Datos sensibles no deben venir en el body
echo "$BODY" | grep -qi "accessToken\|refreshToken" \
  && bad "El body expone tokens (deben ir solo en cookie)" "$(echo "$BODY" | head -c 120)" \
  || ok "El body no expone tokens (solo datos de perfil)"

expect "GET /api/auth/me con sesión -> 200" 200 "$(req_status "$JAR" "$BASE/api/auth/me")"
BODY=$(curl -s -b "$JAR" "$BASE/api/auth/me")
echo "$BODY" | grep -q '"success":true' && ok "/api/auth/me devuelve el usuario autenticado" || bad "/api/auth/me falló" "$BODY"

expect "GET /api/auth/me sin cookie -> 401" 401 "$(req_status - "$BASE/api/auth/me")"
expect "GET /api/auth/me con cookie inválida -> 401" 401 \
  "$(req_status - "$BASE/api/auth/me" -H 'Cookie: academix_access_token=token.falso.invalido')"

# JWT manipulado: se toma la cookie real y se altera la firma.
# Las cookies se llaman `accessToken` / `refreshToken` (ver utils/cookies.js).
if grep -qE "accessToken" "$JAR"; then
  # curl escribe las cookies HttpOnly con el prefijo `#HttpOnly_` en la línea,
  # así que no se puede descartar por el '#' inicial: el valor sigue siendo $7.
  REAL=$(grep -E "accessToken" "$JAR" | awk '{print $7}' | tail -1)
  if [ -n "$REAL" ]; then
    TAMPERED="${REAL%?}X"
    CODE=$(req_status - "$BASE/api/auth/me" -H "Cookie: accessToken=$TAMPERED")
    expect "JWT con firma manipulada -> 401" 401 "$CODE"
  else
    bad "No se pudo extraer el token para la prueba de manipulación" ""
  fi
fi

# =============================================================================
log ""
log "3. RBAC — CONTROL DE ACCESO BASADO EN ROLES"
# =============================================================================
expect "ADMIN lista roles (/api/roles) -> 200" 200 "$(req_status "$JAR" "$BASE/api/roles")"
expect "ADMIN lista permisos (/api/permissions) -> 200" 200 "$(req_status "$JAR" "$BASE/api/permissions")"
expect "ADMIN lista usuarios (/api/users) -> 200" 200 "$(req_status "$JAR" "$BASE/api/users")"
expect "ADMIN ve configuración (/api/settings) -> 200" 200 "$(req_status "$JAR" "$BASE/api/settings")"
expect "ADMIN ve auditoría (/api/audit) -> 200" 200 "$(req_status "$JAR" "$BASE/api/audit")"
expect "ADMIN ve métricas del servidor (/api/system/metrics) -> 200" 200 "$(req_status "$JAR" "$BASE/api/system/metrics")"

# Docente: rol con menos privilegios -> debe recibir 403 en rutas de admin.
TEACHER_BODY=$(curl -s -c "$TEACHER_JAR" -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"maria.gonzalez@academix.com","password":"Academix2026!"}')
if echo "$TEACHER_BODY" | grep -q '"success":true'; then
  ok "Login de docente correcto (maria.gonzalez@academix.com)"
  CODES="/api/users /api/roles /api/permissions"
  for ep in $CODES; do
    C=$(req_status "$TEACHER_JAR" "$BASE$ep")
    expect_one_of "Docente bloqueado en $ep (403)" "401,403" "$C"
  done
  # El docente sí debe poder ver recursos académicos de su ámbito
  C=$(req_status "$TEACHER_JAR" "$BASE/api/students")
  expect_one_of "Docente accede a /api/students -> 200" "200" "$C"
else
  bad "No se pudo autenticar el docente de prueba" "$(echo "$TEACHER_BODY" | head -c 120)"
fi

# =============================================================================
log ""
log "4. CRUD — MÓDULOS ACADÉMICOS (lectura vía API)"
# =============================================================================
for ep in users students teachers subjects assignments attendance grades \
          grade-change-requests gpa credits scholarships guardians branches \
          "academic-years" "academic-periods" "academic-history" "medical-records" \
          "previous-schools" documents calendar graduation gransif "progress-reports" \
          "report-cards" transcripts reports audit activity roles permissions settings; do
  C=$(req_status "$JAR" "$BASE/api/$ep")
  if [ "$C" = "200" ]; then
    ok "GET /api/$ep -> 200"
  else
    bad "GET /api/$ep" "código $C"
  fi
done

# =============================================================================
log ""
log "5. MÓDULO DE SISTEMA (panel de control del servidor)"
# =============================================================================
BODY=$(curl -s -b "$JAR" "$BASE/api/system/metrics")
if echo "$BODY" | grep -q '"success":true'; then
  ok "GET /api/system/metrics -> 200"
  for k in cpu memory disk uptime; do
    echo "$BODY" | grep -qi "$k" && ok "Métricas incluyen '$k'" || bad "Faltan métricas de '$k'" "$(echo "$BODY" | head -c 100)"
  done
else
  bad "GET /api/system/metrics falló" "$(echo "$BODY" | head -c 160)"
fi
expect "GET /api/system/services -> 200" 200 "$(req_status "$JAR" "$BASE/api/system/services")"

# =============================================================================
log ""
log "6. VALIDACIÓN DE DATOS Y MANEJO DE ERRORES"
# =============================================================================
expect_one_of "POST /api/students sin body -> 400/422 (validación)" "400,422" \
  "$(req_status "$JAR" -X POST "$BASE/api/students" -H 'Content-Type: application/json' -d '{}')"
expect_one_of "POST /api/students con email inválido -> 400/422" "400,422" \
  "$(req_status "$JAR" -X POST "$BASE/api/students" -H 'Content-Type: application/json' -d '{"email":"no-es-un-email"}')"
expect "GET ruta inexistente -> 404" 404 "$(req_status "$JAR" "$BASE/api/no-existe-este-endpoint")"
expect "GET /api/students/<uuid inexistente> -> 404 (no 500)" 404 \
  "$(req_status "$JAR" "$BASE/api/students/00000000-0000-0000-0000-000000000000")"

BODY=$(curl -s -b "$JAR" "$BASE/api/no-existe-este-endpoint")
echo "$BODY" | grep -q '"success":false' && ok "El error responde en JSON estructurado" || bad "Error sin estructura JSON" "$BODY"

# =============================================================================
log ""
log "7. SEGURIDAD"
# =============================================================================
HEADERS=$(curl -s -D - -o /dev/null "$BASE/health/live")
echo "$HEADERS" | grep -qi "x-content-type-options" && ok "Cabecera X-Content-Type-Options presente" || bad "Falta X-Content-Type-Options" ""
echo "$HEADERS" | grep -qi "x-frame-options\|content-security-policy" && ok "Protección anti-clickjacking (X-Frame-Options/CSP)" || bad "Faltan cabeceras anti-clickjacking" ""
echo "$HEADERS" | grep -qi "x-powered-by" && bad "Expone X-Powered-By (fuga de información)" "" || ok "No expone X-Powered-By"
echo "$HEADERS" | grep -qi "strict-transport-security" && ok "HSTS presente" || log "  [INFO] HSTS no presente (normal en HTTP local; se activa tras TLS)"

# Inyección SQL: la consulta debe ir parametrizada y responder con normalidad.
expect "Búsqueda con payload SQL no provoca error -> 200" 200 \
  "$(req_status "$JAR" "$BASE/api/students?search=%27%20OR%201%3D1--")"
expect "Búsqueda con payload SQL (UNION) -> 200" 200 \
  "$(req_status "$JAR" "$BASE/api/students?search=1%27%20UNION%20SELECT%20password%20FROM%20users--")"

# CORS
CORS=$(curl -s -D - -o /dev/null -H "Origin: http://localhost:5173" "$BASE/health/live")
echo "$CORS" | grep -qi "access-control-allow-origin" && ok "CORS configurado (origen permitido)" || log "  [INFO] Sin cabecera CORS para este origen"

# =============================================================================
log ""
log "8. REFRESCO DE SESIÓN"
# =============================================================================
expect "POST /api/auth/refresh con cookie -> 200" 200 \
  "$(req_status "$JAR" -X POST "$BASE/api/auth/refresh" -H 'Content-Type: application/json')"
expect "POST /api/auth/refresh sin cookie -> 401" 401 \
  "$(req_status - -X POST "$BASE/api/auth/refresh" -H 'Content-Type: application/json')"

# =============================================================================
log ""
log "9. INTERNACIONALIZACIÓN (EN/ES)"
# =============================================================================
expect "Petición con Accept-Language: en-US -> 200" 200 \
  "$(req_status "$JAR" -H 'Accept-Language: en-US' "$BASE/api/students")"
expect "Petición con Accept-Language: es-ES -> 200" 200 \
  "$(req_status "$JAR" -H 'Accept-Language: es-ES' "$BASE/api/students")"

# =============================================================================
log ""
log "10. RATE LIMITING (se ejecuta al final: bloquea la IP temporalmente)"
# =============================================================================
BLOCKED=0
for i in $(seq 1 15); do
  C=$(req_status - -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
        -d '{"email":"admin@academix.com","password":"x"}')
  if [ "$C" = "429" ]; then BLOCKED=1; ok "Rate limiting activo en /api/auth/login (429 en el intento $i)"; break; fi
done
[ "$BLOCKED" = "0" ] && bad "No se activó el rate limiting tras 15 intentos" "todos devolvieron 401"

# =============================================================================
log ""
log "11. CIERRE DE SESIÓN"
# =============================================================================
expect "POST /api/auth/logout -> 200" 200 \
  "$(req_status "$JAR" -X POST "$BASE/api/auth/logout")"

# =============================================================================
log ""
log "============================================================================="
log " RESULTADO:  ${PASS} PASS  ·  ${FAIL} FAIL  ·  $((PASS+FAIL)) comprobaciones"
log " Reporte: $OUT"
log "============================================================================="

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
