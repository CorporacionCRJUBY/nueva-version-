# ACADEMIX 2.0 — Reporte de QA y correcciones (Nivel producción)

**Proyecto:** ACADEMIX 2.0 · New Direction Academy
**Fecha:** 11 de septiembre de 2026
**Alcance:** corrección integral del backend, rediseño de la interfaz para
funcionarios, y prueba completa del sistema (API, base de datos, permisos,
reportes, Docker).

> **Principio de este informe:** «compilar no es funcionar, y arrancar no es
> verificar». Cada afirmación de esta página proviene de una ejecución real
> contra una base de datos MySQL/MariaDB real, con el backend en marcha. No se
> incluye ningún resultado estimado.

---

## 1. Resumen ejecutivo

| Área | Resultado |
|---|---|
| Barrido de API (todos los módulos) | **107 PASS · 0 FAIL** |
| Errores de backend encontrados y corregidos | **5** (2 críticos) |
| Migraciones / semillas | 60 / 14 · **51 tablas** · ejecución limpia |
| Build de producción (frontend) | **correcto** (2 766 módulos) |
| Tests automatizados | **6/6 frontend** · **25 backend** (2 omitidos por depender de BD local) |
| Rediseño de flujos para funcionarios | panel de alta rápida + acciones rápidas + animaciones |

**Conclusión:** el backend funciona de extremo a extremo en todos los módulos
probados, la base de datos se levanta desde cero sin errores y la interfaz
reduce de 3 navegaciones a 0 el alta de un registro.

---

## 2. Errores encontrados y corregidos

Estos fallos **no se ven al compilar**: aparecen solo al ejecutar el sistema
con datos reales. Todos fueron reproducidos, corregidos y vueltos a probar.

### 🔴 Crítico 1 — Crear registros fallaba SIEMPRE con error 500
**Síntoma.** Al dar de alta un usuario, estudiante, docente, materia o sede, la
interfaz mostraba «Internal server error» y el registro no se guardaba. Es
decir: **el sistema no permitía crear nada**, que es la operación más básica de
una secretaría académica.

**Causa raíz.** El generador de códigos (`codeGenerator.js`) consultaba la
tabla `code_sequences` y devolvía el número siguiente **sin comprobar la tabla
destino**. Los datos iniciales (seeds) habían insertado códigos con el mismo
formato (`USR-2026-000001`, `STU-2026-000001`, …) sin registrar su secuencia.
Resultado: la primera llamada generaba un código ya ocupado y MySQL la
rechazaba:

```
Duplicate entry 'USR-2026-000001' for key 'uniq_users_code'
```

**Corrección.** El generador ahora reserva el número de forma **atómica**
(`SELECT … FOR UPDATE` + `INSERT … ON DUPLICATE KEY UPDATE`), lo que además
elimina una condición de carrera entre dos altas simultáneas, y **verifica
contra la tabla real** avanzando hasta encontrar un código libre (la
comprobación incluye filas con borrado lógico, porque el índice único tampoco
las excluye). Cubre 26 prefijos de módulos.

**Verificado.** Alta real de usuario, estudiante, docente, materia, sede, año
académico y evento de calendario → **201 con código válido**. El barrido
confirma 0 fallos en las 12 operaciones de escritura.

### 🔴 Crítico 2 — Los errores de base de datos se mostraban como 500
**Síntoma.** Un correo duplicado, una sede inexistente o un texto demasiado
largo devolvían «Internal server error» genérico, sin pista alguna para el
funcionario ni para soporte.

**Corrección.** El manejador central de errores ahora traduce los errores del
motor a un estado HTTP con sentido y un mensaje en el idioma de la interfaz:

| Error del motor | Antes | Ahora |
|---|---|---|
| Clave duplicada | 500 | **409** · «Ya existe un registro con el valor "correo@x.com"» |
| Clave foránea inválida | 500 | **400** · «El registro referencia un dato que no existe» |
| Borrado con datos relacionados | 500 | **409** · «No se puede eliminar: tiene datos relacionados» |
| Dato demasiado largo / formato inválido | 500 | **400** con detalle |
| Base de datos no disponible | 500 | **503** |

**Verificado.** Email duplicado → **409**; sede inexistente → **400**; payload
inválido → **400**. Cero respuestas 500 en los escenarios de error del barrido.

### 🟠 Alto 3 — Los PDF de informe no se podían abrir tras mover el servidor
**Síntoma.** Al previsualizar un boletín o un expediente ya generado, el
sistema respondía 400 «Invalid file path».

**Causa raíz.** La ruta del PDF se guarda en la base de datos. Si el proyecto
cambia de carpeta o se restaura un respaldo, esa ruta apunta a una ubicación
que ya no cuelga del directorio de subidas actual. El código comprobaba
«¿existe el archivo?» y, si existía pero fuera de la raíz, llegaba hasta la
validación de seguridad y fallaba.

**Corrección.** Se comprueba si la ruta está **contenida** en la raíz de
subidas; si no lo está, el documento **se regenera** automáticamente en lugar
de devolver un error. La validación de seguridad se mantiene intacta: el
archivo solo se sirve si está dentro de `uploads/`.

**Verificado.** `GET /api/transcripts/:id/preview` → **200 con PDF** en lugar
de 400.

### 🟡 Medio 4 — Dos procesos del servidor provocaban resultados engañosos
**Síntoma.** Las pruebas daban resultados contradictorios: unas veces el alta
funcionaba y otras no, en la misma sesión.

**Causa raíz.** Quedó un proceso antiguo del backend escuchando en el mismo
puerto junto al nuevo; las peticiones se repartían entre el código corregido y
el defectuoso. **No era un error del producto**, sino del entorno de prueba.

**Corrección.** Se terminó el proceso obsoleto y se relanzó el servicio con el
código actual; el barrido completo se repitió contra un único proceso.

### 🟡 Medio 5 — El test de i18n atrapó una clave de traducción mal ubicada
**Síntoma.** Al añadir los textos de «Alta rápida» quedaron en el nivel
superior del archivo en vez de dentro del módulo `common`, y la aplicación
mostraría la clave cruda en pantalla.

**Corrección.** Reubicadas dentro de `common` en `en` y `es`.
**Verificado.** La suite marca **6/6** y el test que recorre las claves de
traducción pasa. *(Es justamente el tipo de error que el rediseño introduce y
que un test automatizado debe atrapar: lo atrapó.)*

---

## 3. Rediseño de la interfaz — pensado para el funcionario

El problema real no era estético. Un funcionario de secretaría debía, para dar
de alta **un solo** estudiante:

```
Lista → clic «Nuevo» → página de formulario aparte → guardar → volver a la lista
        (y al volver perdía búsqueda, filtros y paginación)
```

Tres navegaciones y pérdida de contexto **por cada registro**. El primer día de
clases, con decenas de altas, eso es lento y propenso a errores.

### Lo implementado

**1. Panel de alta rápida (`QuickCreateDrawer.jsx` — nuevo componente).**
Un panel lateral que se abre **sobre la misma lista**, con el formulario mínimo
necesario. Al guardar, la lista se refresca en sitio y el funcionario sigue
donde estaba, con sus filtros intactos.

```
Antes:  3 navegaciones · contexto perdido
Ahora:  0 navegaciones · contexto conservado
```

Incluye lo que hace falta para trabajar rápido sin romper nada:
- Validación en cliente (obligatorios, correo, fecha, longitud) **antes** de
  tocar la red, con el error bajo el campo correspondiente.
- Bloqueo del botón y spinner durante el guardado → **imposible crear duplicados
  por doble clic**.
- Los errores del servidor se muestran legibles (por ejemplo el 409 con el
  valor duplicado) y los errores por campo se pintan junto al campo.
- El payload se construye **solo** con los campos declarados: no se puede
  enviar un campo de más (mass assignment).
- Escape para cerrar, foco automático en el primer campo, confirmación visual
  al guardar.

**2. Acciones rápidas en la barra lateral.** Una sección «Quick Actions» con
«Nuevo estudiante», «Nuevo docente», «Nueva materia». Cada botón abre
directamente el formulario rápido de ese módulo (vía `?quick=new`), sin pasar
por la lista. Cada acción **solo aparece si el usuario tiene el permiso de
creación** correspondiente: el rediseño no relaja la seguridad.

**3. Módulos con el patrón aplicado:** estudiantes, docentes y materias — los
tres de mayor volumen de altas. **El patrón es reutilizable**: el mismo
componente se puede conectar a cualquier otro módulo declarando sus campos, sin
tocar la lógica.

**4. Detalles de acabado.** Animación de entrada del panel, y el botón «Alta
rápida» convive con el formulario completo para quien necesite capturar todos
los datos. Paleta morado/lila **sin cambios** (identidad de ACADEMIX).

---

## 4. Resultados de las pruebas

### 4.1 API — barrido completo (107 comprobaciones · 0 fallos)
Arnés: `qa/api-sweep.mjs` · salida completa en `qa/api-sweep-results.txt`.

| Bloque | Qué se probó | Resultado |
|---|---|---|
| Salud | `/`, `/health/live`, `/health/ready` (conexión real a BD) | ✅ |
| Autenticación | login correcto/incorrecto, sesión, logout, `/me` | ✅ |
| RBAC | docente contra rutas de admin → **403** (no 500) | ✅ |
| Listados | 34 colecciones de todos los módulos | ✅ |
| Detalle por ID | recurso existente y **404 limpio** en inexistente | ✅ |
| CRUD real | crear → leer → actualizar → borrar (sedes, materias, estudiantes, docentes, usuarios, años, calendario) | ✅ |
| Validación | payloads inválidos → 400/422, **nunca 500** | ✅ |
| Errores de BD | duplicados → 409, FK inexistente → 400 | ✅ |
| Especializados | GPA, créditos, graduación, expediente, acudientes, historial, asignaciones | ✅ |
| Documentos | previsualización de **boletín y expediente en PDF** | ✅ |
| Seguridad | cabeceras anti-clickjacking, sin `X-Powered-By` | ✅ |
| Inyección | payload SQL y XSS devuelven 200 sin romper | ✅ |
| Paginación | página, orden, búsqueda, valores inválidos | ✅ |
| i18n | `en-US` y `es-ES` | ✅ |

### 4.2 Base de datos
- **60 migraciones** aplicadas desde cero, **14 semillas**, **51 tablas**.
- Motor InnoDB, charset `utf8mb4` (soporta acentos y emojis).
- El generador de códigos actualizado es compatible con los datos ya
  sembrados: no requiere migración correctiva.

### 4.3 Frontend
- **Build de producción: correcto** (2 766 módulos, sin errores).
- **Tests: 6/6** (incluye la comprobación de que ninguna clave de traducción
  quede sin resolver y que el login no muestre textos crudos).

### 4.4 Permisos
- Docente autenticado contra `/api/users`, `/api/roles` y borrado de
  estudiantes → **403** correcto.
- Las acciones rápidas nuevas respetan los permisos de creación.

### 4.5 Docker
Archivos verificados: `docker-compose.yml` (3 servicios), `backend/Dockerfile`
(multi-stage, usuario no-root), `frontend/Dockerfile` (build + nginx),
`frontend/nginx.conf` (fallback SPA, proxy `/api`, cabeceras de seguridad),
`database/init/01-init.sql`, y las plantillas `.env.example`.
`docker-compose config` valida sin errores.

---

## 5. Estado del entorno de pruebas (transparencia)

La verificación funcional se hizo de forma equivalente y más exigente que
«levantar contenedores»: base de datos **MariaDB real**, 60 migraciones + 14
semillas aplicadas, backend en ejecución y las **107 comprobaciones de API**
contra ese backend real, más el build de producción y los tests del frontend.
Es decir, la lógica del sistema está probada de extremo a extremo.

Lo que queda por confirmar en un servidor con Docker es únicamente la capa de
orquestación de contenedores (construcción de imágenes y arranque de los tres
servicios), cuyos archivos están validados sintácticamente.

**Comando de despliegue real (servidor con Docker):**

```bash
cp backend/.env.example backend/.env        # y rellenar los secretos
export MYSQL_ROOT_PASSWORD='<fuerte>'
export DB_PASSWORD='<password de ADMIN>'
docker compose up --build -d                # interfaz en http://localhost:8080
```

---

## 6. Antes de poner en producción

1. **Secretos**: generar `JWT_SECRET`, `JWT_REFRESH_SECRET` y `ENCRYPTION_KEY`
   con `openssl rand -hex 32`. En producción el arranque **aborta** si siguen
   con los valores de ejemplo (es deliberado).
2. **Cuentas demo**: mantener `SEED_ALLOW_IN_PRODUCTION=false` y eliminar las
   cuentas de demostración antes de abrir el sistema al personal.
3. **HTTPS**: servir por HTTPS y poner `COOKIE_SECURE=true`.
4. **CORS**: `CORS_ORIGIN` con el dominio real, nunca `*`.
5. **Copias de seguridad** del volumen de la base de datos, programadas.

---

## 7. Archivos relevantes

| Archivo | Contenido |
|---|---|
| `qa/api-sweep.mjs` | Arnés del barrido de API (repetible) |
| `qa/api-sweep-results.txt` | Salida completa: 107 comprobaciones |
| `frontend/src/components/QuickCreateDrawer.jsx` | Panel de alta rápida (nuevo) |
| `backend/src/utils/codeGenerator.js` | Generador de códigos corregido |
| `backend/src/middleware/errorHandler.middleware.js` | Traducción de errores de BD |
| `backend/src/utils/safePath.js` | Comprobación `isPathWithinRoot` |
| `docs/DOCUMENTATION.md` | Documentación técnica del sistema |
