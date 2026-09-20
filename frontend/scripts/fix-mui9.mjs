// MUI v9 migration codemod for the Academix frontend.
//
// MUI v9 removed several APIs that this codebase was written against (v5/v6):
//   - Grid:  `item` and the breakpoint props `xs/sm/md/lg/xl` are gone.
//            Use `size={{ xs: 12, md: 6 }}` instead.
//   - Box:   system props (display, justifyContent, p, m, gap, ...) are gone.
//            Use `sx` instead.
//   - Typography: `fontWeight`/`fontSize`/`lineHeight`/`letterSpacing`/spacing
//            props are gone (only sx remains for styling).
//   - ListItemText: `primaryTypographyProps`/`secondaryTypographyProps` were
//            renamed to `slotProps={{ primary: ..., secondary: ... }}`.
//
// The script parses each JSX opening tag with a small tokenizer that respects
// quotes and brace nesting, rebuilds the tag with the migrated attributes, and
// reports per-file statistics. Tags that need no change are left untouched.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');

const SYSTEM_PROPS = new Set([
  // borders
  'border', 'borderTop', 'borderLeft', 'borderRight', 'borderBottom',
  'borderX', 'borderY', 'borderColor', 'borderTopColor', 'borderLeftColor',
  'borderRightColor', 'borderBottomColor', 'borderRadius',
  'borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomLeftRadius', 'borderBottomRightRadius',
  // display
  'display', 'displayPrint',
  // flexbox
  'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'alignContent',
  'order', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'justifySelf', 'alignSelf',
  // css grid
  'gap', 'columnGap', 'rowGap', 'gridColumn', 'gridRow', 'gridAutoFlow',
  'gridAutoColumns', 'gridAutoRows', 'gridTemplateColumns', 'gridTemplateRows',
  'gridTemplateAreas', 'gridArea',
  // palette
  'bgcolor', 'color',
  // positions
  'position', 'zIndex', 'top', 'right', 'bottom', 'left', 'inset',
  // shadows
  'boxShadow',
  // sizing
  'width', 'maxWidth', 'minWidth', 'height', 'maxHeight', 'minHeight', 'boxSizing',
  // spacing
  'm', 'mt', 'mr', 'mb', 'ml', 'mx', 'my',
  'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py',
  // typography
  'fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'letterSpacing',
  'lineHeight', 'textAlign', 'textTransform',
  // common css extras used ad-hoc across the app
  'overflow', 'overflowX', 'overflowY', 'cursor', 'opacity', 'visibility',
  'whiteSpace', 'verticalAlign', 'objectFit', 'objectPosition', 'transform',
  'transition', 'textDecoration', 'textOverflow', 'background',
  'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
  'backdropFilter', 'aspectRatio', 'borderStyle', 'borderWidth', 'outline',
  'pointerEvents', 'userSelect', 'wordBreak', 'filter', 'mixBlendMode',
  'textShadow', 'WebkitLineClamp', 'lineClamp', 'WebkitBoxOrient',
]);

// Props that are still valid component props and must NOT be moved to sx.
const TYPOGRAPHY_KEEP = new Set(['color', 'align', 'variant', 'component', 'gutterBottom', 'noWrap', 'paragraph']);
const BOX_KEEP = new Set(['component', 'ref', 'className', 'id', 'style', 'onClick', 'role', 'title', 'tabIndex', 'key', 'sx']);
const GRID_BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'];
const KEEP_DOM = new Set([
  'key', 'ref', 'id', 'className', 'style', 'onClick', 'onChange', 'onSubmit',
  'onKeyDown', 'onKeyUp', 'onFocus', 'onBlur', 'onMouseEnter', 'onMouseLeave',
  'onScroll', 'onDragStart', 'onDrop', 'onDragOver', 'onTouchStart',
  'role', 'title', 'tabIndex', 'alt', 'src', 'href', 'target', 'rel', 'type',
  'name', 'value', 'placeholder', 'disabled', 'readOnly', 'required',
  'checked', 'defaultChecked', 'defaultValue', 'accept', 'multiple', 'step',
  'min', 'max', 'rows', 'cols', 'htmlFor', 'hidden', 'draggable', 'spellCheck',
  'autoFocus', 'autoComplete', 'autoCorrect', 'data-testid', 'aria-label',
  'aria-hidden', 'aria-expanded', 'aria-controls', 'aria-current', 'item',
  'spacing', 'container', 'columns', 'columnSpacing', 'rowSpacing', 'offset',
  'wrap', 'direction', 'size', 'sx', 'component', 'loading', 'loaderPosition',
  'noWrap', 'gutterBottom', 'paragraph', 'variant', 'align', 'color', 'elevation',
  'square', 'dense', 'disablePadding', 'disableGutters', 'divider', 'secondaryAction',
  'primary', 'secondary', 'slots', 'slotProps', 'disableRipple', 'selected',
  'to', 'end', 'start', 'exact', 'caseSensitive',
]);

// ---- JSX tag tokenizer ---------------------------------------------------

// Scans forward from a `<Tag` occurrence and returns the closing `>` index,
// or -1 if the tag never closes before end of file.
function findTagEnd(src, from) {
  let i = from;
  let quote = null;
  let braceDepth = 0;
  while (i < src.length) {
    const ch = src[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '{') {
      braceDepth += 1;
    } else if (ch === '}') {
      braceDepth -= 1;
    } else if (ch === '>' && braceDepth === 0) {
      return i;
    }
    i += 1;
  }
  return -1;
}

// Parses the attribute text between the tag name and `>`.
function parseAttrs(text) {
  const attrs = [];
  let i = 0;
  const n = text.length;
  const skipWs = () => { while (i < n && /\s/.test(text[i])) i += 1; };
  while (true) {
    skipWs();
    if (i >= n) break;
    if (text[i] === '{' || text[i] === '/') break; // child expression / comment / self-close marker
    // attribute name
    let name = '';
    while (i < n && !/\s/.test(text[i]) && text[i] !== '=') { name += text[i]; i += 1; }
    if (!name) { i += 1; continue; }
    skipWs();
    let value = null;
    if (text[i] === '=') {
      i += 1;
      skipWs();
      const ch = text[i];
      if (ch === '"' || ch === "'") {
        i += 1;
        let v = '';
        while (i < n && text[i] !== ch) { v += text[i]; i += 1; }
        i += 1; // closing quote
        value = { kind: 'string', text: v };
      } else if (ch === '{') {
        let depth = 0;
        let v = '';
        while (i < n) {
          const c = text[i];
          v += c;
          if (c === '{') depth += 1;
          else if (c === '}') {
            depth -= 1;
            if (depth === 0) { i += 1; break; }
          }
          i += 1;
        }
        value = { kind: 'expr', text: v.slice(1, -1) };
      } else {
        let v = '';
        while (i < n && !/\s/.test(text[i])) { v += text[i]; i += 1; }
        value = { kind: 'bare', text: v };
      }
    }
    attrs.push({ name, value });
  }
  return attrs;
}

// Renders a value into a JS object literal entry value.
function renderValue(value) {
  if (!value) return 'true';
  if (value.kind === 'string') return `'${value.text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (value.kind === 'bare') return `'${value.text}'`;
  return value.text; // expr
}

// ---- tag transformers ----------------------------------------------------

function transformTag(name, attrs, selfClosing) {
  if (name === 'Grid') return transformGrid(attrs, selfClosing);
  if (name === 'Box') return transformBox(attrs, selfClosing);
  if (name === 'Typography') return transformTypography(attrs, selfClosing);
  if (name === 'ListItemText') return transformListItemText(attrs, selfClosing);
  if (name === 'Stack') return transformStack(attrs, selfClosing);
  return null;
}

const STACK_KEEP = new Set(['direction', 'spacing', 'useFlexGap', 'divider', 'component', 'ref', 'className', 'id', 'style', 'onClick', 'key', 'sx']);

function transformStack(attrs, selfClosing) {
  const { sys, rest } = collectSystemProps(attrs, STACK_KEEP);
  if (sys.length === 0) return null;
  return mergeSx(rest, sys, selfClosing);
}

function transformGrid(attrs, selfClosing) {
  const hasItem = attrs.some((a) => a.name === 'item');
  const breakpoints = attrs.filter((a) => GRID_BREAKPOINTS.includes(a.name) && a.value);
  const containerAlign = attrs.filter((a) => (a.name === 'alignItems' || a.name === 'justifyContent') && a.value);
  if (!hasItem && breakpoints.length === 0 && containerAlign.length === 0) return null;

  const out = [];
  let sxMerged = false;
  for (const attr of attrs) {
    if (attr.name === 'item') continue;
    if (GRID_BREAKPOINTS.includes(attr.name)) continue;
    if (attr.name === 'alignItems' || attr.name === 'justifyContent') {
      if (!sxMerged) {
        out.push({ name: 'sx', value: { kind: 'expr', text: `{ ${attr.name}: ${renderValue(attr.value)} }` } });
        sxMerged = true;
      } else {
        const last = out[out.length - 1];
        last.value.text = last.value.text.replace(/\}\s*$/, `, ${attr.name}: ${renderValue(attr.value)} }`);
      }
      continue;
    }
    out.push(attr);
  }

  if (breakpoints.length > 0) {
    const entries = breakpoints.map((b) => `${b.name}: ${renderValue(b.value)}`).join(', ');
    out.push({ name: 'size', value: { kind: 'expr', text: `{ ${entries} }` } });
  }

  return { attrs: out, selfClosing };
}

function collectSystemProps(attrs, keep) {
  const sys = [];
  const rest = [];
  for (const attr of attrs) {
    if (!keep.has(attr.name) && SYSTEM_PROPS.has(attr.name) && attr.value) {
      sys.push(attr);
    } else {
      rest.push(attr);
    }
  }
  return { sys, rest };
}

function mergeSx(attrs, sys, selfClosing) {
  const sxAttr = attrs.find((a) => a.name === 'sx' && a.value);
  const entries = sys.map((a) => `${a.name}: ${renderValue(a.value)}`).join(', ');
  const obj = `{ ${entries} }`;
  let newSx;
  if (sxAttr) {
    newSx = { name: 'sx', value: { kind: 'expr', text: `[${sxAttr.value.kind === 'expr' ? sxAttr.value.text : `'${sxAttr.value.text}'`}, ${obj}]` } };
  } else {
    newSx = { name: 'sx', value: { kind: 'expr', text: obj } };
  }
  const out = attrs.filter((a) => a.name !== 'sx');
  out.push(newSx);
  return { attrs: out, selfClosing };
}

function transformBox(attrs, selfClosing) {
  const { sys, rest } = collectSystemProps(attrs, BOX_KEEP);
  if (sys.length === 0) return null;
  return mergeSx(rest, sys, selfClosing);
}

function transformTypography(attrs, selfClosing) {
  const keep = new Set([...TYPOGRAPHY_KEEP, ...KEEP_DOM]);
  const { sys, rest } = collectSystemProps(attrs, keep);
  if (sys.length === 0) return null;
  return mergeSx(rest, sys, selfClosing);
}

function transformListItemText(attrs, selfClosing) {
  const primary = attrs.find((a) => a.name === 'primaryTypographyProps' && a.value);
  const secondary = attrs.find((a) => a.name === 'secondaryTypographyProps' && a.value);
  if (!primary && !secondary) return null;

  const entries = [];
  if (primary) entries.push(`primary: ${primary.value.kind === 'expr' ? primary.value.text : `'${primary.value.text}'`}`);
  if (secondary) entries.push(`secondary: ${secondary.value.kind === 'expr' ? secondary.value.text : `'${secondary.value.text}'`}`);

  const out = attrs
    .filter((a) => a.name !== 'primaryTypographyProps' && a.name !== 'secondaryTypographyProps')
    .concat([{ name: 'slotProps', value: { kind: 'expr', text: `{ ${entries.join(', ')} }` } }]);
  return { attrs: out, selfClosing };
}

// ---- rebuild --------------------------------------------------------------

function rebuild(tagName, attrs, selfClosing) {
  const parts = attrs.map((a) => {
    if (!a.value) return a.name;
    if (a.value.kind === 'string') return `${a.name}="${a.value.text.replace(/"/g, '&quot;')}"`;
    if (a.value.kind === 'expr') return `${a.name}={${a.value.text}}`;
    return `${a.name}={${a.value.text}}`; // bare → keep as expression-ish; values are simple
  });
  return `<${tagName}${parts.length ? ' ' + parts.join(' ') : ''}${selfClosing ? ' /' : ''}>`;
}

// ---- main -----------------------------------------------------------------

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!e.name.startsWith('.') && e.name !== 'node_modules') walk(p, out);
    } else if (/\.(jsx|js)$/.test(e.name)) {
      out.push(p);
    }
  }
}

const TAG_NAMES = ['Grid', 'Box', 'Typography', 'ListItemText', 'Stack'];

// ---- main -----------------------------------------------------------------

function main() {
  const files = [];
  walk(ROOT, files);

  let totalChanged = 0;
  const perFile = [];

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    let out = src;
    let changes = 0;
    for (const tagName of TAG_NAMES) {
      const re = new RegExp(`<${tagName}\\b`, 'g');
      let m;
      while ((m = re.exec(out)) !== null) {
        const tagStart = m.index;
        const tagEnd = findTagEnd(out, tagStart + m[0].length);
        if (tagEnd === -1) continue;
        const inner = out.slice(tagStart + m[0].length, tagEnd);
        let innerTrimmed = inner;
        let selfClosing = false;
        if (innerTrimmed.trimEnd().endsWith('/')) {
          selfClosing = true;
          innerTrimmed = innerTrimmed.trimEnd().slice(0, -1);
        }
        const attrs = parseAttrs(innerTrimmed);
        const result = transformTag(tagName, attrs, selfClosing);
        if (!result) continue;
        const rebuilt = rebuild(tagName, result.attrs, result.selfClosing);
        if (rebuilt === out.slice(tagStart, tagEnd + 1)) continue;
        out = out.slice(0, tagStart) + rebuilt + out.slice(tagEnd + 1);
        changes += 1;
        re.lastIndex = tagStart + rebuilt.length;
      }
    }
    if (changes > 0) {
      fs.writeFileSync(file, out);
      totalChanged += changes;
      perFile.push([path.relative('.', file).replace(/\\/g, '/'), changes]);
    }
  }

  perFile.sort((a, b) => b[1] - a[1]);
  for (const [f, n] of perFile) console.log(`${String(n).padStart(4)}  ${f}`);
  console.log(`\n${perFile.length} files touched, ${totalChanged} tags transformed.`);
}

main();