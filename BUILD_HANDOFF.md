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
