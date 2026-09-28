# Bundled fallback fonts

Loaded on demand by `src/lib/unicodeText.ts` (Text to PDF, OCR text layer) only
when the text contains characters the standard PDF fonts can't encode.

Source: Noto fonts (SIL Open Font License 1.1, see `OFL.txt`), static wght=400
instances, subset with `pyftsubset --layout-features='*'` (shaping tables kept):

| File | Coverage |
| --- | --- |
| NotoSans-Regular.subset.ttf | Latin, Latin Extended, Greek, Cyrillic, general punctuation, currency |
| NotoSansDevanagari-Regular.subset.ttf | Devanagari, Vedic extensions, Devanagari Extended |
| NotoSansArabic-Regular.subset.ttf | Arabic, Arabic Supplement / Extended-A, presentation forms |
| NotoSansSymbols2-Regular.subset.ttf | Dingbats (✓ ✗ ★), geometric shapes, misc symbols |
| NotoSansMath-Regular.subset.ttf | Arrows, mathematical operators |

HarfBuzz (`public/vendor/harfbuzz/harfbuzz.wasm`, from harfbuzzjs, MIT/Old MIT)
shapes Devanagari and Arabic runs.
