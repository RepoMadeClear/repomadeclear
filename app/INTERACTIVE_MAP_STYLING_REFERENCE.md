# Interactive Map Styling Reference

This is a source-based snapshot of the current visual design. The **primary map** is the authenticated workspace (`src/workspace/index.html` + `src/workspace/style.css` + `src/workspace/app.js`). The offline CLI editor and legacy design preview are separate visual surfaces, described separately below. The CSS files are compacted to one physical line, so source references for their selectors point to line 1.

## Primary workspace: page frame

| Part | Current design |
|---|---|
| Font stack | `Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; no font is loaded from an external service. |
| Root colors | Ink `#202936`; body background `#f6f7f9`; primary card `#fff`. |
| Global sizing | `box-sizing:border-box`; body margin 0. |
| Header | 68px white flex bar, bottom border `#e2e6ed`, horizontal padding 28px. Brand 18px with 12px gap; badge 10px with gray-blue fill. |
| Main frame | 20px padding. `.workspace` is white, `#dce1e8` border, 14px radius, clipped, subtle `0 4px 20px #17264104` shadow. |
| Main toolbar | Flex row with 22px/26px padding and `#edf0f4` bottom border. At 700px and narrower it becomes a block with 18px padding. |
| Buttons | White, 12px, 7px radius, `#dce1e9` border and 8px/12px padding. Hover `#f1f4fa`. Primary action is `#202936` with white text; hover `#36445b`. Focus ring: 3px `#527bf6`, 3px offset. |
| Page headings | H1 24px, `-.7px` tracking; eyebrow 10px, `.16em` tracking, gray `#8891a1`; paragraphs 13px/1.65, `#667186`. |
| Canvas bar | Breadcrumb/zoom row, 12px text, 12px/24px padding, `#edf0f4` bottom border. Zoom controls have 8px gap and smaller 5px/10px button padding. |

Source: `src/workspace/style.css:1`; page elements: `src/workspace/index.html:1–7`.

## Primary workspace: canvas and responsive behavior

| Selector | Effective current styling |
|---|---|
| `.layout` | Grid: `minmax(0,1fr) 370px` for wide screens. The stylesheet first sets 315px and an earlier max-1000px rule sets 270px, but the later equal-specificity 370px declaration wins. At max 900px layout becomes block. |
| `#viewport` | Relative, clipped, `touch-action:none`; dotted background `radial-gradient(#e5e9f0 .65px,transparent .65px)` repeated every 18px. Effective height `calc(100vh - 340px)`, min-height 560px. Earlier declarations of `calc(100vh - 300px)` and mobile 550px are overridden by the later, more-specific `.layout #viewport` rule. |
| `#diagram` | SVG fills the viewport (`width:100%;height:100%;display:block`). The changing `viewBox` performs pan and zoom. |
| `.canvas-hint` | Bottom-center overlay; translucent white `#ffffffdf`, muted `#818b9b`, 10px text, 7px padding, 5px radius; pointer events disabled. |
| `aside` | Explanation panel with `#e6eaf0` left divider, 24px padding, scrolling. Later layout rule sets max-height to `calc(100vh - 340px)`. At max 900px it follows the canvas as a block with auto height and no max-height. |
| `.explorer` | Flex row, 14px gap, 12px/24px padding, `#e5e9f0` bottom border, 12px text. At max 900px it wraps. |
| `.explorer input` | 10px/12px padding, min width 280px, 1px `#ccd5e2` border, 7px radius. At max 900px the minimum is removed and width becomes 100%. |
| `#search-results` | Absolute dropdown at top 56px/left 24px, z-index 5, white, `#d5dce8` border, 10px radius, `0 12px 35px #24385720` shadow, 320px max-height, scrollable, max width 650px, 10px padding. |
| `#tour` | Dark `#202938` strip, white text, flex layout, `16px 24px` padding, 24px gap. Its body copy is `#bbc6d7`, 12px, max-width 750px. Controls use `#344156` with `#4c5970` border. At max 700px it stacks. |
| `footer` | Flex/wrap, 20px gap, spaced, 10px `#8992a2`, 12px/24px padding, top border `#edf0f4`. Small legend dot is 6px circle `#667ca6`. |

Responsive rules: max 1000px narrows header padding to 18px, hides `.header-note`, and reduces main padding to 12px. Max 900px makes map/panel layout block, wraps the search row and removes input minimum width. Max 700px hides the brand badge, stacks the toolbar/tour, changes the title to 21px and footer gap to 8px. Because of cascade order, the final viewport minimum remains 560px even though an earlier max-700 rule says 550px. All are in `src/workspace/style.css:1`.

## Primary workspace: SVG design tokens and selectors

### Group containers

The renderer’s `palette` in `src/workspace/app.js:9` has six `[fill,border,label]` triples:

| Index | Fill | Border | Label |
|---:|---|---|---|
| 1 | `#f1f6ff` | `#a8bdeb` | `#456cb5` |
| 2 | `#f5f1ff` | `#c0afea` | `#805bb6` |
| 3 | `#edf9f7` | `#93c9bd` | `#378a7a` |
| 4 | `#fff8ef` | `#e4c491` | `#a27b3c` |
| 5 | `#f2f7fc` | `#b4c8df` | `#5d7b9f` |
| 6 | `#fff4f5` | `#e5b9bf` | `#a76976` |

`.group-box` is a 1px dashed (`5 4`) stroke; the fill and border come from SVG attributes, not CSS. `.group-label` is 600-weight 12px sans-serif; its color is an inline SVG `fill` from the palette (`style.css:1`, `app.js:9,35`).

### Component cards

| Selector / attribute | Current value |
|---|---|
| `.node` | Pointer cursor. Runtime class also gains `.selected` or `.dim` as appropriate. |
| `.node-box` | White fill, `#d6dce7` 1px border, 7 SVG-unit corner radius set in the renderer. |
| `.node:hover .node-box` | Stroke `#6081dc`, width 1.7. |
| `.node.selected .node-box` | Fill `#f5f8ff`, stroke `#4068df`, width 2. |
| `.node-title` | 500-weight 11px sans-serif, `#354158`. |
| `.node-subtitle` | 9px sans-serif, `#929bad`. Text is the last component path segment. |
| `.node-icon` | 12px sans-serif; SVG icon fill is assigned inline as `#7d8cab`. |
| `.dim` | Opacity `.13`; `.node,.edge` transition opacity over `.2s`. |

Markup and card dimensions are generated by `draw()` (`src/workspace/app.js:46`). Overview node rectangle is 294×54 SVG units; drilldown node rectangle is 290×58. Text truncation and card positions are in `app.js:17,30–38,46`.

### Connections and arrowheads

| Selector / attribute | Current value |
|---|---|
| `.edge` | `fill:none`, stroke `#a3afc2`, width 1.2. |
| `.edge.active` | Stroke `#4573e9`, width 2.5, dash `7 4`. A previous `flow` animation is overridden later by `animation:none`, so there is no active moving dash in the effective rule. |
| `.edge[data-certainty='human-supplied']` | Ochre `#b18449`, dash `5 4`; selected/active-edge styling can override these properties. |
| `.edge-hit` | Transparent 12px stroke, `pointer-events:stroke`, pointer cursor. It is a separate hit target above the visible path. |
| `.edge-hit:hover` | Translucent blue `#527bf630` stroke. |
| Arrow marker | SVG marker uses viewBox `0 0 10 10`, 6×6 marker size, `refX=9`, `refY=5`; arrow polygon fill `#8d9bb0` (`app.js:29`). |

Path geometry is generated in `src/workspace/app.js:39–45`. Paths use right-angle horizontal/vertical bends and suppress duplicate visible routes for repeated edges with the same displayed endpoints. The renderer sets runtime classes and `data-certainty`; CSS provides the visible treatment.

### Supporting panel styles

These are also in `src/workspace/style.css:1`:

- `aside h2`: 20px, line-height 1.3, margin `12px 0`; `aside h3`: 11px uppercase, `.09em` tracking, `#7b8595`.
- `.plain-explanation`: 15px/1.8, `#344256`.
- `.path`: 11px/1.7 monospace, `#778298` on `#f5f7fa`, 9px padding.
- `.basis`: 10px, `#8d6a30` on `#fffaed`, `#f4e9cb` border.
- `.evidence`: 2px left border `#a7b9f0`, background `#f7f9ff`, 11px/1.7 monospace; links `#3059a8`.
- `.panel-tabs`: flex/wrap, 4px gap; pressed tab `#edf3ff` background, `#6487df` border, `#254b9d` text.
- `.connection-card`: `#e1e7ef` border, 9px radius; first action is semibold, final action is borderless `#365fae`.
- `#search-results` buttons occupy full width and align left.

Content and class assignment live in `src/workspace/app.js:53–90`; CSS alone does not determine the panel’s layout or content.

## Generated inline styles and SVG attributes

The workspace has no inline `style=""` declarations for its map elements. Instead:

- `draw()` creates SVG elements and sets `fill`, `stroke`, `d`, `marker-end`, `data-certainty`, `class`, `aria-label`, dimensions, and coordinates (`src/workspace/app.js:14,29–46`).
- Runtime classes include `group-box`, `group-label`, `node`, `selected`, `dim`, `node-box`, `node-icon`, `node-title`, `node-subtitle`, `edge`, `active`, and `edge-hit`.
- `#diagram`’s `viewBox` and `#zoom-label` are updated by JavaScript (`app.js:49`).
- SVG export inserts a separate, small inline stylesheet before serializing; it defines only `.node-box`, `.node-title`, `.node-subtitle`, `.group-label`, and `.edge` (`app.js:114`). If redesigning export appearance, edit that string too.
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
- **Workspace visual CSS and responsive rules:** `src/workspace/style.css:1`.
- **Explanation/evidence panel content and HTML structure:** `src/workspace/app.js:53–90`; panel CSS is in `style.css:1`.
- **Exported SVG styling:** `src/workspace/app.js:114`.
- **CLI map visual redesign:** `src/map.css:1`; adjust corresponding SVG markup in `src/editor-client.js:35–60`.
- **Account-page preview only:** `src/web/style.css:3,5` and its renderer in `src/web/client.js:105–137`.
