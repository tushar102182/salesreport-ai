# PDF fonts

`NotoSansBengaliUI-Regular.ttf` / `NotoSansBengaliUI-Bold.ttf` are **Noto Sans Bengali** (hinted TTF from
<https://github.com/notofonts/bengali>) merged with the **Latin-1, punctuation and currency-symbol subset of
Noto Sans**, so a single font renders mixed Bangla + English text (pdfkit has no per-glyph font fallback).

Both fonts are © The Noto Project Authors and licensed under the **SIL Open Font License 1.1** (`OFL.txt`).
"Noto" is not a Reserved Font Name, so the merged derivative may be redistributed under the OFL.

Rebuild (Python + fontTools):

```bash
pip install fonttools
for w in Regular Bold; do
  pyftsubset NotoSans-$w.ttf --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20A0-20CF,U+2122,U+2190-2193,U+2212,U+2215,U+25CF,U+25B2,U+25BC" \
    --layout-features='*' --no-hinting --output-file=lat-$w.ttf
  pyftsubset NotoSansBengali-$w.ttf --unicodes='*' --layout-features='*' --no-hinting --output-file=bn-$w.ttf
  python -c "from fontTools.merge import Merger; Merger().merge(['bn-$w.ttf','lat-$w.ttf']).save('NotoSansBengaliUI-$w.ttf')"
done
```

To use another font (e.g. Hind Siliguri, which already contains Latin + Bengali), drop the TTFs here and
update `apps/server/src/modules/pdf/fonts.ts`.
