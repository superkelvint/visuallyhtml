# Visual to HTML

A small browser tool for converting rich pasted content (Google Docs, web pages, editors) into cleaned HTML you can copy elsewhere.

## What It Does

- Preserves rich paste input using a `contenteditable` editor.
- Sanitizes pasted HTML to reduce unsafe/unwanted markup.
- Optionally strips inline styles/classes/ids.
- Removes redundant wrapper `<span>` tags.
- Preserves and normalizes common emphasis (`bold`, `italic`, `underline`) when style stripping is enabled.
- Shows a live preview of cleaned output.
- Supports pretty-formatted or compact HTML output.
- Copy and download actions for final HTML.

## Files

- `index.html`: app UI and event wiring.
- `cleaner.js`: browser-global cleaning pipeline used by the page.
- `test/cleaner.test.js`: automated tests for cleaner behavior.

## Usage

1. Open `index.html` in a browser.
2. Paste rich content into the left editor.
3. Adjust toggles as needed:
   - `Strip inline styles/classes`
   - `Keep tables`
   - `Keep form controls`
   - `Pretty output`
4. Copy from the HTML output box, or click `Copy HTML` / `Download .html`.

## Toggle Behavior

- `Strip inline styles/classes` off:
  - Keeps inline visual styling where possible (`style`, `class`, `id`).
- `Strip inline styles/classes` on:
  - Drops style/class/id and attempts to preserve emphasis semantically (`<strong>`, `<em>`, `<u>`).
- `Pretty output` on:
  - Indented, human-readable HTML.
- `Pretty output` off:
  - Compact cleaned HTML.
- `Keep form controls` on:
  - Retains common form elements (`form`, `input`, `textarea`, `select`, etc.).
- `Keep form controls` off:
  - Form controls are removed during sanitization.

## Notes

- Invalid pasted HTML (for example, list items nested directly inside headings) may be auto-corrected by the browser parser.
- If you open files directly via `file://`, this project is set up to work without module-import CORS issues.

## Tests

1. Install dependencies: `npm install`
2. Run tests once: `npm test`
3. Watch mode: `npm run test:watch`

Current test coverage includes:
- strip vs preserve style mode
- style-driven bold/italic/underline conversion
- redundant span cleanup
- pretty vs compact output
- table allow/deny behavior
- form control allow/deny behavior
- external link target/rel normalization
