import { useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from 'react';
import type { ReelScene } from '../../domain/project';

const FPS = 30;
const MIN_SCENE_DURATION = 2;
const MAX_SCENE_DURATION = 15;

type SceneTimelineProps = {
  scenes: ReelScene[];
  selectedSceneId: string;
  frame: number;
  onSelect: (id: string) => void;
  onSeek: (frame: number) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  onDurationChange: (id: string, duration: number) => void;
};

const clampDuration = (value: number) => Math.min(MAX_SCENE_DURATION, Math.max(MIN_SCENE_DURATION, Math.round(value)));

function DurationInput({ scene, onChange }: { scene: ReelScene; onChange: (duration: number) => void }) {
  const [draft, setDraft] = useState(String(scene.duration));

  const commit = () => {
    const parsed = Number(draft);
    const duration = clampDuration(Number.isFinite(parsed) ? parsed : scene.duration);
    setDraft(String(duration));
    if (duration !== scene.duration) onChange(duration);
  };

  return (
    <label className="scene-duration-input" onClick={(event) => event.stopPropagation()}>
      <span className="sr-only">Scene duration in seconds</span>
      <input
        aria-label={`Scene ${scene.title.replace('\n', ' ')} duration in seconds`}
        inputMode="numeric"
        min={MIN_SCENE_DURATION}
        max={MAX_SCENE_DURATION}
        step="1"
        type="number"
        value={draft}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') { setDraft(String(scene.duration)); event.currentTarget.blur(); }
        }}
      />
      <span aria-hidden="true">s</span>
    </label>
  );
}

export function SceneTimeline({ scenes, selectedSceneId, frame, onSelect, onSeek, onReorder, onDurationChange }: SceneTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrubPointerRef = useRef<number | null>(null);
  const resizeRef = useRef<{ id: string; startX: number; startDuration: number; pixelsPerSecond: number } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const duration = scenes.reduce((total, scene) => total + scene.duration, 0);
  const totalFrames = duration * FPS;

  const frameAtClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect?.width) return 0;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.min(totalFrames - 1, Math.max(0, Math.round(ratio * (totalFrames - 1))));
  };

  const seekFromPointer = (event: PointerEvent<HTMLElement>) => onSeek(frameAtClientX(event.clientX));

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('.scene-clip')) return;
    scrubPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    seekFromPointer(event);
  };

  const handleClipKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(scenes[index].id);
      onSeek(scenes.slice(0, index).reduce((total, scene) => total + scene.duration * FPS, 0));
      return;
    }
    if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    const target = index + (event.key === 'ArrowLeft' ? -1 : 1);
    if (target < 0 || target >= scenes.length) return;
    event.preventDefault();
    onReorder(scenes[index].id, scenes[target].id);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = draggedId ?? event.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== targetId) onReorder(sourceId, targetId);
    setDraggedId(null);
    setDropTargetId(null);
  };

  const beginResize = (event: PointerEvent<HTMLButtonElement>, scene: ReelScene) => {
    event.preventDefault();
    event.stopPropagation();
    const width = trackRef.current?.getBoundingClientRect().width ?? 0;
    resizeRef.current = { id: scene.id, startX: event.clientX, startDuration: scene.duration, pixelsPerSecond: width / Math.max(1, duration) };
    setResizingId(scene.id);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const resize = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const operation = resizeRef.current;
    if (!operation || !operation.pixelsPerSecond || !Number.isFinite(event.clientX)) return;
    onDurationChange(operation.id, clampDuration(operation.startDuration + ((event.clientX - operation.startX) / operation.pixelsPerSecond)));
  };

  const endResize = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId);
    resizeRef.current = null;
    setResizingId(null);
  };

  return (
    <section className="timeline" aria-label="Timeline">
      <div className="timeline-heading"><span>Scene timeline</span><span>{frame + 1} / {totalFrames} frames</span></div>
      <div className="timeline-body scene-timeline-body">
        <div className="track-labels"><span>Scenes</span></div>
        <div
          className="tracks"
          onPointerDown={handleTrackPointerDown}
          onPointerMove={(event) => { if (scrubPointerRef.current === event.pointerId) seekFromPointer(event); }}
          onPointerUp={(event) => {
            if (scrubPointerRef.current !== event.pointerId) return;
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            scrubPointerRef.current = null;
          }}
        >
          <div className="ruler">{[0, .25, .5, .75, 1].map((point) => <span key={point} style={{ left: `${point * 100}%` }}>{Math.round(duration * point)}s</span>)}</div>
          <div className="timeline-scenes" ref={trackRef}>
            {scenes.map((scene, index) => (
              <div
                aria-label={`Scene ${index + 1}: ${scene.title.replace('\n', ' ')}. ${scene.duration} seconds. Drag to reorder, or press Alt and an arrow key.`}
                className={`clip scene-clip ${scene.id === selectedSceneId ? 'selected' : ''} ${scene.id === draggedId ? 'dragging' : ''} ${scene.id === dropTargetId ? 'drop-target' : ''} ${scene.id === resizingId ? 'resizing' : ''}`}
                draggable={!resizingId}
                key={scene.id}
                role="listitem"
                style={{ width: `${(scene.duration / duration) * 100}%`, background: scene.accent }}
                tabIndex={0}
                onClick={(event) => { if (!(event.target as HTMLElement).closest('input, .scene-resize-handle')) { onSelect(scene.id); onSeek(frameAtClientX(event.clientX)); } }}
                onDragEnd={() => { setDraggedId(null); setDropTargetId(null); }}
                onDragEnter={() => { if (draggedId && draggedId !== scene.id) setDropTargetId(scene.id); }}
                onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
                onDragStart={(event) => handleDragStart(event, scene.id)}
                onDrop={(event) => handleDrop(event, scene.id)}
                onKeyDown={(event) => handleClipKeyDown(event, index)}
              >
                <span className="scene-clip-number">{index + 1}</span>
                <span className="scene-clip-title">{scene.title.replace('\n', ' ')}</span>
                <DurationInput key={`${scene.id}-${scene.duration}`} scene={scene} onChange={(nextDuration) => onDurationChange(scene.id, nextDuration)} />
                <button
                  aria-label={`Resize scene ${index + 1}`}
                  className="scene-resize-handle"
                  draggable={false}
                  onPointerDown={(event) => beginResize(event, scene)}
                  onPointerMove={resize}
                  onPointerUp={endResize}
                  onPointerCancel={endResize}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                    event.preventDefault();
                    onDurationChange(scene.id, clampDuration(scene.duration + (event.key === 'ArrowLeft' ? -1 : 1)));
                  }}
                />
              </div>
            ))}
            <button
              aria-label="Timeline playhead. Drag to seek."
              aria-valuemax={totalFrames - 1}
              aria-valuemin={0}
              aria-valuenow={frame}
              aria-valuetext={`${(frame / FPS).toFixed(2)} seconds`}
              className="playhead"
              role="slider"
              style={{ left: `${(frame / Math.max(1, totalFrames - 1)) * 100}%` }}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                scrubPointerRef.current = event.pointerId;
                event.currentTarget.setPointerCapture?.(event.pointerId);
                seekFromPointer(event);
              }}
              onPointerMove={(event) => { if (scrubPointerRef.current === event.pointerId) seekFromPointer(event); }}
              onPointerUp={(event) => {
                if (scrubPointerRef.current !== event.pointerId) return;
                event.currentTarget.releasePointerCapture?.(event.pointerId);
                scrubPointerRef.current = null;
              }}
              onKeyDown={(event) => {
                const step = event.shiftKey ? FPS : 1;
                const nextFrame = event.key === 'Home' ? 0 : event.key === 'End' ? totalFrames - 1 : event.key === 'ArrowLeft' ? frame - step : event.key === 'ArrowRight' ? frame + step : null;
                if (nextFrame === null) return;
                event.preventDefault();
                onSeek(Math.min(totalFrames - 1, Math.max(0, nextFrame)));
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
