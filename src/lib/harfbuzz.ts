/**
 * harfbuzz.ts
 * Minimal, lazily-loaded binding to HarfBuzz (text shaping) compiled to WASM.
 *
 * The .wasm file is the one shipped by the `harfbuzzjs` npm package (v1.6.2,
 * MIT / HarfBuzz "Old MIT" licence), self-hosted under
 * /public/vendor/harfbuzz/ so it works with the static export. We talk to its
 * C API directly instead of bundling the Emscripten glue: the module only
 * needs five trivial imports, and this keeps Node-only code out of the client
 * bundle. It is fetched only when text in a complex script (Devanagari,
 * Arabic) actually has to be shaped.
 */

export const HARFBUZZ_WASM_URL = "/vendor/harfbuzz/harfbuzz.wasm";

/** One shaped glyph. Positions are in font units (font scale = upem). */
export interface ShapedGlyph {
  /** Glyph id in the font */
  gid: number;
  /**
   * UTF-16 index of the character this glyph comes from (cluster level
   * "characters": a conjunct gets the index of its first character, a
   * reordered matra keeps its own index).
   */
  cluster: number;
  xAdvance: number;
  xOffset: number;
  yOffset: number;
}

interface HbExports {
  memory: WebAssembly.Memory;
  __wasm_call_ctors: () => void;
  malloc: (n: number) => number;
  free: (p: number) => void;
  hb_blob_create: (data: number, len: number, mode: number, user: number, destroy: number) => number;
  hb_face_create: (blob: number, index: number) => number;
  hb_face_get_upem: (face: number) => number;
  hb_font_create: (face: number) => number;
  hb_buffer_create: () => number;
  hb_buffer_destroy: (buf: number) => void;
  hb_buffer_add_utf16: (buf: number, text: number, len: number, offset: number, itemLen: number) => void;
  hb_buffer_set_direction: (buf: number, dir: number) => void;
  hb_buffer_set_script: (buf: number, script: number) => void;
  hb_buffer_set_language: (buf: number, lang: number) => void;
  hb_buffer_guess_segment_properties: (buf: number) => void;
  hb_buffer_set_cluster_level: (buf: number, level: number) => void;
  hb_language_from_string: (str: number, len: number) => number;
  hb_shape: (font: number, buf: number, features: number, numFeatures: number) => void;
  hb_buffer_get_length: (buf: number) => number;
  hb_buffer_get_glyph_infos: (buf: number, len: number) => number;
  hb_buffer_get_glyph_positions: (buf: number, len: number) => number;
}

const HB_MEMORY_MODE_READONLY = 1;
const HB_DIRECTION_LTR = 4;
const HB_DIRECTION_RTL = 5;
/** Keep each glyph's own character index instead of merging whole syllables. */
const HB_BUFFER_CLUSTER_LEVEL_CHARACTERS = 2;
const tag = (s: string) =>
  ((s.charCodeAt(0) << 24) | (s.charCodeAt(1) << 16) | (s.charCodeAt(2) << 8) | s.charCodeAt(3)) >>> 0;

export interface HbFont {
  upem: number;
  shape(text: string, opts: { rtl: boolean; script: string; language: string }): ShapedGlyph[];
}

export interface HarfBuzz {
  createFont(bytes: Uint8Array): HbFont;
}

function bind(ex: HbExports): HarfBuzz {
  const u8 = () => new Uint8Array(ex.memory.buffer);
  const allocBytes = (bytes: Uint8Array) => {
    const p = ex.malloc(bytes.length);
    u8().set(bytes, p);
    return p;
  };
  const langCache = new Map<string, number>();
  const language = (code: string) => {
    let l = langCache.get(code);
    if (l === undefined) {
      const p = allocBytes(new TextEncoder().encode(code));
      l = ex.hb_language_from_string(p, code.length);
      ex.free(p);
      langCache.set(code, l);
    }
    return l;
  };

  return {
    createFont(bytes: Uint8Array): HbFont {
      // The font data must outlive the blob; fonts are cached for the session.
      const data = allocBytes(bytes);
      const blob = ex.hb_blob_create(data, bytes.length, HB_MEMORY_MODE_READONLY, 0, 0);
      const face = ex.hb_face_create(blob, 0);
      const font = ex.hb_font_create(face);
      const upem = ex.hb_face_get_upem(face);
      return {
        upem,
        shape(text, { rtl, script, language: lang }) {
          const buf = ex.hb_buffer_create();
          const n = text.length;
          const tp = ex.malloc(n * 2 + 2);
          const u16 = new Uint16Array(ex.memory.buffer, tp, n);
          for (let i = 0; i < n; i++) u16[i] = text.charCodeAt(i);
          ex.hb_buffer_add_utf16(buf, tp, n, 0, n);
          ex.free(tp);
          ex.hb_buffer_set_direction(buf, rtl ? HB_DIRECTION_RTL : HB_DIRECTION_LTR);
          ex.hb_buffer_set_script(buf, tag(script));
          ex.hb_buffer_set_language(buf, language(lang));
          ex.hb_buffer_guess_segment_properties(buf);
          ex.hb_buffer_set_cluster_level(buf, HB_BUFFER_CLUSTER_LEVEL_CHARACTERS);
          ex.hb_shape(font, buf, 0, 0);
          const len = ex.hb_buffer_get_length(buf);
          const infos = ex.hb_buffer_get_glyph_infos(buf, 0) >> 2;
          const pos = ex.hb_buffer_get_glyph_positions(buf, 0) >> 2;
          const U32 = new Uint32Array(ex.memory.buffer);
          const I32 = new Int32Array(ex.memory.buffer);
          const out: ShapedGlyph[] = [];
          // hb_glyph_info_t and hb_glyph_position_t are both 5 x 32-bit.
          for (let i = 0; i < len; i++) {
            out.push({
              gid: U32[infos + i * 5],
              cluster: U32[infos + i * 5 + 2],
              xAdvance: I32[pos + i * 5],
              xOffset: I32[pos + i * 5 + 2],
              yOffset: I32[pos + i * 5 + 3],
            });
          }
          ex.hb_buffer_destroy(buf);
          return out;
        },
      };
    },
  };
}

/** Instantiates HarfBuzz from raw .wasm bytes (exported for tests). */
export async function instantiateHarfBuzz(wasm: BufferSource): Promise<HarfBuzz> {
  let memory: WebAssembly.Memory | null = null;
  const imports = {
    env: {
      _abort_js: () => {
        throw new Error("harfbuzz: abort");
      },
      _emscripten_runtime_keepalive_clear: () => {},
      _setitimer_js: () => 0,
      emscripten_resize_heap: (requested: number) => {
        if (!memory) return 0;
        const needed = (requested >>> 0) - memory.buffer.byteLength;
        if (needed <= 0) return 1;
        try {
          memory.grow(Math.ceil(needed / 65536));
          return 1;
        } catch {
          return 0;
        }
      },
    },
    wasi_snapshot_preview1: {
      proc_exit: (code: number) => {
        throw new Error(`harfbuzz: exit ${code}`);
      },
    },
  };
  const { instance } = await WebAssembly.instantiate(wasm, imports);
  const ex = instance.exports as unknown as HbExports;
  memory = ex.memory;
  ex.__wasm_call_ctors();
  return bind(ex);
}

let hbPromise: Promise<HarfBuzz> | null = null;

/** Fetches and instantiates HarfBuzz once per session. */
export function loadHarfBuzz(url = HARFBUZZ_WASM_URL): Promise<HarfBuzz> {
  if (!hbPromise) {
    hbPromise = (async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Could not load the text shaper (${res.status})`);
      return instantiateHarfBuzz(await res.arrayBuffer());
    })();
    hbPromise.catch(() => {
      hbPromise = null;
    });
  }
  return hbPromise;
}
