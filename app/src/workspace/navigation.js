export const MIN_SCALE = 0.5;
export const MAX_SCALE = 3;

const ZOOM_SENSITIVITY = 0.0015;

function clampScale(scale) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function screenTransform(state, rect) {
  const viewWidth = state.bounds.w / state.scale;
  const viewHeight = state.bounds.h / state.scale;
  const pixelsPerUnit = Math.min(rect.width / viewWidth, rect.height / viewHeight);
  if (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0) return null;

  const contentWidth = viewWidth * pixelsPerUnit;
  const contentHeight = viewHeight * pixelsPerUnit;
  return {
    pixelsPerUnit,
    marginX: (rect.width - contentWidth) / 2,
    marginY: (rect.height - contentHeight) / 2,
  };
}

export function normalizeWheelDeltas(event, viewport) {
  const rect = viewport.getBoundingClientRect();
  const multiplierX = event.deltaMode === 1 ? 16
    : event.deltaMode === 2 ? viewport.clientWidth || rect.width
      : 1;
  const multiplierY = event.deltaMode === 1 ? 16
    : event.deltaMode === 2 ? viewport.clientHeight || rect.height
      : 1;
  return {x: event.deltaX * multiplierX, y: event.deltaY * multiplierY};
}

export function screenDeltaToViewBox(deltaX, deltaY, state, rect) {
  const transform = screenTransform(state, rect);
  if (!transform) return null;
  return {
    x: deltaX / transform.pixelsPerUnit,
    y: deltaY / transform.pixelsPerUnit,
  };
}

export function screenPointToViewBox(clientX, clientY, state, rect) {
  const transform = screenTransform(state, rect);
  if (!transform) return null;
  return {
    x: state.offset.x + (clientX - rect.left - transform.marginX) / transform.pixelsPerUnit,
    y: state.offset.y + (clientY - rect.top - transform.marginY) / transform.pixelsPerUnit,
  };
}

export function panByScreenPixels(state, deltaX, deltaY, rect) {
  const delta = screenDeltaToViewBox(deltaX, deltaY, state, rect);
  if (!delta) return null;
  return {
    ...state,
    offset: {x: state.offset.x + delta.x, y: state.offset.y + delta.y},
  };
}

export function zoomAtScreenPoint(state, requestedScale, clientX, clientY, rect) {
  const scale = clampScale(requestedScale);
  const nextState = {...state, scale};
  const after = screenTransform(nextState, rect);
  const point = screenPointToViewBox(clientX, clientY, state, rect);
  if (!point || !after) return null;
  return {
    ...nextState,
    offset: {
      x: point.x - (clientX - rect.left - after.marginX) / after.pixelsPerUnit,
      y: point.y - (clientY - rect.top - after.marginY) / after.pixelsPerUnit,
    },
  };
}

export function zoomByStep(state, direction) {
  const factor = direction > 0 ? 1.25 : 1 / 1.25;
  return {...state, scale: clampScale(state.scale * factor)};
}

export function fitView(state) {
  return {...state, scale: 1, offset: {x: 0, y: 0}};
}

export function installWheelNavigation(viewport, getState, setState, updateView) {
  const handleWheel = event => {
    const delta = normalizeWheelDeltas(event, viewport);
    if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y) || (!delta.x && !delta.y)) return;

    const rect = viewport.getBoundingClientRect();
    const state = getState();
    if (event.ctrlKey || event.metaKey) {
      const zoomDelta = delta.y || delta.x;
      const next = zoomAtScreenPoint(
        state,
        state.scale * Math.exp(-zoomDelta * ZOOM_SENSITIVITY),
        event.clientX,
        event.clientY,
        rect,
      );
      if (!next) return;
      setState(next);
    } else {
      const next = panByScreenPixels(state, delta.x, delta.y, rect);
      if (!next) return;
      setState(next);
    }

    event.preventDefault();
    updateView();
  };

  viewport.addEventListener('wheel', handleWheel, {passive: false});
  return () => viewport.removeEventListener('wheel', handleWheel);
}
