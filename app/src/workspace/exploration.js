export const EXPLORATION_LIMITS = Object.freeze({
  directComponentCount: 24,
  minimumTitlePixels: 12,
  highConnectionDensity: 2.5,
  focusedCompactViewportWidth: 720,
  componentPageSize: 24,
  structurePageSize: 24,
  connectionPageSize: 12,
  focusedNeighborsPerDirection: 3,
  compactFocusedNeighborsPerDirection: 1,
});

const CARD = Object.freeze({width: 316, height: 64, gapX: 34, gapY: 48});

export function chooseExplorationMode({
  componentCount,
  relationshipCount,
  viewportWidth,
  viewportHeight,
}) {
  const count = Math.max(0, componentCount);
  if (!count) return 'inventory';
  const columns = Math.max(1, Math.min(3, Math.floor((viewportWidth - 48) / (CARD.width + CARD.gapX))));
  const rows = Math.ceil(count / columns);
  const graphWidth = columns * CARD.width + (columns - 1) * CARD.gapX;
  const graphHeight = rows * CARD.height + Math.max(0, rows - 1) * CARD.gapY;
  const scale = Math.min((viewportWidth - 48) / graphWidth, (viewportHeight - 80) / graphHeight);
  const titlePixels = Math.max(0, scale) * 14;
  const density = relationshipCount / count;
  return count <= EXPLORATION_LIMITS.directComponentCount
    && titlePixels >= EXPLORATION_LIMITS.minimumTitlePixels
    && density <= EXPLORATION_LIMITS.highConnectionDensity
    ? 'graph'
    : 'structure';
}

function normalizedPath(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parts = value.replaceAll('\\', '/').replace(/^\.\//, '').split('/').filter(part => part && part !== '.');
  if (!parts.length || parts.includes('..')) return null;
  return parts.join('/');
}

function sourcePath(node) {
  if (node.kind === 'package-reference' || node.kind === 'external-service') return null;
  return normalizedPath(node.kind === 'source' ? node.label || node.evidence?.file : node.evidence?.file || node.file);
}

function commonPrefix(paths) {
  if (!paths.length) return [];
  const prefix = [];
  for (let index = 0; index < Math.min(...paths.map(parts => parts.length)); index++) {
    const value = paths[0][index];
    if (!paths.every(parts => parts[index] === value)) break;
    prefix.push(value);
  }
  return prefix;
}

function componentItem(id, title, kind, nodes, path = '') {
  return {id, title, kind, path, nodes, children: []};
}

function pathItems(entries, base = []) {
  const directories = entries.map(entry => entry.path.split('/').slice(base.length, -1));
  const common = commonPrefix(directories);
  const trie = {directories: new Map(), files: new Map()};

  for (const entry of entries) {
    const parts = entry.path.split('/');
    const directoryParts = parts.slice(base.length, -1);
    const relativeDirectories = directoryParts.slice(common.length);
    let cursor = trie;
    const prefix = [...base, ...common];
    for (const part of relativeDirectories) {
      prefix.push(part);
      if (!cursor.directories.has(part)) {
        cursor.directories.set(part, {
          name: part,
          path: prefix.join('/'),
          directories: new Map(),
          files: new Map(),
        });
      }
      cursor = cursor.directories.get(part);
    }
    if (!cursor.files.has(entry.path)) cursor.files.set(entry.path, []);
    cursor.files.get(entry.path).push(entry.node);
  }

  const fileItem = (file, nodes) => componentItem(`file:${file}`, file.split('/').at(-1), 'file', nodes, file);
  const buildChildren = (cursor, directoryPath) => {
    const files = [...cursor.files].map(([file, nodes]) => fileItem(file, nodes));
    const folders = [...cursor.directories.values()].map(folder => {
      let current = folder;
      const names = [folder.name];
      while (current.files.size === 0 && current.directories.size === 1) {
        current = current.directories.values().next().value;
        names.push(current.name);
      }
      const path = current.path;
      const children = buildChildren(current, path);
      if (children.length === 1 && children[0].kind === 'file') return children[0];
      const nodes = children.flatMap(child => child.nodes);
      return {
        id: `directory:${path}`,
        title: names.join('/'),
        kind: 'directory',
        path,
        nodes,
        children,
      };
    });
    return [...folders, ...files].sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  };

  return buildChildren(trie, base.join('/'));
}

function packageRoot(path) {
  const match = path.match(/^(apps|packages)\/([^/]+)(?:\/|$)/);
  return match ? {kind: match[1] === 'apps' ? 'Application' : 'Package', path: `${match[1]}/${match[2]}`, name: match[2]} : null;
}

function dependencyItems(nodes) {
  const scopes = new Map();
  const packages = [];
  for (const node of nodes) {
    const label = node.label || node.title || 'Unnamed dependency';
    const scope = label.startsWith('@') ? label.split('/')[0] : null;
    if (!scope) {
      packages.push(componentItem(`dependency:${label}`, label, 'package', [node], label));
      continue;
    }
    if (!scopes.has(scope)) scopes.set(scope, []);
    scopes.get(scope).push(node);
  }
  for (const [scope, members] of scopes) {
    const children = members
      .map(node => componentItem(`dependency:${node.label}`, node.label, 'package', [node], node.label))
      .sort((a, b) => a.title.localeCompare(b.title));
    packages.push({
      id: `dependency-scope:${scope}`,
      title: scope,
      kind: 'directory',
      path: scope,
      nodes: members,
      children,
    });
  }
  return packages.sort((a, b) => a.title.localeCompare(b.title));
}

export function buildStructuralTree(nodes) {
  const entries = nodes
    .map(node => ({node, path: sourcePath(node)}))
    .filter(entry => entry.path);
  const unlocated = nodes.filter(node => !sourcePath(node));
  const packages = new Map();
  const ordinary = [];

  for (const entry of entries) {
    const root = packageRoot(entry.path);
    if (!root) {
      ordinary.push(entry);
      continue;
    }
    if (!packages.has(root.path)) packages.set(root.path, {...root, entries: []});
    packages.get(root.path).entries.push(entry);
  }

  const children = ordinary.length ? pathItems(ordinary) : [];
  for (const item of packages.values()) {
    const segments = item.path.split('/');
    const packageChildren = pathItems(item.entries, segments);
    children.push({
      id: `package:${item.path}`,
      title: `${item.kind} · ${item.name}`,
      kind: 'package',
      path: item.path,
      nodes: item.entries.map(entry => entry.node),
      children: packageChildren,
    });
  }

  if (unlocated.length && unlocated.every(node => node.kind === 'package-reference')) {
    children.push(...dependencyItems(unlocated));
  } else if (unlocated.length) {
    children.push(componentItem('unlocated', 'Components without source paths', 'unlocated', unlocated));
  }

  children.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  return {id: 'root', title: '', kind: 'root', path: '', nodes: [...nodes], children};
}

export function findStructureItem(root, id) {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findStructureItem(child, id);
    if (found) return found;
  }
  return null;
}

export function findStructurePath(root, componentId) {
  function visit(item, parents) {
    const next = [...parents, item];
    if (item.children.length) {
      for (const child of item.children) {
        const found = visit(child, next);
        if (found) return found;
      }
    }
    return item.nodes.some(node => node.id === componentId) ? next.slice(1).map(part => part.id) : null;
  }
  return visit(root, []);
}

export function structureItemsAt(root, path) {
  const item = path.reduce((current, id) => current && findStructureItem(current, id), root);
  return item?.children || [];
}

export function effectiveZoomPercent(viewportWidth, viewportHeight, bounds, scale) {
  if (![viewportWidth, viewportHeight, bounds?.w, bounds?.h, scale].every(Number.isFinite)
    || viewportWidth <= 0 || viewportHeight <= 0 || bounds.w <= 0 || bounds.h <= 0 || scale <= 0) return 0;
  return Math.round(Math.min(viewportWidth * scale / bounds.w, viewportHeight * scale / bounds.h) * 100);
}
