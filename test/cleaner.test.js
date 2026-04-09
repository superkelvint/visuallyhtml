// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';

const cleanerPath = path.resolve(process.cwd(), 'cleaner.js');
const cleanerSource = fs.readFileSync(cleanerPath, 'utf8');

function loadCleaner() {
  delete window.HtmlCleaner;
  window.eval(cleanerSource);
  return window.HtmlCleaner;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('HtmlCleaner', () => {
  it('preserves inline styles when stripStyles is false', () => {
    const cleaner = loadCleaner();
    const domPurifyStub = { sanitize: (html) => html };

    const { cleaned } = cleaner.cleanHtml(
      '<p><span style="font-style: italic; font-weight: 700;">Hello</span></p>',
      { stripStyles: false, prettyOutput: false },
      domPurifyStub
    );

    expect(cleaned).toContain('style="font-style: italic; font-weight: 700;"');
    expect(cleaned).toContain('<span');
  });

  it('converts style-driven emphasis to semantic tags in strip mode', () => {
    const cleaner = loadCleaner();
    const domPurifyStub = { sanitize: (html) => html };

    const { cleaned } = cleaner.cleanHtml(
      '<p><span style="font-style: italic; font-weight: 700; text-decoration: underline;" class="x" id="y">Hi</span></p>',
      { stripStyles: true, prettyOutput: false },
      domPurifyStub
    );

    expect(cleaned).toContain('<u><em><strong>Hi</strong></em></u>');
    expect(cleaned).not.toContain('style=');
    expect(cleaned).not.toContain('class=');
    expect(cleaned).not.toContain('id=');
  });

  it('removes redundant spans after sanitize strips attributes', () => {
    const cleaner = loadCleaner();
    const domPurifyStub = {
      sanitize: (html) => html.replace(/\sclass="x"/g, '')
    };

    const { cleaned } = cleaner.cleanHtml(
      '<h1><span class="x">This is my title</span></h1>',
      { stripStyles: false, prettyOutput: false },
      domPurifyStub
    );

    expect(cleaned).toBe('<h1>This is my title</h1>');
  });

  it('switches between pretty and compact output', () => {
    const cleaner = loadCleaner();
    const domPurifyStub = { sanitize: (html) => html };
    const input = '<div><h1>Title</h1><p>Body</p></div>';

    const pretty = cleaner.cleanHtml(input, { prettyOutput: true }, domPurifyStub);
    const compact = cleaner.cleanHtml(input, { prettyOutput: false }, domPurifyStub);

    expect(pretty.output).toContain('\n');
    expect(compact.output).toBe(compact.cleaned);
    expect(compact.output).not.toContain('\n');
  });

  it('removes tables when keepTables is false', () => {
    const cleaner = loadCleaner();
    const domPurifyStub = {
      sanitize: (html, cfg) => {
        if (!cfg.ALLOWED_TAGS.includes('table')) {
          return html.replace(/<table[\s\S]*?<\/table>/gi, '');
        }
        return html;
      }
    };

    const { cleaned } = cleaner.cleanHtml(
      '<p>before</p><table><tr><td>A</td></tr></table><p>after</p>',
      { keepTables: false, prettyOutput: false },
      domPurifyStub
    );

    expect(cleaned).toBe('<p>before</p><p>after</p>');
  });

  it('adds target/rel to non-anchor-fragment links only', () => {
    const cleaner = loadCleaner();
    const domPurifyStub = { sanitize: (html) => html };

    const { cleaned } = cleaner.cleanHtml(
      '<p><a href="https://example.com">ext</a> <a href="#section">local</a></p>',
      { prettyOutput: false },
      domPurifyStub
    );

    expect(cleaned).toContain('href="https://example.com" target="_blank" rel="noopener noreferrer"');
    expect(cleaned).toContain('href="#section"');
    expect(cleaned).not.toContain('href="#section" target="_blank"');
  });

  it('preserves image width and height attributes', () => {
    const cleaner = loadCleaner();
    const domPurifyStub = { sanitize: (html) => html };

    const { cleaned } = cleaner.cleanHtml(
      '<p><img src="https://example.com/a.png" width="20" height="20" style="border:1px solid #000"></p>',
      { stripStyles: false, prettyOutput: false },
      domPurifyStub
    );

    expect(cleaned).toContain('width="20"');
    expect(cleaned).toContain('height="20"');
  });

  it('keeps or strips form controls based on keepForms toggle', () => {
    const cleaner = loadCleaner();
    const formHtml = '<form><label for="q">Q</label><input id="q" name="q" value="x"></form>';
    const domPurifyStub = {
      sanitize: (html, cfg) => {
        if (!cfg.ALLOWED_TAGS.includes('form')) {
          return html
            .replace(/<\/?form>/g, '')
            .replace(/<\/?label[^>]*>/g, '')
            .replace(/<input[^>]*>/g, '');
        }
        return html;
      }
    };

    const stripped = cleaner.cleanHtml(
      formHtml,
      { keepForms: false, prettyOutput: false },
      domPurifyStub
    );
    const kept = cleaner.cleanHtml(
      formHtml,
      { keepForms: true, prettyOutput: false },
      domPurifyStub
    );

    expect(stripped.cleaned).not.toContain('<form>');
    expect(stripped.cleaned).not.toContain('<input');
    expect(kept.cleaned).toContain('<form>');
    expect(kept.cleaned).toContain('<input');
  });
});
