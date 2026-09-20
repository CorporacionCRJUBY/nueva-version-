# Rediseño de UI — ACADEMIX 2.0

Documento de entrega del rediseño del panel principal y de los formularios de
todos los módulos. La paleta morado/lila existente se mantiene sin cambios.

---

## 1. Panel principal (Dashboard)

### Lo que faltaba
La versión anterior tenía seis contadores y dos listas, sin gráficos, sin
estados de carga reales, sin estados vacíos y con una rejilla que en móvil
quedaba a una sola columna. Además la consulta de «Asistencia de hoy» enviaba
`?date=YYYY-MM-DD`, un parámetro que el backend **no filtra** (usa
`dateFrom` / `dateTo`), así que ese bloque mostraba asistencias de cualquier
fecha.

### Lo que se añadió
| Bloque | Contenido |
| --- | --- |
| Cabecera | Bienvenida, subtítulo, hora de última actualización y botón de recarga |
| KPI | 6 métricas (estudiantes, docentes, materias, calificaciones, asistencia, reportes) con su variante «activos» |
| Gráfico de barras | Matrícula por grado, en orden académico (`1ro` → `6to`) |
| Gráfico de anillo | Distribución de asistencia por estado + tasa de asistencia |
| Analítica | Promedio por materia (top 6, ordenado) con barra de progreso |
| Tabla | Bitácora de actividad reciente (módulo, acción, registro, usuario, fecha) |
| Tabla | Asistencia del día, ya filtrada correctamente con `dateFrom` / `dateTo` |

### Estados cubiertos en cada bloque
- **Cargando**: esqueletos con la forma final (no un spinner genérico).
- **Vacío**: mensaje explícito que explica qué aparecerá y cuándo.
- **Error**: aviso recuperable, solo si fallaron **todas** las consultas.

### Responsive
Rejilla real: KPIs de 1 → 2 → 3 → 6 columnas; gráficos de 1 → 2; analítica de
1 → 2+3; tablas con desplazamiento horizontal controlado.

### Robustez
Todas las consultas se hacen con `Promise.allSettled`: un 403 por falta de
permiso o un endpoint caído solo deja en cero **ese** bloque, en lugar de
tumbar el panel completo. Los KPI se filtran por el permiso real del módulo,
y si el usuario no tiene acceso a ninguno se muestra un estado vacío
explicativo.

---

## 2. Eliminación de «Acciones rápidas»

Eliminada por completo, no solo oculta:

- `MainLayout.jsx`: el arreglo `quickActions`, el componente `QuickAction`, el
  grupo de navegación y el icono `Zap` (import ya innecesario).
- `common.json` (es/en): la clave `quickActions`.
- `StudentListPage`, `TeacherListPage` y `SubjectListPage`: el efecto que
  abría el panel lateral con `?quick=new` y la lectura de `useSearchParams`.
  El panel de alta rápida **se conserva** y sigue abriéndose con su botón
  «Nuevo»; solo se retiró el acceso desde el sidebar.
- Verificado: `grep` de `quick=new|quickActions` en `src/` devuelve **0**
  coincidencias, y una prueba automatizada comprueba que los textos «Acciones
  rápidas» / «Quick Actions» no aparecen en el panel.

---

## 3. Rediseño de formularios (31 módulos)

### El problema
Cada `*FormPage.jsx` repetía a mano el mismo andamiaje (título con degradado,
tarjetas con borde superior morado, divisores, barra de botones) y había
derivado en variantes: unos con borde superior, otros sin él, unos con
encabezado y línea inferior, otros no. No existía un diseño coherente.

### La solución
Una librería compartida, `src/components/FormKit.jsx`, y un codemod que migró
los 31 formularios a ella:

| Componente | Sustituye a |
| --- | --- |
| `PageHeader` | `Box` + `Typography h4.gradient-text` + botón de eliminar |
| `FormSection` | `Paper` con `borderTop: 4px solid` + `Typography h6` + `Divider` |
| `FormGrid` / `FormCol` | `Grid container` / `Grid size={{…}}` |
| `FormActions` | `Box` con `mt: 3, display: flex, gap: 2` |
| `ErrorBanner` | `Alert severity="error"` |
| `FormLoading` | `CircularProgress` centrado |
| `SectionHeading` | Subtítulo `h6` + `sectionTitleSx` + `Divider` |

### Piezas de la migración
- `PageHeader` 31 · `FormSection` 40 · `FormActions` 27 · `ErrorBanner` 30 ·
  `FormLoading` 30 · `FormGrid` 44 · `FormCol` 237.
- 31 de 31 formularios usan ya la capa compartida.
- 0 residuos del encabezado heredado (`gradient-text`) y 0 referencias
  colgantes a `sectionTitleSx`.

### Garantías
El codemod **solo** cambia la capa de presentación. Comprobado con conteos
antes/después:

| Comprobación | Antes | Después |
| --- | --- | --- |
| Campos `name="…"` | 198 | 198 |
| Llamadas a la API | 30 | 30 |

El script queda en `frontend/scripts/redesign-forms.mjs` y es reejecutable
(`--check` solo informa). Se usó un script —y no 31 ediciones manuales— porque
los archivos suman ~7.800 líneas con los mismos patrones repetidos: editarlos
a mano garantizaba nuevas divergencias entre módulos.

---

## 4. Estilo de los campos (tema MUI)

El tema ya estilizaba botones, tablas y tarjetas, pero los campos de
formulario seguían con la apariencia por defecto de MUI. Se añadieron al tema
(`src/App.jsx`) los overrides de `MuiOutlinedInput`, `MuiInputLabel`,
`MuiSelect`, `MuiFormHelperText`, `MuiAutocomplete`, `MuiCheckbox`,
`MuiRadio`, `MuiSwitch`, `MuiDialog*`, `MuiAlert` y `MuiTooltip`.

Resultado: los **cientos de campos de los 31 formularios** heredan el mismo
diseño sin tocar cada archivo — borde lavanda hairline, foco morado con halo
suave, etiqueta semibold, textos de ayuda atenuados y errores en rojo
coherente.

---

## 5. Verificación

| Prueba | Resultado |
| --- | --- |
| `vite build` | ✅ 2771 módulos, sin errores |
| Suite de pruebas | ✅ 10/10 en 3 archivos |
| Campos y llamadas API | ✅ 198 y 30, idénticos al original |
| Residuos de acciones rápidas | ✅ 0 |
| Residuos de encabezado heredado | ✅ 0 |

Se añadió `src/test/Redesign.test.jsx`, que renderiza el dashboard y un
formulario migrado y comprueba: los cuatro bloques del panel, la ausencia de
«acciones rápidas», el gráfico de matrícula, las tablas con datos y que el
formulario de estudiante usa la capa compartida sin el encabezado antiguo.

### Cómo ejecutar
```bash
cd frontend
npm install
npm run test      # 10 pruebas
npm run build     # build de producción
npm run dev       # servidor de desarrollo
```

El backend (Node.js + Express) y la base de datos MySQL nativo **no se
modificaron**: el rediseño es exclusivamente de la capa de presentación del
frontend, así que no hay cambios de contrato de API ni de esquema.
