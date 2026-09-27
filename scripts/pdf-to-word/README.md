# PDF to Word: evaluation scripts

These scripts check the in-browser PDF to Word converter against real PDFs. They are
not part of the app build.

- `convert-in-browser.mjs out-dir a.pdf [b.pdf ...]` runs the real tool page in
  headless Chromium (Playwright) against a static build and saves each `.docx`. It also
  reports the time taken and the longest main-thread task. Serve the build first:
  `npm run build && PORT=4175 node e2e/static-server.mjs`. Override the address with
  `BASE=...`.
- `measure.mjs in.pdf out.docx [--ref ref.txt] [--raw] [--json] [--no-soffice]` compares
  the words in the `.docx` with `pdftotext` output. Use `--raw` to compare with
  `pdftotext -raw` instead, or `--ref` to use a given text file (for scans). It prints:
  - word recall (bag of words)
  - ordered recall: LCS overall and per page, plus coverage by 12-word runs
  - headings, bold/italic runs, tables (rows × cols), and embedded images
  - whether LibreOffice opens the file (`soffice --headless --convert-to pdf`)

  Needs `pdftotext`/`pdfinfo` (poppler-utils) and, unless you pass `--no-soffice`,
  LibreOffice.

## Test set

```sh
mkdir -p testdata && cd testdata
curl -LO https://arxiv.org/pdf/1706.03762          && mv 1706.03762 arxiv-1706.03762.pdf  # Transformer (single column)
curl -LO https://arxiv.org/pdf/1512.03385          && mv 1512.03385 arxiv-1512.03385.pdf  # ResNet (two columns)
curl -LO https://www.irs.gov/pub/irs-pdf/fw9.pdf                                           # IRS W-9 form
# Table-heavy: pages of NIST SP 330 (The International System of Units)
curl -LO https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.330-2019.pdf
for p in 22 31 33 34 39 41; do pdfseparate -f $p -l $p NIST.SP.330-2019.pdf nist-$p.pdf; done
pdfunite nist-22.pdf nist-31.pdf nist-33.pdf nist-34.pdf nist-39.pdf nist-41.pdf nist-si-tables.pdf
```

Scanned input: wrap a skewed page scan (JPEG) into an image-only PDF, for example with
`img2pdf scan.jpg -o skewed-scan.pdf`. Then measure with `--ref` against the page's real
text.
