import { Check, Download, FileJson, LoaderCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReelProject } from '../../domain/project';
import { browserExporter } from '../../video/browserExporter';

type ExportState = 'idle' | 'rendering' | 'success' | 'error' | 'cancelled';

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function ExportDialog({ project, open, onClose }: { project: ReelProject; open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  const close = () => {
    if (state === 'rendering') return;
    setState('idle'); setProgress(0); setError(''); onClose();
  };

  const exportVideo = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setState('rendering'); setError(''); setProgress(0);
    try {
      const blob = await browserExporter.export(project, ({ frame, totalFrames }) => setProgress(Math.round((frame / totalFrames) * 100)), controller.signal);
      if (!controller.signal.aborted) {
        saveBlob(blob, `reelmaker-${project.templateId}.webm`);
        setState('success');
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') setState('cancelled');
      else { setError(caught instanceof Error ? caught.message : 'Export failed unexpectedly.'); setState('error'); }
    } finally { abortRef.current = null; }
  };

  const downloadProject = () => saveBlob(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), `reelmaker-${project.templateId}.json`);

  return (
    <dialog ref={dialogRef} className="export-dialog" onCancel={(event) => { if (state === 'rendering') event.preventDefault(); else close(); }} onClose={() => open && close()}>
      <button className="icon-button dialog-close" aria-label="Close export dialog" onClick={close} disabled={state === 'rendering'}><X size={20} /></button>
      {state === 'rendering' ? (
        <div className="export-progress" role="status" aria-live="polite">
          <LoaderCircle className="spin" size={28} />
          <span className="eyebrow">Rendering locally</span>
          <h2>Building every frame</h2>
          <p>Keep this tab open. A {project.duration}-second video takes about {project.duration} seconds to encode.</p>
          <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
          <strong>{progress}%</strong>
          <button className="button secondary" onClick={() => abortRef.current?.abort()}>Cancel export</button>
        </div>
      ) : state === 'success' ? (
        <div className="export-progress success" role="status">
          <span className="success-icon"><Check /></span><span className="eyebrow">Export complete</span><h2>Your reel is ready.</h2>
          <p>The WebM video was downloaded to your device.</p><button className="button primary" onClick={close}>Back to editor</button>
        </div>
      ) : (
        <>
          <span className="eyebrow">Export / 1080 × 1920</span>
          <h2>Finish your reel</h2>
          <p>Video is encoded privately in this browser. Nothing is uploaded.</p>
          {(state === 'error' || state === 'cancelled') && <div className={`inline-alert ${state}`} role="alert">{state === 'cancelled' ? 'Export cancelled. Your project is unchanged.' : error}</div>}
          <button className="export-option" onClick={exportVideo} disabled={!browserExporter.isSupported()}>
            <span className="export-option-icon"><Download /></span><span><strong>Export WebM video</strong><small>1080 × 1920 · 30 fps · {project.duration}s</small></span><span>Recommended</span>
          </button>
          <button className="export-option" onClick={downloadProject}>
            <span className="export-option-icon"><FileJson /></span><span><strong>Download project</strong><small>Portable JSON backup for later editing</small></span>
          </button>
          {!browserExporter.isSupported() && <p className="support-note">Video export is unavailable in this browser. Download the project file or use a current Chromium-based browser.</p>}
        </>
      )}
    </dialog>
  );
}
