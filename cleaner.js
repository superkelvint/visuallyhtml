const baseAllowedTags = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'span',
  'strong', 'sub', 'sup', 'u', 'ul'
];

const tableTags = ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption'];
const formTags = ['form', 'label', 'input', 'textarea', 'select', 'option', 'button', 'fieldset', 'legend', 'optgroup'];
const allowedAttrsBase = ['href', 'target', 'rel', 'src', 'alt', 'title', 'colspan', 'rowspan', 'width', 'height'];
const formAttrs = [
  'type', 'name', 'value', 'placeholder', 'checked', 'disabled', 'readonly', 'selected',
  'multiple', 'for', 'rows', 'cols', 'min', 'max', 'step', 'pattern', 'autocomplete',
  'method', 'action'
];

function styleHasItalic(styleText = '') {
  if (/font-style\s*:\s*(italic|oblique)/i.test(styleText)) return true;
  if (/mso-bidi-font-style\s*:\s*italic/i.test(styleText)) return true;
  const fontShorthand = styleText.match(/font\s*:\s*([^;]+)/i);
  if (fontShorthand && /\b(italic|oblique)\b/i.test(fontShorthand[1])) return true;
  return false;
}

function styleHasBold(styleText = '') {
  if (/mso-bidi-font-weight\s*:\s*bold/i.test(styleText)) return true;
  const weightMatch = styleText.match(/font-weight\s*:\s*([^;]+)/i);
  if (weightMatch) {
    const value = weightMatch[1].trim().toLowerCase();
    if (value.includes('bold') || value.includes('bolder') || value.includes('semibold') || value.includes('demibold')) {
      return true;
    }
    const numeric = Number.parseInt(value, 10);
    if (Number.isFinite(numeric) && numeric >= 500) return true;
  }
  const fontShorthand = styleText.match(/font\s*:\s*([^;]+)/i);
  if (fontShorthand && /\b(600|700|800|900|bold|bolder)\b/i.test(fontShorthand[1])) return true;
  return false;
}

function styleHasUnderline(styleText = '') {
  return /text-decoration(?:-line)?\s*:[^;]*underline/i.test(styleText);
}

function liftStyledTextToSemanticTags(el, doc) {
  const styleText = el.getAttribute('style');
  if (!styleText) return;

  const wantsItalic = styleHasItalic(styleText) && !['I', 'EM'].includes(el.tagName);
  const wantsBold = styleHasBold(styleText) && !['B', 'STRONG'].includes(el.tagName);
  const wantsUnderline = styleHasUnderline(styleText) && el.tagName !== 'U';

  if (!wantsItalic && !wantsBold && !wantsUnderline) return;

  const fragment = doc.createDocumentFragment();
  while (el.firstChild) fragment.appendChild(el.firstChild);

  let wrapped = fragment;
  if (wantsBold) {
    const strong = doc.createElement('strong');
    strong.appendChild(wrapped);
    wrapped = strong;
  }
  if (wantsItalic) {
    const em = doc.createElement('em');
    em.appendChild(wrapped);
    wrapped = em;
  }
  if (wantsUnderline) {
    const u = doc.createElement('u');
    u.appendChild(wrapped);
    wrapped = u;
  }
  el.appendChild(wrapped);
}

function normalizeHtml(html, options = {}) {
  const { stripStyles = false } = options;
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root');

  root.querySelectorAll('b').forEach((el) => {
    const strong = doc.createElement('strong');
    strong.innerHTML = el.innerHTML;
    el.replaceWith(strong);
  });

  root.querySelectorAll('i').forEach((el) => {
    const em = doc.createElement('em');
    em.innerHTML = el.innerHTML;
    el.replaceWith(em);
  });

  root.querySelectorAll('*').forEach((el) => {
    if (stripStyles) {
      liftStyledTextToSemanticTags(el, doc);
      el.removeAttribute('style');
      el.removeAttribute('class');
      el.removeAttribute('id');
      el.removeAttribute('dir');
      el.removeAttribute('data-pm-slice');
    }

    if (el.tagName === 'A') {
      const href = el.getAttribute('href');
      if (href && !href.startsWith('#')) {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
    }

    if (el.tagName === 'SPAN' && !el.attributes.length) {
      if (el.textContent.trim() === '') {
        el.remove();
      } else {
        el.replaceWith(...el.childNodes);
      }
    }
  });

  return root.innerHTML;
}

function sanitizeHtml(html, options = {}, domPurify = globalThis.DOMPurify) {
  const { keepTables = true, keepForms = false, stripStyles = false } = options;
  const allowedTags = []
    .concat(baseAllowedTags)
    .concat(keepTables ? tableTags : [])
    .concat(keepForms ? formTags : []);
  const allowedAttrs = stripStyles
    ? allowedAttrsBase
    : allowedAttrsBase.concat(['style', 'class', 'id']);
  const fullAllowedAttrs = keepForms ? allowedAttrs.concat(formAttrs) : allowedAttrs;

  if (domPurify) {
    return domPurify.sanitize(html, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: fullAllowedAttrs,
      FORBID_ATTR: ['onerror', 'onclick', 'onload'],
      KEEP_CONTENT: true
    });
  }

  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('script,style,iframe,object,embed').forEach((n) => n.remove());
  return tmp.innerHTML;
}

function unwrapRedundantSpans(html) {
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root');

  root.querySelectorAll('span').forEach((span) => {
    if (span.attributes.length === 0) {
      span.replaceWith(...span.childNodes);
    }
  });

  return root.innerHTML;
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatHtml(html) {
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root');
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const inlineTags = new Set(['a', 'abbr', 'b', 'code', 'em', 'i', 's', 'span', 'strong', 'sub', 'sup', 'u']);

  function formatNode(node, level, inPre = false) {
    const indent = '  '.repeat(level);

    if (node.nodeType === Node.TEXT_NODE) {
      if (inPre) return `${indent}${escapeHtml(node.textContent || '')}`;
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return '';
      return `${indent}${escapeHtml(text)}`;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    const attrText = Array.from(node.attributes)
      .map((attr) => ` ${attr.name}="${escapeHtml(attr.value)}"`)
      .join('');
    const open = `<${tag}${attrText}>`;
    const close = `</${tag}>`;

    if (voidTags.has(tag)) return `${indent}${open}`;

    const isPre = inPre || tag === 'pre' || tag === 'code';
    const children = Array.from(node.childNodes)
      .map((child) => formatNode(child, level + 1, isPre))
      .filter(Boolean);

    if (!children.length) return `${indent}${open}${close}`;

    const hasElementChild = Array.from(node.childNodes).some((child) => child.nodeType === Node.ELEMENT_NODE);
    if (!hasElementChild && inlineTags.has(tag) && !isPre) {
      const inlineContent = children.map((line) => line.trim()).join(' ');
      return `${indent}${open}${inlineContent}${close}`;
    }

    return `${indent}${open}\n${children.join('\n')}\n${indent}${close}`;
  }

  return Array.from(root.childNodes)
    .map((node) => formatNode(node, 0))
    .filter(Boolean)
    .join('\n');
}

function cleanHtml(rawHtml, options = {}, domPurify = globalThis.DOMPurify) {
  const config = {
    stripStyles: false,
    keepTables: true,
    keepForms: false,
    prettyOutput: true,
    ...options
  };

  const normalized = normalizeHtml(rawHtml, { stripStyles: config.stripStyles });
  const sanitized = sanitizeHtml(normalized, {
    keepTables: config.keepTables,
    keepForms: config.keepForms,
    stripStyles: config.stripStyles
  }, domPurify);

  const cleaned = unwrapRedundantSpans(sanitized).trim();
  const output = config.prettyOutput ? formatHtml(cleaned) : cleaned;

  return { cleaned, output };
}

window.HtmlCleaner = {
  cleanHtml,
  normalizeHtml,
  sanitizeHtml,
  formatHtml
};
