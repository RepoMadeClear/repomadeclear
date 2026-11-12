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
  ['#f1f6ff','#a8bdeb','#456cb5'],
  ['#f5f1ff','#c0afea','#805bb6'],
  ['#edf9f7','#93c9bd','#378a7a'],
  ['#fff8ef','#e4c491','#a27b3c'],
  ['#f2f7fc','#b4c8df','#5d7b9f'],
  ['#fff4f5','#e5b9bf','#a76976']
];
```

In the **overview**, groups are arranged in rows of three. Each group background is an SVG rounded rectangle; its nodes are placed in a vertical list within the card. Group-card width is 326 SVG units, the columns start at x=24 with 350-unit spacing, nodes are 294×54, and list rows are spaced 66 units apart. The `Referenced libraries` group is collapsed to a single aggregate node. In **group drilldown**, nodes are placed three across at 325-unit horizontal and 110-unit vertical intervals; the focused group background spans a 976×(height−40) SVG rectangle. Positions and group colors are set in `draw()` (`src/workspace/app.js:30–38`).

Each component card is an SVG `<g class="node">` containing a rounded `<rect class="node-box">`, an icon, a title and a subtitle. The title is shortened to 34 characters; the subtitle uses the final path segment and is shortened to 40 characters. A selected node receives `selected`; nodes unrelated to the selected node/current tour step receive `dim` (`src/workspace/app.js:17,37,46`).

Edges are SVG paths routed with horizontal/vertical segments. When endpoints are separated horizontally by more than 100 units, the path routes through a midpoint; otherwise it routes through a lane to the right of both endpoints. Duplicate visible paths for the same endpoint pair are suppressed. A `<marker id="arrow">` supplies the arrowhead. Each visible edge also gets a wider transparent `.edge-hit` path so it is easier to click (`src/workspace/app.js:29,39–45`).

The graph uses the DOM/SVG rather than a graph-drawing library. The SVG `viewBox`, generated coordinates, CSS classes and attributes are the visual/rendering controls.

## Styling architecture and selector inventory

### Primary workspace CSS (`src/workspace/style.css:1`)

All rules are currently on one physical line. This table lists the stylesheet’s selectors and their present declarations, grouped by role. Later rules in the file override earlier equal-specificity rules.

| Selector(s) | Current declarations / effect |
|---|---|
| `:root` | `font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; text `#202936`; page background `#f6f7f9`; `font-synthesis:none`. |
| `*` | `box-sizing:border-box`. |
| `body` | `margin:0`. |
| `button` | Inherits font/color; pointer cursor; white background; `1px solid #dce1e9`; 7px radius; `8px 12px` padding; 12px type. `button:hover`: `#f1f4fa`. `button:disabled`: opacity `.4`, default cursor. |
| `button:focus-visible, [role=button]:focus-visible` | 3px `#527bf6` outline with 3px offset. |
| `[hidden]` | `display:none!important`. |
| `header` | 68px tall, white flex row, centered/space-between, `0 28px` padding, bottom border `#e2e6ed`. |
| `.brand` | Flex, centered, 12px gap, 18px type. `.brand .badge` is hidden at `max-width:700px`. |
| `.badge` | 10px, `.07em` tracking, `#eef1f6` background, `#5b6680` text, `5px 7px` padding, 5px radius. |
| `.header-note` | 12px, `#7b8595`; hidden at `max-width:1000px`. |
| `main` | 20px padding; reduced to 12px at `max-width:1000px`. |
| `.workspace` | White, border `#dce1e8`, 14px radius, clipped overflow, `0 4px 20px #17264104` shadow. |
| `.toolbar` | Flex, spaced/aligned, bottom border `#edf0f4`, `22px 26px` padding; at max 700px becomes block with 18px padding. |
| `.toolbar button` | At max 700px, `margin-top:12px`. |
| `.eyebrow` | 10px, `.16em` tracking, weight 700, `#8891a1`. |
| `h1` | 24px, `-.7px` tracking, `7px 0 6px` margin; at max 700px, 21px. |
| `p` | 13px, line-height 1.65, `#667186`, no margin. |
| `.primary` / `.primary:hover` | Dark `#202936` background/border with white text; hover `#36445b`. |
| `.canvas-head` | Flex row, centered, space-between, 12px type, `12px 24px` padding, bottom border `#edf0f4`. |
| `.controls` / `.controls button` | Flex with 8px gap; buttons use `5px 10px` padding. |
| `.layout` | Initially declares `grid-template-columns:minmax(0,1fr) 315px`; later declares `minmax(0,1fr) 370px`, which is the effective desktop value. At max 1000px a 270px rule appears earlier and is likewise overridden by the later 370px rule. At max 900px it becomes `display:block`. |
| `#viewport` | Relative, clipped, `touch-action:none`; dotted `radial-gradient(#e5e9f0 .65px, transparent .65px)` at 18px intervals. Initial height `calc(100vh - 300px)`, min-height 520px. At max 700px an earlier 550px height is declared. A later, more-specific `.layout #viewport` rule sets `height:calc(100vh - 340px); min-height:560px`, so that later size wins. |
| `#diagram` | Block, width and height 100%. |
| `.canvas-hint` | Absolute bottom overlay; translucent white `#ffffffdf`, `#818b9b`, 10px text, 7px padding, 5px radius, centered, `pointer-events:none`. |
| `aside` | Left border `#e6eaf0`, 24px padding, scrollable; max-height `calc(100vh - 300px)`, min-height 520px. Later `.layout aside` sets height/max-height to `calc(100vh - 340px)`; max-width 900px changes height to auto and removes max-height. |
| `aside h2` / `aside h3` | H2 20px, line-height 1.3, margin `12px 0`; H3 11px uppercase, `.09em` tracking, `#7b8595`, margin `24px 0 8px`. |
| `aside .path` | 11px/1.7 monospace, wraps long paths, `#778298` on `#f5f7fa`, 9px padding, 6px radius. |
| `aside .basis` | 10px, `#8d6a30` on `#fffaed`, border `#f4e9cb`, 8px padding, 6px radius. |
| `aside button` | Block, full width, left aligned, `8px 0` margin. |
| `aside .evidence` | Left border 2px `#a7b9f0`, `8px 10px` padding, `#f7f9ff`, monospace 11px/1.7, wraps paths. |
| `.empty-symbol` | 40px, `#b3becf`, `18px 0` margin. |
| `.legend` / `.legend span` | Flex/wrap with 7px gap, top margin 18px; chips use `5px 8px`, 4px radius, 10px, `#f2f5fa`/`#65738c`. |
| `.group-box` | SVG group container outline: 1px, dashed `5 4`. Fill and border color are inline SVG attributes from the `palette` in `app.js`. |
| `.group-label` | SVG 600-weight 12px sans-serif; text color comes from an inline SVG `fill` using the third palette color. |
| `.node-box` | White SVG fill, `#d6dce7` stroke, 1px. |
| `.node-title`, `.node-subtitle`, `.node-icon` | Title 500-weight 11px sans-serif/`#354158`; subtitle 9px/`#929bad`; icon 12px sans-serif. Icon additionally gets inline fill `#7d8cab`. |
| `.node` | Pointer cursor. `.node:hover .node-box`: `#6081dc`, 1.7px. `.node.selected .node-box`: `#4068df`, 2px, `#f5f8ff` fill. |
| `.edge` | No fill, `#a3afc2` 1.2px stroke. |
| `.edge.active` | `#4573e9`, 2.5px, dash `7 4`; the earlier `animation:flow` is later overridden to `animation:none` in the same file. |
| `.edge[data-certainty='human-supplied']` | Human edge uses `#b18449` and dash `5 4` unless a later active-edge rule overrides those stroke values. |
| `.edge-hit`, `.edge-hit:hover` | Transparent 12px SVG stroke, stroke-only pointer events, pointer cursor; hover stroke `#527bf630`. |
| `.dim` | Opacity `.13`. `.node,.edge` transition opacity over `.2s`. |
| `.explorer` / `.explorer input` | Flex search row with 14px gap and `12px 24px` padding; input `10px 12px`, min-width 280px, `#ccd5e2` border, 7px radius. At max 900px wraps; input becomes full width with no minimum. |
| `#search-results` / `#search-results button` | Positioned dropdown (top 56px, left 24px, z-index 5), white, 1px `#d5dce8`, 10px radius, `0 12px 35px #24385720` shadow, 320px max-height, scrollable, 650px max-width, 10px padding. Buttons block/full-width/left aligned with 5px vertical margin. |
| `.panel-tabs` / `.panel-tabs button` / `[aria-pressed=true]` | Wrapping flex tabs, 4px gap and `18px 0` margin; tab buttons auto width, zero margin, `7px 9px`, 11px. Pressed tab uses `#edf3ff`, `#6487df` border, `#254b9d` text. |
| `.plain-explanation` | 15px, line-height 1.8, `#344256`. |
| `.connection-card` and its `button:first-child` / `button:last-child` | Card: 1px `#e1e7ef`, 9px radius, `8px 12px`, `10px 0` margin. First button weight 600; last has no border, `#365fae`, 11px. |
| `.evidence a` / `.evidence strong` | Link block with 8px top margin and `#3059a8`; `strong` block. `aside .evidence` supplies the evidence block styling above. |
| `aside details` / `aside summary` | Details margin 14px vertical; summary pointer cursor, 12px. |
| `footer` / `.dot` | Footer flex/wrap, spaced, 20px gap, 10px/`#8992a2`, `12px 24px` padding and top border `#edf0f4`. Dot is 6px `#667ca6`, circular, 5px right margin. |
| `#tour`, `#tour p`, `#tour strong`, `.tour-controls`, `.tour-controls button` | Dark `#202938` flex panel with white text, `16px 24px`, 24px gap; paragraph `#bbc6d7`, max-width 750px, 12px; strong 14px; controls flex/6px gap; buttons `#344156` with `#4c5970` border and white text. At max 700px tour becomes block and controls get 14px top margin. |
| `@keyframes flow` / `@media(prefers-reduced-motion:reduce)` | Keyframe moves dash offset to −22; reduced motion disables active-edge animation. A later unconditional `.edge.active{animation:none}` also disables it in current styling. |
| `@media(max-width:1000px)` | 270px layout rule (overridden later), header padding `0 18px`, hide header note, main padding 12px. |
| `@media(max-width:700px)` | Block layout; aside top border and min-height 220px; block toolbar; viewport 550px (overridden by later height/min-height rule); hide brand badge; block tour; reduce footer gap to 8px; h1 to 21px. |
| `aside label`, `aside input, aside textarea, aside select`, `aside textarea` | Form labels block/12px; inputs block/full width, 9px padding, `#ccd4df` border, 5px radius, 7px top margin; textarea min-height 120px. |
| `#viewport, aside` (later `.layout #viewport, aside`) | Later rule: height `calc(100vh - 340px)`, min-height 560px; aside max-height also `calc(100vh - 340px)`. |
| `@media(max-width:900px)` | Block layout; aside auto height and no max-height; explorer wraps; search input full-width; human-edge style and evidence wrapping remain in force. |
| `.evidence` | `white-space:normal`. |

`src/workspace/style.css` and `dev/diagram-preview/style.css` are not byte-identical. The current preview script copies the workspace stylesheet, not the legacy preview stylesheet.

### Inline and generated SVG styling

CSS is not the only appearance source:

- `draw()` writes the group rectangle’s `fill` and `stroke` and the group label’s `fill` from the palette; these SVG presentation attributes are in `src/workspace/app.js:9,35`.
- The arrowhead’s `<path>` gets the inline `fill:#8d9bb0` at `app.js:29`.
- Node icon SVG text gets inline `fill:#7d8cab`; the SVG `rect` / `text` elements get classes and coordinates at `app.js:46`.
- `class` strings are built at runtime: `.edge`, `.edge.active`, `.edge.dim`, `.node`, `.node.selected`, `.node.dim`, `.group-box`, `.group-label`, `.node-box`, `.node-icon`, `.node-title`, `.node-subtitle`, and `.edge-hit` (`app.js:35,44,46`).
- SVG export clones the current canvas and inserts its own `<style>` with a reduced set of node, title, subtitle, group-label and edge rules; it does not copy the full workspace stylesheet (`app.js:114`).
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

- The display model groups nodes by inferred/detected role; `order` controls the desired group sequence (`model.js:1–17`, `app.js:10–12`).
- Overview and drilldown coordinates are calculated afresh inside `draw()`; saved overlay positions are then applied to those positions (`app.js:27–38`).
- Zoom buttons clamp scale to 0.5×–3× and multiply/divide by 1.25. `updateView()` changes the SVG `viewBox` dimensions and updates the percentage label. **Fit view** resets scale and offset (`app.js:49–50,101`).
- Dragging empty canvas uses SVG pointer capture and updates the viewBox offset while moving. The viewport disables browser touch gestures with CSS `touch-action:none` (`app.js:102`, `style.css:1`).
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

1. **Color, typography, borders, hover/selected states, panel dimensions and responsive breakpoints:** edit `src/workspace/style.css:1`. It is minified to one physical line; preserve cascade order or format it deliberately before substantial edits.
2. **Group background palette and grid geometry:** edit `palette` and `draw()` in `src/workspace/app.js:9,28–38`.
3. **Node card contents, SVG dimensions, labels, edge routing and arrow marker:** edit `draw()` in `app.js:28–48`.
4. **Selection/search/tour/pan/zoom behavior:** edit `app.js:49–103`.
5. **Appearance of evidence, explanation cards, tabs and edit forms:** edit `showNode`, `showConnection`, `evidence` and `editForm` in `app.js:53–90,109–113`, then their selectors in `style.css:1`.
6. **SVG export appearance:** adjust the embedded export style in `app.js:114` as well as the live CSS if the downloaded SVG should match.
7. **Static overview only:** change `web/client.js:105–137` and `web/style.css:3,5`.
8. **Offline CLI editor only:** change `src/map.css:1`, its markup in `src/map.js:13–21`, and SVG/editor behavior in `src/editor-client.js:28–84`.

Keep the semantic/provenance model in `workspace/model.js` and `overlays.js` separate from visual styling unless changing what a node or edge means.
