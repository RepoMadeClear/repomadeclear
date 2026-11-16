# Interactive Map Styling Reference

This is a source-based snapshot of the current visual design. The **primary map** is the authenticated workspace (`src/workspace/index.html` + `src/workspace/style.css` + `src/workspace/app.js`). The offline CLI editor and legacy design preview are separate visual surfaces, described separately below. The workspace stylesheet is formatted as readable CSS; other compacted stylesheets remain separate.

## Primary workspace: page frame

| Part | Current design |
|---|---|
| Font stack | `Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; no font is loaded from an external service. |
| Root colors | Ink `#202936`; body background `#f3f5f8`; primary card `#fff`. |
| Global sizing | `box-sizing:border-box`; body margin 0. |
| Header | 66px white flex bar, bottom border `#e1e6ed`, horizontal padding 32px. Brand 17px with 12px gap; badge 10px with gray-blue fill. |
| Main frame | Centered with 1680px max-width and 22px/28px padding. `.workspace` is white, `#dce2ea` border, 16px radius, clipped, subtle shadow. |
| Main toolbar | Flex row with 22px/28px padding and `#e8ecf1` bottom border; actions wrap. At 700px and narrower it becomes a block with 18px padding. |
| Buttons | White, 12px, 8px radius, `#d5dce6` border and 8px/12px padding. Hover `#f2f5fa`. Primary action is `#202936` with white text; hover `#36445b`. Focus ring: 3px `#527bf6`, 3px offset. |
| Page headings | H1 24px, `-.7px` tracking; eyebrow 10px, `.16em` tracking, gray `#8891a1`; paragraphs 13px/1.65, `#667186`. |
| Canvas bar | Breadcrumb/zoom row, 12px text, 9px/22px padding, `#e8ecf1` bottom border. Zoom controls have 7px gap and smaller 5px/10px button padding. |

Source: `src/workspace/style.css`; page elements: `src/workspace/index.html`.

## Primary workspace: canvas and responsive behavior

| Selector | Effective current styling |
|---|---|
| `.layout` | Grid: `minmax(0,1fr) 350px` on wide screens, 320px panel at max 1100px, stacked at max 900px. |
| `#viewport` | Relative, clipped, `touch-action:none`; 20px pale dotted grid and grab cursor. Desktop height `min(70vh,780px)`, min-height 560px; tablet/mobile uses 620px/520px. |
| `#diagram` | SVG fills the viewport (`width:100%;height:100%;display:block`). The changing `viewBox` performs pan and zoom. |
| `.canvas-hint` | Bottom-center overlay; translucent white with subtle border/shadow, muted 10px text, 7px/11px padding; pointer events disabled. It explains component/arrow inspection, two-finger panning, pinch or Cmd+scroll zoom, and component dragging. |
| `aside` | Explanation panel with `#e3e8ef` left divider, 22px/24px padding, scrolling. Desktop height `min(70vh,780px)`, min-height 560px. At max 900px it follows the canvas with auto height. |
| `.explorer` | Flex row, 12px gap, 9px/22px padding, `#e8ecf1` bottom border, 12px text. At max 900px it wraps. |
| `.explorer input` | 9px/12px padding, width up to 390px, 1px `#ccd5e2` border, 8px radius. At max 900px it becomes full width. |
| `#search-results` | Absolute dropdown at top 50px/left 185px, z-index 5, white, `#d5dce8` border, 10px radius, `0 12px 35px #24385720` shadow, 320px max-height, scrollable, max width 650px, 10px padding. |
| `#tour` | Dark `#202938` strip, white text, flex layout, `16px 24px` padding, 24px gap. Its body copy is `#bbc6d7`, 12px, max-width 750px. Controls use `#344156` with `#4c5970` border. At max 700px it stacks. |
| `footer` | Flex/wrap, 18px gap, spaced, 10px `#8992a2`, 13px/22px padding, top border `#e8ecf1`. The legend has distinct line samples for each connection provenance. |

Responsive rules: max 1100px narrows header padding to 18px, hides `.header-note`, reduces main padding and narrows the inspector. Max 900px stacks map/panel layout, wraps the search row and removes input minimum width. Max 700px hides the brand badge, stacks the toolbar/tour, changes the title to 21px and reduces footer spacing. All are in `src/workspace/style.css`.

## Primary workspace: SVG design tokens and selectors

### Overview areas and drilldown containers

Overview areas are individual white cards rather than a card inside a redundant group container. The renderer’s palette supplies a narrow muted accent per card. The graph-aware layout uses 336×148 SVG-unit cards and variable positions derived from supported relationships. In drilldown, `.group-box` remains a softly tinted parent boundary around individual components.

The renderer’s `palette` in `src/workspace/app.js` has six `[fill,border,label]` triples for drilldown containers and overview accents:

| Index | Fill | Border | Label |
|---:|---|---|---|
| 1 | `#f1f5fb` | `#cbd7e8` | `#49627f` |
| 2 | `#f5f1fa` | `#d8cbe8` | `#745b91` |
| 3 | `#eef7f4` | `#c3ddd3` | `#477b6b` |
| 4 | `#fbf5eb` | `#e4d3b3` | `#896b3c` |
| 5 | `#f0f5f9` | `#cfdae4` | `#58738c` |
| 6 | `#faf0f1` | `#e5ccd0` | `#95676f` |

`.group-box` is a solid 1.2px stroke with 14px corners and a softly tinted fill; colors come from SVG attributes, not CSS. `.group-label` is 650-weight 13px sans-serif and appears only on the drilldown parent container.

### Component cards

| Selector / attribute | Current value |
|---|---|
| `.node` | Pointer cursor. Runtime class also gains `.selected` or `.dim` as appropriate. |
| `.node-box` | White fill, `#cbd4e0` 1.1px border, 10 SVG-unit radius and subtle shadow. |
| `.node:hover .node-box` | Stroke `#6381bd`, width 1.8. |
| `.node.selected .node-box` | Fill `#f3f7ff`, stroke `#436bb0`, width 2. |
| `.node-title` | 550-weight 14px sans-serif, `#2e3b4e`. |
| `.node-subtitle` | 11px sans-serif, `#7d899b`. On overview cards, this is a brief evidence-supported area description. |
| `.node-count` | 10px sans-serif, `#8994a4`; one muted component count per overview card. |
| `.node-icon` | 13px sans-serif; SVG icon fill is assigned inline as `#7588a3`. |
| `.dim` | Opacity `.24`; `.node,.edge` transition opacity over `.2s`. |

Markup and card dimensions are generated by `draw()` (`src/workspace/app.js`). Overview cards summarize one responsibility and show its count once. Drilldown component rectangles are 316×64 SVG units. Text truncation and graph-aware positions are set in the renderer/layout helper.

### Connections and arrowheads

| Selector / attribute | Current value |
|---|---|
| `.edge[data-certainty='detected']` | Solid `#69819b`, 1.4px stroke, `.58` opacity until focused. |
| `.edge[data-certainty='inferred']` | Dotted `#bd812f`, 1.4px stroke. |
| `.edge[data-certainty='human-supplied']` | Dashed `#956bb1`, 1.6px stroke. |
| `.edge[data-certainty='mixed']` | Solid neutral `#52627a`; opens to per-relationship provenance. |
| `.edge.active` | Retains the provenance color/pattern, increases to 2.2px, and uses full opacity. |
| `.edge-hit` | Transparent 14px stroke, `pointer-events:stroke`, pointer cursor. It is a separate hit target above the visible path. |
| `.edge-hit:hover` | Translucent blue `#527bf626` stroke. |
| Arrow markers | Four SVG markers use viewBox `0 0 6 6`, 4×4 marker size, `refX=5.2`, `refY=3`; arrowhead color matches provenance or uses neutral mixed evidence (`app.js`). |

`src/workspace/overview-routing.js` condenses cycles into stable layout layers, retains disconnected areas, and routes one orthogonal, rounded arrow per ordered area pair. Routes attach to card borders, avoid padded card bounds, and apply congestion penalties so unrelated and opposing routes tend to use different lanes. Overview counts are not drawn on the arrows; the inspector shows relationship totals and mixed provenance composition. Group drilldown retains fan-offset cubic Bézier paths. Clicking an overview route opens every member relationship with provenance, plain-English descriptions, and source evidence in the inspector.

### Supporting panel styles

These are also in `src/workspace/style.css`:

- `aside h2`: 20px, line-height 1.3, margin `12px 0`; `aside h3`: 10px uppercase, `.1em` tracking, `#768398`.
- `.plain-explanation`: 14px/1.75, `#344256`.
- `.path`: 11px/1.7 monospace, `#778298` on `#f5f7fa`, 9px padding.
- `.basis`: 10px, `#82612d` on `#fff9eb`, `#f0e2bf` border.
- `.evidence`: 2px left border `#91a9d8`, background `#f6f8fc`, 11px/1.7 monospace; links `#3059a8`.
- `.panel-tabs`: flex/wrap, 5px gap; pressed tab `#edf3ff` background, `#9eb4df` border, `#254b85` text.
- `.connection-card`: `#e1e7ef` border, 9px radius; first action is semibold, final action is borderless `#365fae`.
- `.connection-heading` and `.certainty-badge`: source/target title and a provenance-specific badge for each overview relationship.
- `#search-results` buttons occupy full width and align left.

Content and class assignment live in `src/workspace/app.js:53–90`; CSS alone does not determine the panel’s layout or content.

## Generated inline styles and SVG attributes

The workspace has no inline `style=""` declarations for its map elements. Instead:

- `draw()` creates SVG elements and sets `fill`, `stroke`, `d`, `marker-end`, `data-certainty`, `class`, `aria-label`, dimensions, and coordinates (`src/workspace/app.js:14,29–46`).
- Runtime classes include `group-box`, `group-label`, `node`, `selected`, `dim`, `node-box`, `node-icon`, `node-title`, `node-subtitle`, `node-count`, `edge`, `active`, and `edge-hit`.
- `#diagram`’s `viewBox` and `#zoom-label` are updated by JavaScript (`app.js:49`).
- SVG export inserts a separate inline stylesheet before serializing; it defines group/card labels and all edge provenance styles (`app.js`). If redesigning export appearance, edit that string too.
- The legacy CLI SVG renderer does use JavaScript inline CSS dimensions on `<svg>`: `svg.style.width` and `.height` are calculated from node coordinates (`src/editor-client.js:35–40`).

## Other visual surfaces (do not confuse with the workspace)

### Offline CLI map editor

`src/map.js:13–21` embeds `src/map.css` into the generated HTML. That stylesheet (`src/map.css:1`) uses a different palette and layout:

- CSS variables: ink `#17352f`, muted `#60736f`, line `#dce5df`, teal `#136c54`, paper `#f4f6f2`.
- System UI font; white header/panels; green accent; 220px component catalog, flexible graph, 290px inspector; 14px/12px rounded panel surfaces.
- `.map-scroll` is 440px high with a 20px green-gray dotted grid.
- `.component rect`: white with `#b6cfc1` stroke; selected/focused card gets `#137154` 3px stroke; human node fill `#fff9ed`, border `#cfab76`.
- `.connection`: `#9aaea4` 2px; hover/selected `#136c54` 4px; `.human-line` is `#ae7536`, dash `7 5`.
- Responsive breakpoints are 1050px (inspector moves below graph) and 650px (single-column layout; 350px graph viewport).
- Full selector inventory for `src/map.css:1`: `:root`, `*`, `body`, `header`, `.brand`, `.local-tag,.eyebrow`, `.local-tag`, `.toolbar`, `.notice`, `main`, `h1`, `h2`, `h3`, `.eyebrow`, `.heading`, `.heading p`, `.author`, `.muted`, `.stats`, `.stats strong`, `#status`, `.workspace`, `.catalog`, `.catalog h2`, `.list-item`, `.list-item span`, `.list-item small`, `.list-item:hover,.list-item.active`, `.map-panel`, `.map-heading`, `.map-scroll`, `#graph`, `.connection`, `.connection:hover,.selected-line`, `.human-line`, `.component`, `.component rect`, `.component.selected rect,.component:focus rect`, `.component text`, `.component .node-kind`, `.human-node rect`, `.legend`, `.human-key`, `.inspector`, `.inspector h2`, `.below`, `.below>section,.coverage`, `.coverage`, `details`, `summary`, `form`, `label`, `input,select,textarea`, `textarea`, `button,.button`, `button:hover,.button:hover`, `button:focus-visible,summary:focus-visible,.button:focus-within`, `.toolbar button,.toolbar .button`, `.button input`, `hr`, `.review-tag`, `article`, `blockquote`, `code`, `li`. Responsive selectors are `.workspace`, `.inspector`, `.map-heading .muted` at max-width 1050px; and `header`, `.toolbar`, `.notice`, `main`, `.heading`, `.author`, `.stats`, `.workspace`, `.catalog`, `.map-scroll`, `.below`, `.local-tag`, `h1` at max-width 650px.
- Other notable current `map.css` declarations: `.workspace` starts as a 220px catalog / flexible graph / 290px inspector grid, then at 1050px becomes 180px plus flexible graph while the inspector moves below; at 650px the workspace stacks. `.catalog` is scrollable and max-height 620px (190px on mobile); `.map-scroll` is 440px high (350px on mobile). `.list-item` is a full-width transparent catalog button; hover/active fill is `#e9f3ee`. `.map-panel` uses `#fafcf9`. `.legend` has 18px gap and a `#95622a` human key. `.inspector` has 20px padding and a left border that changes to a top border in the 1050px layout. The remaining selector declarations—including typography, forms, button focus, coverage cards, review tags and source articles—are on the same stylesheet line and use the color variables listed above.

The SVG uses 270×62 cards and cubic Bézier edges with a 9×9 marker. Component and connection class strings (`component`, `human-node`, `selected`, `connection`, `human-line`, `selected-line`) are created by `src/editor-client.js:35–60`; positioning and pointer drag behavior are at `editor-client.js:28–84`.

### Legacy design-preview renderer

`dev/diagram-preview/index.html`, `dev/diagram-preview/app.js`, `dev/diagram-preview/model.js`, and `dev/diagram-preview/style.css` form a separate older preview. Its stylesheet has a white/gray design and the same general six-color group palette as the workspace, but its source differs. It sets cards through `.node-box`, `.node-title`, `.node-subtitle`, group styles and edge styles. It uses a 3-column SVG group layout, click/double-click group navigation, a guided tour, zoom and pan (`dev/diagram-preview/app.js:22–54`). The current `npm run preview:diagram` instead copies `src/workspace/style.css` and uses `src/workspace/app.js` (`scripts/preview-diagram.js:18–21`).

### Static scan overview

The account-page preview in `src/web/client.js:105–137` has a simpler SVG. Relevant CSS in `src/web/style.css:3,5`: `#real-map` has a gray border, 12px radius, 12px padding and scrolling; `#real-map svg` is responsive; `.map-link` is gray `#999` 2px; `.map-node` is white with dark `#222` 1.5px border; text is black 15px sans-serif, counts are gray 12px. These are not the detailed workspace styles.

## Where to customize

- **Workspace palette:** `src/workspace/app.js:9`.
- **Workspace group/node/edge geometry and SVG content:** `src/workspace/app.js:28–48`.
- **Workspace visual CSS and responsive rules:** `src/workspace/style.css`.
- **Explanation/evidence panel content and HTML structure:** edit `src/workspace/app.js`; panel CSS is in `style.css`.
- **Exported SVG styling:** `src/workspace/app.js:114`.
- **CLI map visual redesign:** `src/map.css:1`; adjust corresponding SVG markup in `src/editor-client.js:35–60`.
- **Account-page preview only:** `src/web/style.css:3,5` and its renderer in `src/web/client.js:105–137`.
