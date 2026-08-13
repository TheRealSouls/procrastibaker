import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

export type PanelPosition = { x: number; y: number };

// Gap kept between a dragged panel and the viewport edges.
const EDGE_MARGIN = 8;

// Pixels a pointer must travel before the gesture counts as a drag rather than
// a click. Keeps a draggable button clickable.
const DRAG_THRESHOLD = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function loadPosition(storageKey: string): PanelPosition | null {
  try {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PanelPosition> | null;

    return typeof parsed?.x === "number" && typeof parsed?.y === "number"
      ? { x: parsed.x, y: parsed.y }
      : null;
  } catch {
    return null;
  }
}

/**
 * Makes a fixed-position panel freely draggable by a handle, remembering where
 * the user left it. Returns a null position until the panel has been moved, so
 * the CSS-defined default docking stays in charge until then.
 *
 * Uses pointer events (mouse, touch and pen in one path) with pointer capture so
 * a fast drag cannot slip off the handle.
 */
export function useDraggablePanel(storageKey: string) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<PanelPosition | null>(() =>
    loadPosition(storageKey),
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  // Set once a drag travels far enough to count, so a handle that doubles as a
  // button can tell a real drag from a click that wobbled a pixel.
  const movedRef = useRef(false);

  // Keeps the panel fully on screen whatever the viewport size.
  const clampToViewport = useCallback((x: number, y: number): PanelPosition => {
    const node = nodeRef.current;
    const width = node?.offsetWidth ?? 0;
    const height = node?.offsetHeight ?? 0;

    return {
      x: clamp(x, EDGE_MARGIN, Math.max(EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN)),
      y: clamp(y, EDGE_MARGIN, Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN)),
    };
  }, []);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    const node = nodeRef.current;

    // Ignore secondary buttons so right-click never starts a drag.
    if (!node || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    const rect = node.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    movedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    // Stops the gesture also scrolling the page or selecting text. The click
    // event still fires afterwards, which is what lets the handle be a button.
    event.preventDefault();
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      const nextX = event.clientX - drag.offsetX;
      const nextY = event.clientY - drag.offsetY;

      if (!movedRef.current) {
        const node = nodeRef.current;
        const rect = node?.getBoundingClientRect();

        if (
          rect &&
          Math.abs(nextX - rect.left) + Math.abs(nextY - rect.top) >= DRAG_THRESHOLD
        ) {
          movedRef.current = true;
        }
      }

      setPosition(clampToViewport(nextX, nextY));
    },
    [clampToViewport],
  );

  const endDrag = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  useEffect(() => {
    if (!position) {
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(position));
    } catch {
      // Storage unavailable (private mode / quota); the position just won't persist.
    }
  }, [position, storageKey]);

  // A resized or rotated window must not leave the panel stranded off screen.
  useEffect(() => {
    if (!position) {
      return;
    }

    function handleResize() {
      setPosition((current) =>
        current ? clampToViewport(current.x, current.y) : current,
      );
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [position, clampToViewport]);

  const resetPosition = useCallback(() => {
    setPosition(null);

    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore: the panel still resets for this session.
    }
  }, [storageKey]);

  return {
    nodeRef,
    position,
    isDragging,
    resetPosition,
    // Lets a click handler on a drag handle bail out after an actual drag.
    wasDragged: () => movedRef.current,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
