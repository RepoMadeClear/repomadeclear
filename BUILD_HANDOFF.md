## Purpose-first production deployment — 2026-11-17

- Deployed the tested current app working tree using official Vercel CLI 65.17.0, from an isolated release copy without local environment files or example overlays. Production deployment `dpl_FYEmSC3h4mhvtjPiSnMQixusehYq` is READY and aliased to https://www.repomadeclear.com.
- 129 tests passed before release. Live workspace.js contains the new project tasks, explanation-inclusion controls and purpose-first guide; live client.js contains projectSummary and collapsed technical structure. Both returned HTTP 200.
- After user sign-in, rescanned brickware-web/CoopLayer main at commit 4f641f03a613 on production (2026-11-17 09:54:31 Arizona). New scanKey: 3538600982c7964708d1c0c7bb8c91f6800949d985802236ac80a418d50375ce. Verified the reader purpose, six suggested tasks, nine-step guide opening purpose and prototype/sample-data/no-live limitations, Next and Exit. Returned to repositories without another login; CoopLayer/main restored. Loaded the cached fresh scan with refreshed client and verified the static overview also shows project-specific purpose and limitations. The initially open pre-deploy page retained old frontend code until navigation loaded the new bundle. No production explanations edited.
- No commit, push, credential changes, or schema migration.

## Purpose-first reader milestone — 2026-11-17 (local review)

- Replaced generic architecture introduction with project purpose from bounded root README evidence. New scanner 0.6.0 records documentation and literal JSX screen headings/actions; no repository-specific names/rules, AI provider calls, scanned code execution, or dependency installation.
- Overview and manual guide lead with purpose, explicit prototype/no-live limitations, and suggested user tasks. Technical structure remains available behind disclosure. Documentation claims and inferred task wording are distinguished from team-supplied explanations.
- Suggested parts now offer review/edit plus automatic, include in overview/guide, or keep in technical details. Choices use validated presentation overlays, retain author/evidence and rescan conflict handling, and do not overwrite detected roles or layouts. Free static summary is scan-derived; paid workspace includes saved team edits.
- Actual CoopLayer HEAD 4f641f03a613d6376b557887885aad1f59d48a13: introduction identifies a demonstration for electric cooperatives, highlights sample data/no live utility integrations, and generates six task suggestions. Easyplan independently yields its driver scheduling purpose. No CoopLayer-specific implementation.
- Browser verified local CoopLayer purpose, nine-step guide purpose/limitations, task detail, and saving corrected wording with explicit overview/guide inclusion. Preview: http://127.0.0.1:4196/ (edits there are temporary). Automated tests cover inclusion/supporting selection, rescan preservation, missing docs, CLI features, secrets/instruction-like input, and redacted free summary.
- Validation: 129 app tests passed; storage regression passed; hosted build passed using placeholder public Supabase settings. No production deployment, push or commit in this milestone.
- Existing saved scans require rescanning to acquire README/interface metadata; scanner version changes cache identity. Existing overlays remain. Without documentation, offer an editable purpose and explicitly tentative filename clues rather than invent a business purpose. Root README and literal JSX support are bounded: dynamic labels, localization, non-JSX interfaces, nested package documentation, stale/missing docs and ambiguous business meaning still need human review. This is not universal semantic understanding. Nontechnical participant testing remains outstanding.

## Reader and presentation production verification — November 17, 2026

Deployment dpl_9b15iUrhVbLhguMnDsiFuT4sq52p is READY and aliased to www.repomadeclear.com. Deployed matching frontend and server overlay support from the local checkout, including new explanations.js and workspace/reader.js. In the existing signed-in Chrome session, reloaded the actual Easyplan saved map and verified default Reader view, repository/branch labels, seven-step guided presentation, Next, keyboard Back, outline jump to final step, Finish returning to Reader view, Backend reader drilldown (two grouped parts), preserved existing human notes, and expanded evidence linking to the correct file/commit/lines. No new login was needed. No production notes were edited and the local example overlay was not uploaded. Hosted save/rescan was not exercised in this deployment check; prior local encrypted-storage and rescan tests cover those paths. No commit or push.

## Reader-first explanations and presentation — November 17, 2026 (local)

Implemented shared plain-language area descriptions in `app/src/explanations.js`, a default reader view in `workspace/reader.js`, and aggregate-only static overview cards using the same vocabulary. Related source files/contained declarations are grouped as reader parts; business purpose is not invented from names. Generic source-role suggestions remain explicitly unreviewed. Existing human notes are respected. Supporting libraries remain distinct from outside-service connections. Technical map, source evidence, search, and layouts remain available.

“Guide me through it” now opens a manual presentation: one topic per slide, Back/Next/Finish, keyboard arrows/Escape, outline, editable wording, and editable order. It explains areas and a supported relationship without claiming runtime sequence. CLI/library/trigger evidence uses its own area vocabulary; missing evidence never creates a browser workflow. Tour exit restores the original detailed map camera; reader filters and selected details are retained. Editing controls are separate from reader mode. No AI service or additional operating cost was introduced.

Overlay schema 2 adds a versioned presentation section (schema 1); schema-1 overlays are accepted and upgraded without losing notes, human connections, or positions. Presentation operations run through the existing server-validated encrypted/versioned save path, with authenticated authors and bounded text/reference counts. Descriptions and slide references are anchored to source fingerprints and scanner versions. Changed/missing references flag review; saved steps and orphan explanations remain available. Editors can explicitly review or reattach a missing part. Rescans keep the encrypted overlay through the existing storage RPC. No database schema migration is required. Deploy the updated client and server together; older overlay validators do not support schema 2, so rolling back the server alone is unsafe for newly edited maps.

Validation: 124 tests passed before the final singular/plural copy correction. The local storage regression confirms scan archive, overlay carry-forward, stale saves, edit-version conflicts, caching, and user isolation. Hosted bundle builds with placeholder public Supabase settings; no production credentials changed. Relevant tests include business-purpose negatives, deterministic grouping, CLI/library/scheduled-entry fixtures, v1 overlay migration, source changes/removals, reattachment, manual order, authenticated encrypted presentation save/reload, unpaid rejection, stale-version rejection, and free-preview redaction. Browser checks on actual Easyplan: reader areas, two grouped request capabilities, source detail, editing, unknown-area search, manual/keyboard tour navigation, slide reordering, filter restoration, unchanged detailed-map viewBox after tour, and a 390px layout with document width 390px (no overflow).

Actual Easyplan scan: commit `dc168e288f112824fa2bf9f38d5f9b2b29743a3e`, 25 source files, 133 components, 43 reader parts, 20 parts still in the unknown area, 7 tour steps. Manually inspected `backend/api.py` and `frontend/app/api/adp/hours/route.ts`; prepared two source-reviewed capability descriptions and a bounded project introduction in a LOCAL example overlay. The 2 sampled descriptions match those handlers; no accuracy claim is made for unsampled business meanings. This review establishes code behavior only, not live operation or full business workflow. The example has not been saved to any production account.

Preview: `http://127.0.0.1:4194/`, using Easyplan HEAD and `/tmp/rmc-easyplan-reader-overlay.json`. `RMC_PREVIEW_REPOSITORY` scans a chosen repository without executing it; optional `RMC_PREVIEW_OVERLAY` loads a separate local overlay. Preview edits last until reload and the preview is loopback-only, unauthenticated developer tooling. Its state is not production persistence. See `READER_USABILITY_REVIEW.md` for participant tasks and remaining checks. Nontechnical participant testing has NOT been performed, nor has this pass verified authenticated hosted UI behavior. No deployment, commit, push, new account, or production mutation.

## Selection return deployed and verified — November 16, 2026

Vercel production deployment dpl_H8xmJLCJeZiwvzR8eDSGQet64ViK is READY and aliased to www.repomadeclear.com. Verified in the existing signed-in Chrome session: opened the easyplan saved map, clicked Back to repositories, and observed GitHub installation brickware-web, repository brickware-web/easyplan, and branch main restored without entering credentials. The five relevant initialization/restoration checks pass. No commit or push.

## Remember map selection on return — local

Workspace return links carry installation/repository IDs and the loaded scan branch. After session restoration, the account picker reloads authorized GitHub choices and restores matching selections in order. Missing/revoked repositories or deleted branches remain unselected; concurrent user selection cancels restoration. No credentials or scan contents are stored in the return URL. Selection does not bypass server verification, scan consent, or access checks. Four regression tests cover exact branch encoding, revoked repositories, deleted branches, and interrupted restoration; account initialization regression also passes. Syntax and diff checks pass. Not deployed in this pass.

## Repository and branch context — local

Workspace displays repository and branch from the loaded scan above its title. Text wraps on narrow screens and is rendered safely as text. Missing metadata uses explicit unavailable labels.

## Classification conflict follow-up — local

Verified the existing progressive-exploration milestone and tightened remaining role inference. Importer roles now come from an immutable first-pass snapshot. Command, worker, and public-interface inference requires one consistent importer group, preventing a single command importer from overriding a conflicting worker or unknown importer. Multi-hop propagation remains bounded to direct evidence.

Added regressions for conflicting command/worker importers in reversed node order and unseeded cyclic imports. All 110 tests pass; hosted bundle builds with placeholder public Supabase configuration; diff check passes.

Available historical local snapshots contain 8 or 10 components, with respectively 3 or 5 Unclassified files: cli.js, map.js, scanner.js, and in the larger snapshots editor-client.js and overlays.js. These snapshots lack sufficient role signals under the current rules. Their remaining counts are not an accuracy benchmark. The reported authenticated 83/384-component scans were not accessed during this follow-up. The prior handoff's 203-to-124 comparison is prior work, not a new measurement from this follow-up. User-editable roles still need versioned overlay fields and server validation. Current presentation fixes apply to existing scans; additional scanner evidence would require rescanning.

## Progressive exploration and role classification — November 17, 2026

Local-only milestone. The reported authenticated production scans (83 and 384 components) were not accessible, so no claims are made about their exact assignments. The local baseline preview used a real working-copy scan. Before the UI changes it showed 185 Unclassified components in a narrow, three-column 316×64-unit card stack with 350-unit horizontal and 112-unit vertical spacing. Hundreds of cards stretched the viewBox vertically, reducing rendered text below a readable size. The zoom readout displayed the internal scale multiplier (100%), not the actual viewport-to-viewBox scale.

On the same final local scan (325 components), the prior classifier left 203 Unclassified (34 source files and 169 functions; 122 assigned). The evidence-qualified update leaves 124 (17 source files and 107 functions; 201 assigned). The 79 changed assignments are traceable: ten SQL files under `migrations/` are labeled as schema-change material; seven source files are grouped as frontend/backend modules only when every direct source importer has one matching, directly evidenced role; and 62 contained functions inherit their source file’s group. Conflicting-role imports remain Shared/Unclassified as appropriate. These are source-role suggestions, not runtime findings. The local scan had no test/generated files to reclassify. Remaining Unclassified files lack sufficient role-specific evidence; unsupported frameworks, mixed responsibilities, or other causes are hypotheses unless supported by each scan’s evidence. Legacy saved scans do not include classification-reason metadata, so the UI distinguishes “reason not recorded” from its current evidence-based assessment.

Large areas now open structural groups derived from `apps/`/`packages/` roots, then directories and files. Flat and missing-path items, scoped dependencies, and hundreds of symbols in one file remain reachable. Search covers collapsed groups and pages through every result; breadcrumbs restore the prior path, camera, and structural page. Selecting a component opens a focused incoming/outgoing map, including cross-area neighbors; deliberate neighbor expansion and paged relationship details preserve access to every edge and evidence. Focused layouts are presentation-only. Saved positions, scan IDs, findings, relationship corrections, and human explanations are not rewritten.

Readability rules in `app/src/workspace/exploration.js`: direct graph only at ≤24 components, ≥12 rendered title pixels, and ≤2.5 in-area relationships/component; group and inventory pages cap at 24, relationship pages at 12. Focus maps show up to three peers per direction on wider canvases, reduced to one below 720 CSS pixels. Fit View and the zoom readout use the current visible scope and effective rendered scale. Values are conservative layout cutoffs, not product or scan limits.

Classification causes confirmed for this working-copy scan: 17 source files did not contain directly supported role evidence or qualifying single-role import evidence, and their functions inherited that uncertainty. Ten migration files and role-specific imports accounted for evidence-backed changes. There was no observed test/generated-code population in this scan. Unsupported language/framework, missing context outside the 17 files, or business/runtime role remain unconfirmed causes. No authenticated customer scans were accessible. Scanner code/schema was not changed; existing saved scans receive the new grouping and exploration UI without rescanning. A rescan is only needed for new scanner-derived metadata if a future scanner change adds it.

Verification: automated suite and the hosted bundle build with non-production placeholder public configuration pass; JavaScript syntax and diff checks pass. Regression coverage includes 83/384-area mode thresholds, a 384-file plus 120-symbol (504-component) synthetic area, flat/package/nested/missing paths, all-result pagination, page/camera breadcrumb restore, cycles, disconnected and cross-area relationships, high degree, evidence/provenance, saved-position preservation, and a 390px focused-map layout. Browser checks use the real local working-copy scan (325 components; 124 Unclassified) and inspect the dense drilldown and a 52-relationship focused component. Before/after screenshots were captured in the chat from real local working-copy scans, not fixtures. The 83/384 production scans remain unverified; no visual evidence is claimed for them.

`app/src/scanner.js` was not changed, so no rescan is required for the exploration/classification improvements. Existing overlays do not support manual architectural-role overrides; adding one requires versioned overlay fields plus server-side validation and persistence. The preview is local, unauthenticated, and uses temporary scan data; it is not production-ready. No deployment, push, commit, credential change, or production resource was used.

## Return to repositories — local

The interactive workspace header links back to the repository connection page through the existing account route. The link is visible on desktop and mobile.

## Evidence-based architecture overview — November 16, 2026

Completed a local overview pass using the current repository snapshot. Grouping now follows supported source evidence instead of forcing a Frontend/Backend template. Unclassified items remain in a reviewable area, and supporting tools/dependencies stay separate. Selecting an area highlights its direct links and connected areas; **Explore area** opens the drilldown. Component search still covers the full inventory. Relationship counts are shown once per area card, while arrow details retain the original members, relationship types, provenance, explanations, and source evidence.

The current local snapshot has 47 source files, 282 components, five areas, and eight aggregate arrows representing 84 cross-area relationships. It classifies as a full-stack application from direct browser API references and declared HTTP endpoints; this is a source-based suggestion, not proof of runtime behavior. The overview layout is deterministic, keeps uncertain areas in the graph, places supporting areas separately, and routes connections around cards. The current snapshot has no route crossings, shared trunks, or card-clearance violations. Saved component positions remain in the existing overlay flow; relayout and Fit View do not overwrite them.

Scanner version 0.5.0 adds line-bound JS/TS browser-global evidence. Synthetic test data covers full-stack, frontend-only, backend-only, CLI, library/SDK, worker/scheduled, monorepo, mixed, unclear, cyclic, and disconnected cases; those fixtures are not real scanner detections. CLI commands, public library interfaces, and scheduled triggers are not yet discovered automatically. Do not claim those repository classifications until scanner entry-point evidence is implemented. Editing area names or memberships also remains out of scope: it requires a versioned overlay plus server-side validation and persistence work.

Verification: all 99 app tests pass, including group inventory, evidence-preserving aggregation, noncrossing routes, manual-position reload, and area-selection checks. JavaScript syntax checks and `git diff --check` pass. The local browser preview on port 4177 was checked at 1440×1000 and 390×844: overview, area selection, drilldown, search, pan, zoom, Fit View, and arrow-to-evidence work; the small viewport has no horizontal page overflow. Dense overview and four-component Backend drilldown screenshots were captured in the chat for review. Physical trackpad gestures were not tested. The hosted build remains unavailable because its required Supabase URL and publishable-key environment values are not configured. No deployment, commit, push, credential change, or production resource was used.

Remaining scanner limits: SQL is indexed but not relationship-analyzed; supported relationship extraction is limited to the documented JS/TS, Python, and conservative Java patterns. Other indexed-only languages, dynamic calls, runtime behavior, infrastructure, deployment, and business impact are not established by this scan. Coverage for this snapshot reports five omitted files and ten indexed-only files.

## Local overview connection routing — November 14, 2026

Redesigned overview connections around the group-to-group relationships: one orthogonal SVG arrow per ordered pair of groups, with the number of source relationships shown on a collision-checked count label. Routes stop at group boundaries, avoid passing through group boxes, and charge congestion costs so opposing directions can use separate lanes. Arrows with one provenance type keep its color/pattern; mixed-provenance arrows use a neutral style. Clicking an arrow opens every underlying relationship with its provenance, plain-English description, and repository/branch/commit/file/line evidence. The detailed group view and SVG renderer remain in place.

Browser verification on the local editor at `localhost:4176`: the current sample rendered 31 unique directional arrows summarizing 503 cross-group relationships; route endpoints met the right group boundaries, no route crossed a group box, and count labels did not overlap each other or the group containers. Clicked API endpoints → Functions and verified its two inferred relationships and both source-evidence entries. Automated suite: 89 passing; workspace CSS parses; `git diff --check` passes. No physical trackpad, deployment, push, commit, credential change, or production access. Keep the local preview running for review.

## Local workspace map visual pass — November 14, 2026

Completed the first local review milestone: redesigned the workspace frame, group summaries, component cards, and curved SVG connections. The overview summarizes large areas rather than rendering every source file at once; detected, inferred, and human-supplied connections retain distinct colors/patterns and matching arrowheads. Fit View bounds now include manually positioned components, and duplicate paths no longer merge different certainty types in group detail. Updated the interactive-map guides. Preserved the existing navigation changes.

Browser-tested on the local editor at `localhost:4176`: overview, group drilldown, component selection/movement, search, arrow-to-evidence, zoom controls, Fit View, mouse-drag pan, synthetic two-axis wheel pan and Ctrl+wheel zoom, and a temporary human-supplied connection marker/pattern. After the final visual changes, rechecked overview, a four-component drilldown, selection, arrow evidence, zoom, and Fit View. `localhost:4174` served the sign-in page and redirected to `/#login`; no authenticated map session was available, so the authenticated workspace still needs a visual check. No physical trackpad was available: real two-finger pan and pinch gestures remain untested. The 190-component group drilldown remains dense and needs further usability validation.

Verification: all 87 tests pass; workspace CSS parses; `git diff --check` passes; local preview build serves successfully on port 4176. The regular hosted build still requires Supabase URL/publishable-key environment values; none were configured for this local-only pass. No deployment, push, commit, credential change, or production access. Existing unrelated worktree changes in `app/src/server.js` and `app/test/accounts.test.js` were left untouched. Leave the local preview running for review.

## Local interactive map 404 repair — November 11, 2026

The localhost UI and backend were out of sync: the button called `/api/github/billing-status`, while `src/server.js` had no billing-status handler, workspace assets, or map-detail/edit route. The user chose free interactive access for isolated localhost only; this does not change the hosted paid-access policy. The local UI now hides Stripe checkout and describes free local access. No Stripe request or charge is made.

Added authenticated local billing-status and workspace routes, each rechecking the signed-in Supabase identity and current GitHub repository access. Saved scan and overlay reads/edits use the user's Supabase token with `auth.uid()`-scoped RPC rather than table access or service-role credentials. Migration 010 adds that RPC; it must be applied only to the isolated development Supabase project after migrations 001–009. It has not been applied to any Supabase project. Production, deployment, and Stripe configuration were not touched.

Verification: 79 automated tests pass; local PGlite scan/history/overlay and cross-user isolation tests pass; hosted bundle build passes with the hosted paid policy intact. The updated localhost config reports free local access only while the project isolation guard is satisfied. Unauthenticated billing-status requests return 401; workspace HTML and modules are served. This task did not apply migration 010 to Supabase; a real user's saved scan was not opened against the configured project, and the authenticated browser session was reset during server restart.

## Local Supabase isolation and snapshot diagnostics — November 11, 2026

An earlier local `app/.env` diagnostic pointed to a Supabase project identified elsewhere in this handoff as production. The user-reported decrypt error is from the saved-scan path, not GitHub token decryption: localhost keeps the GitHub token in its process session, then `runHostedScan` reads a legacy `rmc_scans.envelope` before it may read a per-repository `rmc_repository_scans.envelope`. The old error did not identify which envelope failed. The recent key change makes a key mismatch plausible, but without a safe read of the record the exact row and failure cause are unverified.

Local configuration now requires `RMC_DEVELOPMENT_SUPABASE_PROJECT_REF` to match a non-production `SUPABASE_URL` project reference before Supabase authentication or scanning is enabled. Saved-scan decryption errors identify the envelope table without exposing its contents; GitHub-token and scan-snapshot failures remain distinct. The environment file and all database records and keys were left untouched. No Supabase RPC or production resource was accessed or changed.

Use a separately provisioned development Supabase project for local authentication and scanning, apply migrations 001–010 only there, configure the GitHub App's local callback, and generate a separate stable development encryption key. The updated localhost `/api/config` now reports the isolated-project guard satisfied; this check does not read or modify saved scan records. Automated tests: 76 passing before the workspace changes; local PGlite scan-storage tests pass. No deployment, push, or commit.

## Local authenticated scan integration — November 11, 2026

Connected `localhost:4174` `POST /api/github/scan` to the existing bounded `hosted-scan.js` / `scanner.js` implementation. The local route requires the existing authenticated session and exact selected installation/repository/branch, revalidates GitHub access, and uses the signed-in Supabase token with `rmc_repository_scan` for account-scoped quotas, encrypted immutable findings, caching, scan history, and overlay preservation. Local GitHub installation responses now include the GitHub login expected by the UI.

## Local scan error attribution repair — November 11, 2026

The exact “GitHub connection expired” response came from `credentialVault.open()`, which was shared by GitHub-token reads and saved scan reads. In the localhost scan route, GitHub repository and branch authorization use the same in-memory session token as repository selection; after those checks, the scanner opens a legacy encrypted scan envelope before downloading source. Any decryption failure there—including an encryption-key mismatch—was incorrectly reported as GitHub expiry. The actual saved-envelope failure cause cannot be distinguished without reading/decrypting the configured store, so a key mismatch is a likely explanation, not a proven fact.

The vault now reports expiry only for an actually expired encrypted GitHub credential. Unreadable scan data gets an actionable storage/key message, while user/context claim failures remain access-denied responses. Regression coverage includes mismatched scan encryption, truly expired GitHub credentials, unauthorized repository access, and successful authorized mock scans; `npm test`: 73 passing.

No deployment or production code change was made. At the time of this earlier check, `localhost:4174/api/config` reported services ready, but the local `.env` targeted the Supabase project documented as production. Its scan RPC can change quota/lease state, so no live scan or scan-store RPC was attempted. Thus, real localhost authentication, repository download, and architecture generation remain unverified. Use an isolated development project and key for live local scan verification; do not copy the production key into development.

## Ten daily attempts — 2026-11-09

User approved 10 daily scan attempts. Migration 008 applied and verified. Existing counts retained; the separate 10 saved-map cap is unchanged. Messages and terms updated. Targeted scan tests: 5 pass. Deployment dpl_5YmkS46wihjtFMVpUCcaxGKs8k4M READY on www.repomadeclear.com; live ten-attempt terms verified.

## Five daily attempts — 2026-11-09

User approved five daily scan attempts. Migration 007 applied and verified in Supabase; existing attempt counts preserved. Updated UI and limit messages to five, targeted scanner tests pass (5). Deployment dpl_DXYsjKod3sEYP7s2rQfus72vuuZU READY on www.repomadeclear.com; live five-attempt wording verified.

## Clear scan-limit feedback — 2026-11-09

Migration 006 applied: running scan, daily attempts, and saved-map cap now return distinct reasons with retry timestamps where applicable. Updated allowance text to 10 maps / 3 daily attempts including failures. 58 tests pass. Account quota inspection showed 3 attempts, 2 new saved maps, no running scan. Deployment dpl_6u1xzk3445Acb8yevfrU2gy7RX12 READY on www.repomadeclear.com; updated live allowance copy verified.

## Workspace links without scan IDs — 2026-11-09

User supplied a failing workspace URL with installation=180331066 and repository=398445447, without scanKey. Added backward-compatible lookup constrained to authenticated user and repository ID; a unique saved map opens, multiple branches require explicit selection, and an unrelated legacy map never loads. Regression tests now 57 passing. The exact customer scan has not been verified: native Chrome inspection was blocked by locked Mac. Deployment dpl_BvFNneHnjt9zg215YQuQUch9cDm6 READY, aliased to https://www.repomadeclear.com.

## Repository selection / saved maps — 2026-11-09

Fixed the single-scan-per-account mismatch: new immutable scans are stored per authenticated user, repository ID, and branch in rmc_repository_scans (migration 005 applied to dedicated Supabase project). Existing rmc_scans snapshots and rmc_overlays are preserved. Workspace URLs carry the saved scan key; reads still recheck GitHub access, user ID, repository ID, encrypted owner binding, and decrypted repository name. New overlays use user + scan key; matching legacy overlays are copied on first new edit, never deleted. Unchanged snapshots are cached; changed-commit rescans remain unavailable. Global cap: 3 new attempts/day, at most 10 new repository/branch snapshots; existing source size/time limits unchanged.

UI only offers the workspace after a successful matching scan, clears it on selection changes, and ignores scan/selection responses that arrive after a different selection. Workspace label is now Interactive workspace / Your account. Payment remains disabled by RMC_FREE_ACCESS=true. Tests: 56 passed plus hosted build. Exact customer repository not yet identified or verified end-to-end. Production deployment dpl_4R9BF269PquSSA5EdvFVmjbKZzBE is READY and aliased to https://www.repomadeclear.com. Live HTML, client/workspace scan-key bundles, and free-access configuration verified.

# Build handoff — 2026-10-31

## GitHub personal-account isolation — November 9
User reported Brickware appearing alongside 0xyydeca. Source used GitHub /user/installations with saved user token (not global app installations); GitHub docs explicitly include collaborator and organization access. Public API confirmed brickware-web is type User, ID237627484. Exact collaborator grant for the user was not inspected. Tightened product policy: fetch /user identity on every installation listing, allow personal installations only for matching numeric owner ID, retain user-accessible organizations, filter returned repositories to installation owner ID/name. All repository/branch/scan/details/edit paths recheck this provider; guessed installation IDs rejected. UI shows connected GitHub login and shared-account notice, clears stale picker options before loading. 54 tests pass including cross-identity installation denial, repository injection rejection, tenant encryption and free-access isolation. Deployment dpl_J2nx1WJQzvhv944RVGLVucDMazG5 READY; live HTML verified. Affected signed-in Safari session could not be inspected because computer-use access to Safari was not approved; user must refresh for account-specific confirmation.

## GitHub installation picker fix — November 9
User screenshots proved read-only installation existed but repository_selection=all was silently filtered. Provider now accepts selected or all installations explicitly granted on GitHub; still enforces matching app ID, not suspended, contents/metadata read-only and signed-in user access. Added persistent picker help so initialization status cannot overwrite empty-state explanation. Selected repositories remain recommended. All 53 tests pass including all-repo success and write/unrelated installation rejection. Deployment dpl_KmXUHU3yduAGQYEho5ktWGPoR4Kf READY and live HTML verified; user-specific GitHub picker still needs refresh to verify.

## Free access — November 9, 2026
User explicitly superseded paid-feature requirement: make app free now. RMC_FREE_ACCESS=true enables details/edit/export for authenticated users with their own authorized GitHub repository and saved scan. Checkout is rejected server-side; payment buttons and price prompts removed. Existing encrypted user-bound storage, GitHub access validation, resource and scan limits unchanged. Dashboard for live Stripe acct_1SqqDq53WVhOEdrZ/subscriptions showed empty subscriptions onboarding (none found); no subscriptions canceled or financial records changed. All 53 tests pass, including free-mode cross-user/repository isolation and checkout rejection. Deployment dpl_GDK4mC6xDrJZ4oXcUhunPciBapvp READY, aliased to www.repomadeclear.com; live HTML and public config verified free. To reinstate pricing requires explicit product decision and redeployment with RMC_FREE_ACCESS=false. Shared logins still share their account connections/data; free access does not change that.

## Owner account transfer — November 9, 2026
Supabase project restored from paused state and dashboard verified Healthy. User created owner-6c9ecdd5@repomadeclear.com (UID cbe181e4-7fb2-41b4-a06a-59dd15725298). Production RMC_OWNER_USER_ID replaced with this UID; previous Gmail account no longer receives complimentary owner access after deployment. Normal authentication, GitHub authorization and tenant isolation remain required; no customer data copied. Password is not stored in source. Deployment dpl_BAmF6wwZqojwUGttHhfyuoeB3XK3 READY and aliased to www.repomadeclear.com. New account must connect GitHub and create its own scan before opening the workspace.

## Owner access — November 6, 2026
User explicitly authorized complimentary access for their existing verified account. RMC_OWNER_USER_ID is a server-only Vercel production setting: exact UUID match grants details/edit/export without a Stripe subscription. Normal Supabase verification, GitHub repository authorization, own-scan and overlay isolation remain enforced. Checkout refuses to charge the owner. Remove the variable and redeploy to revoke. No shared password or client-side bypass added. All 50 tests and production bundle build pass. Production deployment dpl_BjdQfcNfLnnMxzjtoBmTDb8GrksE is READY and aliased to www.repomadeclear.com. Signed-in owner browser verification remains pending; real live payment/webhook verification remains outstanding and is not established by this owner grant.

## Component explanations and navigation — October 31
Improved shared paid workspace: searchable components; What it does / Connections / Source evidence panels; incoming/outgoing navigation with previous-component action; clickable arrow explanation, type-reference distinction, exact repository/branch/commit/file/line evidence and validated commit-specific GitHub links. Human explanations remain labeled and corrected connections retain a disclosure of original evidence. Added inferred roles for billing/workspace modules; these remain filename/structure suggestions, not semantic/runtime proof. Fixed node dragging pointer capture intercepting ordinary component clicks. Human arrows dashed; no active-arrow flow animation implying runtime traffic.

49 tests pass, including evidence URL validation, human provenance/type-reference wording, existing unpaid isolation. Browser verified component click, connection panel, relationship evidence, and search using actual working-copy snapshot (26 source files, 8 areas, 64 references). Local preview now uses same workspace renderer, loopback-only on http://127.0.0.1:4176; npm run preview:diagram from app, local overlays memory-only until reload. Dependencies installed from lockfile with scripts disabled. Active preview session22512. Proof /private/tmp/rmc-component-explanation.png. Existing sites/clearbrief and old dev/diagram-preview assets preserved.

Deployed protected workspace as dpl_4ESrxrC6D1SH8mDRHgA7ckXcvH4C, https://repomadeclear-pc8wt7kzs-brickware-webs-projects.vercel.app aliased www.repomadeclear.com. Server entitlement checks unchanged; free overview remains static. No real live paid account exists, so production post-payment end-to-end remains unverified (do not assume Stripe live cycle complete). Display name in Stripe separately updated to RepoMadeClear, legal entity remains Brickware LLC.


## Live checkout enabled — October 31
Owner confirmed live Stripe secret and webhook signing secret saved in Vercel. Migration004 applied successfully in dedicated Supabase project; SQL verified row security=true and authenticated SELECT/INSERT/function EXECUTE=false. BILLING_MODE=live set in Production. Latest deployment dpl_HCQtb9DXLUQ55miU4cXLMC8fkgoa at https://www.repomadeclear.com (repomadeclear-ft881jygs-brickware-webs-projects.vercel.app). Live disclosures corrected: USD49/month/one repository, end-of-period cancellation, no additional rescans yet; removed obsolete no-payments preview wording. Build script saved canonical and staging.

Browser verified: authenticated user reconnected existing selected GitHub installation; selected repository1440351661/main. Open interactive map denied with 'No verified paid subscription for this repository yet' despite old sandbox payment. Subscribe opened actual cs_live Checkout with Repo Made Clear One repository, USD49/month and accurate cancellation/usage terms. Checkout creation also checks charges_enabled and valid end-of-period portal configuration server-side. No payment submitted. Manage billing opened live Stripe portal successfully (no payment method or invoices). Proof /private/tmp/rmc-live-checkout.png. Existing test-mode paid map/edit persistence was verified earlier; no live paid account exists, so live post-payment unlock/cancellation/refund lifecycle not end-to-end verified. Signed handler tests pass, but actual live webhook delivery/signing-secret correctness not yet verified. Open checkout will eventually expire and should generate checkout.session.expired; inspect destination we_1UWgxQ53WVhOEdrZZr6AJ4YR deliveries. Do not describe real purchase as tested. All46 automated tests passed before deployment; last change only pricing disclosures.


## Live Stripe setup — October 31, credentials pending
User completed Stripe activation and requested continuing live setup. Created live product prod_VXmUubl9gbugBL, USD49/month price price_1UWgvO53WVhOEdrZ5i5gaCoQ in existing authorized account acct_1SqqDq53WVhOEdrZ. Created portal configuration bpc_1UWgw253WVhOEdrZ3IaZkhSe: cancellation enabled at period end, subscription changes disabled, return to https://www.repomadeclear.com/#login. Created webhook we_1UWgxQ53WVhOEdrZZr6AJ4YR at https://www.repomadeclear.com/api/stripe-webhook, 12 checkout/invoice/subscription/refund/dispute events, snapshot API 2025-12-15.clover. Signing secret not retrieved. Screenshot /private/tmp/rmc-live-plan.png and /private/tmp/rmc-live-webhook.png.

Updated Vercel Production STRIPE_PRICE_ID to live price and added STRIPE_PORTAL_CONFIGURATION_ID. Existing deployment unchanged. Owner asked to replace STRIPE_SECRET_KEY with live key and add STRIPE_WEBHOOK_SECRET directly in Vercel; waiting for confirmation. BILLING_MODE not yet set live. Migration004 NOT applied. Do not deploy before migration and credentials are ready. Re-ran all 46 tests successfully. Remaining: migration004, key configuration, live flag, deployment, live checkout/portal and webhook delivery verification without charging. No real payment made; activation UI alone does not prove charges_enabled API status.


## Live-payment activation — prepared, not deployed
User explicitly requested live customer billing. Stripe email admin@brickware.ai verified; live account acct_1SqqDq53WVhOEdrZ still requires business onboarding (business type/details, account security, review/submit). Owner is completing the required form. Sandbox account remains acct_1SqqE35bzoAu3CdG. Do not claim live charges enabled.

Prepared migration004 rmc_billing_accounts with separate test/live rows and owner-token-protected checkout lease; migration NOT applied. Working code uses this table, so apply migration before deploying. Test customer records copied by migration without removing originals. Checkout checks live account charges_enabled and cancel-at-period-end portal configuration; blocks duplicate subscriptions/concurrent checkout, recovers orphaned open sessions, requires the user's repository scan before charging. Customer billing portal no longer requires a GitHub connection; authenticated caller identity remains verified and rate limited.

Live mode requires BILLING_MODE=live, live STRIPE_SECRET_KEY, live STRIPE_PRICE_ID, STRIPE_PORTAL_CONFIGURATION_ID and STRIPE_WEBHOOK_SECRET. Sandbox remains restricted otherwise. None of these live values configured yet. Live product/portal/webhook must be created after Stripe business activation; owner enters new secrets directly in Vercel. Current production remains prior successful sandbox deployment dpl_DMGWzLnWULRCYuufBLvAGV8T74fA.

46 tests and live-mode browser bundle build pass. Added actual webhook handler tests for signed duplicate delivery, test/live mismatch, invalid signature and storage retry; events audit only, protected access rechecks current Stripe payment state. Test/live account isolation and concurrent checkout lock tests pass. Remaining: apply migration004, configure live Stripe, validate portal and signed delivery, deploy, verify live checkout terms without creating an unauthorized charge. Source saved in VS Code; staging /private/tmp/rmc-payment-work.


## Sandbox checkout and protected map — verified
USD49 monthly sandbox checkout succeeded using Stripe test card and synthetic billing identity. No real charge. Verified live at www.repomadeclear.com: unpaid account denied, paid source map returned (16 source files, 7 presentation areas, 33 references), component explanations and exact evidence accessible. Saved scanner explanation as a human overlay; reload preserved it and original evidence. Authenticated test user kyky0112@gmail.com only; all other users and live Stripe keys are rejected by the sandbox gate. No owner entitlement bypass.

42 automated tests passed, including actual paid-map data isolation/unpaid rejection and deterministic checkout retry parameters. Fixed changing expiration under the same Stripe idempotency key; removed payment_method_types rejected by Stripe API 2026-10-28.endive. Payment methods now follow Stripe dashboard. Final code redirects successful new checkouts directly to protected workspace; redirect never grants entitlement.

Migration003 applied and SQL confirmed RLS and blocked direct authenticated reads/writes on all three tables. Production secrets remain inside Vercel; env pull returns placeholders. Sandbox price and test-email restriction configured. Webhook secret/destination and cancellation portal not configured or end-to-end tested. Live charges still disabled; before launch separate test/live customer records, set live product/key, configure portal/webhook, verify cancellation/refund lifecycle, and disclose final usage terms. Four-rescan plan recommendation is not implemented. Test workspace https://www.repomadeclear.com/workspace.html?installation=177088622&repository=1440351661 . Screenshot /private/tmp/rmc-paid-map-tested.png .


## Sandbox payment integration in progress
Migration 003 applied; RLS and blocked authenticated direct reads/writes verified for billing, overlays, payment events. User saved Stripe and service-role keys in Vercel. STRIPE_PRICE_ID and BILLING_TEST_EMAIL configured. Deployment dpl_9jF4FD8mosoPgJhf2jwmnhdFb6dr is test-only: all billing/protected actions require the verified test email and a test Stripe key. Live keys rejected. No real charges permitted. Sandbox checkout end-to-end still being validated; webhook secret and portal configuration outstanding.


## Payments — implementation prepared, integration NOT activated

User chose USD49/month per repository, monthly only, as pilot price. Four rescans/month and other pasted recommendations are not implemented promises. User selected existing Stripe. Native Chrome account is Brickware AI SANDBOX acct_1SqqE35bzoAu3CdG. Created test product prod_VXY1Sj78ROWe84 and monthly USD4900 price price_1UWSvh5bzoAu3CdGttqv96C5. No live product or charges.

Working copy adds official Stripe SDK, checkout bound to verified user and repository, customer idempotency, duplicate-subscription checks, price validation, billing portal link. Current Stripe subscription, paid invoice and charge are verified on every protected request; canceled/expired/unpaid/wrong-price/refunded/disputed/test-live mismatch fail closed. Signed webhook validates raw body and deduplicates event audit; events never independently grant access. Existing connection rate limit applies.

Paid details/edit endpoints revalidate repository membership, fetch only the user-owned encrypted scan, enforce repository binding, validate human overlay operations with existing engine, save separate encrypted overlays with optimistic version checks and server author/time. Hosted workspace renderer uses protected scan data, supports component explanations, evidence, group drilldown, tour, notes, added components/connections, reconnection, position saves and SVG export. No owner bypass. Local design preview preserved.

39 automated tests and hosted build passed in /private/tmp/rmc-payment-work. Not deployed, migration 003_billing.sql NOT applied, Stripe sandbox end-to-end checkout/editor NOT tested. Required server configuration: STRIPE_SECRET_KEY (sandbox first), STRIPE_PRICE_ID above, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY. Secrets must be entered directly in environment settings, not chat. Configure portal cancel-at-period-end and test return/failed/canceled/refund flows before live activation. No payment collection should launch until paid editing is verified. Current production remains previous free scan/overview.


## Interactive diagram design — local only

User selected LOCAL development preview until payments are ready; do not grant an owner entitlement or publish protected component data. Reference: Eraser-like muted nested groups, Mermaid-like source relationships, right panel plus drill-down, guided highlighting now, layperson explanations.

Implemented app/dev/diagram-preview (HTML/CSS/JS) and npm run preview:diagram. Local-only loopback server on 4175, fixed asset allowlist and host checks, creates isolated Git snapshot of current application source without executing it. Snapshot is explicitly local working-copy, not published GitHub main. No credentials or source snippets in served scan findings. Current preview: 17 source files, 7 presentation groups, 38 source references. Suggested component roles are inferred from file names/project structure and labeled; source relationships and evidence remain unchanged.

Features verified in browser: clickable node explanation/evidence panel, group drill-down, eight-step guided source-reference tour with play/pause/next/back and faded unrelated components; zoom/fit/pan controls implemented. Model checks passed for unchanged edges, complete group membership, preserved commit evidence. SVG labels use textContent. Readiness: design preview, not a paid product; editing/export/payment integration not added in this milestone. Live site unchanged. Run npm run preview:diagram in app/ to restart after closing the current temporary preview process.


## Live repository overview scan — completed

User requested live scanning and real map. Hosted /api/github scan action now revalidates Supabase identity, GitHub selected installation/repository and branch on every scan/cache read. GitHub tree/blob API reads committed source without executing code. Shared scanner supports explicit JS/TS ES imports only. Caps: 500 tree entries, 5 MB total, 80 source files, 200 KB each, 2,000 edges, 40-second acquisition deadline plus 8-second parse budget. Four concurrent blob reads; no AI calls.

Migration 002_scans.sql applied live. RLS enabled; direct authenticated table access and anonymous RPC blocked, verified true via SQL. Per-user locked RPC enforces one saved free scan, unchanged-commit cache, three attempts/day, two-minute claim. Full immutable findings are user-bound JWE ciphertext; free API emits folder groups/counts and grouped links only, no component explanations, file evidence or source snippets. Paid plans/details/editing/export/rescans are not implemented and remain unavailable. Preview terms disclosed before scan.

Live real scan succeeded for brickware-web/repomadeclear main at commit 8f0b66072cd27d1c446abf35c2a435c6ff9fb0bd: 16 source files, 29 omitted tree entries, 5 groups, 4 grouped links; zero unresolved references and omitted calls. Scan timestamp displayed 2026-10-30 19:56 Phoenix. 34 tests passed, hosted build passed. Evidence isolation/cache/limits tests use doubles; database policy checks and first live scan verified separately. Synchronous bounded preview scan, not a background worker. Source saved in canonical VS Code app. Previous original Site preserved.

Limitations: no live payment/entitlement service, no changed-commit rescan, no hosted overlays, no scan deletion UI or retention automation, no external-customer pilot validation. Existing Github user tokens require reconnection after expiry. Changes deployed by CLI; GitHub auto-deploy remains disconnected.


## Repository boundary repair and live GitHub validation

Created a dedicated Git repository at /Users/kyaryeh/Documents/git/repomadeclear after GitHub Desktop incorrectly picked up the parent repository and unrelated sibling projects. Parent Git repository was not modified. Root ignore rules exclude local secrets, private keys, dependencies, build output and scan artifacts.

GITHUB_CLIENT_SECRET is now configured in Vercel Production; deployment dpl_E7XeoByu1sY2mAJVEkXx8zXkKMmM is ready. User completed live OAuth authorization and installed App 5550419 with selected repository brickware-web/repomadeclear, installation 177088622. Live picker displays that installation and repository. GitHub repository was verified empty, so no branches exist yet. Hosted scanning remains unimplemented. These facts supersede credentials-pending notes below.

## Hosted GitHub connection — credentials pending, 2026-10-30

User confirmed email delivery and successful verified sign-in; screenshot shows signed-in account. Both domains validated in Vercel and custom-domain HTTPS signup loaded. Supabase Site URL is now https://www.repomadeclear.com (save toast verified).

User registered GitHub App `repo-made-clear` under brickware-web. App ID 5550419, client ID Iv23li0TML7YRHUcHKJY. Requested permissions Contents read and mandatory Metadata read; public installability; webhook disabled; expiring user tokens left enabled. Both www.repomadeclear.com/github/callback and repomadeclear.vercel.app/github/callback registered. User explicitly chose to submit registration themselves. Latest UI: zero client secrets and zero key pairs; GitHub says a private key must be generated before installation. Owner must create credentials and store GITHUB_CLIENT_SECRET in Vercel Production, not chat. The private key is not consumed by this user-token implementation but GitHub requires it for installing the App.

Implemented and deployed `/api/github` Vercel function, authenticated against Supabase on every request, exact host/origin checks, PKCE and browser binding, one-use state atomically consumed in Postgres, user-bound expiring JWE encryption of GitHub tokens, selected-repository/read-only installation checks, branch and access revalidation, durable selection metadata, local disconnect. Tokens expire after at most 8 hours and require reconnect; refresh/webhook revocation are still future work. No scanning or paid data routes are exposed. Disconnect deletes the saved connection but does not uninstall or revoke the GitHub App; UI discloses that distinction.

Migration app/migrations/001_github_connections.sql applied to dedicated Supabase project. RLS ON; direct reads/writes revoked from authenticated and anon; narrow RPC uses auth.uid() exclusively, no user-id parameter, encrypted payloads, atomic one-use state and 30 calls/minute/user. Live SQL checks returned true for RLS, blocked direct reads, blocked direct writes, and blocked anonymous RPC. This is connection storage, not a completed project/scan tenant data layer. Automated API tests use in-memory store doubles; live OAuth and cross-user integration acceptance remain pending credentials.

31 tests and hosted build pass. Deployment dpl_J8Ku4LKMUYXJg64iUcBKVGgDmAPu ready; public GET /api/github returns intended Method not allowed JSON. Vercel Production has GITHUB_APP_ID, GITHUB_APP_SLUG, GITHUB_CLIENT_ID and generated server-only GITHUB_TOKEN_ENCRYPTION_KEY. GITHUB_CLIENT_SECRET is missing, so backend/status and UI fail closed with GitHub unavailable. After owner saves secret, redeploy and validate installation/OAuth/repository/branch flow with selected repository only. Never expose encryption key or client secret to browser build.

Canonical source saved in VS Code app/. Temporary deployment staging /private/tmp/rmc-github-build. GitHub auto-deploy remains disconnected. Original Site preserved.

## Live managed accounts — 2026-10-30

Dedicated Supabase project `ylefxstaiqvnhksbcapa` (Repo Made Clear, Brickware AI) is healthy. The older `bpcjvcusgfuykwghqrme` belongs to another app and was not changed. New project's email signup enabled, anonymous signup disabled, email confirmation required (verified live settings endpoint). Supabase Site URL was set to https://repomadeclear.vercel.app; custom-domain follow-up is in progress.

Published managed browser authentication with official @supabase/supabase-js. Hosted client supports password signup/login, email confirmation links, recovery links, password update, local signout, persisted sessions and automatic refresh. Hosted sessions use Supabase's browser storage, not the earlier process-local Node cookie implementation. Browser state is NOT authorization for repository data or paid actions. All hosted repository/scan/payment features remain unavailable; no protected data or backend routes were published. Future hosted APIs must independently validate access tokens and enforce tenant/paid permissions.

Build: `scripts/build-hosted.js` bundles only account UI/assets and safe config, rejects non-publishable keys, uses Vercel production SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. `vercel.json` permits browser connections only to the dedicated project. Original local Node server remains separate. Code saved in VS Code project; GitHub auto-deploy still not connected. 25 automated tests passed. Live public signup rendering and provider configuration verified; actual email delivery, signup, login, refresh and recovery end-to-end await the owner entering their own password. No account was created by the agent.

Supabase's current default sender only delivers to team members (initial test admin@brickware.ai); custom SMTP is required for customer emails and editable templates. Hosted UI uses default email LINKS, not the older local code templates. Custom SMTP, production data access, paid entitlement, GitHub connection and scanning remain outstanding.

Domain: user purchased/attached repomadeclear.com and www.repomadeclear.com. GoDaddy A @ changed from Parked to 216.198.79.1 (TTL600); CNAME www changed from repomadeclear.com to 360ddf4293bbaa0a.vercel-dns-017.com (TTL3600), exactly matching Vercel requirements. Both saves confirmed. Nameservers and other DNS records preserved. Vercel apex redirects 308 to www. Propagation/TLS verification pending at this note.

## Vercel website preview — 2026-10-30

User requested launch on Vercel. Published https://repomadeclear.vercel.app in `brickware-webs-projects/repomadeclear`. Public HTTP check returned 200; `/api/config` reports all services unavailable and `/api/session` reports signed out. This is a static design preview, not working hosted authentication/scanning or production readiness. Supabase was still provisioning during account setup; no Supabase credentials were deployed.

Reproducible preview configuration: `app/vercel.json` runs `node scripts/build-preview.js`, output `dist/`. Build copies only three web assets and explicit unavailable-service JSON responses. No scanner artifacts, evidence, secrets or backend are published. Existing local Node app remains unchanged. Deployment used an allowlisted temporary staging directory and Vercel CLI, not GitHub; GitHub auto-deploy is NOT connected and the parent-Git-root caution still applies. For later Git import, choose `app` as Root Directory after explicitly publishing the actual project code.

Next: finish Supabase setup and replace volatile sessions with hosted persistent sessions before enabling real accounts on Vercel. Do not simply add credentials to this static preview and claim authentication works.

## Design update — 2026-10-30

User requested the supplied Vercel screenshots as a visual reference: minimal monochrome account screen first, and a spacious marketing homepage reached by clicking the top-left logo. Implemented in `app/src/web/` with a custom nested-diamond SVG mark. Default `/` shows login; `#home` shows marketing; `#signup`, `#login`, `#recover`, and `#verify` preserve account flows. Homepage sections include product, workflow, and transparent pricing availability. No unsupported social-login buttons or customer logos were added. Both details and editing stay paid. Service setup is still required.

All 20 existing tests pass. Browser verification confirmed sign-in rendering, diamond-to-home navigation and home-to-signup navigation at a narrow viewport. Desktop CSS is responsive; no external service configuration or deployment was performed.

## Current implementation status — account/GitHub foundation, 2026-10-30

Canonical working project is now `/Users/kyaryeh/Documents/git/repomadeclear`; this is the folder open in VS Code. The older LineageTracing copy is not the active application workspace. Its existing Site was preserved.

User reconfirmed the journey and explicitly answered: **details and editing both paid**. Free users get only a static high-level map. Keep paid detail/edit/export checks on the server when those endpoints are built.

Implemented this milestone in `app/`:
- Customer shell at `http://localhost:4174`, started with `npm start`. The previous developer map preview on port 4173 is a separate tool and was not replaced.
- Managed Supabase Auth adapter (implementation recommendation) for email/password registration, sign-in, verification codes, recovery codes and password update. No password storage or custom password hashing. Server-held provider tokens, opaque HttpOnly cookies, email-confirmation checks, recovery isolation, session expiry, same-origin/host checks and bounded requests.
- GitHub App user authorization with PKCE and one-use session-bound callback state. Installation/repository/branch selection checks both user and App access, selected repositories, and Contents/Metadata read-only permissions. Rechecks access when saving selection; tokens remain server-side. Local disconnect implemented.
- No fake success paths. Without configuration, registration is disabled with a setup message. A selected branch does not trigger a scan. Customer routes do not serve developer maps, scan outputs or protected details.
- Twenty automated tests pass. Seven new tests cover account/security/provider boundaries using test doubles; thirteen previous scanner/editor tests still pass.
- Local browser check passed for the unconfigured customer shell: page rendering, recovery and code view switching, and disabled registration. Screenshot: `/private/tmp/repo-made-clear-account-screen.png`. Live email delivery and real GitHub OAuth were NOT tested because credentials are not configured.

Read `app/ACCOUNTS_SETUP.md` and `.env.example` next. No external accounts, GitHub App, email sender or paid services were created. Do not request secrets in chat; the owner configures them in the ignored local `.env`. Supabase Confirm email must be enabled and confirmation/recovery templates must include the email code. GitHub setup uses the callback URL documented in the guide.

Limitations: volatile single-process sessions/connections, no refresh, no durable users/projects/scan jobs/entitlements, no hosted source intake, no paid checkout, no webhooks, no production revocation/deletion workflow. All project/scan routes currently fail closed as unavailable; this is NOT a finished paywall. Production authentication, user/tenant isolation, webhook replay and payment bypass acceptance remain outstanding. Scanner scope is still explicit JS/TS source imports; configuration extraction is not implemented.

Next: configure and live-test managed email and GitHub App; build bounded GitHub source intake, persistent tenant-owned projects and background scans, unchanged-scan cache and quotas; serve a strictly limited static preview; then implement verified payment entitlements for detail/edit/export and paid rescans. Determine actual terms and prices before scans/payment go live. Representative repository validation and the three-owner pilot gate remain open.

Repository caution: `git rev-parse --show-toplevel` still returned `/Users/kyaryeh/Documents/git`, the parent of the intended project. Do not stage, commit, pull or push from the parent tree. No Git publishing or remote changes were made in this milestone.

## Prior scanner/editor milestone — 2026-10-30

The local extraction and human-editing slices are implemented in `app/`. Read `app/README.md` for precise scope and commands. The existing Site remains unchanged. Stage 1 customer validation is still outstanding; stage 2's edit/rescan model and offline editor are implemented, with browser acceptance still pending.

- Scanner version 0.2.0 / schema version 2 reads committed Git objects without executing source. Each source file and explicit ES reference has a fingerprint; evidence includes repository, branch, commit and line range. Connection IDs survive harmless line shifts. Changed resolved destinations are detected even when import text stays identical.
- The scanner now rejects an empty/nested folder that would silently fall back to a parent Git repository. Environment and secret-like files remain excluded. Resource caps remain enforced; no AI calls are made.
- The local map editor provides component and connection selection, separate human explanations/rationale, custom components/edges, connection correction, drag/keyboard layout changes, and separate edit-file save/load. Human assertions are clearly labeled; reconnected arrows do not inherit detected evidence.
- Original findings are immutable. Human edits and layout are separate collections with author/time metadata. Rescans preserve edits and flag changed/missing evidence. Missing evidence cannot be acknowledged as current. Local browser storage is optional convenience; use an edits JSON file as the portable backup across scans.
- Thirteen automated tests pass, including real temporary Git rescan sequences, overlay preservation/conflicts, evidence and secret exclusions, input limits, parent-folder scope protection, import context validation, generated-script syntax and CSP/escaping checks.
- Latest actual application-source snapshot: five scanned files, twelve references, 74 ms, $0 AI usage. Artifact: `app/output/51d07b824e1ffef22a2061b7a32096dad4a88f58/map.html`. This is internal verification, not customer validation. Synthetic cases remain confined to tests.
- Browser visual/interaction QA was attempted but blocked by browser URL policy for local file URLs. Do not claim it passed. Verify the map manually in a browser (see README checklist).
- The user supplied `https://github.com/brickware-web/repomadeclear` and `/Users/kyaryeh/Documents/git/repomadeclear/`. After the user made GitHub public, connected API access succeeded and the commit API reported an empty repository. The local folder was empty and Git was falling back to its parent. Neither destination was changed; no code was published or pushed.
- No deployment, authentication, GitHub App, billing, paid entitlement or tenant isolation exists. This offline map contains protected details and must not be used as a free customer preview. Source findings are not overwritten on repeat output, but early cache lookup and hosted scan-frequency enforcement remain unfinished.
- No paid service provisioned. App and root docs remain local without a configured backup remote. The public empty GitHub repository is not yet a backup of this project.

Next: browser QA of the local editor, then real representative repository extraction/owner review. Continue to separately stored authenticated overlays when accounts arrive. Preserve the three-repository pilot validation gate and test server access/paid entitlements before customer use. Publishing this local code to the now-public repository requires a separate explicit request; do not include scan outputs or customer evidence.

## Original handoff context

Read `AGENTS.md` and `PROJECT_BRIEF.md`. The original documentation-only handoff below records the agreed staged direction.

Suggested next-chat request:
> Read AGENTS.md, PROJECT_BRIEF.md, and BUILD_HANDOFF.md in this project. Start building Repo Made Clear in app/. First deliver a bounded real repository scanner and an evidence-backed map using a representative supported repository. Preserve the old Site. Follow the staged plan and keep the $500 budget in mind. Do not substitute demo findings for real scan results.

## Verified local starting state

- Root: `/Users/kyaryeh/Documents/ChatGPT/LineageTracing`.
- Existing prototype: `sites/clearbrief/dist/index.html`, `style.css`, `app.js`.
- Existing Site: https://clearbrief-tech-updates-ky.yikpuitim1999.chatgpt.site/
- Existing prototype git checkout was clean before these root documents were added. The workspace root is not itself a git repository; these new documents are local and are not yet backed up by the nested Site repository.
- Inspection confirms a fictional workflow, browser-local notes, export/presentation tools, and public GitHub metadata/root package.json inspection. It does not implement the proposed authenticated scanner.
- No domain registration, hosting migration, account purchase, code-access credential setup, or deployment was performed today.

## Recommended development setup

Use Codex on this local project as the primary coding assistant; free VS Code is optional for viewing/editing files. Use ChatGPT chat for planning/copy/product feedback. Keep Sites as the existing visual prototype, rather than assuming its current static implementation provides the server jobs, custom auth, secure GitHub integration, and payment enforcement required here.

Recommended architecture, to validate at implementation: TypeScript/React web application, a mature interactive graph library, managed email/password auth and Postgres, a server-side GitHub App integration, a background scanner, and hosted payment checkout with verified webhooks. React Flow and an automatic layout library are candidates, not purchased dependencies. Choose hosting after measuring scanner runtime/memory, rather than assuming every scan fits a short web request.

## Build sequence and acceptance

1. **Extraction feasibility.** Define supported file patterns and graph schema. Analyze a small representative authorized repository without executing it. Output nodes, typed edges, file/line evidence, commit, and coverage gaps. Negative fixture proves an unused package does not become a confirmed integration. Measure runtime and expected scan cost.
2. **Map and human edits.** Show overview and expandable details, save custom notes/components/edges and layout separately. Prove rescan preserves edits and flags stale evidence. Use fixture data only when visibly labeled in development.
3. **Accounts and real GitHub connection.** Email verification/reset, selected-repo installation, repository/branch picker, background scan status, access revocation and deletion. Verify project isolation and repository access for each signed-in user.
4. **Preview and payment.** Free static preview; paid details/edit/export endpoints check server-side entitlement. Choose actual offer/price before configuring live checkout. Verify signed, idempotent payment webhooks; no entitlement from a redirect alone. Test unpaid API requests, duplicate events, cancellation policy, and scan abuse limits.
5. **Pilot and launch readiness.** Three representative users/repositories, understandable failure states, export, support/contact, retention/deletion policy, privacy/terms, monitoring, usage caps. Review secrets handling and access control before real customer code. Deploy only a clearly described readiness level.

## Costs and tool choice

Verified official pages on 2026-10-30:
- OpenAI pricing: https://learn.chatgpt.com/docs/pricing — Plus $20/month with Codex, usage limits; Pro from $100/month. Subscription usage is limited and optional extra credits/API-key billing differ. Existing user's actual plan is unknown.
- Cursor: https://cursor.com/pricing — current page lists Free, Plus $8/month (Grok only), Premium $30/month, Super $100, Ultra $200. Third-party models are billed separately by usage. Do not quote stale $20 Pro pricing without rechecking.
- VS Code: https://code.visualstudio.com/docs/supporting/faq — free for private/commercial use. Full Visual Studio is not necessary for this web app.

Recommendation: use an existing eligible Codex subscription first, or budget $20/month for Plus if appropriate. Do not buy both Cursor and an upgraded Codex plan at the outset. No promise that Plus covers all weekly development; measure actual consumption before upgrading.

Distinguish (1) coding-assistant subscription/overages, (2) the app's model/API usage serving customers, (3) hosting/database/email/processing, and (4) payment processing fees. Do not assume a personal subscription gives unlimited production inference. Recheck available credits and commercial integration terms before choosing production model access.

Illustrative $500 cash envelope, not quotes or purchase authorization:
- Domain reserve $25, ownership not yet confirmed.
- Three months coding tool reserve $60, less if already covered.
- Hosting/database/email/processing reserve $120.
- Product AI testing reserve $45.
- Contingency $250.
Total $500, excluding founder labor and taxes. Costs can exceed this without limits; defer paid infrastructure until needed and enforce quotas. A small pilot operating estimate of $40–125/month from prior discussion is an estimate, excludes coding subscription and payment fees, and must be replaced by measured costs.

Reduce tokens by retaining these handoff docs, using small completed milestones, sending relevant code excerpts rather than whole repos to explanation models, caching by commit/content hash, and regenerating only changed explanations. Use stronger models for difficult analysis only after measuring quality; do not select a model based on cost alone. Record actual token usage and cost per scan.

## Important product judgments

The paywall is the user's chosen flow, not validated conversion research. A visible sample explanation on a separate demo may help sell the benefit without changing the locked customer preview. Recommend experiments, but do not silently change the user's paywall.

Eraser already offers interactive architecture maps; click-to-expand is not a proven competitive advantage. Test whether evidence-backed plain-English reporting plus durable human context solves a paying customer's recurring need.

User corrections must never become fabricated code evidence. Store internal scan timestamps now even though the full history UI is later. Screenshots of a visible map cannot be reliably blocked.

Logo refinement — 2026-10-30: user supplied a precise mark reference. Header and hero now use a thin black outer diamond outline, a white gap, and a solid black inner diamond. Replaced the earlier thick nested mark.

Local test bypass was removed at the user’s request on 2026-10-30. Normal managed-auth login remains required.


## Local analysis/rescan milestone — 2026-11-09 (NOT deployed)
- Scanner 0.3.0: JS/TS resolved direct named calls, Express/Next routes, inferred file-based API exports, literal fetch request/endpoint matches, direct Supabase/Prisma operations and external HTTP host references. Static findings, not runtime discovery.
- Python syntax parser: simple absolute imports, top-level function calls (inferred), FastAPI verb decorators and requests/httpx literal hosts. No Python database analysis, relative imports, dynamic routing, or complete call graph. No scanned code executes.
- Interactive workflow tour follows request → endpoint → handler/function → supported database/service edges, with inference labels and source lines.
- Proposed hosted limits implemented locally: 200 source files, 20 MB supported source, 200 KB/file, 5,000 tree entries; images/docs excluded from source bytes. Existing network deadline, evidence and edge caps remain.
- Synthetic 200-file/19.8 MB parser benchmark: 271 ms, 168 MB process RSS, ~231 KB JSON. Real current repo: 28 files, 204 nodes, 1,166 edges, 237 ms. Not production/download load testing. Reproduce with scripts/benchmark-scanner.mjs.
- Migration 009 introduces bounded immutable history (100 prior snapshots/account), updated current map, annotation carry-forward and server-only transactional save RPC. Shares lock with scan completion; stale-map/version writes rejected. Branch is included in new cache keys. Legacy annotations copied only after backend verifies encrypted repository/branch identity.
- Validation: 65 automated tests pass; npm run test:storage passes in local PostgreSQL-compatible PGlite for archive, annotations, stale saves, version conflicts, cache and user separation. Hosted build passes with public Supabase config.
- REQUIRED BEFORE DEPLOY: apply migration 009 to dedicated Supabase project; verify legacy migration and concurrent live sessions; exercise GitHub download bounds and visually verify new workflow navigation. Do not deploy paid-map.js before its save RPC exists. Current production remains unchanged.
- Changes saved in local canonical VS Code repository; not committed or pushed by this task.

## Production deployment — 2026-11-09
- Applied migration 009 to dedicated Supabase project ylefxstaiqvnhksbcapa; dashboard confirmed history table and safe-edit RPC exist.
- Vercel deployment dpl_HBziZHJBQ2TYf1dDaTsLL3dHdRfs is READY and aliased to https://www.repomadeclear.com. Deployed matching staging app via CLI.
- Live smoke checks: HTTP 200; 5,000 tree entries, 200 supported files, 20 MB supported source, Python and rescan copy present; unauthenticated details request returns 401.
- 65 automated tests and local storage regression checks passed before deployment. A signed-in live GitHub rescan/edit walkthrough has not yet been verified.
- Preview build failed because Preview lacks public Supabase settings; production build succeeded with its existing environment.
