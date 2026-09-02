import { marked, type Tokens } from "marked";

// ─── Types ──────────────────────────────────────────────────────────────────

export type MarkdownTheme = "github" | "academic" | "obsidian" | "minimalist" | "crimson";
export type PageFormat = "A4" | "Letter" | "Legal";
export type PageOrientation = "portrait" | "landscape";
export type PageMargin = "none" | "small" | "medium" | "large";

export interface MarkdownRenderOptions {
  theme?: MarkdownTheme;
  fontSize?: "small" | "medium" | "large";
  lineSpacing?: "compact" | "normal" | "relaxed";
  showPageNumbers?: boolean;
  headerTitle?: string;
}

export const THEME_CONFIGS: Record<MarkdownTheme, { name: string; description: string; previewColor: string }> = {
  github: {
    name: "GitHub Classic",
    description: "Crisp documentation style with modern tech aesthetics",
    previewColor: "#0969da",
  },
  academic: {
    name: "Academic & Research",
    description: "Formal serif typography suitable for essays and reports",
    previewColor: "#2c3e50",
  },
  obsidian: {
    name: "Obsidian Void",
    description: "Sleek pitch-dark developer theme with glowing accents",
    previewColor: "#E8607A",
  },
  minimalist: {
    name: "Minimalist Clean",
    description: "Ultra-modern typography with generous whitespace",
    previewColor: "#18181b",
  },
  crimson: {
    name: "Crimson Editorial",
    description: "Warm literary styling with rich ruby headings",
    previewColor: "#8b0000",
  },
};

// ─── Syntax Highlighter ─────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function highlightCode(code: string, lang?: string): string {
  const language = (lang || "").toLowerCase().trim();
  
  // Master Tokenizer Regex
  // Order matters: Comments -> Strings -> Regex/Templates -> Keywords -> Booleans/Constants -> Numbers -> Functions
  const masterRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|<!--[\s\S]*?-->)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[\s\S]*?`)|(\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b)|(\b(?:const|let|var|function|return|if|else|for|while|import|export|from|class|async|await|def|public|private|protected|interface|type|struct|new|try|catch|finally|throw|switch|case|break|continue|default|void|package|func|select|defer|go|match|impl|trait|fn|mut|val|lambda|enum|extends|implements|static|readonly|as|in|of|yield)\b)|(\b(?:true|false|null|undefined|nil|None|self|this|super)\b)|(\b[a-zA-Z_$][\w$]*(?=\s*\())/g;

  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = masterRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(code.slice(lastIndex, match.index));
    }
    const [_, comment, str, num, kw, bool, fn] = match;
    if (comment) {
      result += `<span class="token comment">${escapeHtml(comment)}</span>`;
    } else if (str) {
      result += `<span class="token string">${escapeHtml(str)}</span>`;
    } else if (num) {
      result += `<span class="token number">${escapeHtml(num)}</span>`;
    } else if (kw) {
      result += `<span class="token keyword">${escapeHtml(kw)}</span>`;
    } else if (bool) {
      result += `<span class="token boolean">${escapeHtml(bool)}</span>`;
    } else if (fn) {
      result += `<span class="token function">${escapeHtml(fn)}</span>`;
    }
    lastIndex = masterRegex.lastIndex;
  }

  if (lastIndex < code.length) {
    result += escapeHtml(code.slice(lastIndex));
  }

  return result;
}

// ─── Markdown Parser with GFM Extensions ────────────────────────────────────

export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return "";
  
  try {
    const renderer = new marked.Renderer();

    // Code blocks with syntax highlighting & language header (and Mermaid support)
    renderer.code = function ({ text, lang }: Tokens.Code): string {
      const language = (lang || "").trim().split(/\s+/)[0].toLowerCase();
      
      // Mermaid diagram block
      if (language === "mermaid") {
        return `<div class="mermaid-diagram-container" data-mermaid-code="${encodeURIComponent(text)}">
          <div class="mermaid-placeholder">
            <div class="mermaid-loading-indicator">
              <span class="mermaid-spinner"></span> Loading diagram...
            </div>
            <pre class="code-block language-mermaid" style="display:none;"><code>${escapeHtml(text)}</code></pre>
          </div>
        </div>`;
      }

      const highlighted = highlightCode(text, language);
      return `<div class="code-block-wrapper">
        ${language ? `<div class="code-lang-tag">${escapeHtml(language)}</div>` : ""}
        <pre class="code-block language-${escapeHtml(language || "text")}"><code>${highlighted}</code></pre>
      </div>`;
    };

    // Task list & standard list items with full inline token parsing
    renderer.listitem = function (item: Tokens.ListItem): string {
      const content = item.tokens ? this.parser.parse(item.tokens) : item.text;
      if (item.task) {
        return `<li class="task-list-item"><label class="task-checkbox-label"><input type="checkbox"${item.checked ? ' checked="checked"' : ""} disabled="disabled" class="task-checkbox" /><span class="task-text">${content}</span></label></li>`;
      }
      return `<li>${content}</li>`;
    };

    // Tables with responsive wrapper & cell token parsing
    renderer.table = function (token: Tokens.Table): string {
      let headerHtml = "";
      let bodyHtml = "";

      if (token.header && token.header.length > 0) {
        headerHtml += "<thead><tr>";
        token.header.forEach((cell, i) => {
          const align = token.align[i] ? ` style="text-align:${token.align[i]}"` : "";
          const content = cell.tokens ? this.parser.parseInline(cell.tokens) : cell.text;
          headerHtml += `<th${align}>${content}</th>`;
        });
        headerHtml += "</tr></thead>";
      }

      if (token.rows && token.rows.length > 0) {
        bodyHtml += "<tbody>";
        token.rows.forEach((row) => {
          bodyHtml += "<tr>";
          row.forEach((cell, i) => {
            const align = token.align[i] ? ` style="text-align:${token.align[i]}"` : "";
            const content = cell.tokens ? this.parser.parseInline(cell.tokens) : cell.text;
            bodyHtml += `<td${align}>${content}</td>`;
          });
          bodyHtml += "</tr>";
        });
        bodyHtml += "</tbody>";
      }

      return `<div class="table-wrapper"><table>${headerHtml}${bodyHtml}</table></div>`;
    };

    // Links open safely in new tab
    renderer.link = function ({ href, title, text }: Tokens.Link): string {
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
    };

    return marked.parse(markdown, {
      gfm: true,
      breaks: true,
      renderer,
    }) as string;
  } catch (e) {
    console.error("Markdown parse error:", e);
    return escapeHtml(markdown);
  }
}

// ─── CSS Styles ─────────────────────────────────────────────────────────────

export function getThemeStyles(theme: MarkdownTheme = "github", fontSize: "small" | "medium" | "large" = "medium"): string {
  const fontSizes = {
    small: { base: "14px", h1: "1.75em", h2: "1.35em", h3: "1.15em", line: "1.5" },
    medium: { base: "16px", h1: "2em", h2: "1.5em", h3: "1.25em", line: "1.6" },
    large: { base: "18px", h1: "2.25em", h2: "1.65em", h3: "1.35em", line: "1.7" },
  };

  const fs = fontSizes[fontSize] || fontSizes.medium;

  // Theme-specific colors and font family
  let themeCss = "";
  if (theme === "github") {
    themeCss = `
      --md-bg: #ffffff;
      --md-fg: #24292f;
      --md-heading: #1f2328;
      --md-border: #d0d7de;
      --md-link: #0969da;
      --md-code-bg: #f6f8fa;
      --md-code-border: #d0d7de;
      --md-code-fg: #24292f;
      --md-quote-border: #d0d7de;
      --md-quote-fg: #57606a;
      --md-table-header-bg: #f6f8fa;
      --md-table-row-alt: #f6f8fa;
      --md-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
    `;
  } else if (theme === "academic") {
    themeCss = `
      --md-bg: #ffffff;
      --md-fg: #1a1a1a;
      --md-heading: #111111;
      --md-border: #cccccc;
      --md-link: #1b4992;
      --md-code-bg: #f4f4f4;
      --md-code-border: #e0e0e0;
      --md-code-fg: #222222;
      --md-quote-border: #333333;
      --md-quote-fg: #333333;
      --md-table-header-bg: #f0f0f0;
      --md-table-row-alt: #f9f9f9;
      --md-font-family: "Merriweather", "Georgia", "Times New Roman", serif;
    `;
  } else if (theme === "obsidian") {
    themeCss = `
      --md-bg: #0a0b0e;
      --md-fg: #e6edf3;
      --md-heading: #f0f6fc;
      --md-border: #30363d;
      --md-link: #58a6ff;
      --md-code-bg: #161b22;
      --md-code-border: #30363d;
      --md-code-fg: #e6edf3;
      --md-quote-border: #E8607A;
      --md-quote-fg: #8b949e;
      --md-table-header-bg: #161b22;
      --md-table-row-alt: #12151c;
      --md-font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
    `;
  } else if (theme === "minimalist") {
    themeCss = `
      --md-bg: #ffffff;
      --md-fg: #18181b;
      --md-heading: #09090b;
      --md-border: #e4e4e7;
      --md-link: #18181b;
      --md-code-bg: #f4f4f5;
      --md-code-border: #e4e4e7;
      --md-code-fg: #18181b;
      --md-quote-border: #18181b;
      --md-quote-fg: #71717a;
      --md-table-header-bg: #f4f4f5;
      --md-table-row-alt: #fafafa;
      --md-font-family: "Inter", system-ui, -apple-system, sans-serif;
    `;
  } else if (theme === "crimson") {
    themeCss = `
      --md-bg: #fcfbf9;
      --md-fg: #2c2523;
      --md-heading: #8b0000;
      --md-border: #e5dec9;
      --md-link: #a32a2a;
      --md-code-bg: #f2ece1;
      --md-code-border: #dfd5c2;
      --md-code-fg: #2c2523;
      --md-quote-border: #8b0000;
      --md-quote-fg: #604e4a;
      --md-table-header-bg: #f2ece1;
      --md-table-row-alt: #f7f3ec;
      --md-font-family: "Georgia", "Baskerville", serif;
    `;
  }

  return `
/* ── Theme Root Variables ── */
.markdown-container {
  ${themeCss}
}

.markdown-body {
  font-family: var(--md-font-family);
  font-size: ${fs.base};
  line-height: ${fs.line};
  color: var(--md-fg);
  background: var(--md-bg);
  word-wrap: break-word;
  overflow-wrap: break-word;
  text-align: left;
  box-sizing: border-box;
}

/* ── Headings ── */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  font-weight: 700;
  line-height: 1.25;
  color: var(--md-heading);
  margin-top: 1.5em;
  margin-bottom: 0.6em;
  page-break-after: avoid;
  break-after: avoid;
}

.markdown-body > :first-child,
.markdown-body h1:first-child,
.markdown-body h2:first-child,
.markdown-body h3:first-child { margin-top: 0 !important; }

.markdown-body h1 {
  font-size: ${fs.h1};
  border-bottom: 1.5px solid var(--md-border);
  padding-bottom: 0.3em;
  letter-spacing: -0.02em;
}
.markdown-body h2 {
  font-size: ${fs.h2};
  border-bottom: 1px solid var(--md-border);
  padding-bottom: 0.25em;
  letter-spacing: -0.01em;
}
.markdown-body h3 { font-size: ${fs.h3}; }
.markdown-body h4 { font-size: 1em; font-weight: 600; }
.markdown-body h5 { font-size: 0.9em; font-weight: 600; }
.markdown-body h6 { font-size: 0.85em; color: var(--md-quote-fg); }

/* ── Paragraphs & Text ── */
.markdown-body p {
  margin-top: 0;
  margin-bottom: 1em;
  orphans: 3;
  widows: 3;
}
.markdown-body strong { font-weight: 700; }
.markdown-body em { font-style: italic; }
.markdown-body del { text-decoration: line-through; opacity: 0.7; }

/* ── Links ── */
.markdown-body a {
  color: var(--md-link);
  text-decoration: none;
  font-weight: 500;
}
.markdown-body a:hover {
  text-decoration: underline;
}

/* ── Divider ── */
.markdown-body hr {
  height: 0;
  border: 0;
  border-top: 1px solid var(--md-border);
  margin: 1.8em 0;
}

/* ── Blockquotes ── */
.markdown-body blockquote {
  border-left: 4px solid var(--md-quote-border);
  margin: 1em 0;
  padding: 0.5em 1em;
  color: var(--md-quote-fg);
  background: rgba(125, 125, 125, 0.04);
  border-radius: 0 6px 6px 0;
  page-break-inside: avoid;
  break-inside: avoid;
}
.markdown-body blockquote > :first-child { margin-top: 0; }
.markdown-body blockquote > :last-child { margin-bottom: 0; }

/* ── Lists ── */
.markdown-body ul,
.markdown-body ol {
  padding-left: 1.8em;
  margin-top: 0;
  margin-bottom: 1em;
}
.markdown-body ul { list-style-type: disc; }
.markdown-body ol { list-style-type: decimal; }
.markdown-body li {
  margin-bottom: 0.35em;
  overflow-wrap: break-word;
}
.markdown-body li + li { margin-top: 0.2em; }
.markdown-body li > ul,
.markdown-body li > ol {
  margin-top: 0.3em;
  margin-bottom: 0;
  padding-left: 1.4em;
}
.markdown-body li > ul { list-style-type: circle; }
.markdown-body li > ul ul { list-style-type: square; }

/* ── Task Lists ── */
.markdown-body li.task-list-item {
  list-style: none !important;
  margin-left: -1.3em;
  padding-left: 0;
}
.markdown-body .task-checkbox-label {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5em;
  cursor: default;
}
.markdown-body .task-checkbox {
  width: 1.05em;
  height: 1.05em;
  border-radius: 4px;
  accent-color: var(--md-link);
  margin: 0;
  position: relative;
  top: 0.15em;
}

/* ── Code Blocks & Inline Code ── */
.markdown-body code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 85%;
  background: var(--md-code-bg);
  color: var(--md-code-fg);
  border: 1px solid var(--md-code-border);
  padding: 0.15em 0.4em;
  border-radius: 5px;
  white-space: break-spaces;
}

.markdown-body .code-block-wrapper {
  position: relative;
  margin: 1.2em 0;
  border-radius: 8px;
  border: 1px solid var(--md-code-border);
  background: var(--md-code-bg);
  overflow: hidden;
  page-break-inside: avoid;
  break-inside: avoid;
}

.markdown-body .code-lang-tag {
  position: absolute;
  top: 6px;
  right: 10px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.5;
  user-select: none;
}

.markdown-body pre.code-block {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 85%;
  line-height: 1.5;
  padding: 14px 16px;
  margin: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  overflow-x: auto;
  white-space: pre;
}

.markdown-body pre.code-block > code {
  background: transparent;
  border: none;
  padding: 0;
  font-size: 100%;
  white-space: pre;
  color: inherit;
}

/* ── Syntax Highlighting Tokens ── */
.token.comment { color: #6a737d; font-style: italic; }
.token.string { color: #0a8f4c; }
.token.number { color: #005cc5; }
.token.keyword { color: #d73a49; font-weight: 600; }
.token.boolean { color: #005cc5; font-weight: 600; }
.token.function { color: #6f42c1; }

${theme === "obsidian" ? `
  .token.comment { color: #8b949e; font-style: italic; }
  .token.string { color: #7ee787; }
  .token.number { color: #79c0ff; }
  .token.keyword { color: #ff7b72; font-weight: 600; }
  .token.boolean { color: #79c0ff; font-weight: 600; }
  .token.function { color: #d2a8ff; }
` : ""}

/* ── Tables ── */
.markdown-body .table-wrapper {
  width: 100%;
  overflow-x: auto;
  margin: 1.2em 0;
  border-radius: 6px;
  border: 1px solid var(--md-border);
  page-break-inside: avoid;
  break-inside: avoid;
}
.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.95em;
}
.markdown-body thead {
  background: var(--md-table-header-bg);
  border-bottom: 2px solid var(--md-border);
}
.markdown-body th {
  font-weight: 600;
  text-align: left;
  padding: 8px 14px;
  color: var(--md-heading);
}
.markdown-body td {
  padding: 8px 14px;
  border-top: 1px solid var(--md-border);
}
.markdown-body tr:nth-child(even) {
  background: var(--md-table-row-alt);
}

/* ── Images ── */
.markdown-body img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.2em auto;
  border-radius: 6px;
  page-break-inside: avoid;
  break-inside: avoid;
}

/* ── Mermaid Diagrams ── */
.markdown-body .mermaid-diagram-container {
  margin: 1.5em 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--md-code-bg);
  border: 1px solid var(--md-border);
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  page-break-inside: avoid;
  break-inside: avoid;
  box-sizing: border-box;
  min-height: 80px;
}

.markdown-body .mermaid-svg-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.markdown-body .mermaid-svg-wrapper svg {
  max-width: 100% !important;
  height: auto !important;
  display: block;
  margin: 0 auto;
}

.markdown-body .mermaid-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--md-quote-fg);
  font-size: 13px;
  font-family: inherit;
}

.markdown-body .mermaid-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(125, 125, 125, 0.3);
  border-top-color: var(--md-link);
  border-radius: 50%;
  animation: mermaid-spin 0.8s linear infinite;
  margin-right: 8px;
}

@keyframes mermaid-spin {
  to { transform: rotate(360deg); }
}

.markdown-body .mermaid-error-container {
  width: 100%;
}
.markdown-body .mermaid-error-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #d73a49;
}
.markdown-body .mermaid-badge {
  background: #d73a49;
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
}

/* ── Print Stylesheet ── */
@media print {
  body {
    background: transparent !important;
    color: #000000 !important;
  }
  .markdown-body {
    background: transparent !important;
  }
  .code-block-wrapper,
  blockquote,
  table,
  img,
  pre {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
}
  `;
}

// ── Default CSS Export ──────────────────────────────────────────────────────
export const GITHUB_MARKDOWN_CSS = getThemeStyles("github", "medium");
