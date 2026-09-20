#!/usr/bin/env node
/**
 * scripts/redesign-forms.mjs
 *
 * Codemod de rediseño de formularios de ACADEMIX 2.0.
 *
 * QUÉ HACE
 *   Reescribe los 31 `src/features/<modulo>/pages/*FormPage.jsx` para que usen
 *   la capa compartida `components/FormKit` en lugar del andamiaje que cada
 *   módulo había duplicado a mano:
 *
 *     · `<Paper style={sx({ p:3, borderTop:'4px solid', ... })}>` + `Typography h6`
 *       + `Divider`            ->  `<FormSection title={...}>`
 *     · `<Grid container>`     ->  `<FormGrid>`
 *     · `<Grid size={{...}}>`  ->  `<FormCol size={{...}}>`
 *     · `<Box style={sx({ mt:3, display:'flex', gap:2 })}>`  ->  `<FormActions>`
 *     · `<Paper>` … `</Paper>` ->  `<FormSection>` … `</FormSection>`
 *     · cabecera con `gradient-text` -> `<PageHeader>`
 *     · `<Alert severity="error">`   -> `<ErrorBanner>`
 *     · bloque de carga con `CircularProgress` -> `<FormLoading>`
 *     · `<Box style={sx({ p: 3 })}>`  ->  `<div className="space-y-6">`
 *
 *   NO toca la lógica: campos, nombres (`name`), valores, `onChange`,
 *   `onSubmit`, llamadas a la API y validaciones quedan intactos. Solo cambia
 *   la capa de presentación.
 *
 * POR QUÉ UN SCRIPT Y NO 31 EDICIONES MANUALES
 *   Los 31 archivos suman ~7.800 líneas con los mismos 5 patrones repetidos.
 *   Editarlos a mano garantizaba divergencias entre módulos (justo el problema
 *   que este rediseño corrige). El codemod aplica el MISMO criterio a todos y
 *   es auditable: al final imprime cuántas piezas sustituyó en cada archivo.
 *
 * CÓMO SE USA
 *   node scripts/redesign-forms.mjs          (aplica los cambios)
 *   node scripts/redesign-forms.mjs --check  (solo informa, no escribe)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FEATURES_DIR = path.resolve(__dirname, '..', 'src', 'features');
const CHECK_ONLY = process.argv.includes('--check');

/* ===========================================================================
 * Utilidades de escaneo de JSX
 * ========================================================================= */

/** Índice del `>` que cierra la etiqueta abierta en `start`. */
function tagEnd(src, start) {
  let brace = 0;
  let quote = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === quote && src[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      continue;
    }
    if (c === '{') brace++;
    else if (c === '}') brace--;
    else if (c === '>' && brace === 0) return i;
  }
  return -1;
}

/** Busca la primera etiqueta `<tag ...>` cuyo texto cumpla `predicate`. */
function findOpenTag(src, tag, predicate, from = 0) {
  for (let i = from; i < src.length; i++) {
    if (src[i] !== '<' || src[i + 1] === '/') continue;
    if (!src.startsWith(`<${tag}`, i)) continue;
    // `<Grid` no debe confundirse con `<FormGrid`, ni `<Box` con `<BoxXx`.
    const boundary = src[i + 1 + tag.length];
    if (boundary && !/[\s/>]/.test(boundary)) continue;
    const end = tagEnd(src, i);
    if (end < 0) continue;
    const attrs = src.slice(i, end + 1);
    if (predicate(attrs)) return { start: i, end, attrs };
    i = end;
  }
  return null;
}

/** Empareja la etiqueta de cierre correspondiente al `<tag>` abierto en `openStart`. */
function matchingClose(src, openStart, tag) {
  let depth = 0;
  let i = openStart;
  while (i < src.length) {
    if (src[i] === '<' && src.startsWith(`</${tag}`, i)) {
      depth -= 1;
      const end = src.indexOf('>', i);
      if (end < 0) return null;
      if (depth === 0) return { closeStart: i, closeEnd: end };
      i = end + 1;
      continue;
    }
    if (src[i] === '<' && src.startsWith(`<${tag}`, i)) {
      const boundary = src[i + 1 + tag.length];
      if (!boundary || /[\s/>]/.test(boundary)) {
        depth += 1;
        const end = tagEnd(src, i);
        i = end < 0 ? i + 1 : end + 1;
        continue;
      }
    }
    i += 1;
  }
  return null;
}

/**
 * Colapsa el espaciado de una expresión JSX a una sola línea y **quita las
 * llaves exteriores**.
 *
 * Las llaves de un ternario (`{(a ? b : c)}`) no son válidas como valor de una
 * prop en JSX: `<X title={{a ? b : c}} />` pasaría un OBJETO. Como el valor se
 * vuelve a envolver en llaves al construir la prop, hay que desenvolverlo aquí.
 */
const oneLine = (text) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (!flat.startsWith('{') || !flat.endsWith('}')) return flat;
  let depth = 0;
  for (let i = 0; i < flat.length; i++) {
    if (flat[i] === '{') depth += 1;
    else if (flat[i] === '}') {
      depth -= 1;
      // Solo si las llaves exteriores se emparejan (`{...}{...}` se deja igual).
      if (depth === 0) return i === flat.length - 1 ? flat.slice(1, -1).trim() : flat;
    }
  }
  return flat;
};

/* ===========================================================================
 * Transformaciones
 * ========================================================================= */

/** Piezas sustituidas por archivo (para el informe final). */
const stats = {
  FormSection: 0,
  FormGrid: 0,
  FormCol: 0,
  FormActions: 0,
  PageHeader: 0,
  ErrorBanner: 0,
  FormLoading: 0,
  SectionHeading: 0,
  RootDiv: 0,
  legacyLeft: 0,
};

/** `<Paper>` de sección -> `<FormSection>`. */
function convertSections(src) {
  let out = src;
  for (let guard = 0; guard < 300; guard++) {
    const found = findOpenTag(
      out,
      'Paper',
      (a) => /p:\s*3/.test(a) && /borderTop:\s*'4px solid'/.test(a)
    );
    if (!found) break;

    const close = matchingClose(out, found.start, 'Paper');
    if (!close) break;

    let inner = out.slice(found.end + 1, close.closeStart);
    const flexRow = /display:\s*'flex'/.test(found.attrs);

    // Título de la sección (se convierte en la prop `title`).
    let title = null;
    const titleMatch = inner.match(
      /^\s*<Typography\s+variant="h6"[^>]*>\s*([\s\S]*?)\s*<\/Typography>/
    );
    if (titleMatch) {
      title = oneLine(titleMatch[1]);
      inner = inner.slice(titleMatch[0].length);
    }

    // Divisor decorativo: lo aporta ya el encabezado de FormSection.
    const dividerMatch = inner.match(/^\s*<Divider\b[^>]*?\/>\s*/);
    if (dividerMatch) inner = inner.slice(dividerMatch[0].length);

    const attrs = [
      title ? `title={${title}}` : '',
      flexRow ? 'bodyClassName="flex flex-wrap items-center gap-6"' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const replacement = `<FormSection${attrs ? ` ${attrs}` : ''}>${inner}</FormSection>`;
    out = out.slice(0, found.start) + replacement + out.slice(close.closeEnd + 1);
    stats.FormSection += 1;
  }
  return out;
}

/** `<Grid container>` -> `<FormGrid>` y `<Grid size={{…}}>` -> `<FormCol>`. */
function convertGrids(src) {
  let out = src;

  // 1) Contenedores (de fuera hacia dentro, para no desemparejar el anidado).
  for (let guard = 0; guard < 500; guard++) {
    const found = findOpenTag(out, 'Grid', (a) => /\scontainer\b/.test(a));
    if (!found) break;
    const close = matchingClose(out, found.start, 'Grid');
    if (!close) break;

    const loose = /spacing=\{3\}/.test(found.attrs);
    out =
      out.slice(0, found.start) +
      `<FormGrid gap="${loose ? 'loose' : 'normal'}">` +
      out.slice(found.end + 1, close.closeStart) +
      '</FormGrid>' +
      out.slice(close.closeEnd + 1);
    stats.FormGrid += 1;
  }

  // 2) Columnas.
  for (let guard = 0; guard < 800; guard++) {
    const found = findOpenTag(out, 'Grid', (a) => /\ssize=\{/.test(a));
    if (!found) break;
    const close = matchingClose(out, found.start, 'Grid');
    if (!close) break;

    // La prop `size={{…}}` se extrae y se reinyecta como `size={…}`, porque
    // `FormCol` recibe un OBJETO: dejar el atributo como estaba produciría
    // `<FormCol size={{…}}>`, es decir `{ size: {…} }` como ancho.
    const attrs = out.slice(found.start + '<Grid'.length, found.end);
    const sizeMatch = attrs.match(/\ssize=\{([\s\S]*)\}/);
    const sizeAttr = sizeMatch ? ` size={${sizeMatch[1].trim()}}` : ' size={12}';
    const restAttrs = attrs.replace(/\ssize=\{[\s\S]*\}/, '');

    out =
      out.slice(0, found.start) +
      `<FormCol${sizeAttr}${restAttrs}>` +
      out.slice(found.end + 1, close.closeStart) +
      '</FormCol>' +
      out.slice(close.closeEnd + 1);
    stats.FormCol += 1;
  }

  return out;
}

/** `<Box>` de pie con botones -> `<FormActions>`. */
function convertFooters(src) {
  let out = src;
  for (let guard = 0; guard < 100; guard++) {
    const found = findOpenTag(
      out,
      'Box',
      (a) => /mt:\s*3/.test(a) && /display:\s*'flex'/.test(a) && /gap:\s*2/.test(a)
    );
    if (!found) break;
    const close = matchingClose(out, found.start, 'Box');
    if (!close) break;

    out =
      out.slice(0, found.start) +
      '<FormActions>' +
      out.slice(found.end + 1, close.closeStart) +
      '</FormActions>' +
      out.slice(close.closeEnd + 1);
    stats.FormActions += 1;
  }
  return out;
}

/** `<Box style={sx({ p: 3 })}>` (raíz de página) -> `<div className="space-y-6">`. */
function convertRoots(src) {
  let out = src;
  for (let guard = 0; guard < 200; guard++) {
    const found = findOpenTag(
      out,
      'Box',
      (a) => /p:\s*3/.test(a) && !/borderTop/.test(a) && !/display:\s*'flex'/.test(a) && !/minHeight/.test(a)
    );
    if (!found) break;
    const close = matchingClose(out, found.start, 'Box');
    if (!close) break;

    out =
      out.slice(0, found.start) +
      '<div className="space-y-6">' +
      out.slice(found.end + 1, close.closeStart) +
      '</div>' +
      out.slice(close.closeEnd + 1);
    stats.RootDiv += 1;
  }
  return out;
}

/** Cabecera con `Box` + `Typography.gradient-text` -> `<PageHeader>`. */
function convertBoxHeaders(src, route) {
  let out = src;
  for (let guard = 0; guard < 50; guard++) {
    const found = findOpenTag(
      out,
      'Box',
      (a) => /justifyContent:\s*'space-between'/.test(a) && /mb:\s*3/.test(a)
    );
    if (!found) break;
    const close = matchingClose(out, found.start, 'Box');
    if (!close) break;

    const inner = out.slice(found.end + 1, close.closeStart);
    if (!/className="gradient-text"/.test(inner)) {
      // No es una cabecera: se examina el siguiente `<Box>` (sin recursión
      // sobre una copia del texto, que impediría aplicar los índices al
      // original y volvería a encontrar este mismo bloque).
      continue;
    }

    const titleMatch = inner.match(
      /<Typography\s+variant="h4"[^>]*>\s*([\s\S]*?)\s*<\/Typography>/
    );
    if (!titleMatch) break;

    const deleteMatch = inner.match(/onClick=\{(\s*\(\)\s*=>\s*[^}]+?)\}/);
    const replacement = buildPageHeader(oneLine(titleMatch[1]), route, deleteMatch && oneLine(deleteMatch[1]));

    out = out.slice(0, found.start) + replacement + out.slice(close.closeEnd + 1);
    stats.PageHeader += 1;
  }
  return out;
}

/** Cabecera suelta (`Typography.gradient-text` sin `Box` contenedor). */
function convertBareHeaders(src, route) {
  let out = src;
  for (let guard = 0; guard < 50; guard++) {
    const found = findOpenTag(out, 'Typography', (a) => /gradient-text/.test(a));
    if (!found) break;
    const end = out.indexOf('</Typography>', found.end);
    if (end < 0) break;

    const title = oneLine(out.slice(found.end + 1, end));
    out =
      out.slice(0, found.start) +
      buildPageHeader(title, route, null) +
      out.slice(end + '</Typography>'.length);
    stats.PageHeader += 1;
  }
  return out;
}

/** Bloque JSX de una cabecera de página. */
function buildPageHeader(title, route, deleteHandler) {
  const lines = [
    '<PageHeader',
    `        title={${title}}`,
    `        backTo="${route}"`,
  ];
  if (deleteHandler) {
    lines.push(`        onDelete={isEdit ? ${deleteHandler} : undefined}`);
    lines.push(`        deleteLabel={t('common.delete')}`);
  }
  lines.push('      />');
  return lines.join('\n');
}

/** Estado de carga con `CircularProgress` -> `<FormLoading>`. */
function convertLoading(src) {
  const pattern =
    /if \(loading\) \{\s*return \(\s*<Box style=\{sx\(\{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' \}\)\}>\s*<CircularProgress \/>\s*<\/Box>\s*\);\s*\}/;
  if (!pattern.test(src)) return src;
  stats.FormLoading += 1;
  return src.replace(pattern, 'if (loading) {\n    return <FormLoading sections={2} fieldsPerSection={6} />;\n  }');
}

/**
 * `<Alert severity="error">{error}</Alert>` -> `<ErrorBanner message={error} … />`.
 *
 * Se recorre el texto a mano en vez de usar una expresión regular porque los
 * atributos del `Alert` contienen `=>` (en `onClose`), y un `[^>]*` ingenuo se
 * detiene en el `>` de la flecha: la mitad de los avisos no se convertían.
 * Aquí se localiza la etiqueta de apertura con la expresión de abajo y se
 * exige que el cuerpo sea exactamente `{error}`, de modo que solo se sustituye
 * el aviso de error del formulario.
 */
const ALERT_OPEN_RE = /<Alert\b((?:=>|[^>])*)>/g;

function convertAlerts(src) {
  let out = '';
  let cursor = 0;
  let match;
  let guard = 0;

  ALERT_OPEN_RE.lastIndex = 0;
  while ((match = ALERT_OPEN_RE.exec(src)) !== null && guard < 500) {
    guard += 1;
    const attrs = match[1];
    if (!/severity="error"/.test(attrs)) continue;

    const openEnd = match.index + match[0].length;
    const closeIdx = src.indexOf('</Alert>', openEnd);
    if (closeIdx < 0) continue;
    if (src.slice(openEnd, closeIdx).trim() !== '{error}') continue;

    const hasClose = /onClose=/.test(attrs);
    out +=
      src.slice(cursor, match.index) +
      `<ErrorBanner message={error}${hasClose ? ' onClose={() => setError(null)}' : ''} />`;
    cursor = closeIdx + '</Alert>'.length;
    ALERT_OPEN_RE.lastIndex = cursor;
    stats.ErrorBanner += 1;
  }

  return out + src.slice(cursor);
}

/**
 * Subtítulo de sección heredado: `Typography h6` con `sectionTitleSx` seguido
 * del `Divider` decorativo, ambos sustituidos por `<SectionHeading>`.
 */
const HEADING_PAIR_RE = /<Typography variant="h6" style=\{sx\(sectionTitleSx\)\}>([\s\S]*?)<\/Typography>\s*<Divider\b[^>]*?\/>/g;

/** Subtítulo heredado suelto (sin `Divider` a continuación). */
const HEADING_SOLO_RE = /<Typography variant="h6" style=\{sx\(sectionTitleSx\)\}>([\s\S]*?)<\/Typography>/g;

/** `Divider` decorativo suelto: el encabezado de sección ya pinta su borde. */
const ORPHAN_DIVIDER_RE = /^[ \t]*<Divider style=\{sx\(\{ my: 3 \}\)\} \/>[ \t]*\r?\n/gm;

/** Declaración de la constante heredada (estilo del subtítulo antiguo). */
const LEGACY_DECL_RE = /^[ \t]*const sectionTitleSx = \{[^}]*\};[ \t]*\r?\n/m;

/**
 * Sustituye los subtítulos heredados y retira la constante `sectionTitleSx`.
 *
 * La constante solo se elimina cuando ya NO queda ninguna referencia: si un
 * módulo la usara en un lugar que este codemod no reconoce, borrarla dejaría
 * un `undefined` en tiempo de ejecución y el formulario se caería al pintar.
 */
function removeLegacyHelpers(src) {
  let out = src.replace(HEADING_PAIR_RE, (_match, inner) => {
    stats.SectionHeading += 1;
    return `<SectionHeading>${oneLine(inner)}</SectionHeading>`;
  });

  out = out.replace(HEADING_SOLO_RE, (_match, inner) => {
    stats.SectionHeading += 1;
    return `<SectionHeading>${oneLine(inner)}</SectionHeading>`;
  });

  // Divisores que solo separaban bloques ya delimitados por el encabezado.
  out = out.replace(ORPHAN_DIVIDER_RE, '');

  // Se retira la declaración y se comprueba si quedan USOS reales de la
  // constante (la propia declaración contiene su nombre, así que hay que
  // eliminarla ANTES de comprobar; si no, el detector nunca ve el fin).
  const withoutDecl = out.replace(LEGACY_DECL_RE, '');
  if (!withoutDecl.includes('sectionTitleSx')) return withoutDecl;

  // Todavía hay usos no migrados: se conserva la declaración para no dejar un
  // `undefined` en tiempo de ejecución, y se reporta para revisarlo a mano.
  stats.legacyLeft += 1;
  return out;
}

/** Inserta el import de `FormKit` con las piezas realmente usadas. */
function addImports(src) {
  const anchor = src.match(/import \{ sx \} from '([^']*)\/ui\/sx';/);
  if (!anchor) return src;

  const body = src.replace(anchor[0], '');
  const used = Object.keys(stats).filter((name) => {
    if (name === 'RootDiv' || name === 'legacyLeft') return false;
    return new RegExp(`<${name}\\b`).test(body);
  });
  if (!used.length) return src;

  const importPath = `${anchor[1]}/components/FormKit`;
  const line = `import { ${used.join(', ')} } from '${importPath}';`;
  return src.replace(anchor[0], `${anchor[0]}\n${line}`);
}

/**
 * Red de seguridad: colapsa `={{` … `}}` en atributos JSX.
 *
 * Un `={{…}}` pasa un OBJETO como valor de la prop, así que casi nunca es lo
 * que se quiere en un atributo. Se conserva únicamente cuando el contenido
 * parece un objeto literal de verdad (`size={{ xs: 12 }}`, `style={{ … }}`).
 * Tras las transformaciones anteriores no debería quedar ninguno; si queda,
 * aquí se corrige antes de escribir el archivo.
 */
function fixDoubleBraces(src) {
  return src.replace(/=\{\{([^{}]*)\}\}/g, (full, inner) =>
    /^\s*[A-Za-z_$][\w$]*\s*:/.test(inner) ? full : `={${inner.trim()}}`
  );
}

/* ===========================================================================
 * Recorrido de archivos
 * ========================================================================= */

/** `academicPeriods` -> `academic-periods` (ruta de la lista del módulo). */
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

function collectFormPages(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFormPages(full, acc);
    else if (entry.name.endsWith('FormPage.jsx')) acc.push(full);
  }
  return acc;
}

const files = collectFormPages(FEATURES_DIR).sort();
const report = [];

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  const relative = path.relative(path.resolve(__dirname, '..'), file);
  // relative = 'src/features/<modulo>/pages/<X>FormPage.jsx' → índice 2.
  const moduleName = relative.split(path.sep)[2];
  const route = `/${kebab(moduleName)}`;

  for (const key of Object.keys(stats)) stats[key] = 0;

  let out = original;
  out = convertSections(out);
  out = convertGrids(out);
  out = convertFooters(out);
  out = convertLoading(out);
  out = convertAlerts(out);
  out = convertBoxHeaders(out, route);
  out = convertBareHeaders(out, route);
  out = convertRoots(out);
  out = removeLegacyHelpers(out);
  out = addImports(out);
  out = fixDoubleBraces(out);

  const leftover = (out.match(/className="gradient-text"/g) || []).length;
  const applied = Object.values(stats).reduce((a, b) => a + b, 0);

  if (!CHECK_ONLY && out !== original) fs.writeFileSync(file, out);

  report.push({ relative, applied, leftover, ...stats });
}

/* ===========================================================================
 * Informe
 * ========================================================================= */
const pad = (v, n) => String(v).padEnd(n);
console.log(`\n${CHECK_ONLY ? '[CHECK] ' : ''}Rediseño de formularios — ${files.length} archivos\n`);
console.log(
  pad('ARCHIVO', 58) + pad('SEC', 4) + pad('GRID', 5) + pad('COL', 4) +
  pad('ACT', 4) + pad('HDR', 4) + pad('ERR', 4) + pad('LOAD', 5) + pad('DIV', 4) +
  pad('SUB', 4) + 'REST'
);
console.log('-'.repeat(100));
for (const r of report) {
  console.log(
    pad(r.relative.replace(/^src\/features\//, ''), 58) +
      pad(r.FormSection, 4) + pad(r.FormGrid, 5) + pad(r.FormCol, 4) +
      pad(r.FormActions, 4) + pad(r.PageHeader, 4) + pad(r.ErrorBanner, 4) +
      pad(r.FormLoading, 5) + pad(r.RootDiv, 4) + pad(r.SectionHeading, 4) +
      (r.leftover ? `${r.leftover} (cabecera sin migrar)` : '')
  );
}

const totals = report.reduce(
  (acc, r) => {
    for (const k of Object.keys(stats)) acc[k] += r[k];
    acc.leftover += r.leftover;
    return acc;
  },
  { FormSection: 0, FormGrid: 0, FormCol: 0, FormActions: 0, PageHeader: 0, ErrorBanner: 0, FormLoading: 0, SectionHeading: 0, RootDiv: 0, legacyLeft: 0, leftover: 0 }
);
console.log('-'.repeat(100));
console.log(`TOTAL: ${JSON.stringify(totals)}`);
const untouched = report.filter((r) => r.applied === 0).map((r) => r.relative);
if (untouched.length) console.log(`\nSin cambios (revisar a mano):\n  ${untouched.join('\n  ')}`);
console.log('');
