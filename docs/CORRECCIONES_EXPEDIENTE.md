# Correcciones y rediseño — 19 de septiembre de 2026

Este documento recoge **qué se corrigió**, **qué se rediseñó** y **qué se verificó**
en esta iteración sobre ACADEMIX 2.0. El objetivo eran dos cosas: arreglar todo lo
que aparecía marcado en rojo en la captura del cliente, y rehacer el expediente del
estudiante para que se viera como un expediente escolar real.

---

## 1. Lo marcado en rojo en la captura

La captura señalaba tres zonas: el encabezado superior, la cabecera del contenido y
el menú lateral (con varios círculos sobre él). Reproduje la aplicación en vivo
—backend Express contra MySQL nativo con datos reales, más el frontend en
desarrollo— y capturé esas mismas zonas para ver qué estaba mal de verdad.

| # | Punto marcado | Causa real | Corrección |
|---|---|---|---|
| 1 | Nombre de la marca cortado en el encabezado | El bloque de título robaba ancho al logotipo y «NEW DIRECTION ACADEMY» se comprimía | `shrink-0` en el logotipo y `flex-1` en el bloque de título: la marca nunca se comprime |
| 2 | Título de sección incorrecto en la barra superior | Se elegía la primera coincidencia por prefijo, así que `/assignments` ganaba a `/assignments/my-groups` | Se elige ahora la **coincidencia más larga**; la topbar rotula la pantalla correcta |
| 3 | Menú lateral: secciones que «no tenían nada» | Los grupos plegados no anunciaban su contenido, así que parecían bloques vacíos | La cabecera plegada muestra el número de destinos (`Teachers · 4`); al abrirse, los elementos quedan a la vista |
| 4 | Menú lateral cortado en pantallas pequeñas | No existía botón de cierre en el panel superpuesto | Botón ✕ en la cabecera, visible **solo** en móvil; escritorio conserva su comportamiento |
| 5 | Contraste apagado en los subelementos del menú | El token `sidebar.item` era demasiado oscuro sobre el violeta profundo | Token subido a `#bcb0e0` y etiquetas de grupo a `white/80` |

**Sobre el punto 5, con datos y no con impresiones.** Medí el contraste real en el
navegador con los colores computados: los subelementos del menú dan **7.94:1**
(`rgb(188,176,224)` sobre `rgb(30,27,75)`). El mínimo AA de WCAG es 4.5:1, así que
están holgadamente por encima. Lo mismo con las etiquetas de grupo, ya en
`rgba(255,255,255,0.8)`. El contador `Teachers · 4` se verificó funcionando en vivo.

---

## 2. Expediente del estudiante — rediseñado

El expediente ya tenía diez pestañas, pero la vista general no se leía como un
expediente de centro educativo. Se reescribió la capa de presentación.

### Cabecera de identidad
Foto del estudiante (o sus iniciales si no hay imagen), **código impreso bajo la
foto**, nombre completo, distintivo de estado y la línea de ubicación académica
(grado · sección · año). En la propia cabecera se muestran cinco datos de contacto
directo —identificación, **edad calculada** desde la fecha de nacimiento, fecha de
nacimiento, correo y teléfono— y la botonera de acciones. Si el estudiante tiene
alergias, condiciones médicas o medicación, aparece un **aviso médico** en la
cabecera, visible sin tener que abrir la pestaña de salud.

### Cuatro fichas de resumen
Tasa de asistencia **con anillo de progreso** (verde ≥85 %, violeta ≥70 %, ámbar por
debajo), promedio acumulado, créditos obtenidos y número de documentos. Cuando un
dato no existe, la ficha lo dice con palabras («No grades recorded», «No documents
yet») en vez de dejar un número suelto o un guion que parece un dato roto.

### Pestañas
Se conservan las **diez** pestañas, con contador en las que tienen contenido
(`Attendance (15)`, `Guardians (2)`) para que se vea de un vistazo qué hay dentro.

### Secciones
- **Resumen** — información personal, ubicación académica y ficha del contacto de
  emergencia, marcando principal / emergencia / autorizado para recoger.
- **Académico** — notas por materia y período.
- **Asistencia** — totales por estado (P/O/E/U) con su código de color y el detalle.
- **Tutores** — una tarjeta por tutor, con parentesco y permisos.
- **Documentos** — tabla con previsualizar, descargar, editar y eliminar.
- **Médico** — salud y datos del seguro.
- **Becas**, **Historial**, **Escuelas anteriores** y **Historial de estados** (este
  último como línea de tiempo).

### Estados vacíos
Cada sección sin datos muestra un icono, un título y una frase que explica **qué
aparecerá ahí y cuándo**. Ningún panel queda en blanco.

---

## 3. Un fallo real que se encontró y se corrigió

Al montar el expediente rediseñado, la página quedaba **completamente en blanco**.
La causa: un `useMemo` declarado **después** de los `return` condicionales de
`loading` y `error`. En el primer render el componente salía antes de llegar a él y
en el siguiente React sí lo encontraba, lo que producía el error «Rendered more
hooks than during the previous render». Se movió el hook por delante de todos los
`return` condicionales. Es un fallo que habría roto el expediente en producción.

---

## 4. Claves de traducción

Faltaban **3 claves** que el código ya usaba con `defaultValue` y que nunca se
habían añadido a los ficheros de idioma: `permissions.validate`,
`permissions.manage` y `permissions.requestChange`. Por eso fallaban dos pruebas
del proyecto. Se añadieron, junto con las claves nuevas del expediente.

**Resultado:** de 3 pruebas fallando en el código de partida se pasó a **1**, y la
que queda es un fallo de aserción de una prueba de rediseño anterior, que ya fallaba
igual en el código original (verificado ejecutando la suite sobre una copia sin
tocar). No es una regresión de este trabajo.

---

## 5. Verificación ejecutada

| Prueba | Resultado |
|---|---|
| `vite build` | ✅ Compila — 2774 módulos, sin errores |
| Suite de pruebas | ✅ 14 de 15 pasan; **1 fallo preexistente** (idéntico en el código original) |
| Prueba nueva del expediente | ✅ 5 de 5 — endpoint, identidad con edad calculada, 4 fichas de resumen, 10 pestañas, contacto de emergencia |
| Backend contra MySQL nativo | ✅ `/health/ready` → `db: up`; login HTTP 200; `/students/1/record` HTTP 200 con 12 bloques, 2 tutores, tasa de asistencia 60 % sobre 15 registros |
| Equivalencia funcional | ✅ Campos de formulario **199 → 199**; llamadas a la API **240 → 240**; módulos **31 → 31** |
| Backend y base de datos | ✅ `diff` sin diferencias en `backend/src` ni en `database/` |
| Contraste medido | ✅ 7.94:1 en el menú lateral (AA exige 4.5:1) |

### Limitación honesta
El sandbox no tiene daemon de Docker, así que `docker compose up` no pudo ejecutarse
aquí. Los `Dockerfile` y `docker-compose.yml` **no se modificaron** en esta
iteración; el arranque con contenedores sigue pendiente de probarse en la máquina
del usuario.

---

## 6. Stack

Sin cambios: **backend Node.js + Express**, **frontend React + Vite + TailwindCSS**
y **MySQL nativo**. Todo el trabajo de esta iteración es de capa de presentación más
el arreglo del hook; ninguna llamada a la API ni ningún esquema se tocó.
