"use client";

import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import type { Task } from "../../lib/tasks/queries";
import type { DropTarget } from "./board-columns";

type Point = { x: number; y: number };
type Drag = {
  pointerId: number;
  listeners: AbortController;
  task: Task;
  origin: Point;
  point: Point;
  active: boolean;
};

function edgeSpeed(value: number, low: number, high: number) {
  if (value < low + 42) return -Math.min(16, Math.ceil((low + 42 - value) / 3));
  if (value > high - 42) return Math.min(16, Math.ceil((value - high + 42) / 3));
  return 0;
}

function findTarget(board: HTMLElement, drag: Drag): DropTarget | null {
  const element = document.elementFromPoint(drag.point.x, drag.point.y);
  const column = element?.closest<HTMLElement>("[data-board-column]");
  const columnId = column?.dataset.boardColumn;
  if (!column || !columnId || !board.contains(column)) return null;
  for (const card of column.querySelectorAll<HTMLElement>("[data-board-task]")) {
    const beforeId = card.dataset.boardTask;
    if (!beforeId || beforeId === drag.task.id) continue;
    const bounds = card.getBoundingClientRect();
    if (drag.point.y < bounds.top + bounds.height / 2) return { columnId, beforeId };
  }
  return { columnId, beforeId: null };
}

export function useTaskDrag(board: RefObject<HTMLDivElement | null>, onDrop: (task: Task, target: DropTarget) => void) {
  const gesture = useRef<Drag | null>(null);
  const frame = useRef(0);
  const [preview, setPreview] = useState<{ task: Task; point: Point; target: DropTarget | null } | null>(null);

  useEffect(() => () => {
    gesture.current?.listeners.abort();
    cancelAnimationFrame(frame.current);
  }, []);

  function updatePreview() {
    const drag = gesture.current;
    const scroll = board.current?.querySelector<HTMLElement>("[data-task-scroll]");
    if (!drag?.active || !scroll) return;
    const bounds = scroll.getBoundingClientRect();
    if (drag.point.y >= Math.max(0, bounds.top) && drag.point.y <= Math.min(window.innerHeight, bounds.bottom)) {
      scroll.scrollLeft += edgeSpeed(drag.point.x, bounds.left, bounds.right);
    }
    window.scrollBy(0, edgeSpeed(drag.point.y, 0, window.innerHeight));
    const target = findTarget(scroll, drag);
    setPreview((previous) => previous && previous.point === drag.point
      && previous.target?.columnId === target?.columnId && previous.target?.beforeId === target?.beforeId
      ? previous : { task: drag.task, point: drag.point, target });
    frame.current = requestAnimationFrame(updatePreview);
  }

  function start(event: PointerEvent<HTMLSpanElement>, task: Task) {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return;
    const point = { x: event.clientX, y: event.clientY };
    const listeners = new AbortController();
    gesture.current = { pointerId: event.pointerId, listeners, task, origin: point, point, active: false };
    const options = { capture: true, signal: listeners.signal };
    window.addEventListener("pointermove", move, options);
    window.addEventListener("pointerup", end, options);
    window.addEventListener("pointercancel", (pointer) => { if (pointer.pointerId === event.pointerId) cancel(); }, options);
    window.addEventListener("blur", cancel, { signal: listeners.signal });
    window.addEventListener("keydown", (keyboard) => { if (keyboard.key === "Escape") cancel(); }, options);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: globalThis.PointerEvent) {
    const drag = gesture.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.point = { x: event.clientX, y: event.clientY };
    if (drag.active || Math.hypot(drag.point.x - drag.origin.x, drag.point.y - drag.origin.y) < 6) return;
    drag.active = true;
    updatePreview();
  }

  function cancel() {
    const drag = gesture.current;
    gesture.current = null;
    drag?.listeners.abort();
    cancelAnimationFrame(frame.current);
    setPreview(null);
  }

  function end(event: globalThis.PointerEvent) {
    const drag = gesture.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const root = board.current;
    drag.point = { x: event.clientX, y: event.clientY };
    const target = drag.active && root ? findTarget(root, drag) : null;
    cancel();
    if (target) onDrop(drag.task, target);
  }

  return { preview, start };
}
