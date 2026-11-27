# Jellycat Studio branding

The approved identity is the original filled cat face, with level open eyes, centred stepped-circle pupils and one square
reflection in each pupil. The mark is the same in print and on screen. The earlier placeholder and exploratory alternatives
are not part of this kit.

## Files

- `source/mark.json`: the canonical, editable vector paths. The site, link previews and exporter all read this file.
- `svg/`: mark-only, horizontal and stacked lockups in black, reversed white, green, amber and phosphor white. All lettering is
  outlined; all artwork is vector. These are the preferred print masters.
- `png/`: matching transparent exports at 512px and 2400px wide, with 300ppi metadata.
- `icons/`: SVG favicons in each phosphor, the 16/32/48px ICO and PNGs, 180px Apple touch icon, 192/512px bookmark icons,
  a 512px maskable version and 512px avatars.
- `fonts/`: the site's existing VT323 Latin font and its SIL Open Font License.
- `palette.json`: the exact inks and backgrounds; screen colours are read from `app/app.css`.
- `index.html`: open this local file for the visual guide. `preview.png` shows the kit at a glance.

## Use

Keep the silhouette, eye proportions and reflections together. Preserve the aspect ratio. Use one ink, with no added stroke,
shadows, smoothing or gradients. Give the mark clear space of about one pupil diameter in print and marketing layouts; the
compact site icon slots keep their existing dimensions.

Use black on light paper and white for reverse artwork. Use the SVG when placing the logo into a document; the PNGs are for
software that needs raster images. Check a physical proof at the intended size before commercial printing. The screen-only
CRT effects belong to the site, not the exported artwork.

The companion wordmarks retain the existing VT323 typeface and studio name. They do not change the live site's text layout.
Their letterforms are converted to paths so a recipient does not need the font installed.

## Rebuild

From the repository root, after `pnpm install --frozen-lockfile`:

```sh
pnpm branding
```

The generator uses the canonical paths, current phosphor tokens and bundled VT323. Generated assets are committed with their
source. The site serves the generated favicon, touch icon and bookmark icons from `public/`; its inline mark reads the source
directly. `scripts/og.ts` reads the same source when building link previews.
