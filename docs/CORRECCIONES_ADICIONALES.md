# Correcciones adicionales (revisión completa)

| # | Error | Causa | Corrección |
|---|-------|-------|-----------|
| 1 | `Redesign.test.jsx` fallaba | El mock de `usePermissions` devolvía funciones nuevas en cada render, lo que reiniciaba la carga del Dashboard en bucle y desmontaba el título | Mock con objeto estable (como el hook real, que usa `useCallback`) |
| 2 | Formularios de Tutores, Historial médico y Escuelas previas quedaban en blanco | Llamaban a `loadOptions()`, función eliminada al migrar a búsqueda en servidor → `ReferenceError` | Eliminada la llamada huérfana |
| 3 | Detalle de Reporte fallaba | `PdfIcon` usado sin importar (import de lucide vacío) | `import { FileText as PdfIcon } from 'lucide-react'` |
| 4 | Los 17 formularios con selector `AsyncSelect` fallaban al montar | MUI 9 eliminó `params.InputProps` de `renderInput` (`endAdornment` de undefined) | Migrado a `params.slotProps.input` |
| 5 | Campos numéricos sin `step/min/max` | MUI 9 ignora `inputProps` en `TextField` | Migrado a `slotProps.htmlInput` (Becas, Ajustes, Materias, Calificaciones) |

Prueba nueva: `src/test/FormPagesRender.test.jsx` (montaje de los formularios afectados).

Resultado: frontend 19/19 pruebas, `vite build` OK; backend 105 pruebas OK, 0 errores de lint.

## Previsualización de documentos

| # | Causa | Corrección |
|---|-------|-----------|
| 6 | La CSP de nginx (`default-src 'self'`, sin `frame-src`) bloqueaba el `<iframe>` con URL `blob:` → el PDF no se mostraba (verificado en Chromium: violación `frame-src`). `object-src 'none'` además bloquea el visor de PDF dentro de blob iframes | `frame-src 'self' blob:` y `object-src 'self' blob:` en `nginx.conf` (server e index.html) |
| 7 | `getBlobUrl` hacía `new Blob([blob])`, que crea un blob **sin tipo MIME** (verificado: `''`) → el visor de PDF/imagen no reconocía el archivo | Se conserva el blob original y se puede forzar el tipo (`axiosClient.getBlobUrl(url, mimeType)`) |
| 8 | Documentos con MIME vacío/genérico (`octet-stream`, `image/jpg`) nunca se previsualizaban | El diálogo (y el backend) deducen el tipo por la extensión |
| 9 | Nombres con caracteres fuera de Latin-1 (—, “ ”, emojis) → `ERR_INVALID_CHAR` (500) en `/preview` y `/download`; los acentos salían corruptos | `Content-Disposition` seguro con `filename*` (RFC 5987) |
| 10 | Tipos no previsualizables (docx/xlsx/zip) descargaban el archivo entero solo para mostrar un aviso | No se pide al servidor; aviso + botón de descarga inmediatos |

Pruebas nuevas: `DocumentPreview.test.jsx` (5), `documentsHeaders.test.js` (2).

## Revisión final con la aplicación en marcha (MariaDB + backend + navegador)

| # | Hallazgo | Corrección |
|---|----------|-----------|
| 11 | `file_name` guardaba el nombre interno generado (`1789…_abc.pdf`); la descarga salía con ese nombre. La columna es `varchar(100)` | Se guarda el nombre original (UTF-8 recuperado, saneado, máx. 100 caracteres conservando la extensión) |
| 12 | La columna/campo «Título» de documentos usaba la clave `documents.title` («Documents») | Nueva clave `documents.documentTitle` (en/es) en lista, formulario y expediente |
| 13 | La etiqueta «ATTENDANCE» de la tarjeta KPI se partía en «ATTENDANC/E» | Menos relleno y icono más pequeño; una sola línea a 1366, 1100 y 390 px |

Verificación: 130 rutas recorridas con sesión iniciada (0 pantallas en blanco, 0 excepciones, 0 errores 5xx);
QA de API 79/80 (el fallo es de configuración: `AUTH_RATE_LIMIT_MAX=1000` en el .env de desarrollo);
subir → listar → descargar → previsualizar con nombre con tilde y guion largo, bajo la CSP de nginx.conf.
Frontend 24/24 pruebas, backend 112 pruebas, 0 errores de lint.
No probado: `docker compose up` (sin Docker en el entorno) y nginx real (simulado con sus mismas cabeceras).
