// Drag-to-wipe before/after slider. Renders two layers (children prop:
// {before, after}) and clips them in opposite directions based on a single
// pointer-controlled position (0..100). Used in the landing hero to compare
// the flat cut sheet (before) with the 3D folded box (after).
import { ReactNode, useRef, useState, useCallback, useEffect } from "react";

interface Props {
  before: ReactNode;          // shown on the LEFT as the handle moves right
  after: ReactNode;           // shown on the RIGHT as the handle moves right
  className?: string;
  initialPos?: number;        // 0..100, default 50
  onChange?: (pos: number) => void;
}

export function CompareSlider({ before, after, className, initialPos = 50, onChange }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(initialPos);
  const draggingRef = useRef(false);

  // clip-path polygons mirror each other around the handle position
  const beforeClip = `polygon(0 0, ${pos}% 0, ${pos}% 100%, 0 100%)`;
  const afterClip = `polygon(${pos}% 0, 100% 0, 100% 100%, ${pos}% 100%)`;

  const updateFromClientX = useCallback((clientX: number) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    setPos(p);
    onChange?.(p);
  }, [onChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    stageRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
    updateFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };
  const onPointerUp = () => { draggingRef.current = false; };

  // Keyboard support for accessibility: arrow keys nudge the handle
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
      else if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={stageRef}
      className={`compare-stage ${className ?? ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="slider"
      tabIndex={0}
      aria-label="Compare cut file with folded box"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
    >
      <div className="compare-after" style={{ clipPath: afterClip }}>{after}</div>
      <div className="compare-before" style={{ clipPath: beforeClip }}>{before}</div>
      <div className="compare-handle" style={{ left: `${pos}%` }}>
        <div className="compare-handle-grip" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 7-5 5 5 5" />
            <path d="m15 7 5 5-5 5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
