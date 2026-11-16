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
    if (element.tagName === 'g' && element.className.split(' ').includes('node') && (!label || element.getAttribute('aria-label') === label)) return element;
    pending.unshift(...element.children);
  }
  throw new Error(`Rendered component ${label || ''} was not found.`);
}

test('workspace component selection, click-vs-drag, node movement, and empty-canvas pan remain intact', async () => {
  const appPath = fileURLToPath(new URL('../src/workspace/app.js', import.meta.url));
  const source = (await readFile(appPath, 'utf8')).replace(/^import .*;\n/gm, '');
  const elements = new Map();
  const document = {
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
  const scan = {
    nodes,
    edges: [
      {id: 'alpha-beta', source: 'alpha', target: 'beta', certainty: 'detected', kind: 'calls-function', evidence: {file: 'src/alpha.js', startLine: 1}},
      {id: 'alpha-beta-inferred', source: 'alpha', target: 'beta', certainty: 'inferred', kind: 'calls-function', evidence: {file: 'src/alpha.js', startLine: 3}},
      {id: 'alpha-gamma', source: 'alpha', target: 'gamma', certainty: 'detected', kind: 'calls-function', evidence: {file: 'src/alpha.js', startLine: 2}},
      {id: 'beta-gamma', source: 'beta', target: 'gamma', certainty: 'inferred', kind: 'calls-function', evidence: {file: 'src/beta.js', startLine: 2}},
      {id: 'gamma-alpha', source: 'gamma', target: 'alpha', certainty: 'human-supplied', kind: 'calls-function', evidence: {file: 'src/gamma.js', startLine: 2}},
    ],
    groups: [{label: 'Frontend', nodes: ['alpha', 'beta']}, {label: 'Backend', nodes: ['gamma']}, {label: 'Tools', nodes: []}],
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
    `return (async()=>{${source}\nreturn {svg,view:()=>({scale,offset:{...offset},bounds:{...bounds}})};})()`,
  );
  const app = await boot(
    globalThis, document, window, model, connectionDescription, () => null,
    createOverlayEngine, () => ({matches: false}), {}, () => {}, () => 1,
    fitView, installWheelNavigation, panByScreenPixels, screenDeltaToViewBox, zoomByStep,
    aggregateOverviewEdges, layoutOverviewGroups, routeOverviewEdges,
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

  node.dispatch('click');
  node = findNode(app.svg, 'Alpha');
  assert.ok(node.className.split(' ').includes('selected'), 'clicking a component selects it');
  assert.match(elements.get('panel').textContent, /Alpha/);

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
  elements.get('fit').dispatch('click');
  assert.equal(app.view().scale, 1);
  assert.deepEqual(app.view().offset, {x: 0, y: 0});
});
