import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStructuralTree,
  chooseExplorationMode,
  effectiveZoomPercent,
  findStructurePath,
  structureItemsAt,
} from '../src/workspace/exploration.js';

const source = (id, label, file = label) => ({
  id,
  label,
  kind: id.startsWith('function-') ? 'function' : 'source',
  evidence: {file},
});

test('readability rules progressively route 83- and 384-component areas to structure', () => {
  for (const componentCount of [83, 384, 500]) {
    assert.equal(chooseExplorationMode({
      componentCount,
      relationshipCount: componentCount * 2,
      viewportWidth: 1000,
      viewportHeight: 560,
    }), 'structure');
  }
  assert.equal(chooseExplorationMode({
    componentCount: 4,
    relationshipCount: 4,
    viewportWidth: 1000,
    viewportHeight: 560,
  }), 'graph');
  assert.equal(chooseExplorationMode({
    componentCount: 4,
    relationshipCount: 16,
    viewportWidth: 1000,
    viewportHeight: 560,
  }), 'structure', 'high connection density avoids a cluttered graph');
  assert.equal(chooseExplorationMode({
    componentCount: 10,
    relationshipCount: 5,
    viewportWidth: 390,
    viewportHeight: 520,
  }), 'structure', 'available mobile space is part of the decision');
});

test('folder navigation collapses common and single-child paths while preserving package roots', () => {
  const nodes = [
    source('a', 'packages/web/src/pages/home.ts', 'packages/web/src/pages/home.ts'),
    source('b', 'packages/web/src/pages/account.ts', 'packages/web/src/pages/account.ts'),
    source('c', 'packages/shared/src/index.ts', 'packages/shared/src/index.ts'),
    source('d', 'root.ts', 'root.ts'),
  ];
  const tree = buildStructuralTree(nodes);
  assert.deepEqual(tree.children.map(item => item.title), ['Package · shared', 'Package · web', 'root.ts']);
  const web = tree.children.find(item => item.title === 'Package · web');
  assert.deepEqual(web.children.map(item => item.title), ['account.ts', 'home.ts']);
  assert.deepEqual(findStructurePath(tree, 'a'), [web.id, web.children[1].id]);
});

test('root files, missing paths, and large single-file symbol collections remain reachable', () => {
  const nodes = [
    source('root', 'readme.js', 'readme.js'),
    ...Array.from({length: 120}, (_, index) => source(
      `function-${index}`,
      `function${index}`,
      'src/one-file.js',
    )),
    {id: 'missing', label: '', kind: 'source'},
  ];
  const tree = buildStructuralTree(nodes);
  assert.ok(tree.children.some(item => item.kind === 'file' && item.path === 'readme.js'));
  const manySymbols = tree.children.find(item => item.path === 'src/one-file.js');
  assert.equal(manySymbols.nodes.length, 120);
  assert.ok(tree.children.some(item => item.kind === 'unlocated' && item.nodes.length === 1));
  assert.equal(findStructurePath(tree, 'function-119').at(-1), manySymbols.id);
  assert.equal(structureItemsAt(tree, [manySymbols.id]).length, 0);
});

test('flat inventories and scoped dependency packages remain pageable structure items', () => {
  const flat = buildStructuralTree(Array.from({length: 80}, (_, index) => (
    source(`node-${index}`, `root-${index}.ts`)
  )));
  assert.equal(flat.children.length, 80);

  const dependencies = buildStructuralTree([
    {id: 'one', kind: 'package-reference', label: '@acme/one'},
    {id: 'two', kind: 'package-reference', label: '@acme/two'},
    {id: 'three', kind: 'package-reference', label: 'zeta'},
  ]);
  const scope = dependencies.children.find(item => item.title === '@acme');
  assert.deepEqual(scope.children.map(item => item.title), ['@acme/one', '@acme/two']);
  assert.ok(dependencies.children.some(item => item.title === 'zeta'));
});

test('rendered zoom reflects the fitted SVG scale rather than the zoom multiplier', () => {
  assert.equal(effectiveZoomPercent(1000, 800, {w: 1000, h: 800}, 1), 100);
  assert.equal(effectiveZoomPercent(1000, 800, {w: 2500, h: 2000}, 1), 40);
  assert.equal(effectiveZoomPercent(1000, 800, {w: 2500, h: 2000}, 1.25), 50);
  assert.equal(effectiveZoomPercent(0, 800, {w: 1000, h: 800}, 1), 0);
});
