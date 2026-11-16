const gridSize = 8;
const routePadding = 24;
const obstaclePadding = 8;
const routeMargin = 96;
const relationshipKinds = new Set([
  'imports-source',
  'references-package',
  'may-request-endpoint',
  'requests-http',
  'requests-service',
  'declares-endpoint',
]);

export function aggregateOverviewEdges(edges, nodes) {
  const groups = new Map(nodes.map(node => [node.id, node.group]));
  const byDirection = new Map();
  for (const edge of edges) {
    const sourceGroup = groups.get(edge.source);
    const targetGroup = groups.get(edge.target);
    if (!sourceGroup || !targetGroup || sourceGroup === targetGroup) continue;
    const key = `${sourceGroup}\0${targetGroup}`;
    if (!byDirection.has(key)) byDirection.set(key, {sourceGroup, targetGroup, edges: []});
    byDirection.get(key).edges.push(edge);
  }
  return [...byDirection.values()].map(connection => {
    const certainties = new Set(connection.edges.map(edge => edge.certainty || 'detected'));
    return {
      ...connection,
      count: connection.edges.length,
      certainty: certainties.size === 1 ? [...certainties][0] : 'mixed',
      certaintyCounts: Object.fromEntries([...certainties].map(certainty => [
        certainty,
        connection.edges.filter(edge => (edge.certainty || 'detected') === certainty).length,
      ])),
      memberIds: connection.edges.map(edge => edge.id),
    };
  });
}

export function layoutOverviewGroups(groups, edges, nodes, card = {width: 336, height: 148, gapX: 108, gapY: 72}) {
  const groupNames = new Set(groups.map(group => group.label));
  const nodeGroups = new Map(nodes.map(node => [node.id, node.group]));
  const adjacency = new Map(groups.map(group => [group.label, new Set()]));
  const directed = new Map(groups.map(group => [group.label, new Set()]));
  const incoming = new Map(groups.map(group => [group.label, new Set()]));

  for (const edge of edges) {
    if (!relationshipKinds.has(edge.kind)) continue;
    const source = nodeGroups.get(edge.source);
    const target = nodeGroups.get(edge.target);
    if (!groupNames.has(source) || !groupNames.has(target) || source === target) continue;
    adjacency.get(source).add(target);
    adjacency.get(target).add(source);
    directed.get(source).add(target);
    incoming.get(target).add(source);
  }

  let nextIndex = 0;
  const stack = [];
  const onStack = new Set();
  const index = new Map();
  const low = new Map();
  const component = new Map();
  let componentCount = 0;
  const visit = label => {
    index.set(label, nextIndex);
    low.set(label, nextIndex++);
    stack.push(label);
    onStack.add(label);
    for (const target of directed.get(label)) {
      if (!index.has(target)) {
        visit(target);
        low.set(label, Math.min(low.get(label), low.get(target)));
      } else if (onStack.has(target)) {
        low.set(label, Math.min(low.get(label), index.get(target)));
      }
    }
    if (low.get(label) !== index.get(label)) return;
    while (stack.length) {
      const member = stack.pop();
      onStack.delete(member);
      component.set(member, componentCount);
      if (member === label) break;
    }
    componentCount++;
  };
  for (const label of [...groupNames].sort()) if (!index.has(label)) visit(label);

  const componentEdges = new Map([...Array(componentCount)].map((_, id) => [id, new Set()]));
  const componentIncoming = new Map([...Array(componentCount)].map((_, id) => [id, new Set()]));
  for (const [source, targets] of directed) {
    for (const target of targets) {
      const from = component.get(source);
      const to = component.get(target);
      if (from === to) continue;
      componentEdges.get(from).add(to);
      componentIncoming.get(to).add(from);
    }
  }
  const indegree = new Map([...componentEdges.keys()].map(id => [id, componentIncoming.get(id).size]));
  const ready = [...indegree].filter(([, degree]) => degree === 0).map(([id]) => id).sort((a, b) => a - b);
  const componentRank = new Map([...componentEdges.keys()].map(id => [id, 0]));
  while (ready.length) {
    const current = ready.shift();
    for (const target of componentEdges.get(current)) {
      componentRank.set(target, Math.max(componentRank.get(target), componentRank.get(current) + 1));
      indegree.set(target, indegree.get(target) - 1);
      if (indegree.get(target) === 0) {
        ready.push(target);
        ready.sort((a, b) => a - b);
      }
    }
  }

  const core = groups.filter(group => group.category !== 'supporting');
  const support = groups.filter(group => group.category === 'supporting');
  const ranks = new Map(groups.map(group => [
    group.label,
    core.includes(group) ? componentRank.get(component.get(group.label)) || 0 : null,
  ]));
  const maxCoreRank = Math.max(0, ...[...ranks.values()].filter(Number.isInteger));
  for (const group of support) ranks.set(group.label, maxCoreRank + 1);

  const levels = new Map();
  for (const group of groups) {
    const rank = ranks.get(group.label);
    if (!levels.has(rank)) levels.set(rank, []);
    levels.get(rank).push(group);
  }
  const orderByRank = new Map();
  for (const rank of [...levels.keys()].sort((a, b) => a - b)) {
    const level = levels.get(rank);
    const priorOrder = new Map([...orderByRank.values()].flat().map((label, position) => [label, position]));
    level.sort((a, b) => {
      const barycenter = group => {
        const neighbors = [...adjacency.get(group.label)]
          .filter(label => priorOrder.has(label))
          .map(label => priorOrder.get(label));
        return neighbors.length ? neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length : Infinity;
      };
      return barycenter(a) - barycenter(b)
        || adjacency.get(b.label).size - adjacency.get(a.label).size
        || a.label.localeCompare(b.label);
    });
    orderByRank.set(rank, level.map(group => group.label));
  }

  return groups.map(group => {
    const rank = ranks.get(group.label);
    const row = orderByRank.get(rank).indexOf(group.label);
    return {
      group: group.label,
      x: 24 + rank * (card.width + card.gapX),
      y: 24 + row * (card.height + card.gapY),
      w: card.width,
      h: card.height,
    };
  });
}

class MinHeap {
  values = [];

  push(value) {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index) {
      const parent = Math.floor((index - 1) / 2);
      if (this.values[parent].priority <= value.priority) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = value;
  }

  pop() {
    const first = this.values[0];
    const last = this.values.pop();
    if (this.values.length && last) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.values.length) break;
        const child = right < this.values.length && this.values[right].priority < this.values[left].priority ? right : left;
        if (this.values[child].priority >= last.priority) break;
        this.values[index] = this.values[child];
        index = child;
      }
      this.values[index] = last;
    }
    return first;
  }

  get length() {
    return this.values.length;
  }
}

function routeGrid(boxes) {
  const right = Math.max(...boxes.map(box => box.x + box.w)) + routeMargin;
  const bottom = Math.max(...boxes.map(box => box.y + box.h)) + routeMargin;
  const min = 0;
  const columns = Math.ceil((right - min) / gridSize) + 1;
  const rows = Math.ceil((bottom - min) / gridSize) + 1;
  const blocked = new Set();
  for (const box of boxes) {
    const leftCell = Math.floor((box.x - obstaclePadding - min) / gridSize);
    const rightCell = Math.ceil((box.x + box.w + obstaclePadding - min) / gridSize);
    const topCell = Math.floor((box.y - obstaclePadding - min) / gridSize);
    const bottomCell = Math.ceil((box.y + box.h + obstaclePadding - min) / gridSize);
    for (let y = topCell; y <= bottomCell; y++) {
      for (let x = leftCell; x <= rightCell; x++) blocked.add(y * columns + x);
    }
  }
  return {min, columns, rows, blocked};
}

function ports(box) {
  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;
  const aligned = value => Math.round(value / gridSize) * gridSize;
  const within = (value, min, max) => Math.max(min, Math.min(max, aligned(value)));
  const left = Math.floor((box.x - routePadding) / gridSize) * gridSize;
  const right = Math.ceil((box.x + box.w + routePadding) / gridSize) * gridSize;
  const top = Math.floor((box.y - routePadding) / gridSize) * gridSize;
  const bottom = Math.ceil((box.y + box.h + routePadding) / gridSize) * gridSize;
  return [
    ...[-24, -8, 8, 24].flatMap(offset => [
      {x: left, y: within(centerY + offset, box.y, box.y + box.h)},
      {x: right, y: within(centerY + offset, box.y, box.y + box.h)},
    ]),
    ...[-20, -4, 12, 28].flatMap(offset => [
      {x: within(centerX + offset, box.x, box.x + box.w), y: top},
      {x: within(centerX + offset, box.x, box.x + box.w), y: bottom},
    ]),
  ];
}

function simplify(points) {
  const result = [];
  for (const point of points) {
    while (result.length >= 2) {
      const a = result[result.length - 2];
      const b = result[result.length - 1];
      if ((a.x === b.x && b.x === point.x) || (a.y === b.y && b.y === point.y)) result.pop();
      else break;
    }
    result.push(point);
  }
  return result;
}

function findRoute(sourceBox, targetBox, grid, usage) {
  const {min, columns, rows, blocked} = grid;
  const idAt = point => Math.round((point.y - min) / gridSize) * columns + Math.round((point.x - min) / gridSize);
  const pointAt = cell => ({x: min + (cell % columns) * gridSize, y: min + Math.floor(cell / columns) * gridSize});
  const sourcePorts = ports(sourceBox);
  const targetPorts = ports(targetBox);
  const targetIds = new Set(targetPorts.map(idAt));
  const sourceAt = new Map(sourcePorts.map(point => [idAt(point), point]));
  const heap = new MinHeap();
  const distance = new Map();
  const previous = new Map();
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const encode = (cell, direction) => cell * 5 + direction;

  for (const cell of sourceAt.keys()) {
    if (blocked.has(cell)) continue;
    const state = encode(cell, 4);
    const portCongestion = (usage.get(cell) || 0) * 48;
    distance.set(state, portCongestion);
    heap.push({state, priority: portCongestion});
  }

  let finalState;
  while (heap.length) {
    const current = heap.pop();
    const cost = distance.get(current.state);
    if (current.priority !== cost) continue;
    const cell = Math.floor(current.state / 5);
    const direction = current.state % 5;
    if (targetIds.has(cell)) {
      finalState = current.state;
      break;
    }
    const x = cell % columns;
    const y = Math.floor(cell / columns);
    for (let nextDirection = 0; nextDirection < directions.length; nextDirection++) {
      const [dx, dy] = directions[nextDirection];
      const nextX = x + dx;
      const nextY = y + dy;
      if (nextX < 0 || nextY < 0 || nextX >= columns || nextY >= rows) continue;
      const nextCell = nextY * columns + nextX;
      if (blocked.has(nextCell)) continue;
      const turnCost = direction === 4 || direction === nextDirection ? 0 : 3;
      const congestion = (usage.get(nextCell) || 0) * 48;
      const nextCost = cost + 1 + turnCost + congestion;
      const nextState = encode(nextCell, nextDirection);
      if (nextCost >= (distance.get(nextState) ?? Infinity)) continue;
      distance.set(nextState, nextCost);
      previous.set(nextState, current.state);
      heap.push({state: nextState, priority: nextCost});
    }
  }
  if (finalState === undefined) throw new Error(`Could not route overview connection from ${sourceBox.group} to ${targetBox.group}.`);

  const cells = [];
  for (let state = finalState; state !== undefined; state = previous.get(state)) cells.push(Math.floor(state / 5));
  cells.reverse();
  const start = sourceAt.get(cells[0]);
  const end = targetPorts.find(point => idAt(point) === cells.at(-1));
  const startCell = pointAt(cells[0]);
  const endCell = pointAt(cells.at(-1));
  const sourceAnchor = {x: Math.max(sourceBox.x, Math.min(sourceBox.x + sourceBox.w, start.x)), y: Math.max(sourceBox.y, Math.min(sourceBox.y + sourceBox.h, start.y))};
  const targetAnchor = {x: Math.max(targetBox.x, Math.min(targetBox.x + targetBox.w, end.x)), y: Math.max(targetBox.y, Math.min(targetBox.y + targetBox.h, end.y))};
  const points = simplify([sourceAnchor, start, ...cells.map(pointAt), end, targetAnchor]);
  const occupiedCells = new Set(cells);
  for (const [from, to] of [[sourceAnchor, start], [end, targetAnchor]]) {
    const steps = Math.ceil(Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) / gridSize);
    for (let index = 0; index <= steps; index++) {
      const progress = steps ? index / steps : 0;
      occupiedCells.add(idAt({
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
      }));
    }
  }
  for (const cell of occupiedCells) usage.set(cell, (usage.get(cell) || 0) + 1);
  return points;
}

function roundedPath(points, radius = 8) {
  if (points.length < 3) return points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ');
  let path = `M${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index++) {
    const before = points[index - 1];
    const corner = points[index];
    const after = points[index + 1];
    const beforeLength = Math.abs(corner.x - before.x) + Math.abs(corner.y - before.y);
    const afterLength = Math.abs(after.x - corner.x) + Math.abs(after.y - corner.y);
    const bend = Math.min(radius, beforeLength / 2, afterLength / 2);
    const incoming = {
      x: corner.x + Math.sign(before.x - corner.x) * bend,
      y: corner.y + Math.sign(before.y - corner.y) * bend,
    };
    const outgoing = {
      x: corner.x + Math.sign(after.x - corner.x) * bend,
      y: corner.y + Math.sign(after.y - corner.y) * bend,
    };
    path += ` L${incoming.x} ${incoming.y} Q${corner.x} ${corner.y} ${outgoing.x} ${outgoing.y}`;
  }
  const last = points.at(-1);
  return `${path} L${last.x} ${last.y}`;
}

export function routeOverviewEdges(connections, boxes) {
  const boxByGroup = new Map(boxes.map(box => [box.group, box]));
  const grid = routeGrid(boxes);
  const usage = new Map();
  const routes = [...connections].sort((a, b) => b.count - a.count
    || a.sourceGroup.localeCompare(b.sourceGroup)
    || a.targetGroup.localeCompare(b.targetGroup));
  const routed = new Map();
  for (const connection of routes) {
    const sourceBox = boxByGroup.get(connection.sourceGroup);
    const targetBox = boxByGroup.get(connection.targetGroup);
    if (!sourceBox || !targetBox) throw new Error(`Missing overview group box for ${connection.sourceGroup} or ${connection.targetGroup}.`);
    const points = findRoute(sourceBox, targetBox, grid, usage);
    const path = points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ');
    routed.set(connection, {...connection, path, points});
  }
  return connections.map(connection => ({
    ...routed.get(connection),
    path: roundedPath(routed.get(connection).points),
  }));
}
