import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aggregateOverviewEdges, layoutOverviewGroups, routeOverviewEdges} from '../src/workspace/overview-routing.js';

const nodes = [
  {id: 'a1', group: 'A'},
  {id: 'a2', group: 'A'},
  {id: 'b1', group: 'B'},
  {id: 'c1', group: 'C'},
];
const boxes = [
  {group: 'A', x: 24, y: 24, w: 336, h: 148},
  {group: 'B', x: 468, y: 24, w: 336, h: 148},
  {group: 'C', x: 24, y: 244, w: 336, h: 148},
];
const edges = [
  {id: 'a1-b1', source: 'a1', target: 'b1', certainty: 'detected', evidence: {file: 'src/a1.js', startLine: 3}},
  {id: 'a2-b1', source: 'a2', target: 'b1', certainty: 'inferred', evidence: {file: 'src/a2.js', startLine: 4}},
  {id: 'b1-a1', source: 'b1', target: 'a1', certainty: 'human-supplied', evidence: {file: 'src/b1.js', startLine: 5}},
  {id: 'a1-c1', source: 'a1', target: 'c1', certainty: 'detected', evidence: {file: 'src/a1.js', startLine: 6}},
  {id: 'c1-b1', source: 'c1', target: 'b1', certainty: 'inferred', evidence: {file: 'src/c1.js', startLine: 7}},
  {id: 'a1-a2', source: 'a1', target: 'a2', certainty: 'detected', evidence: {file: 'src/a1.js', startLine: 8}},
];

test('overview aggregation creates one directional connection and preserves certainty counts', () => {
  const connections = aggregateOverviewEdges(edges, nodes);
  const aToB = connections.find(connection => connection.sourceGroup === 'A' && connection.targetGroup === 'B');
  const bToA = connections.find(connection => connection.sourceGroup === 'B' && connection.targetGroup === 'A');

  assert.equal(connections.length, 4);
  assert.equal(aToB.count, 2);
  assert.equal(aToB.certainty, 'mixed');
  assert.deepEqual(aToB.certaintyCounts, {detected: 1, inferred: 1});
  assert.deepEqual(aToB.memberIds, ['a1-b1', 'a2-b1']);
  assert.deepEqual(aToB.edges.map(edge => edge.id), ['a1-b1', 'a2-b1']);
  assert.deepEqual(aToB.edges.map(edge => edge.evidence.file), ['src/a1.js', 'src/a2.js']);
  assert.equal(bToA.count, 1);
  assert.equal(bToA.certainty, 'human-supplied');
});

test('overview routes are orthogonal, avoid unrelated group boxes, and separate opposing directions', () => {
  const connections = aggregateOverviewEdges(edges, nodes);
  const routes = routeOverviewEdges(connections, boxes);
  const aToB = routes.find(route => route.sourceGroup === 'A' && route.targetGroup === 'B');
  const bToA = routes.find(route => route.sourceGroup === 'B' && route.targetGroup === 'A');

  assert.notEqual(aToB.path, bToA.path);
  assert.match(aToB.path, /^M-?\d+ -?\d+/);
  assert.ok(routes.some(route => /Q/.test(route.path)), 'bent routes use rounded corners');
  assert.equal('countPosition' in aToB, false, 'relationship counts are kept out of the diagram');
  const pathPoints = route => route.points.map(({x, y}) => [x, y]);
  const sharedCells = new Set(pathPoints(aToB).flatMap(([x, y]) => `${x},${y}`));
  assert.ok(pathPoints(bToA).every(([x, y]) => !sharedCells.has(`${x},${y}`)), 'opposing directions use separate lanes');

  for (const route of routes) {
    const points = pathPoints(route);
    const sourceBox = boxes.find(box => box.group === route.sourceGroup);
    const targetBox = boxes.find(box => box.group === route.targetGroup);
    const [sourceX, sourceY] = points[0];
    const [targetX, targetY] = points.at(-1);
    assert.ok((sourceX === sourceBox.x || sourceX === sourceBox.x + sourceBox.w) && sourceY >= sourceBox.y && sourceY <= sourceBox.y + sourceBox.h
      || (sourceY === sourceBox.y || sourceY === sourceBox.y + sourceBox.h) && sourceX >= sourceBox.x && sourceX <= sourceBox.x + sourceBox.w, 'route begins on the source group boundary');
    assert.ok((targetX === targetBox.x || targetX === targetBox.x + targetBox.w) && targetY >= targetBox.y && targetY <= targetBox.y + targetBox.h
      || (targetY === targetBox.y || targetY === targetBox.y + targetBox.h) && targetX >= targetBox.x && targetX <= targetBox.x + targetBox.w, 'route ends on the target group boundary');
    for (let index = 1; index < points.length; index++) {
      const [x1, y1] = points[index - 1];
      const [x2, y2] = points[index];
      assert.ok(x1 === x2 || y1 === y2, 'each route segment is horizontal or vertical');
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 8;
      for (let step = 0; step <= steps; step++) {
        const x = x1 + (x2 - x1) * step / steps;
        const y = y1 + (y2 - y1) * step / steps;
        for (const box of boxes) {
          if (box.group === route.sourceGroup || box.group === route.targetGroup) continue;
          assert.ok(x < box.x - 8 || x > box.x + box.w + 8 || y < box.y - 8 || y > box.y + box.h + 8, `${route.sourceGroup} to ${route.targetGroup} avoids ${box.group}`);
        }
      }
    }
  }
  for (let first = 0; first < routes.length; first++) {
    for (let second = first + 1; second < routes.length; second++) {
      for (let firstSegment = 1; firstSegment < routes[first].points.length; firstSegment++) {
        const a = routes[first].points[firstSegment - 1];
        const b = routes[first].points[firstSegment];
        for (let secondSegment = 1; secondSegment < routes[second].points.length; secondSegment++) {
          const c = routes[second].points[secondSegment - 1];
          const d = routes[second].points[secondSegment];
          const crosses = (a.x === b.x && c.y === d.y
            && c.y > Math.min(a.y, b.y) && c.y < Math.max(a.y, b.y)
            && a.x > Math.min(c.x, d.x) && a.x < Math.max(c.x, d.x))
            || (a.y === b.y && c.x === d.x
              && a.y > Math.min(c.y, d.y) && a.y < Math.max(c.y, d.y)
              && c.x > Math.min(a.x, b.x) && c.x < Math.max(a.x, b.x));
          const overlaps = (a.x === b.x && c.x === d.x && a.x === c.x
            && Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) < Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)))
            || (a.y === b.y && c.y === d.y && a.y === c.y
              && Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) < Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)));
          assert.equal(crosses, false, 'independent relationship routes do not cross');
          assert.equal(overlaps, false, 'independent relationship routes do not share a trunk');
        }
      }
    }
  }
});

test('overview layout is stable across cycles and disconnected areas, with supporting areas separated', () => {
  const groups = [
    {label: 'Frontend'},
    {label: 'Backend'},
    {label: 'Offline tools'},
    {label: 'Dependencies', category: 'supporting'},
  ];
  const layoutNodes = groups.map(group => ({id: group.label, group: group.label}));
  const imports = [
    {source: 'Frontend', target: 'Backend', kind: 'imports-source'},
    {source: 'Backend', target: 'Frontend', kind: 'imports-source'},
    {source: 'Backend', target: 'Dependencies', kind: 'references-package'},
  ];
  const first = layoutOverviewGroups(groups, imports, layoutNodes);
  const second = layoutOverviewGroups(groups, imports, layoutNodes);
  assert.deepEqual(first, second, 'identical graph inputs produce identical coordinates');
  assert.ok(first.every(area => Number.isFinite(area.x) && Number.isFinite(area.y)));
  assert.equal(first.find(area => area.group === 'Frontend').x, first.find(area => area.group === 'Backend').x, 'a cycle stays in one layer');
  assert.ok(first.find(area => area.group === 'Dependencies').x > first.find(area => area.group === 'Backend').x, 'supporting dependencies do not crowd the primary layer');
  assert.ok(first.find(area => area.group === 'Offline tools'), 'disconnected areas remain laid out');
});
