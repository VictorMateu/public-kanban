"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject, type TouchEvent } from "react";
import type { Task } from "../../lib/tasks/queries";
import type { DropTarget } from "./board-columns";

type Point = { x: number; y: number };
type Drag = {
  listeners: AbortController;
  task: Task;
  origin: Point;
  point: Point;
  active: boolean;
  holdTimer?: number;
};

const movementThreshold = 6;
const touchHoldMs = 350;

function edgeSpeed(value: number, low: number, high: number) {
  if (value < low + 42) return -Math.min(16, Math.ceil((low + 42 - value) / 3));
  if (value > high - 42) return Math.min(16, Math.ceil((value - high + 42) / 3));
  return 0;
}

function columnAt(board: HTMLElement, point: Point) {
  const column = document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>("[data-board-column]");
  return column && board.contains(column) ? column : null;
}

function findTarget(board: HTMLElement, drag: Drag): DropTarget | null {
  const column = columnAt(board, drag.point);
  const columnId = column?.dataset.boardColumn;
  if (!column || !columnId) return null;
  const list = column.querySelector<HTMLElement>("[data-column-scroll]");
  if (!list) return null;
  const viewport = list.getBoundingClientRect();
  const y = Math.max(viewport.top, Math.min(drag.point.y, viewport.bottom));
  for (const card of list.querySelectorAll<HTMLElement>("[data-board-task]")) {
    const beforeId = card.dataset.boardTask;
    if (!beforeId || beforeId === drag.task.id) continue;
    const bounds = card.getBoundingClientRect();
    if (y < bounds.top + bounds.height / 2) return { columnId, beforeId };
  }
  return { columnId, beforeId: null };
}

export function useTaskDrag(board: RefObject<HTMLDivElement | null>, onDrop: (task: Task, target: DropTarget) => void) {
  const gesture = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const frame = useRef(0);
  const [preview, setPreview] = useState<{ task: Task; point: Point; target: DropTarget | null } | null>(null);

  useEffect(() => () => {
    window.clearTimeout(gesture.current?.holdTimer);
    gesture.current?.listeners.abort();
    cancelAnimationFrame(frame.current);
  }, []);

  function updatePreview() {
    const drag = gesture.current;
    const scroll = board.current?.querySelector<HTMLElement>("[data-task-scroll]");
    if (!drag?.active || !scroll) return;
    const { x, y } = drag.point;
    const bounds = scroll.getBoundingClientRect();
    if (y >= Math.max(0, bounds.top) && y <= Math.min(window.innerHeight, bounds.bottom)) {
      scroll.scrollLeft += edgeSpeed(x, bounds.left, bounds.right);
    }
    const list = columnAt(scroll, drag.point)?.querySelector<HTMLElement>("[data-column-scroll]");
    if (list) {
      const viewport = list.getBoundingClientRect();
      list.scrollTop += edgeSpeed(y, Math.max(0, viewport.top), Math.min(window.innerHeight, viewport.bottom));
    }
    const target = findTarget(scroll, drag);
    setPreview((previous) => previous && previous.point === drag.point
      && previous.target?.columnId === target?.columnId && previous.target?.beforeId === target?.beforeId
      ? previous : { task: drag.task, point: drag.point, target });
    frame.current = requestAnimationFrame(updatePreview);
  }

  function cancel() {
    const drag = gesture.current;
    gesture.current = null;
    if (!drag) return;
    window.clearTimeout(drag.holdTimer);
    drag.listeners.abort();
    cancelAnimationFrame(frame.current);
    if (drag.active) setPreview(null);
  }

  function begin(task: Task, point: Point) {
    if (gesture.current) return null;
    suppressClick.current = false;
    const drag: Drag = { listeners: new AbortController(), task, origin: point, point, active: false };
    gesture.current = drag;
    const options = { signal: drag.listeners.signal };
    window.addEventListener("blur", cancel, options);
    window.addEventListener("contextmenu", (event) => {
      if (drag.active) event.preventDefault();
    }, options);
    window.addEventListener("keydown", (event) => { if (event.key === "Escape") cancel(); }, options);
    return drag;
  }

  function activate(drag: Drag) {
    drag.active = true;
    suppressClick.current = true;
    updatePreview();
  }

  function finish(drag: Drag, point: Point) {
    drag.point = point;
    const root = board.current;
    const target = drag.active && root ? findTarget(root, drag) : null;
    cancel();
    if (target) onDrop(drag.task, target);
  }

  function startPointer(event: PointerEvent<HTMLButtonElement>, task: Task) {
    if (event.pointerType === "touch" || !event.isPrimary || event.button !== 0) return;
    const drag = begin(task, { x: event.clientX, y: event.clientY });
    if (!drag) return;
    const pointerId = event.pointerId;
    const button = event.currentTarget;
    const options = { capture: true, signal: drag.listeners.signal };
    window.addEventListener("pointermove", (pointer) => {
      if (pointer.pointerId !== pointerId) return;
      drag.point = { x: pointer.clientX, y: pointer.clientY };
      if (!drag.active && Math.hypot(drag.point.x - drag.origin.x, drag.point.y - drag.origin.y) >= movementThreshold) {
        button.setPointerCapture(pointerId);
        activate(drag);
      }
    }, options);
    window.addEventListener("pointerup", (pointer) => {
      if (pointer.pointerId === pointerId) finish(drag, { x: pointer.clientX, y: pointer.clientY });
    }, options);
    window.addEventListener("pointercancel", (pointer) => { if (pointer.pointerId === pointerId) cancel(); }, options);
  }

  function startTouch(event: TouchEvent<HTMLButtonElement>, task: Task) {
    const touch = event.changedTouches[0];
    if (!touch || event.touches.length !== 1) return;
    const drag = begin(task, { x: touch.clientX, y: touch.clientY });
    if (!drag) return;
    const touchId = touch.identifier;
    const options = { capture: true, passive: false, signal: drag.listeners.signal };
    drag.holdTimer = window.setTimeout(() => activate(drag), touchHoldMs);
    window.addEventListener("touchstart", (nativeEvent) => { if (nativeEvent.touches.length > 1) cancel(); }, options);
    // Allow a swipe to scroll normally until the hold activates, then take over the gesture.
    window.addEventListener("touchmove", (nativeEvent) => {
      const moved = Array.from(nativeEvent.changedTouches).find(({ identifier }) => identifier === touchId);
      if (!moved) return;
      drag.point = { x: moved.clientX, y: moved.clientY };
      if (drag.active && nativeEvent.cancelable) nativeEvent.preventDefault();
      else if (Math.hypot(drag.point.x - drag.origin.x, drag.point.y - drag.origin.y) >= movementThreshold) cancel();
    }, options);
    window.addEventListener("touchend", (nativeEvent) => {
      const ended = Array.from(nativeEvent.changedTouches).find(({ identifier }) => identifier === touchId);
      if (!ended) return;
      if (drag.active) nativeEvent.preventDefault();
      finish(drag, { x: ended.clientX, y: ended.clientY });
    }, options);
    window.addEventListener("touchcancel", cancel, options);
  }

  function suppressesClick(event: MouseEvent<HTMLButtonElement>) {
    return event.detail !== 0 && suppressClick.current;
  }

  return { preview, startPointer, startTouch, suppressesClick };
}
