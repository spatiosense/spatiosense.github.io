# Viewer loading brand

`spatio-cube.min.js` is generated from the repository's `spatio-logo/`
subrepo. It includes the shader and supports progress-controlled pulse reveal.
The initializer uses a scene-sized canvas with a responsive cube framing margin,
so the pulsing dot field covers the entire viewer before gathering into the logo.
The loader opts into `pulseOrganic: 1`: irregular, slowly drifting field dots
and order-preserving cube convergence avoid stacked nearest-grid origins.
Background dots softly recede around the projected cube silhouette.
`pulseRotate: true` introduces gentle pointer tilt as the mark gathers; the
wordmark stays flat, with the package’s pointer-driven black-to-purple colour
shift. Reduced motion disables both interactions. Independent pulse phases and a drifting glow keep the background organic
without concentric inward waves; nearby field dots gain up to 12% radius on hover.
Reduced motion also disables that proximity response. `pulseNoise` controls
the initial positional scatter.
This mode is implemented in `spatio-logo/shader/pulse.wgsl`; the default logo
mode is unchanged for other consumers. A soft dot mask keeps text legible
without a card boundary. A soft purple gradient drifts behind the particles;
reduced motion holds it still. On startup, particles grow from zero radius over
a short staggered entrance; completion is never delayed by it. The download
bar updates immediately from the reported byte ratio.
Progress jumps ease the cube over a short transition while byte counts remain
exact. A cached download can skip byte events: completion still shows the
formed cube during runtime startup, without replaying the particle entrance.
During preparation, a compositor animation gently breathes and tilts the cube
even when synchronous WASM startup pauses its JavaScript shader loop. Reduced
motion disables this animation; it does not add a minimum loading duration.

It passes `pulseAuto: "off"`; `pulseReveal` follows download bytes
and reaches 1 only when Trunk reports runtime success. Background dots retain
their pulse strength through 98% of the download, then fade over the final 2%,
independently of the cube convergence, which finishes by 15% of the download.
A soft white radial halo behind the wordmark and status keeps them readable
without introducing a card edge. Unknown totals and runtime
preparation remain indeterminate. Reduced motion uses the static logo.

Regenerate the bundle from the repository root:

```sh
rtk proxy mise exec -- bun --cwd spatio-logo run build
rtk proxy cp spatio-logo/dist/spatio-cube.min.js embodx/www/brand/spatio-cube.min.js
rtk proxy cp spatio-logo/dist/spatio-cube.min.js web/src/vendor/spatio-cube.min.js
rtk proxy cp spatio-logo/wordmark.svg embodx/www/brand/wordmark.svg
```

`logo-cube.webp` is the existing lossless fallback from
`web/public/brand/logo-cube.webp`. Keep it aligned when the cube artwork changes.
Retain the bundle's copyright notice. Trunk copies this directory into each
backend bundle, so standalone and directly mounted viewers resolve assets beside
their initializer without depending on the host's root or a third-party CDN.

The loader's completion signal means runtime initialization returned; it does
not claim that remote site assets or every point-cloud node have loaded. The
viewer owns those subsequent loading states. A brief opacity transition reveals
the viewer; it adds no artificial minimum load duration.
