# Rediseño visual de ACADEMIX 2.0 — replicando el panel de referencia

> Este documento describe el rediseño que alinea el aspecto de toda la aplicación
> con el panel de referencia adjunto, **sin retirar ninguna funcionalidad** del
> programa base.

---

## 1. Qué se replicó de la referencia

El ZIP de referencia es un proyecto *Figma Make* (React + Tailwind) cuyo lenguaje
visual se extrajo y se trasladó al sistema de diseño de ACADEMIX.

| Elemento | Referencia | Aplicado en ACADEMIX |
|---|---|---|
| Violeta primario (acción, foco, enlaces) | `#7c3aed` | token `brand-600` + `--color-primary` |
| Lienzo lavanda | `#f5f3ff` (plano, sin degradados) | `canvas` + `background-color` del `body` |
| Borde hairline lavanda | `#ddd6fe` | token `line` + `--color-divider` |
| Tinta de títulos | `#1e1b4b` | token `ink` |
| Etiquetas / texto secundario | `#7c6faa` | token `ink-muted` |
| Acento lila | `#a78bfa` | token `brand-400` |
| Sidebar (gradiente vertical) | `#1e1b4b` → `#2d1b69` | `bg-sidebar-gradient` |
| Panel del login (gradiente 145°) | `#2d1b69` → `#4c1d95` → `#6d28d9` | `bg-hero-gradient` |
| Ítem de navegación activo | lavado translúcido + texto lila + punto guía | `.nav-item-active` + punto en `NavLink` |
| Radios | contenidos (≈10px, tarjetas ≈12px) | `rounded-md` en campos, `rounded-lg` en tarjetas |
| Sombras | muy suaves y bajas | `shadow-sm` = `0 1px 2px rgba(30,27,75,.05)` |
| Chips / badges | píldora completa | `.chip` → `rounded-full` |
| Tipografía | títulos **Outfit**, cuerpo **Inter**, código **JetBrains Mono** | `fontFamily` + `index.html` |
| Barra de scroll | fina (4px) con pulgar lila | `::-webkit-scrollbar` |
| Tarjeta KPI | etiqueta arriba, valor grande, icono en mosaico tenue | `DashboardWidgets → StatCard` |
| Topbar | título de sección + píldora del ciclo lectivo + campana con aviso + avatar con nombre + salir | `MainLayout` |

---

## 2. Cómo se aplicó (y por qué así)

El código base es **token-driven**: las páginas usan clases semánticas
(`bg-brand-600`, `text-ink-muted`, `border-line`, `.card`, `.field`, `.stat-card`,
`.nav-item`) y **rara vez colores literales**. Eso permitió reestilizar toda la
aplicación desde la raíz:

1. **`tailwind.config.js`** — re-tuneo de la escala `brand`/`lilac`/`violet`,
   `canvas`, `surface`, `line`, `ink`, `sidebar`, sombras y degradados.
2. **`src/index.css`** — mismos valores en las variables CSS (`--brand-*`,
   `--color-*`) que consume la API `sx` heredada, más la capa de componentes
   (`.card`, `.btn`, `.field`, `.chip`, `.nav-item`, `.modal-*`, `.stat-card`).
3. **`src/ui/tokens.js` y `src/ui/sx.js`** — espejo en JS de esos tokens
   (`palette`, `COLOR_MAP`, `resolveColor`), para que los estilos heredados
   resuelvan los colores nuevos.
4. **`scripts/migrate-design-tokens.mjs`** — codemod que sustituye los colores
   de la paleta anterior que habían quedado **escritos a mano** en 14 archivos
   (gradientes de los gráficos SVG, valores por defecto, tokens). Aplicó **242
   sustituciones**. Es auditable (`--check`) y reejecutable; hoy reporta 0.

Se hizo con un codemod, y no editando a mano, porque las sustituciones afectan a
14 archivos y son de la misma naturaleza: aplicarlas a mano invita a dejar
algunas atrás (justo lo que produce un rediseño a medias).

> **Resultado:** cambiando ~3 archivos de tokens, las ~34 páginas y los 31
> formularios heredan el nuevo lenguaje visual automáticamente.

---

## 3. Cambios concretos en el shell y los componentes

### Sidebar (`layouts/MainLayout.jsx`)
- Fondo con el gradiente de la referencia (`bg-sidebar-gradient`).
- Ítem activo: lavado violeta translúcido + texto lila claro + **punto guía** a la
  derecha (antes: bloque sólido saturado).
- Se conservó **todo**: agrupaciones, submenús acordeón, filtrado por
  permisos/roles (`isAdmin`, `system.view`), colapso y modo off-canvas en móvil.

### Topbar (`layouts/MainLayout.jsx`)
- **Título de la sección activa** + píldora del ciclo lectivo `2026–2027`,
  derivados de los mismos destinos traducidos del menú (no añade datos nuevos).
- Avatar circular con la inicial + nombre del usuario; botón **Salir** directo.
- Campana con indicador de aviso pendiente.
- Se conservó la búsqueda rápida (⌘K), el selector de idioma y el menú de usuario.

### Tarjetas KPI (`components/DashboardWidgets.jsx`)
- Distribución de la referencia: etiqueta arriba, valor grande, **icono en
  mosaico tenue** arriba a la derecha (antes: bloque saturado con degradado).
- Se conservan props, navegación por `to` y `data-testid="stat-card"`.

### Formularios (`components/FormKit.jsx`)
- Encabezado de sección sobre superficie blanca (sin degradado) y radios
  contenidos, como las tarjetas de la referencia.

---

## 4. Funciones conservadas — prueba de equivalencia

Rediseñar no debe tocar el comportamiento. Se midió **antes y después** con
búsquedas sobre el código, y los cuatro valores coinciden exactamente:

| Métrica | Antes | Después |
|---|---|---|
| `name="…"` en los formularios (campos) | 220 | **220** |
| Llamadas a la API (`api.get/post/put/patch/delete`) | 263 | **263** |
| Archivos de página en `src/features` | 67 | **67** |
| Rutas declaradas en `App.jsx` (`path=`) | 132 | **132** |

Esto prueba que **cambió la presentación, no el comportamiento**: ningún campo,
llamada a la API, módulo ni ruta se perdió.

Además:
- **Backend y esquema intactos** — ningún archivo de `backend/` ni de
  `database/` fue modificado. Node.js + Express y MySQL nativo siguen igual.
- Se conservaron los `data-testid` (`page-header`, `form-section`,
  `form-actions`, `stat-card`) que usan las pruebas.

---

## 5. Verificación ejecutada

| Comprobación | Resultado |
|---|---|
| `vite build` | ✅ 0 errores (2771 módulos, 7 chunks) |
| Equivalencia de campos / API / módulos / rutas | ✅ 220 / 263 / 67 / 132 — idénticos |
| Colores de la paleta anterior restantes | ✅ 0 (el codemod los migró todos) |
| Backend contra MySQL nativo | ✅ conexión establecida, 50 tablas |
| Render del panel con sesión real | ✅ revisado por captura (login, dashboard, formulario, listado) |

### Defectos detectados y corregidos durante la revisión visual
1. **Etiquetas KPI truncadas** («STUD…», «ATTENDANC…») al ponerlas en mayúsculas
   con `tracking-wider` + `truncate`. → `tracking-normal` + `break-words`.
2. **Contraste bajo** en el texto del menú lateral sobre el morado profundo. →
   `sidebar.item` aclarado de `#9d8dc4` a `#a99bd0`.

### Fallos preexistentes (NO introducidos por este rediseño)
- `src/test/i18n.test.js` reporta 2 fallos: faltan las claves
  `permissions.validate`, `permissions.manage` y `permissions.requestChange` en
  los archivos de i18n. **Se verificó que ya fallaba igual en el programa base
  original**: esas claves están en el código con `defaultValue` pero nunca se
  añadieron al i18n. No se tocaron porque quedan fuera del alcance del rediseño.

---

## 6. Limitaciones de la verificación (honestidad)

- El sandbox **no tiene daemon de Docker**, así que `docker compose up` no pudo
  ejecutarse aquí. Los `Dockerfile` y `docker-compose.yml` **no se modificaron**.
- El render se validó **con capturas** sobre el build de producción servido en
  local contra MariaDB con datos reales sembrados; no se recorrieron a mano las
  34 pantallas.
