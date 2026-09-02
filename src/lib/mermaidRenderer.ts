/**
 * mermaidRenderer.ts
 * Client-side loader and renderer for Mermaid diagrams (Sequence diagrams, Flowcharts, Class diagrams, etc.)
 * Dynamically loads Mermaid.js from CDN with caching, theme adaptation, and robust error handling.
 */

import type { MarkdownTheme } from "./markdownStyles";

let mermaidInstance: any = null;
let mermaidLoadingPromise: Promise<any> | null = null;

/**
 * Loads and initializes the Mermaid library dynamically in the browser.
 */
export async function getMermaidInstance(theme: MarkdownTheme = "github"): Promise<any> {
  if (typeof window === "undefined") return null;

  const mermaidTheme = theme === "obsidian" ? "dark" : theme === "academic" || theme === "crimson" ? "neutral" : "default";

  if (mermaidInstance) {
    try {
      mermaidInstance.initialize({
        startOnLoad: false,
        theme: mermaidTheme,
        securityLevel: "loose",
        fontFamily: theme === "academic" || theme === "crimson" ? 'Georgia, "Times New Roman", serif' : '"Inter", -apple-system, sans-serif',
        sequence: {
          useMaxWidth: true,
          showSequenceNumbers: true,
        },
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
        },
      });
    } catch {
      // initialize may throw if called multiple times with same config, safe to ignore
    }
    return mermaidInstance;
  }

  if (mermaidLoadingPromise) {
    return mermaidLoadingPromise;
  }

  mermaidLoadingPromise = (async () => {
    // 1. Check if window.mermaid already exists
    if ((window as any).mermaid) {
      mermaidInstance = (window as any).mermaid;
      mermaidInstance.initialize({
        startOnLoad: false,
        theme: mermaidTheme,
        securityLevel: "loose",
        fontFamily: '"Inter", -apple-system, sans-serif',
      });
      return mermaidInstance;
    }

    // 2. Try dynamic ESM import from CDN via runtime Function
    try {
      const cdnUrl = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs";
      const dynamicImport = new Function("url", "return import(url)");
      const module = await dynamicImport(cdnUrl);
      mermaidInstance = module.default || module;
      (window as any).mermaid = mermaidInstance;
      mermaidInstance.initialize({
        startOnLoad: false,
        theme: mermaidTheme,
        securityLevel: "loose",
        fontFamily: '"Inter", -apple-system, sans-serif',
      });
      return mermaidInstance;
    } catch (esmError) {
      console.warn("ESM Mermaid load failed, falling back to script tag:", esmError);
    }

    // 3. Fallback to classic script tag injection
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js";
      script.crossOrigin = "anonymous";
      script.onload = () => {
        mermaidInstance = (window as any).mermaid;
        if (mermaidInstance) {
          mermaidInstance.initialize({
            startOnLoad: false,
            theme: mermaidTheme,
            securityLevel: "loose",
            fontFamily: '"Inter", -apple-system, sans-serif',
          });
          resolve(mermaidInstance);
        } else {
          reject(new Error("Mermaid script loaded but window.mermaid is not defined"));
        }
      };
      script.onerror = () => {
        reject(new Error("Failed to load Mermaid from CDN"));
      };
      document.head.appendChild(script);
    });
  })();

  return mermaidLoadingPromise;
}

let diagramCounter = 0;

/**
 * Scans a DOM element for `.mermaid-diagram-container` elements and renders
 * each Mermaid code block into an interactive, high-fidelity SVG diagram.
 */
export async function renderMermaidInElement(
  container: HTMLElement,
  theme: MarkdownTheme = "github"
): Promise<void> {
  if (typeof window === "undefined" || !container) return;

  const diagramContainers = Array.from(
    container.querySelectorAll<HTMLElement>(".mermaid-diagram-container")
  );

  if (diagramContainers.length === 0) return;

  try {
    const mermaid = await getMermaidInstance(theme);
    if (!mermaid) return;

    for (const el of diagramContainers) {
      // Check if already rendered
      if (el.getAttribute("data-rendered") === "true") continue;

      const rawCode = decodeURIComponent(el.getAttribute("data-mermaid-code") || "").trim();
      if (!rawCode) continue;

      diagramCounter++;
      const uniqueId = `mermaid-svg-${Date.now()}-${diagramCounter}`;

      try {
        const { svg } = await mermaid.render(uniqueId, rawCode);
        el.innerHTML = `<div class="mermaid-svg-wrapper">${svg}</div>`;
        el.setAttribute("data-rendered", "true");
        el.classList.add("mermaid-rendered");
      } catch (err: any) {
        console.warn("Mermaid render syntax error:", err);
        // Fallback: render formatted code with an informative warning
        el.innerHTML = `
          <div class="mermaid-error-container">
            <div class="mermaid-error-header">
              <span class="mermaid-badge">Diagram</span>
              <span class="mermaid-error-msg">${err?.message ? err.message.slice(0, 100) : "Invalid diagram syntax"}</span>
            </div>
            <pre class="code-block language-mermaid"><code>${escapeHtml(rawCode)}</code></pre>
          </div>
        `;
        el.setAttribute("data-rendered", "true");
      }
    }
  } catch (err) {
    console.error("Error in renderMermaidInElement:", err);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
