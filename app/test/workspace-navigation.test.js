import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  fitView,
  installWheelNavigation,
  normalizeWheelDeltas,
  panByScreenPixels,
  screenDeltaToViewBox,
  screenPointToViewBox,
  zoomAtScreenPoint,
  zoomByStep,
} from '../src/workspace/navigation.js';

const rect = {left: 100, top: 50, width: 1000, height: 800};
const initial = () => ({scale: 1, offset: {x: 0, y: 0}, bounds: {w: 1000, h: 800}});

function viewport() {
  const listeners = new Map();
  return {
    clientWidth: rect.width,
    clientHeight: rect.height,
    getBoundingClientRect: () => rect,
    addEventListener(type, listener, options) { listeners.set(type, {listener, options}); },
    removeEventListener(type) { listeners.delete(type); },
    dispatch(event) { listeners.get(event.type)?.listener(event); },
    listener(type) { return listeners.get(type); },
  };
}

function wheel(overrides = {}) {
  return {
    type: 'wheel',
    deltaX: 0,
    deltaY: 0,
    deltaMode: 0,
    ctrlKey: false,
    metaKey: false,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    prevented: false,
    preventDefault() { this.prevented = true; },
    ...overrides,
  };
}

test('trackpad wheel panning preserves horizontal, vertical, and diagonal movement', () => {
  const start = initial();
  assert.deepEqual(panByScreenPixels(start, 35, 0, rect).offset, {x: 35, y: 0});
  assert.deepEqual(panByScreenPixels(start, 0, 27, rect).offset, {x: 0, y: 27});
  assert.deepEqual(panByScreenPixels(start, 35, 27, rect).offset, {x: 35, y: 27});
});

test('wheel deltas normalize pixel, line, and page modes independently by axis', () => {
  const pageViewport = {...viewport(), clientWidth: 1200, clientHeight: 700};
  assert.deepEqual(normalizeWheelDeltas(wheel({deltaX: 2, deltaY: 3, deltaMode: 1}), pageViewport), {x: 32, y: 48});
  assert.deepEqual(normalizeWheelDeltas(wheel({deltaX: 2, deltaY: 3, deltaMode: 2}), pageViewport), {x: 2400, y: 2100});
});

test('screen-space panning stays the same size at different zoom levels', () => {
  const atOne = initial();
  const atTwo = {...initial(), scale: 2};
  const oneDelta = screenDeltaToViewBox(40, 24, atOne, rect);
  const twoDelta = screenDeltaToViewBox(40, 24, atTwo, rect);
  assert.deepEqual(oneDelta, {x: 40, y: 24});
  assert.deepEqual(twoDelta, {x: 20, y: 12});
  assert.equal(oneDelta.x * atOne.scale, twoDelta.x * atTwo.scale);
  assert.equal(oneDelta.y * atOne.scale, twoDelta.y * atTwo.scale);
});

test('zoom keeps the SVG point beneath the cursor fixed, including letterboxed viewports', () => {
  const state = {...initial(), offset: {x: 80, y: 45}};
  const point = {x: rect.left + 730, y: rect.top + 260};
  const zoomed = zoomAtScreenPoint(state, 1.8, point.x, point.y, rect);
  const before = screenPointToViewBox(point.x, point.y, state, rect);
  const after = screenPointToViewBox(point.x, point.y, zoomed, rect);
  assert.equal(zoomed.scale, 1.8);
  assert.ok(Math.abs(before.x - after.x) < 1e-9);
  assert.ok(Math.abs(before.y - after.y) < 1e-9);

  const wideRect = {...rect, width: 1400, height: 700};
  const widePoint = {x: rect.left + 600, y: rect.top + 300};
  const wideZoom = zoomAtScreenPoint(state, 1.4, widePoint.x, widePoint.y, wideRect);
  const wideBefore = screenPointToViewBox(widePoint.x, widePoint.y, state, wideRect);
  const wideAfter = screenPointToViewBox(widePoint.x, widePoint.y, wideZoom, wideRect);
  assert.ok(Math.abs(wideBefore.x - wideAfter.x) < 1e-9);
  assert.ok(Math.abs(wideBefore.y - wideAfter.y) < 1e-9);
});

test('step zoom controls retain their increments, limits, and fit reset', () => {
  const state = {...initial(), scale: 1, offset: {x: 120, y: 60}};
  assert.equal(zoomByStep(state, 1).scale, 1.25);
  assert.equal(zoomByStep(state, -1).scale, 0.8);
  assert.equal(zoomByStep({...state, scale: 3}, 1).scale, 3);
  assert.equal(zoomByStep({...state, scale: 0.5}, -1).scale, 0.5);
  assert.deepEqual(fitView(state), {...state, scale: 1, offset: {x: 0, y: 0}});
});

test('canvas wheel listener is non-passive, pans, zooms continuously, and clamps zoom', () => {
  const canvas = viewport();
  let state = initial();
  let updates = 0;
  installWheelNavigation(canvas, () => state, next => { state = next; }, () => updates++);
  assert.deepEqual(canvas.listener('wheel').options, {passive: false});

  const horizontal = wheel({deltaX: 20});
  canvas.dispatch(horizontal);
  assert.equal(state.offset.x, 20);
  assert.equal(horizontal.prevented, true);

  const pinch = wheel({deltaY: -10, ctrlKey: true});
  canvas.dispatch(pinch);
  assert.ok(state.scale > 1 && state.scale < 1.25);
  assert.equal(pinch.prevented, true);

  const cmdWheel = wheel({deltaY: 10, metaKey: true});
  canvas.dispatch(cmdWheel);
  assert.ok(state.scale < 1.02);

  canvas.dispatch(wheel({deltaY: -10000, ctrlKey: true}));
  assert.equal(state.scale, 3);
  canvas.dispatch(wheel({deltaY: 10000, ctrlKey: true}));
  assert.equal(state.scale, 0.5);
  assert.equal(updates, 5);
});

test('normal page scrolling outside the canvas is not intercepted', () => {
  const canvas = viewport();
  let state = initial();
  installWheelNavigation(canvas, () => state, next => { state = next; }, () => {});

  const outsidePage = viewport();
  const outsideWheel = wheel({deltaY: 60});
  outsidePage.dispatch(outsideWheel);
  assert.equal(outsideWheel.prevented, false);
  assert.equal(state.offset.y, 0);
});
