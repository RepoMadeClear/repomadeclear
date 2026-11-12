# Repo Made Clear — accounts, GitHub connection, and local scanner

Local development only. The existing Site is untouched. The local customer app supports managed sign-in, read-only GitHub access, bounded scans, and an interactive map when configured with an isolated development Supabase project. Local interactive access is free; no Stripe checkout or payment is used. Hosted payment policy is unchanged.

## Architecture overview

```mermaid
flowchart LR
  subgraph Hosted["Hosted customer app (Vercel)"]
    Browser["Customer browser"] --> Static["Built web app<br/>hosted-client.js"]
    Static --> Auth["Supabase Auth<br/>browser session"]
    Static --> GHRoute["/api/github"]
    GHRoute --> GHHandler["github-api.js<br/>auth and access checks"]
    GHHandler --> GitHub["GitHub App / GitHub API"]
    GHHandler --> ConnStore["Supabase RPC<br/>encrypted GitHub connection"]
    GHHandler --> HostedScan["hosted-scan.js"]
    HostedScan --> GitHub
    HostedScan --> Scanner["scanner.js<br/>scanSnapshot"]
    HostedScan --> ScanStore["Supabase RPC<br/>encrypted scan evidence"]
    HostedScan --> Overview["Grouped overview<br/>returned to browser"]
    Overview --> Browser
    Auth -. "credentials and sessions" .-> Browser
    Disabled["Paid workspace actions<br/>require hosted entitlement"]
  end

  subgraph Local["Local developer workflows"]
    Repo["Authorized Git repository"] --> CLI["npm run scan<br/>src/cli.js"]
    CLI --> LocalScanner["scanner.js<br/>Git objects + scanSnapshot"]
    LocalScanner --> Findings["scan.json"]
    LocalScanner --> MapRender["map.js"]
    MapRender --> Map["map.html"]
    Map --> Editor["editor-client.js"]
    Editor --> Overlay["overlays.js"]
    Overlay --> EditFile["Separate edits JSON"]

    Start["npm start"] -->     LocalServer["server.js<br/>local account, GitHub and workspace routes"]
    LocalServer --> Providers["providers.js"]
    Providers --> Services["Supabase Auth / GitHub API"]
    LocalServer --> Workspace["Authenticated interactive workspace"]
    Workspace --> MapStore["User-scoped map RPC"]
  end
```

The hosted app and local developer tools are separate. The hosted scanner reuses the source-analysis logic but returns a grouped preview; the local CLI produces protected full findings and a standalone editable map. Neither source findings nor human edits are mixed with one another.

## Customer account and GitHub entry flow

Run `npm start` and open http://localhost:4174. This customer shell is separate from the offline developer editor. Local Supabase authentication and scanning require an explicitly configured development project; the local server fails closed against the known production project. With isolated Supabase, GitHub App, and encryption-key configuration, it supports managed sign-in, read-only repository selection, and a bounded scan through the same `scanner.js` and `hosted-scan.js` used by the hosted API. The endpoint rechecks repository access and the selected branch, stores encrypted per-user findings through the scan RPC, and returns only a grouped overview. Scan quotas, unchanged-scan caching, scan history, and overlay preservation depend on the configured Supabase project having the repository-scan migrations applied.

On localhost only, an isolated development Supabase project enables free interactive maps. Map reads and edits require the signed-in user, revalidated GitHub repository access, and a saved scan owned by that user. Apply migrations 001–010 only to the isolated development project; migration 010 adds authenticated, user-scoped map reads and edits. It is not applied automatically and must never be applied to production as part of this local workflow. Stripe remains disabled locally, and the hosted paid-access policy is unchanged. See [ACCOUNTS_SETUP.md](ACCOUNTS_SETUP.md). Without required configuration it reports setup is needed; it does not create demo accounts or pretend a scan ran.

The hosted app keeps its paid entitlement requirement. Only the isolated localhost preview is free. No Stripe checkout, test payment or real charge is used by localhost. Automated tests cover the local map route, saved-scan ownership, GitHub revocation and storage isolation; external email/OAuth flows remain unverified until setup.

## Open in VS Code

Open this workspace's `app` folder. With Node 22+ and Git installed:

```sh
npm ci --ignore-scripts
npm test
node scripts/scan-self.js
npm run scan -- /absolute/path/to/authorized-git-repository main owner/repository
```

The command prints a `map.html` path. Open that file in a browser. `scan.json` beside it contains structured findings. Both include protected details and are local developer artifacts: never expose these files as the free customer preview.

`scan-self.js` copies this application's real source into a temporary Git repository, commits a clearly labeled local snapshot and scans it. It prints the retained snapshot path for checking evidence. This is not an external customer validation or fabricated example. The source snapshot is temporary and may be removed by the operating system.

## Supported boundary

Committed `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx` source; explicit ES imports/re-exports and literal dynamic imports. Relative source references resolve exact paths, extensionless paths, index files and JS-to-TS extensions. Bare imports are package references, not confirmed services. CommonJS calls, computed imports and unresolved relative references are counted as gaps. Alias configurations, Next.js routes, database/API calls, infrastructure, runtime topology and business impact are not yet supported. This narrower slice is an implementation recommendation within the proposed JS/TS MVP.

The scanner reads Git objects, never executes scanned source or installs its dependencies. Only normal committed files are considered; symlinks, environment files, secret-like paths, tests and common generated directories are excluded. No source snippets or arbitrary literal values are saved or sent to AI. This is not a general secret detector; file paths and package names are retained as evidence, so security review is required before customer code intake.

Caps: 2,000 tree entries, 20 MB repository blobs, 500 KB per supported file, 15 seconds and 10,000 connections. No AI calls or tokens. Runtime and bytes are recorded. A declared but unused package does not generate a node. Findings have repository, branch, commit, scan time, typed references and exact source line ranges. Explanations are deterministic and describe only observed references.

Outputs retain the first findings for an identical commit/context instead of overwriting them. This currently avoids output replacement, not repeat parsing; early scan caching and frequency enforcement belong before a hosted scanning endpoint. Human edits and positions live in an independent overlay document; the original scan findings remain unchanged.

## Edit the map and carry context into a rescan

1. Open the generated `map.html` in your browser and enter your name for edit attribution.
2. Select a component or connection. Add an explanation and design rationale; source findings remain separately visible.
3. Add a component or connection under **Add human context**. Added components and reconnected arrows are human-supplied, never scanner-verified.
4. Drag components to move them. Keyboard users can focus a component and use arrow keys.
5. Choose **Save edits file** to save a separate JSON document. Browser storage is a convenience only; its availability and sharing between local files vary.
6. Scan a newer commit. Open its map, choose **Load edits file**, and load the saved JSON. Loading replaces the current working edits, so save those first.
7. Review changed or missing source evidence. Context and saved positions survive. Missing components/connections remain in the review list rather than appearing as newly detected facts. You cannot mark missing evidence reviewed; retain the note and add a human component/connection if appropriate.

Each human edit records its author and update time. Source-bound edits also record the evidence fingerprint and commit they were reviewed against. A line-number shift alone does not invalidate a connection note. Changed import content, resolved destination, source-file contents, or scanner version flags relevant context. Layout positions are preserved independently. Human names are self-reported locally, not authenticated identities.

The edit document is scoped to repository label and branch, validated on import, capped at 1,000 entries per collection and 2 MB per imported file, and cannot add fabricated source evidence. Repository labels must remain consistent across rescans. This is local data separation, not tenant isolation or paid entitlement. Legacy version 0.1 scans lack the new fingerprints; generate a version 0.2 scan before using this workflow.

## Validation and next gate

Thirteen automated tests pass. They cover evidence correctness, unused packages, secret-file exclusions, unsupported patterns, resource limits, parent-repository fallback rejection, generated-script escaping and CSP integrity, immutable scan findings, stable connections after line shifts, changed destinations, overlay preservation, missing evidence, and invalid/cross-context edit imports. Run `npm test`.

Actual source verification: five supported application files and twelve references. No third-party source was executed. The user-provided `brickware-web/repomadeclear` GitHub repository became publicly accessible but had no commits; the provided local folder was empty. Neither has been modified or populated by this implementation.

Browser visual/interaction QA is outstanding: the browser tool's URL policy blocked opening the local HTML file. Automated model and generated-script tests passed, but do not substitute for an end-to-end browser check. Check note saving, drag/keyboard movement, file save/load, reload persistence, connection corrections, and review actions in a browser before considering the local editing milestone fully accepted.

Next: perform browser QA and validate extraction with authorized representative repositories containing code. The three-repository/owner review gate remains outstanding. Add route/integration patterns only with evidence tests. Paid entitlement enforcement and webhook replay handling remain separate work. No deployment is authorized or implied by this local artifact.
