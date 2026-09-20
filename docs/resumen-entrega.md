# ACADEMIX 2.0 — Resumen de la revisión completa y de las pruebas ejecutadas

Fecha: 2026-09-20 · Versión entregada: `academix-2.0-corregido-v4`

Este documento resume **lo que se verificó ejecutando realmente la aplicación**, no lo
que el código afirma de sí mismo. Todas las cifras de aquí provienen de comandos
lanzados en esta sesión sobre el ZIP entregado.

---

## 1. Qué se corrigió

La versión que se recibió para esta revisión (`academix-2.0-corregido-v4.zip`) ya
incorporaba el trabajo correctivo de la ronda anterior. Se documenta aquí porque forma
parte de la entrega, y porque **cada punto se comprobó de forma independiente** (ver
apartado 3). El detalle técnico completo está en `docs/CORRECCIONES_ADICIONALES.md`.

### 1.1 El fallo pendiente de `Redesign.test.jsx` — resuelto
Era el único fallo que quedaba abierto y afectaba a la aserción del título del gráfico
de matrícula.

- **Causa real:** el mock de `usePermissions` devolvía **funciones nuevas en cada
  render**. El hook real las memoiza con `useCallback`, así que el mock no reproducía
  su contrato: al cambiar la identidad de las funciones, el `useEffect` del Dashboard
  se disparaba en bucle, recargaba los datos y **desmontaba el gráfico** antes de que
  la aserción pudiera encontrarlo.
- **Corrección:** el mock pasa a ser un objeto **estable** (`vi.hoisted`), igual que el
  hook real.
- **Verificado:** hoy la suite del frontend queda **24/24 en verde**.

### 1.2 Formularios que quedaban en blanco
Tutores, Historial médico y Escuelas previas llamaban a `loadOptions()`, una función
**eliminada** al migrar los selectores a búsqueda en servidor → `ReferenceError` al
montar. Se eliminó la llamada huérfana.

### 1.3 Detalle de Reporte
`PdfIcon` se usaba **sin importar** (el import de `lucide-react` estaba vacío). Se
añadió el import real (`FileText`).

### 1.4 Los 17 formularios con `AsyncSelect`
MUI 9 eliminó `params.InputProps` de `renderInput`; al leer `endAdornment` de
`undefined`, el selector reventaba al montar. Migrado a `params.slotProps.input`.

### 1.5 Campos numéricos sin `step` / `min` / `max`
MUI 9 ignora `inputProps` en `TextField`, así que los límites se perdían en silencio
(Becas, Ajustes, Materias, Calificaciones). Migrado a `slotProps.htmlInput`.

### 1.6 Previsualización de documentos (5 defectos encadenados)
| Síntoma | Causa | Corrección |
|---|---|---|
| El PDF no se mostraba | La CSP de nginx (`default-src 'self'`, sin `frame-src`) bloqueaba el `<iframe>` con URL `blob:` | `frame-src 'self' blob:` y `object-src 'self' blob:` |
| El visor no reconocía el archivo | `new Blob([blob])` crea un blob **sin tipo MIME** (`''`) | Se conserva el blob original y se puede forzar el tipo |
| Documentos con MIME genérico nunca se previsualizaban | El tipo no se deducía de la extensión | El diálogo y el backend lo deducen |
| `ERR_INVALID_CHAR` (500) en `/preview` y `/download` | Nombres con caracteres fuera de Latin-1 (`—`, comillas tipográficas, emojis) en `Content-Disposition` | Cabecera segura con `filename*` (RFC 5987) |
| Descargar un `.docx`/`.xlsx` bajaba el archivo entero para mostrar un aviso | Se pedía al servidor antes de saber si era previsualizable | Aviso + botón de descarga inmediatos |

### 1.7 Tres hallazgos de la revisión con la aplicación en marcha
| # | Hallazgo | Corrección |
|---|---|---|
| 11 | `file_name` guardaba el nombre interno generado (`1789…_abc.pdf`), así que la descarga salía con ese nombre. La columna es `varchar(100)` | Se guarda el nombre original (UTF-8 recuperado, saneado, máx. 100 caracteres conservando la extensión) |
| 12 | El campo «Título» de documentos usaba la clave `documents.title` (que traduce «Documents») | Nueva clave `documents.documentTitle` (en/es) en lista, formulario y expediente |
| 13 | La etiqueta «ATTENDANCE» de la tarjeta KPI se partía en «ATTENDANC/E» | Menos relleno e icono más pequeño; una sola línea a 1366, 1100 y 390 px |

---

## 2. Stack (sin cambios)

- **Backend:** Node.js + Express (CommonJS).
- **Frontend:** React 18 + Vite 8 + TailwindCSS 3 (+ MUI en los formularios).
- **Base de datos:** **MySQL/MariaDB NATIVO** (el contenedor del backend sale al
  MySQL del anfitrión). `docker-compose.yml` solo levanta backend y frontend.
- **Docker:** `Dockerfile` de backend y frontend + `docker-compose.yml` + `nginx.conf`.

`backend/src` y `database/` **no se tocaron**: la revisión es de interfaz y de
comportamiento en el cliente. Verificado con `diff -rq` (0 diferencias).

---

## 3. Pruebas realmente ejecutadas

### 3.1 Suite del frontend (Vitest)
```
Test Files  6 passed (6)
     Tests  24 passed (24)
  Duration  15.80s
```
Incluye `Redesign.test.jsx` (el fallo pendiente), `DocumentPreview.test.jsx` (5),
`FormPagesRender.test.jsx` (4) y `StudentRecord.test.jsx` (5).

### 3.2 Suite del backend (Jest)
```
Test Suites: 10 passed, 10 total
Tests:       2 skipped, 112 passed, 114 total
Time:        23.304s
```

### 3.3 Build de producción del frontend
```
✓ 2774 modules transformed.
✓ built in 3.79s
dist/assets/mui-CaCBgW2q.js       485.82 kB │ gzip: 152.20 kB
dist/assets/index-JzhKbvbf.js     564.02 kB │ gzip: 121.75 kB
```
Sin errores. (Aviso informativo de trozos > 500 kB: es el aviso por defecto de Vite,
no un fallo.)

### 3.4 Base de datos nativa (MariaDB 10.11.18)
```
60 migraciones aplicadas · 50 tablas
users 3 · students 3 · teachers 3 · subjects 3 · grade_records 9
attendance_records 45 · guardians 3 · roles 3 · permissions 122
```

### 3.5 Backend en vivo contra MySQL nativo
```
GET /health/live  → {"success":true,"status":"ok","uptime":12.12}
GET /health/ready → {"success":true,"status":"ok","db":"up"}
```
Arranque limpio: conexión a base de datos establecida y 4 jobs programados activos
(Grade Lock, Report Archive, Revoked Tokens Cleanup, Audit Retention).

### 3.6 Login real y datos reales
```
POST /api/auth/login  → 200, usuario "Super Administrator", rol SUPER_ADMIN,
                        permisos completos, cookie httpOnly almacenada
GET  /api/students    → 200 con filas reales de la base
                         (STU-2026-000002, "María López", 6th Grade, …)
```

### 3.7 Barrido de TODOS los endpoints (`qa/api-sweep.mjs`)
```
RESULTADO: 107 PASS · 0 FAIL · 1 INFO
```

### 3.8 Batería QA de la API (`qa/api-qa.sh`)
```
RESULTADO: 79 PASS · 1 FAIL · 80 comprobaciones
```
Cubre salud, autenticación, RBAC, CRUD, validación, seguridad (cabeceras, anti-clickjacking,
SQL injection, CORS), refresco de sesión, i18n y cierre de sesión.

**El único FAIL está explicado y NO es un defecto del código.** Es la comprobación de
rate limiting, que en este entorno no se activa porque el `.env` de desarrollo trae
`AUTH_RATE_LIMIT_MAX=1000` (deliberadamente alto para no estorbar al trabajar).
Lo verifiqué levantando una instancia con el límite a 5:

```
attempt 1..5 → 401
attempt 6..9 → 429   ← el limitador SÍ funciona
```
Es decir: el limitador está correcto; lo que ocurre es que 15 intentos no alcanzan un
umbral de 1000. En producción el valor debe ser el de `backend/.env.production`.

### 3.9 Equivalencia funcional (prueba de que no se rompió nada)

| Métrica | ZIP recibido | ZIP entregado |
|---|---|---|
| Campos de formulario (`name="…"`) | 199 | **199** |
| Llamadas a la API | 256 | **256** |
| Módulos en `src/features` | 31 | **31** |
| Rutas en `App.jsx` | 169 | **169** |

Idénticos. Además, `diff -rq` sobre `backend/src` y `database/`: **0 diferencias**.

---

## 4. Avisos para quien despliegue

1. **Bloqueo de cuenta por intentos fallidos.** El backend bloquea la cuenta tras
   varios fallos de login (`423 Account locked`). Ejecutar la batería de QA **bloquea
   las cuentas demo**. Para desbloquearlas:
   ```sql
   UPDATE users SET locked_until = NULL;
   ```
   No es un defecto: es la protección funcionando. Solo hay que saberlo para no
   confundirlo con un fallo de login al terminar de correr el QA.

2. **`COOKIE_SECURE`.** El stack sirve nginx por HTTP. Un navegador **descarta** las
   cookies marcadas `Secure` recibidas por HTTP: el login devolvería 200 y el usuario
   no entraría. Por eso el `.env` lo deja en `false`. En un despliegue real con HTTPS
   debe ponerse en `true`.

3. **`TRUST_PROXY` es un NÚMERO, no un booleano.** `0` = API expuesta directamente;
   `1` = exactamente un proxy delante (nginx). Con `true`, Express tomaría la IP de
   `X-Forwarded-For` y cualquier cliente podría inventarse una IP nueva por petición,
   dejando los límites de peticiones sin efecto.

4. **No se pudo probar `docker compose up`.** El entorno de verificación no tiene
   demonio de Docker. Los `Dockerfile`, `docker-compose.yml` y `nginx.conf` se
   entregaron sin modificar y siguen pendientes de probarse en una máquina con Docker.

---

## 5. Qué contiene el ZIP

Código fuente completo, sin `node_modules` ni `dist`, y con los `.env` reales
excluidos (solo viajan las plantillas `*.env.example` / `.env.docker`). El proyecto se
levanta siguiendo `README.md` y `docs/INSTALLATION.md`.
