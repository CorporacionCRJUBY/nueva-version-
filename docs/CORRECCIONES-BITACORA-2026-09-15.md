# Correcciones a partir de la bitácora de pruebas del 15/09/2026

Cada hallazgo está enlazado con la línea del log que lo delató.

---

## 1. El usuario nunca veía el motivo real de un error

**Síntoma:** en las capturas, "Request failed with status code 400" y
"Request failed with status code 409" en vez del mensaje del backend.

**Causa:** el backend responde siempre con el sobre
`{ success:false, error:{ message, status, code, details } }`
(`middleware/errorHandler.middleware.js` y `middleware/validate.middleware.js`),
pero el interceptor de `frontend/src/api/axiosClient.js` leía `data.message` y
`data.code`, que no existen en ese sobre. Al no encontrarlos caía al
`error.message` genérico de axios. Afectaba a **todos** los formularios.

**Corrección:** el interceptor lee `data.error.*` y, cuando el 400 trae
`details` de express-validator, arma un mensaje por campo
(`weight: Weight must be between 0 and 1`).

`frontend/src/api/axiosClient.js`

---

## 2. Todas las subidas de archivo fallaban

**Síntoma:**
```
POST /api/documents/upload 400 - 63     (x16)
POST /api/students/1/photo  400 - 64
```
con el mensaje "No file uploaded" aunque la captura muestra el `.docx` ya
seleccionado.

**Causa:** la instancia de axios fija `Content-Type: application/json` por
defecto. Axios ≥ 1.x, al ver ese header, convierte el `FormData` a JSON: el
archivo se pierde y al backend le llega un JSON sin multipart, así que multer
no encuentra nada.

**Corrección:** `api.upload()` manda `Content-Type: undefined` para que axios
calcule el header con su propio boundary.

Adicional en `middleware/upload.middleware.js`: el `fileFilter` rechazaba los
tipos no permitidos con `cb(null, false, error)`. Multer ignora el tercer
argumento, de modo que el archivo se descartaba en silencio y el usuario veía
también "No file uploaded". Ahora se rechaza con `cb(error)` y un mensaje que
dice qué tipo se recibió.

`frontend/src/api/axiosClient.js`, `backend/src/middleware/upload.middleware.js`

---

## 3. Los 400 "Validation failed" en cadena

**Síntoma:**
```
POST /api/grades            400 - 185   (x14)
POST /api/students          400 - 312   (x7)
POST /api/medical-records   400 - 202
PUT  /api/graduation/1      400 - 202
PUT  /api/attendance/232    400 - 288, 176
PUT  /api/academic-periods/1 400 - 195  (x2)
```

**Causa:** en React un campo de texto vacío vale `""` (nunca `undefined`) y un
registro cargado de la BD trae `null` en las columnas sin valor. El
`optional()` de express-validator solo salta `undefined`, así que `""` y `null`
entraban a `isISO8601()`, `isInt()`, `isFloat()` o `isObject()` y reventaban.

El tamaño exacto de cada respuesta del log confirma el campo culpable:

| Endpoint | Bytes | Campo |
|---|---|---|
| `PUT /api/academic-periods/1` | 195 | `grading_config: null` |
| `POST /api/medical-records` | 202 | `last_checkup_date: ""` |
| `POST /api/grades` | 185 | `weight: null` |

**Corrección (dos capas):**

1. `backend/src/middleware/sanitizeBody.middleware.js` (nuevo): normaliza el
   contrato de entrada en un solo punto — `""` (y las cadenas de solo espacios)
   pasan a `null`, recorriendo también objetos y arrays anidados (necesario para
   `POST /api/attendance/daily`, que manda `records: [...]`). **No** toca `0`,
   `false` ni las colecciones vacías, que son valores legítimos. Se registra en
   `app.js` justo después de los body parsers, y dentro de
   `upload.middleware.js` para los campos de texto del multipart, que los parsea
   multer y no express.
2. Los 463 `optional()` de `backend/src/validators/*.js` pasan a
   `optional({ values: 'null' })`, de modo que un opcional vacío se salta la
   validación y llega a la BD como NULL. Los cuatro `optional({ checkFalsy: true,
   nullable: true })` heredados de express-validator 6 se normalizan a
   `optional({ values: 'falsy' })`.

Cubierto por `backend/tests/unit/sanitizeBody.test.js` (6 casos).

---

## 4. `[audit.service] Failed to write audit log:`

**Síntoma:** ese error en cada `PUT /api/settings` (16:20:02, 18:01:07,
18:01:13), sin ninguna pista de la causa después de los dos puntos.

**Causa doble:**
- `settings.service.js` pasaba a la auditoría las **filas** que devuelve
  `repository.get()`, es decir un array. `before`/`after` son columnas JSON:
  knex serializa un objeto a JSON, pero expande un array como lista de valores
  SQL, así que el INSERT quedaba inválido.
- `logger.error('...:', error.message)` — el segundo argumento se descartaba en
  el formato del logger, por eso el mensaje salía vacío.

**Corrección:** `audit.service.js` serializa `before`/`after` él mismo (y trunca
`ip`/`user_agent` a lo que aguantan las columnas, 45 y 255), y loguea la causa
interpolada. `settings.service.js` audita un mapa clave → valor, que además es
lo legible en la consola de auditoría, y guarda cadena vacía en vez del literal
`"null"` cuando un ajuste se deja en blanco.

---

## 5. Ruido de 403 con roles limitados

**Síntoma:** tras el segundo login,
```
GET /api/activity   403   GET /api/reports  403
GET /api/teachers   403   GET /api/branches 403
```
repetidos en cada render del panel.

**Causa:** el Dashboard consultaba los ocho módulos sin mirar los permisos. El
`Promise.allSettled` evitaba que la página se rompiera, pero el interceptor
disparaba un snackbar rojo por cada 403.

**Corrección:** el Dashboard solo lanza la petición si `canView(módulo)` es
cierto; el resto se resuelve como "sin datos" y sus tarjetas no se pintan.
Además el interceptor ya no muestra snackbar para un 403 en un GET: eso es
"este rol no ve este módulo", no un fallo.

`frontend/src/pages/Dashboard.jsx`, `frontend/src/api/axiosClient.js`

---

## 6. El 409 de calificaciones ahora se explica

**Síntoma:** `409 - Ya existe un registro con el valor «2-1-1-1-RC-1»
(grade_records.grade_records_unique_entry)`.

El 409 es correcto (la restricción única impide dos notas del mismo estudiante
en la misma materia, asignación y periodo), pero ese texto no le dice nada a
quien está capturando. Se añadió un diccionario de mensajes para las
restricciones únicas que se ven a diario:

> Ya existe una calificación para ese estudiante en esa materia, asignación y
> periodo. Edita la existente en vez de crear otra.

También se limpió el envío del formulario de calificaciones: mandaba el
registro entero del estado, con los ids como texto y el peso en `null` al
vaciar el campo. Ahora manda solo los campos del endpoint, con los números
convertidos y el peso por defecto en 1.

`backend/src/middleware/errorHandler.middleware.js`,
`frontend/src/features/grades/pages/GradeFormPage.jsx`

---

## 7. Cada lectura salía duplicada

**Síntoma:** en todo el log, cada GET aparece dos veces seguidas — un 200 y su
304 gemelo (`/api/students`, `/api/branches`, `/api/academic-years`... cientos
de pares). También duplica el trabajo del servidor en producción cuando dos
pantallas piden el mismo catálogo a la vez.

**Causa:** el doble montaje de efectos de `React.StrictMode` en desarrollo, más
varias pantallas que cargan los mismos catálogos simultáneamente.

**Corrección:** `api.get()` comparte la promesa de los GET idénticos que siguen
en vuelo — la segunda llamada se cuelga de la primera en vez de abrir otra
petición. **No es una caché**: la entrada se borra en cuanto la petición
termina, así que dos lecturas separadas en el tiempo siguen yendo al servidor.
Solo afecta a GET, y una petición con `signal`/`cancelToken` propio queda fuera
del mecanismo (cancelarla afectaría al otro consumidor).

`frontend/src/api/axiosClient.js`

---

## 8. `pageSize` sin límite en todas las lecturas

**Síntoma:** `GET /api/students?pageSize=1000 200` y una veintena de llamadas
parecidas.

**Causa:** los validadores `findAll` limitan `pageSize` a 100, pero **ninguna
ruta GET pasa por `validate`** — ese límite es código muerto. Y
`middleware/pagination.middleware.js` era un no-op declarado ("stub ... so the
app starts") que además nadie montaba. Resultado: `?pageSize=999999` volcaba la
tabla entera, y un `page=-5` producía un OFFSET negativo.

**Corrección:** `clampPagination` implementado y montado en `app.js`. Acota en
vez de rechazar (un 400 rompería los selectores, que piden 1000 a propósito):
recorta `pageSize`/`limit` a 1000, fuerza `page >= 1` y normaliza los tres a
número para que los servicios no arrastren cadenas al calcular el OFFSET. En
Express 5 `req.query` es un getter, así que se redefine la propiedad en vez de
asignarla.

Cubierto por `backend/tests/unit/pagination.middleware.test.js` (7 casos).

---

## 9. Limpieza asociada

- **Formulario de periodos académicos**: reenviaba el registro entero de la BD
  —con `grading_config: null` incluido, el causante del 400 de 195 bytes—. Ahora
  manda solo los campos editables, con el año como número.
- **Lecturas muertas del error**: `AcademicHistoryFormPage` y
  `CalendarFormPage` leían `error.response?.data?.message`, que no existe (el
  interceptor rechaza con un objeto ya formateado, no con el error de axios).
  Funcionaban de casualidad por el fallback; ahora usan `error.message`
  directamente.

---

## 10. Los picos de 926 ms en `/activity` y `/grades`

**Síntoma:** en una tanda concreta del sondeo del panel, dos lecturas
cualesquiera saltan de 10–20 ms a ~926 ms mientras el resto de la misma tanda
sigue rápida.

**Investigación:** Node es de un solo hilo, así que un pico así casi siempre
es el event loop bloqueado por una operación síncrona en OTRA petición que
coincidió en el tiempo — no un problema de las rutas que aparecen lentas.
Encontré dos candidatos reales en el código, ambos corregidos:

- `services/pdf.service.js` guardaba cada boletín/transcripción con
  `fs.mkdirSync` + `fs.writeFileSync` (síncronos). Mientras esa escritura
  corre, ninguna otra petición en curso avanza. Pasado a `fs/promises`.
- `services/system.service.js` (`GET /api/system/logs`) leía el `app.log`
  completo con `fs.readFileSync` y luego lo partía entero con `split('\n')`.
  Con un log de varios MB —normal tras días de uso— esto bloquea el event
  loop más tiempo que la escritura de un PDF. Pasado a async y, si el archivo
  supera 512 KB, ya no lee el archivo completo: abre el descriptor y lee solo
  la cola en bytes antes de partirla en líneas.

**Honestidad sobre el alcance:** no hay en el log una petición de PDF o de
`/system/logs` exactamente junto a los dos picos de 926 ms, así que no puedo
confirmar con certeza que esta fue la causa de *ese* incidente puntual — pero
sí es la clase de bug que produce exactamente ese síntoma, y ya no está en el
código. Si el pico reaparece con reportes largos, el propio layout de
`pdfmake` (diseño y paginación del PDF) sigue siendo síncrono y puede bloquear
unos milisegundos por sí solo; la solución de fondo en ese caso sería mover la
generación a un `worker_thread` o a una cola de trabajos, no un ajuste puntual
de E/S.

`backend/src/services/pdf.service.js`, `backend/src/services/system.service.js`,
`backend/src/controllers/system.controller.js`

---

## 11. La validación de query nunca se ejecutaba

**Síntoma:** ninguno directamente en el log, pero se documentó como pendiente:
los 25 bloques `findAll` de los validadores no estaban conectados a ninguna
ruta GET.

**Decisión tomada:** conectarlos, no borrarlos — son la única protección
contra un `pageSize` desmedido si en el futuro se quita `clampPagination`, y
documentan qué filtros acepta cada listado.

**Ajuste necesario para no romper nada:** los 25 validadores limitaban
`pageSize` a 100, pero el propio frontend pide **1000** a propósito en todos
los selectores de los formularios (estudiantes, materias, asignaciones,
periodos, años académicos, roles, permisos...). Conectarlos tal cual habría
roto esos 45 selectores. Se subió el límite a 1000 en los 25 validadores para
que coincida con el techo de `clampPagination`, y se conectaron con
`validators.findAll, validate` antes de `controller.findAll` en las 25 rutas
correspondientes.

Se revisó que ningún listado del frontend manda un filtro vacío en la URL: las
26 pantallas de lista usan el patrón `campo: valor || undefined`, que hace que
axios omita el parámetro en vez de mandarlo como cadena vacía — así que
conectar la validación no introduce 400 nuevos en las pantallas existentes.

Cubierto por `backend/tests/unit/findAllValidators.test.js` (4 casos: acepta
`pageSize=1000`, rechaza por encima de eso, acepta una consulta paginada
normal, y no exige los filtros que el frontend omite).

`backend/src/validators/*.js` (25 archivos), `backend/src/routes/*.js` (25 archivos)

---

## 12. `pageSize=1000` en los selectores de los formularios

**Síntoma:** `GET /api/students?pageSize=1000`, `GET /api/subjects?pageSize=1000`,
etc. — el catálogo completo cargado en el navegador cada vez que se abre un
formulario, solo para llenar un `<select>`.

**Corrección:** `frontend/src/components/AsyncSelect.jsx` (nuevo). Selector
sobre `Autocomplete` de MUI que busca contra el servidor con debounce
(300 ms) y pide como máximo 20 filas por vez. El valor ya guardado se resuelve
aparte con `api.getById(id)`, para que al editar un registro se vea el nombre
aunque esa fila no esté entre las primeras 20 de una búsqueda vacía. Una
respuesta lenta y vieja nunca pisa a una más nueva: cada búsqueda lleva un id
incremental y solo se aplica la última.

Se aplicó al campo **estudiante** en los 15 formularios que lo cargaban
completo (calificaciones, asistencia, tutores, documentos, expedientes
médicos, escuela anterior, boletines, transcripciones, graduación, GPA,
créditos, historial académico, becas, GRANSIF, reportes de progreso), y a
**docente/materia** en el formulario de asignaciones.

**Decisión deliberada de NO tocar:** sedes, años académicos, periodos
académicos, roles y permisos siguen como `<Select>` con el catálogo completo.
Son listas estructuralmente chicas — una sede es un dato que se da de alta un
puñado de veces al año, un año académico es uno por ciclo — que no crecen con
el número de estudiantes o docentes. Convertirlas a búsqueda asíncrona habría
sido complejidad sin beneficio; queda comentado en cada archivo por qué se
dejaron así, para que quien lo revise después no lo confunda con un olvido.

Verificado con `vite build` (compila sin errores) y una revisión manual de
que no quedaran imports (`Select`/`MenuItem`/`FormControl`) ni variables de
estado sin usar en los archivos donde el estudiante era el único selector.

`frontend/src/components/AsyncSelect.jsx` (nuevo), y 16 formularios en
`frontend/src/features/*/pages/*FormPage.jsx`.

---

## 13. `pdfmake` síncrono — evaluado, sin cambios

Se reconsideró mover la generación de PDF a un `worker_thread` (quedó
pendiente del punto 10). La escritura a disco ya no bloquea el event loop
(corregida antes); lo que sigue siendo síncrono es el propio diseño y
paginación del documento dentro de `pdfmake`.

**Decisión:** no moverlo. Un colegio genera boletines y transcripciones uno a
la vez, no en ráfagas masivas concurrentes, así que el bloqueo — si ocurre —
es del orden de milisegundos, no de segundos. El costo de un worker_thread
(serializar los datos del reporte para cruzar el límite del hilo, manejar
errores que ahora ocurren en otro proceso, la complejidad adicional en cada
llamada a `generateReportCard`/`generateTranscript`) no se justifica sin
evidencia de que esto cause un problema real en producción. Queda anotado
como riesgo aceptado, no como pendiente.

---

## Pendiente de revisar (no corregido)

Con los puntos 12 y 13 resueltos (uno corregido, el otro evaluado y
descartado con justificación), no queda ningún pendiente abierto de esta
bitácora. Si en producción aparece evidencia de que el layout de `pdfmake`
sí bloquea de forma perceptible con reportes largos, ese sería el disparador
para reabrir el punto 13 y mover la generación a un `worker_thread`.

