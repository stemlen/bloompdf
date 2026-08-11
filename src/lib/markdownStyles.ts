import { marked } from "marked";

// ─── GitHub-flavored Markdown CSS ─────────────────────────────────────────────
// Shared single source of truth for both browser Preview and Puppeteer PDF generation.
export const GITHUB_MARKDOWN_CSS = `
/* ── Reset ──────────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; }

/* ── Base & Typography ──────────────────────────────────────────────────── */
.markdown-body {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial,
               sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  font-size: 16px;
  line-height: 1.6;
  color: #24292f;
  background: #ffffff;
  word-wrap: break-word;
  overflow-wrap: break-word;
  text-align: left;
}

/* ── Headings ────────────────────────────────────────────────────────────── */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  font-weight: 600;
  line-height: 1.25;
  color: #1f2328;
  margin-top: 24px;
  margin-bottom: 16px;
  page-break-after: avoid;
  break-after: avoid;
}
.markdown-body > :first-child,
.markdown-body h1:first-child,
.markdown-body h2:first-child,
.markdown-body h3:first-child { margin-top: 0 !important; }

.markdown-body h1 { font-size: 2em;     border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
.markdown-body h2 { font-size: 1.5em;   border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
.markdown-body h3 { font-size: 1.25em; }
.markdown-body h4 { font-size: 1em;    }
.markdown-body h5 { font-size: 0.875em; }
.markdown-body h6 { font-size: 0.85em;  color: #57606a; }

/* ── Paragraphs ──────────────────────────────────────────────────────────── */
.markdown-body p {
  margin-top: 0;
  margin-bottom: 16px;
  orphans: 3;
  widows: 3;
}

/* ── Strong / Em / Del ───────────────────────────────────────────────────── */
.markdown-body strong { font-weight: 600; }
.markdown-body em     { font-style: italic; }
.markdown-body del    { text-decoration: line-through; color: #57606a; }

/* ── Links ───────────────────────────────────────────────────────────────── */
.markdown-body a { color: #0969da; text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }

/* ── Horizontal Rule ─────────────────────────────────────────────────────── */
.markdown-body hr {
  height: 0;
  border: 0;
  border-top: 1px solid #d0d7de;
  margin: 24px 0;
}

/* ── Blockquote ──────────────────────────────────────────────────────────── */
.markdown-body blockquote {
  border-left: 4px solid #d0d7de;
  margin: 0 0 16px 0;
  padding: 0 1em;
  color: #57606a;
  page-break-inside: avoid;
  break-inside: avoid;
}
.markdown-body blockquote > :first-child { margin-top: 8px; }
.markdown-body blockquote > :last-child  { margin-bottom: 8px; }

/* ── Lists ───────────────────────────────────────────────────────────────── */
.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}
.markdown-body ul { list-style-type: disc; }
.markdown-body ol { list-style-type: decimal; }

.markdown-body li {
  margin-bottom: 4px;
  overflow-wrap: break-word;
}
.markdown-body li + li { margin-top: 2px; }

/* Nested lists — tighter spacing */
.markdown-body li > ul,
.markdown-body li > ol {
  margin-top: 4px;
  margin-bottom: 0;
  padding-left: 1.5em;
}
.markdown-body li > ul  { list-style-type: circle; }
.markdown-body li > ul ul { list-style-type: square; }

/* Task list */
.markdown-body li.task-list-item {
  list-style: none;
  margin-left: -1.3em;
  padding-left: 0;
}
.markdown-body li.task-list-item input[type="checkbox"] {
  margin-right: 0.5em;
  vertical-align: middle;
  position: relative;
  top: -1px;
}

/* Definition list */
.markdown-body dl { margin-bottom: 16px; }
.markdown-body dt { font-weight: 600; margin-top: 16px; }
.markdown-body dd { padding-left: 1.5em; margin-bottom: 8px; }

/* ── Inline Code ─────────────────────────────────────────────────────────── */
.markdown-body code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
               "Liberation Mono", monospace;
  font-size: 85%;
  background: rgba(175, 184, 193, 0.2);
  padding: 0.2em 0.4em;
  border-radius: 6px;
  white-space: break-spaces;
}

/* ── Fenced / Indented Code Blocks ──────────────────────────────────────── */
.markdown-body pre {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
               "Liberation Mono", monospace;
  font-size: 85%;
  line-height: 1.5;
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  padding: 16px;
  margin-top: 0;
  margin-bottom: 16px;
  overflow: auto;
  white-space: pre;
  word-break: normal;
  word-wrap: normal;
  page-break-inside: avoid;
  break-inside: avoid;
}
.markdown-body pre > code {
  background: transparent;
  padding: 0;
  border-radius: 0;
  font-size: 100%;
  white-space: pre;
  word-break: normal;
}

/* ── Tables ──────────────────────────────────────────────────────────────── */
.markdown-body table {
  border-spacing: 0;
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
  page-break-inside: avoid;
  break-inside: avoid;
}
.markdown-body thead { background: #f6f8fa; }
.markdown-body th {
  font-weight: 600;
  text-align: left;
}
.markdown-body th,
.markdown-body td {
  padding: 6px 13px;
  border: 1px solid #d0d7de;
}
.markdown-body tr { background-color: #ffffff; }
.markdown-body tr:nth-child(even) { background-color: #f6f8fa; }
.markdown-body thead tr { border-bottom: 2px solid #d0d7de; }

/* ── Images ──────────────────────────────────────────────────────────────── */
.markdown-body img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 16px auto;
  page-break-inside: avoid;
  break-inside: avoid;
  border-radius: 4px;
}

/* ── Keyboard ────────────────────────────────────────────────────────────── */
.markdown-body kbd {
  display: inline-block;
  padding: 3px 5px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
               "Liberation Mono", monospace;
  font-size: 11px;
  color: #24292f;
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  box-shadow: inset 0 -1px 0 #d0d7de;
  vertical-align: middle;
}

/* ── Superscript / Subscript ─────────────────────────────────────────────── */
.markdown-body sup { vertical-align: super; font-size: 0.75em; }
.markdown-body sub { vertical-align: sub;   font-size: 0.75em; }

/* ── Syntax Highlighting Tokens ─────────────────────────────────────────── */
.markdown-body .token.comment,
.markdown-body .token.prolog,
.markdown-body .token.doctype,
.markdown-body .token.cdata         { color: #6a737d; font-style: italic; }
.markdown-body .token.punctuation                    { color: #24292f; }
.markdown-body .token.namespace                      { opacity: .7; }
.markdown-body .token.property,
.markdown-body .token.tag,
.markdown-body .token.constant,
.markdown-body .token.symbol,
.markdown-body .token.deleted                        { color: #d73a49; }
.markdown-body .token.boolean,
.markdown-body .token.number                         { color: #005cc5; }
.markdown-body .token.selector,
.markdown-body .token.attr-name,
.markdown-body .token.string,
.markdown-body .token.char,
.markdown-body .token.builtin,
.markdown-body .token.inserted                       { color: #032f62; }
.markdown-body .token.operator,
.markdown-body .token.entity,
.markdown-body .token.url,
.markdown-body .language-css .token.string,
.markdown-body .style .token.string,
.markdown-body .token.variable                       { color: #e36209; }
.markdown-body .token.atrule,
.markdown-body .token.attr-value,
.markdown-body .token.function,
.markdown-body .token.class-name                    { color: #6f42c1; }
.markdown-body .token.keyword                        { color: #d73a49; }
.markdown-body .token.regex,
.markdown-body .token.important        { color: #e36209; }
.markdown-body .token.important,
.markdown-body .token.bold                           { font-weight: bold; }
.markdown-body .token.italic                         { font-style: italic; }
.markdown-body .token.entity                         { cursor: help; }

/* ── Page Simulation Container ──────────────────────────────────────────── */
.a4-page-preview {
  width: 100%;
  max-width: 816px; /* 8.5in at 96dpi */
  min-height: 1056px; /* 11in at 96dpi (A4 ratio ~1.414) */
  background: #ffffff;
  padding: 1in; /* Exactly 1in margins matching Puppeteer PDF margin */
  margin: 0 auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e5e3;
  border-radius: 4px;
  position: relative;
  box-sizing: border-box;
}

@media (max-width: 640px) {
  .a4-page-preview {
    padding: 1.5rem 1rem;
    min-height: auto;
  }
}
`;

export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";
  try {
    marked.use({
      gfm: true,
      breaks: false,
    });
    return marked.parse(markdown) as string;
  } catch (e) {
    console.error("Markdown parse error:", e);
    return "";
  }
}
