import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {
  fitView,
  installWheelNavigation,
  panByScreenPixels,
  screenDeltaToViewBox,
  zoomByStep,
} from '../src/workspace/navigation.js';
import {aggregateOverviewEdges, layoutOverviewGroups, routeOverviewEdges} from '../src/workspace/overview-routing.js';
import {
  EXPLORATION_LIMITS,
  buildStructuralTree,
  chooseExplorationMode,
  effectiveZoomPercent,
  findStructureItem,
  findStructurePath,
  structureItemsAt,
} from '../src/workspace/exploration.js';

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = {};
    this.children = [];
    this.listeners = new Map();
    this.hidden = false;
    this.scrollTop = 0;
  }
  set textContent(value) { this.children = []; this.text = String(value); }
  get textContent() { return [this.text || '', ...this.children.map(child => child.textContent)].join(''); }
  set className(value) { this.setAttribute('class', value); }
  get className() { return this.getAttribute('class') || ''; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  append(...children) { this.children.push(...children); }
  prepend(...children) { this.children.unshift(...children); }
  replaceChildren(...children) { this.children = []; this.text = ''; this.append(...children); }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  dispatch(type, event = {}) {
    if (type === 'click') this.onclick?.(event);
    for (const listener of this.listeners.get(type) || []) listener({...event, target: event.target || this});
  }
  closest(selector) { return selector === '[role=button]' && this.getAttribute('role') === 'button' ? this : null; }
  setPointerCapture() {}
  getBoundingClientRect() { return {left: 0, top: 0, width: 1000, height: 800}; }
}

function findNode(svg, label) {
  const pending = [...svg.children];
  while (pending.length) {
    const element = pending.shift();
    if (element.tagName === 'g' && element.className.split(' ').includes('node') && (!label || element.getAttribute('aria-label')?.startsWith(label))) return element;
    pending.unshift(...(element.children || []));
  }
  throw new Error(`Rendered component ${label || ''} was not found.`);
}

function findElements(root, predicate) {
  const found = [];
  const pending = [...root.children];
  while (pending.length) {
    const element = pending.shift();
    if (predicate(element)) found.push(element);
    pending.unshift(...(element.children || []));
  }
  return found;
}

test('workspace component selection, click-vs-drag, node movement, and empty-canvas pan remain intact', async () => {
  const appPath = fileURLToPath(new URL('../src/workspace/app.js', import.meta.url));
  const source = (await readFile(appPath, 'utf8')).replace(/^import\b[\s\S]*?from\s+['"][^'"]+['"];\s*$/gm, '');
  const elements = new Map();
  const document = {
    querySelector:()=>null,
    body:{classList:{contains:()=>true}},
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element('div'));
      return elements.get(id);
    },
    createElement: tag => new Element(tag),
    createElementNS: (_namespace, tag) => new Element(tag),
    createTextNode: text => ({textContent: String(text)}),
  };
  const windowListeners = new Map();
  const window = {
    addEventListener(type, listener, options) { windowListeners.set(type, {listener, options}); },
    removeEventListener(type, listener) {
      if (windowListeners.get(type)?.listener === listener) windowListeners.delete(type);
    },
    dispatch(type, event) {
      const entry = windowListeners.get(type);
      if (!entry) return;
      if (entry.options?.once) windowListeners.delete(type);
      entry.listener(event);
    },
  };
  const nodes = [
    {id: 'alpha', title: 'Alpha', label: 'src/alpha.js', kind: 'source', group: 'Frontend', explanation: 'Alpha explains the first component.', basis: 'Source-backed', certainty: 'detected'},
    {id: 'beta', title: 'Beta', label: 'src/beta.js', kind: 'source', group: 'Frontend', explanation: 'Beta explains the second component.', basis: 'Source-backed', certainty: 'detected'},
    {id: 'gamma', title: 'Gamma', label: 'src/gamma.js', kind: 'source', group: 'Backend', explanation: 'Gamma explains the third component.', basis: 'Source-backed', certainty: 'detected'},
  ];
  // Representative large-area test fixture only; it is not a scanner result.
  const denseNodes = [
    ...Array.from({length: 384}, (_, index) => ({
      id: `dense-file-${index}`,
      title: index === 0
        ? 'Dense file 000 with an exceptionally long descriptive component name'
        : `Dense file ${String(index).padStart(3, '0')}`,
      label: `src/dense/module-${String(index).padStart(3, '0')}/index.ts`,
      kind: 'source',
      group: 'Unclassified',
      explanation: 'Representative component for exploration tests.',
      basis: 'Synthetic test evidence.',
    })),
    ...Array.from({length: 120}, (_, index) => ({
      id: `dense-function-${index}`,
      title: `denseFunction${String(index).padStart(3, '0')}`,
      label: `denseFunction${String(index).padStart(3, '0')}`,
      kind: 'function',
      group: 'Unclassified',
      evidence: {file: 'src/dense/single-file.ts', startLine: index + 1},
      explanation: 'Representative function in a large source file.',
      basis: 'Synthetic test evidence.',
    })),
  ];
  nodes.push(...denseNodes);
  const denseEdges = [
    ...Array.from({length: 30}, (_, index) => ({
      id: `dense-in-${index}`,
      source: `dense-file-${index + 1}`,
      target: 'dense-file-0',
      certainty: index === 0 ? 'inferred' : index === 1 ? 'human-supplied' : 'detected',
      kind: 'calls-function',
      evidence: {file: `src/dense/module-${String(index + 1).padStart(3, '0')}/index.ts`, startLine: index + 1},
    })),
    ...Array.from({length: 30}, (_, index) => ({
      id: `dense-out-${index}`,
      source: 'dense-file-0',
      target: `dense-file-${index + 31}`,
      certainty: index === 0 ? 'inferred' : 'detected',
      kind: 'calls-function',
      evidence: {file: 'src/dense/module-000/index.ts', startLine: index + 1},
    })),
    {id: 'dense-cycle-a', source: 'dense-file-2', target: 'dense-file-3', certainty: 'detected', kind: 'calls-function', evidence: {file: 'src/dense/module-002/index.ts', startLine: 3}},
    {id: 'dense-cycle-b', source: 'dense-file-3', target: 'dense-file-2', certainty: 'inferred', kind: 'calls-function', evidence: {file: 'src/dense/module-003/index.ts', startLine: 4}},
  ];
  const scan = {
    nodes,
    edges: [
      {id: 'alpha-beta', source: 'alpha', target: 'beta', certainty: 'detected', kind: 'calls-function', evidence: {file: 'src/alpha.js', startLine: 1}},
      {id: 'alpha-beta-inferred', source: 'alpha', target: 'beta', certainty: 'inferred', kind: 'calls-function', evidence: {file: 'src/alpha.js', startLine: 3}},
      {id: 'alpha-gamma', source: 'alpha', target: 'gamma', certainty: 'detected', kind: 'calls-function', evidence: {file: 'src/alpha.js', startLine: 2}},
      {id: 'beta-gamma', source: 'beta', target: 'gamma', certainty: 'inferred', kind: 'calls-function', evidence: {file: 'src/beta.js', startLine: 2}},
      {id: 'gamma-alpha', source: 'gamma', target: 'alpha', certainty: 'human-supplied', kind: 'calls-function', evidence: {file: 'src/gamma.js', startLine: 2}},
      ...denseEdges,
    ],
    groups: [
      {label: 'Frontend', nodes: ['alpha', 'beta']},
      {label: 'Backend', nodes: ['gamma']},
      {label: 'Tools', nodes: []},
      {label: 'Unclassified', description: 'Components retained for review.', reason: 'Reason metadata was not supplied by this fixture.', nodes: denseNodes.map(node => node.id)},
    ],
    positions: [{targetId: 'beta', x: 2500, y: 1800}],
    commit: 'a'.repeat(40),
  };
  let saved = {scan, overlay: {}, version: 0};
  const operations = [];
  const globalThis = {
    async rmcLoadMap() { return saved; },
    async rmcSaveEdit(operation, version) {
      assert.equal(version, saved.version);
      operations.push(operation);
      saved = {...saved, version: version + 1};
      return saved;
    },
  };
  const model = value => value;
  const connectionDescription = () => ({label: 'Reference', text: 'Alpha refers to Beta.', limit: 'Static source evidence.'});
  const createOverlayEngine = () => ({project: () => ({}), fresh: () => ({}), apply: () => ({})});
  const boot = new Function(
    'globalThis', 'document', 'window', 'model', 'connectionDescription', 'evidenceURL',
    'createOverlayEngine', 'matchMedia', 'crypto', 'clearInterval', 'setInterval',
    'fitView', 'installWheelNavigation', 'panByScreenPixels', 'screenDeltaToViewBox', 'zoomByStep',
    'aggregateOverviewEdges', 'layoutOverviewGroups', 'routeOverviewEdges',
    'EXPLORATION_LIMITS', 'buildStructuralTree', 'chooseExplorationMode', 'effectiveZoomPercent',
    'findStructureItem', 'findStructurePath', 'structureItemsAt', 'location', 'mountReader',
    `return (async()=>{${source}\nreturn {svg,view:()=>({scale,offset:{...offset},bounds:{...bounds}}),zoom:()=>$('zoom-label').textContent};})()`,
  );
  const app = await boot(
    globalThis, document, window, model, connectionDescription, () => null,
    createOverlayEngine, () => ({matches: false}), {}, () => {}, () => 1,
    fitView, installWheelNavigation, panByScreenPixels, screenDeltaToViewBox, zoomByStep,
    aggregateOverviewEdges, layoutOverviewGroups, routeOverviewEdges,
    EXPLORATION_LIMITS, buildStructuralTree, chooseExplorationMode, effectiveZoomPercent,
    findStructureItem, findStructurePath, structureItemsAt, {search:''}, ()=>({}),
  );

  const overviewConnections = app.svg.children.filter(element => element.className === 'overview-edge');
  assert.equal(overviewConnections.length, 2, 'overview shows one arrow per group direction');
  const frontendToBackend = overviewConnections.find(element => element.getAttribute('data-source-group') === 'Frontend' && element.getAttribute('data-target-group') === 'Backend');
  const backendToFrontend = overviewConnections.find(element => element.getAttribute('data-source-group') === 'Backend' && element.getAttribute('data-target-group') === 'Frontend');
  assert.equal(frontendToBackend.getAttribute('data-relationship-count'), '2');
  assert.equal(frontendToBackend.getAttribute('data-certainty'), 'mixed');
  assert.notEqual(frontendToBackend.children[0].getAttribute('d'), backendToFrontend.children[0].getAttribute('d'), 'opposing directions use separate routes');
  frontendToBackend.children.find(element => element.className.split(' ').includes('edge-hit')).dispatch('click');
  assert.match(elements.get('panel').textContent, /Alpha → Gamma/);
  assert.match(elements.get('panel').textContent, /Detected/);
  assert.match(elements.get('panel').textContent, /Inferred/);
  assert.match(elements.get('panel').textContent, /Line 2/);
  backendToFrontend.children.find(element => element.className.split(' ').includes('edge-hit')).dispatch('click');
  assert.match(elements.get('panel').textContent, /Human-supplied/);
  assert.match(elements.get('panel').textContent, /src\/gamma.js/);

  findNode(app.svg, 'Frontend').dispatch('click');
  assert.ok(findNode(app.svg, 'Frontend').className.split(' ').includes('selected'), 'clicking an overview area selects it');
  assert.ok(!findNode(app.svg, 'Backend').className.split(' ').includes('dim'), 'areas with direct relationships remain emphasized');
  assert.ok(findNode(app.svg, 'Tools').className.split(' ').includes('dim'), 'unrelated areas dim while a selection is active');
  const activeRoute = app.svg.children.find(element => element.className === 'overview-edge'
    && element.getAttribute('data-source-group') === 'Frontend'
    && element.getAttribute('data-target-group') === 'Backend');
  assert.ok(activeRoute.children[0].className.split(' ').includes('active'), 'relationships touching the selected area are emphasized');
  assert.match(elements.get('panel').textContent, /Explore area/, 'the selected area offers an explicit drilldown action');
  elements.get('panel').children.find(child => child.textContent === 'Explore area').dispatch('click');
  let manuallyPlaced = findNode(app.svg, 'Beta').children[0].attributes;
  assert.equal(Number(manuallyPlaced.x), 2500, 'saved positions are applied in group detail');
  assert.equal(Number(manuallyPlaced.y), 1800);
  elements.get('relayout').dispatch('click');
  manuallyPlaced = findNode(app.svg, 'Beta').children[0].attributes;
  assert.equal(Number(manuallyPlaced.x), 2500, 'relayout retains saved manual positions');
  assert.equal(Number(manuallyPlaced.y), 1800);
  const frontendEdges = app.svg.children.filter(element => element.tagName === 'path' && element.className.split(' ').includes('edge'));
  assert.deepEqual(frontendEdges.map(edge => edge.getAttribute('data-certainty')), ['detected', 'inferred'], 'group detail preserves overlapping relationships with different certainty');
  let node = findNode(app.svg, 'Alpha');
  const firstRect = node.children[0].attributes;
  const start = {x: 100, y: 120};
  node.dispatch('pointerdown', {button: 0, clientX: start.x, clientY: start.y, stopPropagation() {}});
  window.dispatch('pointerup', {clientX: start.x, clientY: start.y});
  assert.equal(operations.length, 0, 'a click-sized pointer gesture does not move or save a component');

  const before = {x: Number(firstRect.x), y: Number(firstRect.y)};
  const movementBounds = app.view().bounds;
  assert.ok(movementBounds.w >= 2840, 'Fit View bounds include manually positioned components');
  assert.ok(movementBounds.h >= 1888, 'Fit View bounds include manually positioned components');
  node.dispatch('pointerdown', {button: 0, clientX: start.x, clientY: start.y, stopPropagation() {}});
  window.dispatch('pointerup', {clientX: start.x + 24, clientY: start.y + 12});
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(operations[0].type, 'position');
  assert.equal(operations[0].targetId, 'alpha');
  const delta = screenDeltaToViewBox(24, 12, {scale: 1, offset: {x: 0, y: 0}, bounds: movementBounds}, {left: 0, top: 0, width: 1000, height: 800});
  assert.ok(Math.abs(operations[0].x - (before.x + delta.x)) < 1e-9);
  assert.ok(Math.abs(operations[0].y - (before.y + delta.y)) < 1e-9);
  assert.deepEqual(saved.scan.positions, [{targetId: 'beta', x: 2500, y: 1800}], 'temporary navigation does not mutate saved positions');

  node = findNode(app.svg, 'Alpha');
  node.dispatch('click');
  node = findNode(app.svg, 'Alpha');
  assert.ok(node.className.split(' ').includes('selected'), 'component selection opens a focused map');
  assert.match(elements.get('panel').textContent, /Alpha/);
  const focusedBounds = app.view().bounds;
  assert.deepEqual(focusedBounds, {w: 1000, h: 500}, 'focused map uses a compact, readable scope rather than saved diagram bounds');
  node.dispatch('pointerdown', {button: 0, clientX: start.x, clientY: start.y, stopPropagation() {}});
  window.dispatch('pointerup', {clientX: start.x + 24, clientY: start.y + 12});
  assert.equal(operations.length, 1, 'temporary focused cards cannot overwrite saved component positions');

  app.svg.dispatch('pointerdown', {
    clientX: 300, clientY: 300, pointerId: 1,
    target: new Element('rect'),
  });
  app.svg.dispatch('pointermove', {clientX: 330, clientY: 320});
  app.svg.dispatch('pointerup');
  const pan = screenDeltaToViewBox(-30, -20, {scale: 1, offset: {x: 0, y: 0}, bounds: app.view().bounds}, {left: 0, top: 0, width: 1000, height: 800});
  assert.deepEqual(app.view().offset, pan);

  elements.get('zoom-in').dispatch('click');
  assert.equal(app.view().scale, 1.25);
  assert.match(app.zoom(), /125%/);
  elements.get('fit').dispatch('click');
  assert.equal(app.view().scale, 1);
  assert.deepEqual(app.view().offset, {x: 0, y: 0});

  elements.get('show-all').dispatch('click');
  findNode(app.svg, 'Unclassified').dispatch('click');
  const explore = findElements(elements.get('panel'), element => element.tagName === 'button' && element.textContent === 'Explore area')[0];
  assert.ok(explore, 'large areas offer an explicit drill-in action');
  explore.dispatch('click');
  assert.equal(elements.get('viewport').getAttribute('data-exploration-mode'), 'structure');
  assert.match(elements.get('panel').textContent, /reason was not recorded/i);
  assert.match(elements.get('panel').textContent, /504 components/);
  assert.ok(findElements(app.svg, element => element.className.split(' ').includes('node') && element.getAttribute('aria-label')?.includes('Application')).length <= 12,
    'structural groups are limited to a readable page');

  const areaOffset = { ...app.view().offset };
  app.svg.dispatch('pointerdown', {clientX: 300, clientY: 300, pointerId: 2, target: new Element('rect')});
  app.svg.dispatch('pointermove', {clientX: 320, clientY: 310});
  app.svg.dispatch('pointerup');
  const exploredOffset = { ...app.view().offset };
  assert.notDeepEqual(exploredOffset, areaOffset, 'the structural view can be panned independently');
  const structureNext = findElements(elements.get('panel'), element => element.tagName === 'button' && element.textContent === 'Next')[0];
  structureNext.dispatch('click');
  assert.match(elements.get('panel').textContent, /Groups and files 13–24 of 385/);

  const search = elements.get('component-search');
  search.value = 'dense';
  search.dispatch('input');
  assert.match(elements.get('search-count').textContent, /504 matching components/);
  const results = elements.get('search-results');
  let reachable = 0;
  for (let page = 0; page < 21; page++) {
    reachable += findElements(results, element => element.tagName === 'button' && element.getAttribute('aria-label')?.startsWith('Open ')).length;
    const next = findElements(results, element => element.tagName === 'button' && element.textContent === 'Next')[0];
    if (!next || next.disabled) break;
    next.dispatch('click');
  }
  assert.equal(reachable, 504, 'pagination exposes every component in the selected area to search');

  search.value = 'src/dense/single-file.ts';
  search.dispatch('input');
  assert.match(elements.get('search-count').textContent, /120 matching components/,
    'search matches symbols by their containing source path');

  search.value = 'denseFunction119';
  search.dispatch('input');
  const lastResult = findElements(results, element => element.tagName === 'button' && element.getAttribute('aria-label')?.includes('denseFunction119'))[0];
  assert.ok(lastResult, 'search can find a function in a one-file, many-symbol group');
  lastResult.dispatch('click');
  assert.match(elements.get('panel').textContent, /denseFunction119/);
  assert.match(elements.get('panel').textContent, /src\/dense\/single-file\.ts/);
  assert.equal(elements.get('viewport').getAttribute('data-exploration-mode'), 'focused');
  findElements(elements.get('breadcrumbs'), element => element.tagName === 'button' && element.textContent === 'single-file.ts')[0].dispatch('click');
  assert.match(elements.get('panel').textContent, /function · src\/dense\/single-file\.ts/,
    'component inventory displays a function’s containing source path');
  const areaBreadcrumb = findElements(elements.get('breadcrumbs'), element => element.tagName === 'button' && element.textContent === 'Unclassified')[0];
  areaBreadcrumb.dispatch('click');
  assert.deepEqual(app.view().offset, exploredOffset, 'returning through a breadcrumb restores the prior exploration position');
  assert.match(elements.get('panel').textContent, /Groups and files 13–24 of 385/,
    'returning through a breadcrumb restores the previously selected structural page');

  search.value = 'Dense file 000';
  search.dispatch('input');
  findElements(results, element => element.tagName === 'button' && element.getAttribute('aria-label')?.includes('Dense file 000'))[0].dispatch('click');
  assert.equal(findElements(app.svg, element => element.className.split(' ').includes('focused-node')).length, 7,
    'a high-degree component starts with a bounded immediate neighborhood');
  const focusedTitle = findElements(app.svg, element => element.className.split(' ').includes('focused-node') && element.className.split(' ').includes('selected'))[0].children[1].textContent;
  assert.ok(focusedTitle.length <= 32, 'long names are shortened to fit the focused card');
  assert.ok(findElements(app.svg, element => element.className.split(' ').includes('edge')
    && element.getAttribute('data-certainty') === 'inferred').length,
  'focused arrows preserve their relationship provenance');
  findElements(app.svg, element => element.className.split(' ').includes('edge-hit'))[0].dispatch('click');
  assert.match(elements.get('panel').textContent, /src\/dense\/module-001\/index\.ts/);
  assert.match(elements.get('panel').textContent, /Static source evidence/);
  findElements(elements.get('panel'), element => element.tagName === 'button' && element.textContent.startsWith('To: Dense file 000'))[0].dispatch('click');
  const connectionsTab = findElements(elements.get('panel'), element => element.tagName === 'button' && element.textContent.startsWith('Connections ('))[0];
  connectionsTab.dispatch('click');
  assert.match(elements.get('panel').textContent, /30 relationships/);
  assert.match(elements.get('panel').textContent, /more are available below/);
  const expand = findElements(elements.get('panel'), element => element.tagName === 'button' && element.textContent.startsWith('Expand connections:'))[0];
  expand.dispatch('click');
  assert.match(elements.get('panel').textContent, /Previous component/);
  findElements(elements.get('panel'), element => element.tagName === 'button' && element.textContent === '← Previous component')[0].dispatch('click');

  elements.get('viewport').getBoundingClientRect = () => ({left: 0, top: 0, width: 390, height: 520});
  window.dispatch('resize');
  const compactNodes = findElements(app.svg, element => element.className.split(' ').includes('focused-node'));
  assert.equal(compactNodes.length, 3,
    `a narrow map shows a readable center and one neighbor in each direction: ${compactNodes.map(node => node.getAttribute('aria-label')).join(' | ')}`);
  assert.match(app.zoom(), /(?:1[2-9]|[2-9]\d+)px text/,
    'the focused map keeps labels readable at a 390px viewport width');
  assert.match(findElements(app.svg, element => element.className.split(' ').includes('focus-summary'))[0].textContent,
    /Incoming 1\/30 · Outgoing 1\/30/, 'mobile relationship counts fit the compact map');

  assert.equal(saved.scan.edges.length, 67, 'navigation leaves every detected, inferred, and human relationship intact');
  assert.deepEqual(saved.scan.positions, [{targetId: 'beta', x: 2500, y: 1800}], 'exploration layouts never replace saved manual positions');
});
