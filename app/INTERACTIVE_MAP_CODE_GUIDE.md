# Interactive Map Code Guide

This guide describes the checked-in source as it exists now. “Interactive map” can refer to three related but separate frontends:

1. **Authenticated workspace** — the primary component-and-connection map at `/workspace.html`. It is also reused by the current local design-preview command.
2. **Offline CLI map editor** — a self-contained `map.html` generated after a local repository scan. It has a different layout, renderer, and stylesheet.
3. **Legacy design-preview source** — `app/dev/diagram-preview/`; it is a separate older renderer and is not the entry point used by `npm run preview:diagram`.

The authenticated workspace is the best starting point for redesigning the current interactive map. The scan-result diagram on the account page is a fourth, simpler *static overview*, not the detailed interactive map.

## Complete frontend inventory

| File | Purpose | Important references |
|---|---|---|
| `src/workspace/index.html` | Workspace shell: toolbar, zoom controls, search, SVG canvas, explanation panel, tour controls and footer. | Lines 1–7 |
| `src/workspace/style.css` | Primary workspace styling, including the SVG map, responsive layout, focus, selection, evidence and connection states. It is currently one physical CSS line. | Line 1 |
| `src/workspace/app.js` | Primary renderer and browser interactions: SVG node/group/edge creation, layout, selection, evidence, search, tour, zoom/pan, moving components, edit forms and SVG export. | Lines 1–116 |
| `src/workspace/navigation.js` | Shared SVG viewBox navigation math: wheel-delta normalization, screen-to-viewBox conversion, cursor-centered zoom, zoom limits, fit, and canvas wheel handling. | Lines 1–117 |
| `src/workspace/model.js` | Projects scan data into display nodes/groups and describes evidence-backed connections; validates GitHub evidence URLs. | Lines 1–51 |
| `src/local-workspace-client.js` | Local browser bridge: reads query parameters, calls `/api/github`, and loads the shared workspace renderer. | Lines 1–35 |
| `src/workspace-entry.js` | Hosted browser bridge: uses the managed Supabase session to request map details/edits, then loads the same renderer. | Lines 1–11 |
| `src/overlays.js` | Shared pure model for editable human overlays, layout positions, projection, validation and rescan conflicts. | Lines 1–131 |
| `src/web/client.js` | Account/repository/scan UI. Renders the free overview and navigates to `/workspace.html` after requesting local or hosted access. | Lines 105–152 |
| `src/web/index.html` | Account-page and overview markup; defines the scan result container and “Open interactive map” controls. | Lines 1–2 |
| `src/web/style.css` | Account-page styling plus the separate static overview diagram (`#real-map`). It does not style the detailed workspace. | Lines 1–5 |
| `dev/diagram-preview/index.html` | Legacy design-preview page structure. | Lines 1–7 |
| `dev/diagram-preview/app.js` | Legacy, independently implemented SVG overview, drilldown, tour and pan/zoom interactions. | Lines 1–54 |
| `dev/diagram-preview/model.js` | Legacy map labels and groups. | Lines 1–20 |
| `dev/diagram-preview/style.css` | Legacy preview stylesheet. It shares much of the workspace’s original style but is not identical and is not used by the current preview command. It is one physical line. | Line 1 |
| `src/map.js` | Builds the offline CLI editor as a complete HTML document, inlining scan data and the editor script. | Lines 1–22 |
| `src/map.css` | Styles the offline CLI editor, its catalog, SVG graph, inspector, forms, and responsive layout. It is one physical line. | Line 1 |
| `src/editor-client.js` | Offline CLI editor behavior and SVG graph renderer. It does not use HTTP endpoints. | Lines 1–140 |
| `src/cli.js` | Calls `renderMap` and writes `map.html` beside the local `scan.json`. | Lines 1–25 |
| `scripts/preview-diagram.js` | Current `npm run preview:diagram`: scans a local working-copy snapshot, bundles `src/workspace/app.js`, copies `src/workspace/index.html` and `src/workspace/style.css`, then serves those assets locally. | Lines 1–22 |

The workspace shell is shared between localhost and the hosted app. `scripts/build-hosted.js` copies the workspace HTML/CSS and bundles `src/workspace-entry.js` as the hosted `/workspace.js`; the local server serves `local-workspace-client.js` at that same URL instead. The interactive renderer itself remains `src/workspace/app.js`.

## Frontend architecture and rendering flow

### Authenticated workspace

1. `web/client.js` scans the selected repository and renders a grouped, static preview. On **Open interactive map**, it calls `/api/github/billing-status`, then navigates to `/workspace.html` with the selected installation, repository, and `scanKey` (`src/web/client.js:152`).
2. `workspace/index.html` loads `workspace.css` and `workspace.js` (`src/workspace/index.html:1`). The server/build supplies the appropriate local or hosted browser bridge at `workspace.js`.
3. The bridge calls the backend for `details` and installs `rmcLoadMap` / `rmcSaveEdit` callbacks. The workspace renderer awaits `rmcLoadMap()` before drawing (`src/local-workspace-client.js:1–35`, `src/workspace-entry.js:1–11`, `src/workspace/app.js:1–7`).
4. `workspace/model.js` adds human-readable titles, group labels and relationship explanations to the scan. The renderer projects saved overlay edits over the immutable scan and passes the result through that model (`src/workspace/app.js:1–6`, `src/workspace/model.js:1–33`).
5. `draw()` creates SVG groups, node cards and edges from DOM/SVG elements. The explanation panel is constructed as normal HTML DOM (`src/workspace/app.js:28–48`, `52–90`).

The shell’s main elements are `#diagram` (the SVG), `#viewport` (the clipped/pannable canvas), `#panel` (explanations and evidence), `#breadcrumbs`, `#component-search`, and `#tour` (`src/workspace/index.html:3–7`).

### Other frontends: not the same renderer

- **Offline CLI editor:** `npm run scan -- <repo> ...` calls `renderMap(scan)`, which returns a complete HTML document with `map.css` embedded in a `<style>` tag and scan data/editor code inlined (`src/cli.js:4–22`, `src/map.js:8–21`). `editor-client.js` renders its own `<svg id="graph">`, component catalog and inspector. It is a local developer artifact, not the authenticated `/workspace.html` page.
- **Current local design preview:** `npm run preview:diagram` generates a temporary, local snapshot and uses the workspace HTML, CSS and renderer. It injects an in-memory implementation of the load/save callbacks, so preview edits last only until reload (`scripts/preview-diagram.js:1–22`).
- **Legacy design preview:** `dev/diagram-preview/app.js` is another full SVG renderer. Its page asks for `/scan.json`; it is not the route used by the current `preview:diagram` script (`dev/diagram-preview/index.html:1–7`, `dev/diagram-preview/app.js:1–54`).
- **Free overview:** `web/client.js` draws the small scan-result SVG and list. `web/style.css` styles it via `#real-map`, `.map-node`, `.map-link`, and related rules. It does not provide the detailed node-selection/editing workspace (`web/client.js:105–137`, `web/style.css:3,5`).

## How the workspace draws the map

The renderer’s core uses SVG namespace helpers (`el`) and a keyboard/click activation helper (`activate`). The key geometry and SVG construction are in `src/workspace/app.js:13–16,28–48`.

```js
const palette = [
  ['#f1f5fb','#cbd7e8','#49627f'],
  ['#f5f1fa','#d8cbe8','#745b91'],
  ['#eef7f4','#c3ddd3','#477b6b'],
  ['#fbf5eb','#e4d3b3','#896b3c'],
  ['#f0f5f9','#cfdae4','#58738c'],
  ['#faf0f1','#e5ccd0','#95676f']
];
```

The **overview** classifies components from supported source evidence and relationship types. Direct JS/TS references to browser globals, declared HTTP endpoints, and supported database operations can suggest Frontend or Backend areas; requests and imports alone do not prove execution. Top-level `apps/` and `packages/` roots remain visible as monorepo areas. Dependencies, external integrations, build/development source, and human additions stay in supporting areas. Uncertain components remain in the visible Unclassified area and are arranged with the graph rather than assumed to be tools; every component also remains searchable. Each area card is the group itself, with one muted component count and a short description. Selecting an area emphasizes its direct links; **Explore area** opens its drilldown. Layout is deterministic and graph-aware; cycles share a layer, disconnected groups remain visible, and supporting areas are placed apart. Position is a reading aid, not execution order. Each ordered area pair gets one rounded SVG route with no inline count; the inspector shows its members, certainty composition, explanation, and evidence. In **group drilldown**, component cards are 316×64 SVG units, placed three across at 350-unit horizontal and 112-unit vertical intervals. Saved positions expand the containing group and SVG bounds so **Fit view** includes moved components. Overview classification, aggregation, layout, and routing are in `src/workspace/model.js` and `src/workspace/overview-routing.js`; rendering is in `src/workspace/app.js`.

Each overview area card is an SVG `<g class="node">` containing the area name, a short description, one muted component count, and a narrow accent. Drilldown component cards contain an icon, title, and shortened source path. A selected node receives `selected`; unrelated nodes and edges receive `dim`. **Show all links** clears selection emphasis; **Relayout** recalculates deterministic positions without changing saved manual positions.

Overview edges are SVG paths routed between visible card boundaries with rounded orthogonal corners. Relationships aggregate only by ordered source/target area pair; original edge objects, IDs, certainty, type, and evidence remain available in the inspector. Mixed-provenance arrows use a neutral style, and homogeneous arrows use the detected, inferred, or human-supplied color and pattern. Counts are shown in the inspector, not on routes. In group drilldown, source edges retain fan-offset cubic Bézier routes; duplicate paths are suppressed only when endpoints and certainty match. Wide transparent `.edge-hit` paths keep arrows easy to select. Exported SVG includes the overview routes without count badges (`src/workspace/overview-routing.js`, `src/workspace/app.js`).

The graph uses the DOM/SVG rather than a graph-drawing library. The SVG `viewBox`, generated coordinates, CSS classes and attributes are the visual/rendering controls.

## Styling architecture and selector inventory

### Primary workspace CSS (`src/workspace/style.css`)

The stylesheet is formatted as readable CSS. This table lists its selectors and current declarations, grouped by role.

| Selector(s) | Current declarations / effect |
|---|---|
| `:root` | `font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; text `#202936`; page background `#f3f5f8`; `font-synthesis:none`. |
| `*` | `box-sizing:border-box`. |
| `body` | `margin:0`. |
| `button` | Inherits font/color; pointer cursor; white background; `1px solid #d5dce6`; 8px radius; `8px 12px` padding; 12px type. `button:hover`: `#f2f5fa`. `button:disabled`: opacity `.4`, default cursor. |
| `button:focus-visible, [role=button]:focus-visible` | 3px `#527bf6` outline with 3px offset. |
| `[hidden]` | `display:none!important`. |
| `header` | 66px tall, white flex row, centered/space-between, `0 32px` padding, bottom border `#e1e6ed`. |
| `.brand` | Flex, centered, 12px gap, 17px type. `.brand .badge` is hidden at `max-width:700px`. |
| `.badge` | 10px, `.07em` tracking, `#eef1f6` background, `#5b6680` text, `5px 7px` padding, 5px radius. |
| `.header-note` | 12px, `#7b8595`; hidden at `max-width:1000px`. |
| `main` | Centered with 1680px max-width; 22px/28px desktop padding, reduced at narrower widths. |
| `.workspace` | White, border `#dce2ea`, 16px radius, clipped overflow, subtle shadow. |
| `.toolbar` | Flex, spaced/aligned with wrapping actions, bottom border `#e8ecf1`, `22px 28px` padding; at max 700px becomes block with 18px padding. |
| `.eyebrow` | 10px, `.16em` tracking, weight 700, `#8891a1`. |
| `h1` | 24px, `-.7px` tracking, `7px 0 6px` margin; at max 700px, 21px. |
| `p` | 13px, line-height 1.65, `#667186`, no margin. |
| `.primary` / `.primary:hover` | Dark `#202936` background/border with white text; hover `#36445b`. |
| `.canvas-head` | Flex row, centered, space-between, 12px type, 9px/22px padding, bottom border `#e8ecf1`. |
| `.controls` / `.controls button` | Flex with 7px gap; buttons use `5px 10px` padding. |
| `.layout` | Desktop grid: `minmax(0,1fr) 350px`; 320px panel at max 1100px; stacks at max 900px. |
| `#viewport` | Relative, clipped, `touch-action:none`; 20px pale dotted grid, grab cursor. Desktop height `min(70vh,780px)`, min-height 560px; tablet/mobile uses 620px/520px heights. |
| `#diagram` | Block, width and height 100%. |
| `.canvas-hint` | Bottom-center overlay; translucent white with subtle border/shadow, muted 10px text, 7px/11px padding, `pointer-events:none`. |
| `aside` | Left border `#e3e8ef`, 22px/24px padding, scrollable; desktop height `min(70vh,780px)`, min-height 560px; stacks below map at max 900px. |
| `aside h2` / `aside h3` | H2 20px, line-height 1.3, margin `12px 0`; H3 10px uppercase, `.1em` tracking, `#768398`, margin `22px 0 8px`. |
| `aside .path` | 11px/1.7 monospace, wraps long paths, `#778298` on `#f5f7fa`, 9px padding, 7px radius. |
| `aside .basis` | 10px, `#82612d` on `#fff9eb`, border `#f0e2bf`, 8px/10px padding, 7px radius. |
| `aside button` | Block, full width, left aligned, `8px 0` margin. |
| `aside .evidence` | Left border 2px `#91a9d8`, `8px 10px` padding, `#f6f8fc`, monospace 11px/1.7, wraps paths. |
| `.empty-symbol` | 36px, `#a9b5c7`, `12px 0` margin. |
| `.legend` / `.legend span` | Flex/wrap; four line samples distinguish detected, inferred, human-supplied, and mixed connections. |
| `.group-box` | SVG group container: solid 1.2px border, 14px corners, softly tinted fill. Fill/border come from inline SVG attributes. |
| `.group-label` | SVG 650-weight 13px sans-serif; used for the real parent group in drilldown. |
| `.node-box` | White SVG fill, `#cbd4e0` 1.1px stroke, 10px corners and subtle shadow. |
| `.node-title`, `.node-subtitle`, `.node-icon` | Title 550-weight 14px sans-serif/`#2e3b4e`; subtitle 11px/`#7d899b`; icon 13px sans-serif. |
| `.node` | Pointer cursor. `.node:hover .node-box`: `#6381bd`, 1.8px. `.node.selected .node-box`: `#436bb0`, 2px, `#f3f7ff` fill. |
| `.edge[data-certainty='detected']` | Solid `#69819b` 1.4px stroke, `.58` opacity until focused. |
| `.edge[data-certainty='inferred']` | Dotted `#bd812f` 1.4px stroke. |
| `.edge[data-certainty='human-supplied']` | Dashed `#956bb1` 1.6px stroke. |
| `.edge[data-certainty='mixed']` | Solid neutral `#52627a`; opens to individual relationships. |
| `.edge.active` | Keeps its provenance color/pattern, increases to 2.2px, and uses full opacity. |
| `.edge-hit`, `.edge-hit:hover` | Transparent 14px SVG stroke, stroke-only pointer events, pointer cursor; hover stroke `#527bf626`. |
| `.node-count` | Muted component count, shown once on each overview card. Relationship totals stay in the details panel. |
| `.dim` | Opacity `.24`. `.node,.edge` transition opacity over `.2s`. |
| `.explorer` / `.explorer input` | Flex search row with 12px gap and `9px 22px` padding; input 9px/12px, width up to 390px, `#ccd5e2` border, 8px radius. At max 900px wraps and input becomes full width. |
| `#search-results` / `#search-results button` | Positioned dropdown (top 50px, left 185px, z-index 5), white, 1px `#d5dce8`, 10px radius, `0 12px 35px #24385720` shadow, 320px max-height, scrollable, 650px max-width, 10px padding. Buttons block/full-width/left aligned with 4px vertical margin. |
| `.panel-tabs` / `.panel-tabs button` / `[aria-pressed=true]` | Wrapping flex tabs, 5px gap and `18px 0` margin; tab buttons auto width, zero margin, `7px 9px`, 11px. Pressed tab uses `#edf3ff`, `#9eb4df` border, `#254b85` text. |
| `.plain-explanation` | 14px, line-height 1.75, `#344256`. |
| `.connection-card`, `.connection-heading`, `.certainty-badge` | Card: 1px `#e1e7ef`, 9px radius, `8px 12px`, `10px 0` margin. Overview relationship details show source/target, a provenance badge, explanation, and evidence. |
| `.evidence a` / `.evidence strong` | Link inline-block with 6px top margin and `#3059a8`; `strong` block. `aside .evidence` supplies the evidence block styling above. |
| `aside details` / `aside summary` | Details margin 14px vertical; summary pointer cursor, 12px. |
| `footer` / `.legend` | Footer flex/wrap, spaced, 18px gap, 10px/`#8992a2`, `13px 22px` padding and top border `#e8ecf1`. The legend has line samples for each provenance and mixed-evidence arrows. |
| `#tour`, `#tour p`, `#tour strong`, `.tour-controls`, `.tour-controls button` | Dark `#202938` flex panel with white text, `16px 24px`, 24px gap; paragraph `#bbc6d7`, max-width 750px, 12px; strong 14px; controls flex/6px gap; buttons `#344156` with `#4c5970` border and white text. At max 700px tour becomes block and controls get 14px top margin. |
| `@media(prefers-reduced-motion:reduce)` | Reduces transition duration for all elements. |
| `@media(max-width:1100px)` | 320px inspector, header padding `0 18px`, hide header note, reduce main padding, align toolbar content to the top. |
| `@media(max-width:900px)` | Block map/panel layout; 620px viewport; aside auto-height; search row wraps and input fills available width. |
| `@media(max-width:700px)` | Hide brand badge; stack toolbar/tour; 520px viewport; h1 to 21px; reduce footer spacing. |
| `aside label`, `aside input, aside textarea, aside select`, `aside textarea` | Form labels block/12px; inputs block/full width, 9px padding, `#ccd4df` border, 6px radius, 7px top margin; textarea min-height 120px. |
| `#viewport, aside` | Desktop height `min(70vh,780px)`, min-height 560px. |
| `@media(max-width:900px)` | Aside moves below the map; explorer wraps; search input fills available width. |

`src/workspace/style.css` and `dev/diagram-preview/style.css` are not byte-identical. The current preview script copies the workspace stylesheet, not the legacy preview stylesheet.

### Inline and generated SVG styling

CSS is not the only appearance source:

- `draw()` writes the group rectangle’s `fill` and `stroke` and the group label’s `fill` from the palette; these SVG presentation attributes are in `src/workspace/app.js:9,35`.
- Arrowhead paths get inline fills from the detected, inferred, human-supplied, or mixed-provenance colors in `app.js`.
- Node icon SVG text gets inline `fill:#7588a3`; the SVG `rect` / `text` elements get classes and coordinates at `app.js:46`.
- `class` strings are built at runtime: `.edge`, `.edge.active`, `.edge.dim`, `.node`, `.node.selected`, `.node.dim`, `.group-box`, `.group-label`, `.node-box`, `.node-icon`, `.node-title`, `.node-subtitle`, `.node-count`, and `.edge-hit`.
- SVG export clones the current canvas and inserts its own `<style>` for group containers, cards, labels, and all four edge certainty styles; it does not copy the full workspace stylesheet.
- The account-page static overview is created in `web/client.js` with SVG presentation attributes for group boxes, labels and counts; `.map-node`, `.map-link`, and `#real-map` styles are in `web/style.css:3,5`.

## Interaction, selection and evidence

### Component and connection selection

- `activate()` gives SVG elements `tabindex=0`, `role=button`, click handling, and Enter/Space keyboard activation (`app.js:16`).
- Clicking a node calls `openNode()`, records the previous selected node, highlights connected edges/nodes, and shows its panel. A double-click enters the node’s group; group labels also enter group drilldown (`app.js:35,46,60–61`).
- Clicking the thick transparent `.edge-hit` path opens the relationship explanation, From/To navigation, evidence, and—when source-backed—the connection edit action (`app.js:44,62–68`).
- The panel’s tabs are `What it does`, `Connections`, and `Source evidence`. Connection cards navigate to adjacent components or open the individual connection (`app.js:70–89`).
- Search filters by title/path and opens the chosen result (`app.js:91–96`). The tour follows supported request/endpoint/database relationships and highlights one edge at a time (`app.js:21–26,97–100`).
- Evidence displays file, line range, repository, branch and commit. `evidenceURL()` validates the values before making a GitHub permalink; local or invalid evidence is shown without a GitHub link (`app.js:53–58`, `model.js:40–45`).

### Grouping, zoom, panning and component movement

- The display model groups nodes from explicit scan evidence, relationship types, and top-level app/package structure. Group reasons are presented for review; unsupported roles stay Unclassified. `scanner.js` now records line-bound direct browser-global references for JS/TS; it still does not detect CLI entry points, scheduler configuration, or library export surfaces.
- Overview and drilldown coordinates are calculated afresh inside `draw()`; saved overlay positions are then applied to those positions (`app.js:27–38`).
- Zoom buttons clamp scale to 0.5×–3× and multiply/divide by 1.25. `updateView()` changes the SVG `viewBox` dimensions and updates the percentage label. **Fit view** resets scale and offset; saved positions expand SVG bounds so moved components remain included (`app.js:49–50,101`).
- Two-finger wheel scrolling pans in both axes; Ctrl+wheel (including browser trackpad pinch events) and Cmd+wheel zoom continuously around the pointer. Delta modes are normalized, and screen pixels are converted using the SVG's actual aspect-preserving scale (`navigation.js`).
- Dragging empty canvas uses SVG pointer capture and updates the viewBox offset while moving. The viewport disables browser touch gestures with CSS `touch-action:none` (`app.js:102`, `style.css`).
- Node movement is different from canvas panning: `beginMove()` records pointer-down and pointer-up positions, and saves a changed position when total movement is at least 8 pixels. The current handler does not redraw a live drag preview; the position updates after release (`app.js:46,116`).

## Editing and persistence

The map uses three layers: immutable scanner findings, a human-edit overlay, and presentation positions. `overlays.js` validates/applies notes, human nodes/edges, reconnections, positions and review status; `workspace/model.js` projects their display meaning (`overlays.js:1–131`, `model.js:1–33`).

1. Panel actions build an operation: note, add node, add edge, reconnect, or position (`app.js:105–116`).
2. `save()` sends the operation with the current overlay version through `rmcSaveEdit`, then rebuilds the model and SVG (`app.js:105–108`).
3. The local browser bridge posts to `/api/github` with URL query parameters and the operation (`local-workspace-client.js:1–20`). The local server requires its authenticated session, local-only access gate, connected GitHub session, and a fresh repository lookup before delegating to `localWorkspace` (`server.js:76–79,121–135`).
4. `localWorkspace()` validates the scan key, asks storage only for the current repository/key, decrypts it for the authenticated user, verifies the repository full name, then decrypts or initializes that scan’s overlay (`local-workspace.js:5–20`).
5. `workspaceStorage()` calls `rmc_repository_map` using the signed-in Supabase token, never a service-role key (`workspace-storage.js:3–32`). Migration 010 scopes scan and overlay reads/writes to `auth.uid()`, checks the repository ID/key, and uses an optimistic version check before writing (`migrations/010_authenticated_workspace.sql:3–83`).

In the hosted build, the browser bridge uses the Supabase session and sends requests to `/api/github`; the hosted handler calls `paidMap()`, which checks payment and repository access before loading encrypted scan data and saving the overlay (`workspace-entry.js:1–11`, `github-api.js:83–92`, `paid-map.js:5–58`). The shared renderer is the same; local-only free access does not change the hosted entitlement path.

The separate CLI editor persists edits in browser `localStorage`, scoped by repository and branch, and offers JSON file import/export. That implementation and its security/deployment boundary are in `editor-client.js:1–27,120–139` and `map.js:13–21`; it does not use the authenticated workspace RPC.

## Practical redesign guide

For the primary authenticated workspace:

1. **Color, typography, borders, hover/selected states, panel dimensions and responsive breakpoints:** edit `src/workspace/style.css`.
2. **Group classification, evidence rationale, and overview layout:** edit `src/workspace/model.js` and `layoutOverviewGroups()` in `src/workspace/overview-routing.js`.
3. **Node card contents, SVG dimensions, labels, edge routing and arrow marker:** edit `draw()` in `app.js`.
4. **Selection/search/tour/pan/zoom behavior:** edit `app.js:49–103`.
5. **Appearance of evidence, explanation cards, tabs and edit forms:** edit `showNode`, `showConnection`, `evidence` and `editForm` in `app.js:53–90,109–113`, then their selectors in `style.css`.
6. **SVG export appearance:** adjust the embedded export style in `app.js` as well as the live CSS if the downloaded SVG should match.
7. **Static overview only:** change `web/client.js:105–137` and `web/style.css:3,5`.
8. **Offline CLI editor only:** change `src/map.css:1`, its markup in `src/map.js:13–21`, and SVG/editor behavior in `src/editor-client.js:28–84`.

Keep immutable scanner findings, human overlays, and presentation grouping separate. The current overlay schema supports component explanations and positions, but not editable area names or grouping; adding those requires a versioned overlay/schema and server validation change. Do not write presentation classification back into scanner findings.
