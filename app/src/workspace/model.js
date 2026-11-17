const frontendPath = /(?:^|\/)(?:client|frontend|web|browser|ui)(?:\/|$)/i;
const supportPath = /(?:^|\/)(?:build|dev|scripts|tools)(?:\/|$)/i;
const testPath = /(?:^|\/)(?:test|tests|__tests__|fixture|fixtures)(?:\/|$)|(?:\.|-)(?:test|spec)\.[^.]+$/i;
const generatedPath = /(?:^|\/)generated(?:\/|$)|(?:\.|-)generated\.[^.]+$/i;
const migrationPath = /(?:^|\/)migrations\/[^/]+\.sql$/i;
const monorepoPath = /^(apps|packages)\/([^/]+)\//;
const semanticGroups = new Map([
  ['cli-command', ['Commands', 'A command entry point represented in supported scan evidence.']],
  ['worker-trigger', ['Triggers & scheduled jobs', 'A worker trigger represented in supported scan evidence.']],
  ['scheduled-trigger', ['Triggers & scheduled jobs', 'A scheduled trigger represented in supported scan evidence.']],
  ['public-interface', ['Public interface', 'A public library interface represented in supported scan evidence.']],
]);
const roleDescriptions = {
  'billing.js': ['Payment checks', 'Checks whether a repository has a paid subscription before its detailed map can be opened.'],
  'paid-map.js': ['Protected map & saved edits', 'Loads the map and saves human notes only after checking payment and repository access.'],
  'stripe-webhook.js': ['Payment notifications', 'Receives signed payment updates from Stripe and records them for tracking.'],
  'workspace-entry.js': ['Map access doorway', 'Asks the server for the map using the signed-in account.'],
  'app.js': ['Interactive map controls', 'Organizes what you see and the controls used to explore or edit the map.'],
  'model.js': ['Map labels & grouping', 'Turns scan findings into names and groups that are easier to explore.'],
  'hosted-client.js': ['Web app connector', 'Connects the page to account and repository services.'],
  'client.js': ['Account & repository screens', 'Handles the buttons and forms people use to sign in and choose their repository.'],
  'hosted-auth.js': ['Account sessions', 'Helps the browser use the managed sign-in service and keep track of who is signed in.'],
  'github.js': ['Repository request entry', 'Provides the entry point for repository requests from the website.'],
  'github-api.js': ['Access checks & requests', 'Checks the signed-in user and routes repository requests to the appropriate helper.'],
  'github-store.js': ['Protected connection storage', 'Handles encrypted connection information so access credentials do not need to be exposed in the page.'],
  'hosted-scan.js': ['Online scan coordinator', 'Collects supported source from GitHub and prepares the saved software overview.'],
  'providers.js': ['Account & GitHub connectors', 'Groups the requests used to talk to the account provider and GitHub.'],
  'scanner.js': ['Source relationship reader', 'Reads source code to find explicit references between files and libraries. It does not run the application.'],
  'map.js': ['Map document builder', 'Builds a view of the scan findings for people to explore.'],
  'editor-client.js': ['Local map editor', 'Handles interactions in the local map editor.'],
  'overlays.js': ['Human notes & edits', 'Keeps human changes separate from the findings detected in source code.'],
  'cli.js': ['Local scan command', 'Starts a scan from a developer’s command line.'],
  'server.js': ['Local development server', 'Serves the local account and repository workflow for development.'],
  'build-hosted.js': ['Website build step', 'Prepares website files for hosting.'],
  'build-preview.js': ['Preview build step', 'Prepares the earlier preview website files.'],
  'scan-self.js': ['Project scan helper', 'Provides a local helper for scanning this project.'],
};

function packageRoot(file) {
  const match = file.match(monorepoPath);
  return match ? {kind: match[1], name: match[2]} : null;
}

function sourceFile(node) {
  const file = typeof node.label === 'string' && node.label.trim() ? node.label : node.evidence?.file;
  return typeof file === 'string' && file.trim() ? file : `unlocated:${node.id}`;
}

function classifySources(nodes, edges) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const sourceByPath = new Map(nodes.filter(node => node.kind === 'source').map(node => [sourceFile(node), node]));
  const signals = new Map([...sourceByPath].map(([file, node]) => [file, {
    node,
    browser: false,
    frontend: false,
    backend: false,
    request: false,
    endpoint: false,
    storage: false,
    publicInterface: false,
    cli: false,
    worker: false,
    external: false,
    importedBy: new Set(),
  }]));

  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    const file = edge.evidence?.file || source?.evidence?.file || target?.evidence?.file;
    const record = signals.get(file);
    if (!record) continue;
    if (edge.kind === 'declares-endpoint') record.endpoint = true;
    if (edge.kind.startsWith('database-')) record.storage = true;
    if (edge.kind === 'requests-http') record.request = true;
    if (edge.kind === 'requests-service') record.external = true;
    if (edge.kind === 'calls-function' && target?.kind === 'public-interface') record.publicInterface = true;
  }

  for (const node of nodes) {
    const record = signals.get(node.kind === 'source' ? sourceFile(node) : node.evidence?.file);
    if (node.kind === 'source' && node.browserEvidence?.length) record && (record.browser = true);
    if (!record) continue;
    if (node.kind === 'cli-command') record.cli = true;
    if (node.kind === 'worker-trigger' || node.kind === 'scheduled-trigger') record.worker = true;
    if (node.kind === 'public-interface') record.publicInterface = true;
  }

  for (const [file, record] of signals) {
    record.frontend = record.browser || (record.request && frontendPath.test(file));
    record.backend = record.endpoint || record.storage;
  }

  for (const edge of edges) {
    if (edge.kind !== 'imports-source') continue;
    const sourceFile = byId.get(edge.source)?.label;
    const targetFile = byId.get(edge.target)?.label;
    if (sourceFile && targetFile && signals.has(targetFile)) signals.get(targetFile).importedBy.add(sourceFile);
  }

  const roots = new Set([...sourceByPath.keys()].map(packageRoot).filter(Boolean).map(root => `${root.kind}/${root.name}`));
  const monorepo = roots.size > 1;
  const fileGroups = new Map();
  const groupReasons = new Map();

  for (const [file, record] of signals) {
    const root = packageRoot(file);
    let group;
    let reason;
    if (file.startsWith('unlocated:')) {
      group = 'Unclassified';
      reason = 'No source path was recorded for this component, so its file context cannot be assessed.';
    } else if (migrationPath.test(file)) {
      group = 'Database schema & migrations';
      reason = 'The source path is under a migrations directory and has a SQL file extension. This identifies schema-change material, not runtime database activity.';
    } else if (testPath.test(file)) {
      group = 'Tests & fixtures';
      reason = 'The source path or filename uses an explicit test, spec, or fixture naming convention.';
    } else if (generatedPath.test(file)) {
      group = 'Generated code';
      reason = 'The source path or filename explicitly marks this file as generated.';
    } else if (root) {
      const prefix = root.kind === 'apps' ? 'Application' : 'Package';
      group = `${prefix} · ${root.name}`;
      reason = `Placed under the repository's ${root.kind} directory. This identifies a source boundary, not a deployed runtime.`;
    } else if (record.cli) {
      group = 'Commands';
      reason = 'A command entry point is represented in supported scan evidence.';
    } else if (record.worker) {
      group = 'Worker triggers';
      reason = 'A worker or scheduled trigger is represented in supported scan evidence.';
    } else if (record.publicInterface) {
      group = 'Public interface';
      reason = 'A public library interface is represented in supported scan evidence.';
    } else if (record.frontend && record.backend) {
      group = 'Application modules';
      reason = 'This file has both browser-oriented request and backend endpoint or storage evidence; its runtime boundary is unclear.';
    } else if (record.frontend) {
      group = 'Frontend';
      reason = record.browser
        ? 'The scanner found a direct browser API reference in this source file. Runtime execution is not verified.'
        : 'A request declaration is tied to a browser-oriented source path. This suggests a frontend role but does not prove runtime execution.';
    } else if (record.backend) {
      group = 'Backend';
      reason = record.endpoint
        ? 'This source file declares an HTTP endpoint.'
        : 'This source file contains a supported database operation.';
    } else if (supportPath.test(file)) {
      group = 'Build & development tools';
      reason = 'The source path is under a build, development, script, or tools directory. That location is a supporting-area hint, not proof of runtime role.';
    } else {
      group = 'Unclassified';
      reason = 'The supported scan did not find enough role-specific evidence to assign this source file. It remains available for review.';
    }
    fileGroups.set(file, group);
    groupReasons.set(file, reason);
  }

  const backend = [...signals.values()].some(record => record.backend);
  const frontend = [...signals.values()].some(record => record.frontend);
  for (const [file, record] of signals) {
    if (fileGroups.get(file) === 'Unclassified') {
      const importingGroups = new Set([...record.importedBy]
        .map(importer => fileGroups.get(importer))
        .filter(group => group === 'Frontend' || group === 'Backend'));
      if (importingGroups.size > 1) {
        fileGroups.set(file, 'Shared modules');
        groupReasons.set(file, 'Referenced by both frontend- and backend-classified source files. This is a shared source responsibility, not a runtime boundary.');
        continue;
      }
    }
    if (fileGroups.get(file) !== 'Unclassified') continue;
    const importGroups = new Set([...record.importedBy].map(importer => fileGroups.get(importer)).filter(Boolean));
    if (importGroups.has('Commands')) {
      fileGroups.set(file, 'Core processing');
      groupReasons.set(file, 'Imported by a source file with an evidenced command entry point.');
      continue;
    }
    if (importGroups.has('Worker triggers')) {
      fileGroups.set(file, 'Worker processing');
      groupReasons.set(file, 'Imported by a source file with an evidenced worker or scheduled trigger.');
      continue;
    }
    if (importGroups.has('Public interface')) {
      fileGroups.set(file, 'Library modules');
      groupReasons.set(file, 'Imported by a source file with an evidenced public library interface.');
      continue;
    }
    const importers = [...record.importedBy].map(importer => fileGroups.get(importer));
    if (importers.length && importers.every(group => group === 'Frontend') && importGroups.size === 1) {
      fileGroups.set(file, 'Frontend modules');
      groupReasons.set(file, 'Imported only by source files with direct frontend evidence. This is an inferred role association, not proof that the module runs in a browser.');
      continue;
    }
    if (importers.length && importers.every(group => group === 'Backend') && importGroups.size === 1) {
      fileGroups.set(file, 'Backend modules');
      groupReasons.set(file, 'Imported only by source files with direct backend evidence. This is an inferred role association, not proof that the module runs on a server.');
      continue;
    }
  }
  const cli = nodes.some(node => node.kind === 'cli-command');
  const worker = nodes.some(node => node.kind === 'worker-trigger' || node.kind === 'scheduled-trigger');
  const library = nodes.some(node => node.kind === 'public-interface');
  const archetypes = [frontend, backend, cli, worker, library].filter(Boolean).length;
  let classification;
  if (monorepo) classification = 'Monorepo';
  else if (frontend && backend && !cli && !worker && !library) classification = 'Full-stack application';
  else if (archetypes > 1) classification = 'Mixed repository';
  else if (cli) classification = 'CLI application';
  else if (worker) classification = 'Worker or scheduled job';
  else if (library) classification = 'Library or SDK';
  else if (frontend) classification = 'Frontend application';
  else if (backend) classification = 'Backend service';
  else classification = 'Structure available · runtime classification unclear';

  return {fileGroups, groupReasons, signals, classification};
}

function describe(node, group, reason) {
  if (node.kind === 'function') {
    return {
      title: node.label,
      explanation: node.explanation,
      basis: 'Detected function declaration; grouped with its source file. Its presence does not prove it runs.',
    };
  }
  if (node.kind === 'api-endpoint') {
    return {
      title: node.label,
      explanation: node.explanation,
      basis: node.certainty === 'inferred' ? 'Inferred endpoint declaration' : 'Detected endpoint declaration',
    };
  }
  if (node.kind === 'http-request') {
    return {title: node.label, explanation: node.explanation, basis: 'Detected request declaration; grouped with its source file.'};
  }
  if (node.kind === 'database-table') {
    return {title: node.label, explanation: node.explanation, basis: 'Detected database operation; grouped with its source file.'};
  }
  if (node.kind === 'external-service') {
    return {title: node.label, explanation: node.explanation, basis: 'Detected external host reference; a successful connection is not established.'};
  }
  if (node.kind === 'package-reference') {
    return {
      title: node.label,
      explanation: 'A library or built-in module referenced by source code. A reference alone does not prove it runs or is deployed.',
      basis: 'Detected source reference; kept in a supporting area.',
    };
  }

  const filename = (node.label || node.evidence?.file || 'Source location unavailable').split('/').pop();
  const role = roleDescriptions[filename];
  if (node.certainty === 'human-supplied') {
    return {title: node.label, explanation: node.explanation, basis: 'Human-supplied component.'};
  }
  if (node.kind === 'source') {
    return {
      title: role?.[0] || filename.replace(/\.[^.]+$/, '').replaceAll('-', ' '),
      explanation: role?.[1] || node.explanation || 'A source file in this project. Its role is not established by the available scan.',
      basis: `${node.certainty === 'inferred' ? 'Inferred source' : 'Detected source file'}. ${reason}`,
    };
  }
  return {
    title: node.label,
    explanation: node.explanation || 'This item is retained because the scan found it, but its role is not classified.',
    basis: reason,
  };
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function model(scan) {
  const edges = scan.edges || [];
  const nodes = scan.nodes || [];
  const {fileGroups, groupReasons, signals, classification} = classifySources(nodes, edges);
  const projectedNodes = nodes.map(node => {
    let group;
    let reason;
    if (node.certainty === 'human-supplied') {
      group = 'Your additions';
      reason = 'Human-supplied component; original scan findings remain separate.';
    } else if (node.kind === 'package-reference') {
      group = 'Referenced dependencies';
      reason = 'Named by an import in supported source; presence does not prove active use.';
    } else if (node.kind === 'external-service') {
      group = 'External integrations';
      reason = 'An external host is named in source evidence; successful connection is not established.';
    } else if (node.kind === 'source') {
      const file = sourceFile(node);
      group = fileGroups.get(file) || 'Unclassified';
      reason = groupReasons.get(file) || 'No supported role evidence was available.';
    } else {
      const file = node.evidence?.file || edges.find(edge => edge.source === node.id || edge.target === node.id)?.evidence?.file;
      const declared = semanticGroups.get(node.kind);
      group = declared?.[0] || fileGroups.get(file) || 'Unclassified';
      reason = declared?.[1] || (file
        ? groupReasons.get(file) || 'Grouped with the source file that provides its evidence.'
        : 'No supported relationship connects this item to a classified source area.');
    }
    const details = describe(node, group, reason);
    const human = node.human;
    const recordedReason = [node.classificationReason, node.roleReason]
      .find(value => typeof value === 'string' && value.trim());
    return {
      ...node,
      ...details,
      group,
      groupReason: reason,
      classificationReason: recordedReason || reason,
      classificationReasonRecorded: Boolean(recordedReason),
      ...(human ? {
        explanation: human.explanation,
        basis: 'Human-supplied explanation · original source evidence retained',
      } : {}),
    };
  });

  const groups = [...new Set(projectedNodes.map(node => node.group))].sort((a, b) => a.localeCompare(b)).map(label => {
    const members = projectedNodes.filter(node => node.group === label);
    const reasons = [...new Set(members.map(node => node.groupReason))];
    const description = label === 'Frontend'
      ? 'Browser API references or browser-oriented requests appear in supported source; runtime behavior is not verified.'
      : label === 'Backend'
        ? 'Source with declared endpoints or database operations; deployment is not verified.'
        : label === 'Application modules'
          ? 'Source contains both browser-facing and backend evidence; the runtime boundary is unclear.'
          : label === 'Shared modules'
            ? 'Source referenced by more than one classified responsibility.'
            : label === 'Commands'
              ? 'Command entry points represented in supported scan evidence.'
              : label === 'Core processing'
                ? 'Source modules imported by an evidenced command entry point.'
                : label === 'Worker triggers'
                  ? 'Worker or scheduled triggers represented in supported scan evidence.'
                  : label === 'Worker processing'
                    ? 'Source modules imported by an evidenced worker or scheduled trigger.'
                    : label === 'Public interface'
                      ? 'Public library interface represented in supported scan evidence.'
                      : label === 'Library modules'
                        ? 'Source modules imported by an evidenced public interface.'
        : label === 'Referenced dependencies'
          ? 'Libraries named by source imports. A reference does not prove active use.'
          : label === 'External integrations'
            ? 'External hosts named in supported source relationships.'
            : label === 'Build & development tools'
              ? 'Supporting source suggested by its repository location; execution is not assumed.'
                : label === 'Database schema & migrations'
                  ? 'SQL schema-change files located in a migrations directory. This does not establish active database use.'
                  : label === 'Tests & fixtures'
                    ? 'Source explicitly named or located as a test, specification, or fixture.'
                    : label === 'Generated code'
                      ? 'Source explicitly marked as generated.'
                      : label === 'Frontend modules'
                        ? 'Modules imported only by source with direct frontend evidence; the association is inferred.'
                        : label === 'Backend modules'
                          ? 'Modules imported only by source with direct backend evidence; the association is inferred.'
                : label === 'Unclassified'
                  ? 'Components retained for review because supported evidence did not establish a role.'
                : label === 'Your additions'
                  ? 'Human-supplied components kept separate from scanner findings.'
                  : label.startsWith('Application ·') || label.startsWith('Package ·')
                    ? 'A top-level application or package source boundary; not a deployment claim.'
                    : `Related ${label.toLowerCase()} entries grouped for exploration.`;
    return {
      id: `group-${slug(label)}`,
      label,
      description,
      reason: reasons.join(' '),
      category: label === 'Unclassified'
        ? 'uncertain'
        : ['Referenced dependencies', 'External integrations', 'Build & development tools', 'Database schema & migrations', 'Tests & fixtures', 'Generated code', 'Your additions'].includes(label)
          ? 'supporting'
          : 'primary',
      nodes: members.map(node => node.id),
    };
  });

  return {
    ...scan,
    nodes: projectedNodes,
    edges,
    groups,
    classification,
    coverage: scan.coverage || null,
  };
}

export function connectionDescription(edge, nodes) {
  const a = nodes.find(n => n.id === edge.source);
  const b = nodes.find(n => n.id === edge.target);
  const from = a?.title || a?.label || 'This component';
  const to = b?.title || b?.label || 'another component';
  if (edge.certainty === 'human-supplied') return {
    label: 'Added by a person',
    text: edge.human?.explanation || edge.explanation || `${from} is connected to ${to} according to a human edit.`,
    limit: 'This connection is human-supplied, not established by the scan.',
  };
  if (['calls-function', 'defines-function', 'declares-endpoint', 'handled-by', 'requests-http', 'requests-service', 'may-request-endpoint'].includes(edge.kind) || edge.kind.startsWith('database-')) return {
    label: edge.kind.replaceAll('-', ' '),
    text: edge.explanation,
    limit: edge.certainty === 'inferred' ? 'Inferred from matching source patterns; verify deployment and runtime behavior.' : 'Detected in source code; this does not prove the operation ran successfully.',
  };
  if (edge.kind === 'type-reference') return {
    label: 'Shares a definition',
    text: `${from} refers to definitions from ${to}. Think of this as agreeing on the shape of information, rather than sending information.`,
    limit: 'A type reference does not show a call, data transfer, or execution order.',
  };
  return {
    label: edge.kind === 'references-package' ? 'Names a library' : 'References another file',
    text: `${from} names ${to} in its source code. ${edge.kind === 'references-package' ? 'This identifies a software tool the code refers to.' : 'This shows a direct source-code relationship between these parts.'}`,
    limit: 'The arrow does not prove a live request, a data transfer, or which part runs first.',
  };
}

export function evidenceURL(e) {
  if (!e || !/^[-\w.]+\/[-\w.]+$/.test(e.repository || '') || !/^[a-f0-9]{40}$/.test(e.commit || '') || !Number.isInteger(e.startLine) || e.startLine < 1 || !Number.isInteger(e.endLine) || e.endLine < e.startLine) return null;
  if (!e.file || e.file.split('/').some(p => !p || p === '.' || p === '..')) return null;
  return `https://github.com/${e.repository}/blob/${e.commit}/${e.file.split('/').map(encodeURIComponent).join('/')}#L${e.startLine}-L${e.endLine}`;
}
