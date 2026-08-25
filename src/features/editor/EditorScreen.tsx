import { AlignCenter, AlignLeft, Check, ChevronDown, Download, LoaderCircle, Pause, Play, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { navigate } from '../../navigation';
import { createProject, getTemplate, projectSchema, templates, type ReelProject } from '../../domain/project';
import { projectRepository } from '../../infrastructure/projectRepository';
import { generateReelSuggestion } from '../../infrastructure/ollamaReelGenerator';
import { Logo } from '../../ui/Logo';
import { TemplateArtwork } from '../../ui/TemplateArtwork';
import { ReelComposition } from '../../video/ReelComposition';
import { ExportDialog } from './ExportDialog';

const ACCENTS = ['#faff69', '#ffffff', '#22c55e', '#3b82f6'] as const;

export function EditorScreen({ templateId }: { templateId: string }) {
  const template = getTemplate(templateId);
  const persisted = projectRepository.load();
  const initial = useMemo(() => template ? (persisted?.templateId === template.id ? persisted : createProject(template)) : null, [template, persisted]);
  const [project, setProject] = useState<ReelProject | null>(initial);
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'invalid'>('saved');
  const [isPlaying, setIsPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiState, setAiState] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ status: 'idle' });
  const playerRef = useRef<PlayerRef>(null);
  const resetDialogRef = useRef<HTMLDialogElement>(null);

  const parsed = project ? projectSchema.safeParse(project) : null;
  const issues = parsed && !parsed.success ? Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])) : {};

  useEffect(() => {
    if (!project) return;
    const valid = projectSchema.safeParse(project);
    if (!valid.success) { setSaveState('invalid'); return; }
    setSaveState('saving');
    const timeout = window.setTimeout(() => { projectRepository.save(valid.data); setSaveState('saved'); }, 350);
    return () => window.clearTimeout(timeout);
  }, [project]);

  useEffect(() => {
    const dialog = resetDialogRef.current;
    if (resetOpen && dialog && !dialog.open) dialog.showModal();
    if (!resetOpen && dialog?.open) dialog.close();
  }, [resetOpen]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = ({ detail }: { detail: { frame: number } }) => setFrame(detail.frame);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    player.addEventListener('frameupdate', onFrame);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    player.addEventListener('ended', onPause);
    return () => { player.removeEventListener('frameupdate', onFrame); player.removeEventListener('play', onPlay); player.removeEventListener('pause', onPause); player.removeEventListener('ended', onPause); };
  }, [project]);

  if (!template || !project) {
    return <main className="fatal-state"><span className="eyebrow">Template unavailable</span><h1>That starting point doesn’t exist.</h1><p>Return to the library and choose an available template.</p><button className="button primary" onClick={() => navigate('/')}>Browse templates</button></main>;
  }

  const change = <K extends keyof ReelProject>(key: K, value: ReelProject[K]) => setProject((current) => current ? { ...current, [key]: value, updatedAt: Date.now() } : current);
  const switchTemplate = (id: string) => { const next = getTemplate(id); if (next) { setProject(createProject(next)); navigate(`/editor/${next.id}`); } };
  const totalFrames = project.duration * 30;
  const reset = () => { setProject(createProject(template)); setResetOpen(false); playerRef.current?.seekTo(0); };
  const generateWithAi = async () => {
    if (!aiPrompt.trim() || aiState.status === 'loading') return;
    setAiState({ status: 'loading' });
    try {
      const suggestion = await generateReelSuggestion(aiPrompt, project.templateId);
      setProject((current) => current ? { ...current, ...suggestion, updatedAt: Date.now() } : current);
      playerRef.current?.seekTo(0);
      setAiState({ status: 'success', message: 'AI direction applied. Review and edit anything before exporting.' });
    } catch (error) {
      setAiState({ status: 'error', message: error instanceof Error ? error.message : 'Could not generate this reel.' });
    }
  };

  return (
    <div className="editor-shell">
      <header className="editor-header">
        <div className="editor-header-left"><Logo /><span className="header-rule" /><button className="project-name">Untitled reel <ChevronDown size={15} /></button></div>
        <div className="save-state" aria-live="polite">{saveState === 'saved' ? <><Check size={14} /> Saved locally</> : saveState === 'saving' ? 'Saving…' : 'Fix validation to save'}</div>
        <div className="editor-actions">
          <button className="button secondary download-project" onClick={() => setExportOpen(true)}><Download size={17} /> <span>Download</span></button>
          <button className="button primary" disabled={!parsed?.success} onClick={() => setExportOpen(true)}>Export video</button>
        </div>
      </header>

      <main className="workbench">
        <aside className="template-rail" aria-label="Templates">
          <div className="panel-heading"><span className="eyebrow">Templates</span><span>{templates.length}</span></div>
          <div className="rail-list">
            {templates.map((item) => <button key={item.id} className={item.id === project.templateId ? 'selected' : ''} aria-pressed={item.id === project.templateId} onClick={() => switchTemplate(item.id)}><TemplateArtwork template={item} compact /><span>{item.name}</span></button>)}
          </div>
        </aside>

        <section className="preview-stage" aria-label="Video preview">
          <div className="stage-toolbar"><span className="aspect-badge">9:16 · Vertical</span><span>1080 × 1920</span></div>
          <div className="player-frame">
            <Player
              ref={playerRef}
              component={ReelComposition}
              inputProps={{ project }}
              durationInFrames={totalFrames}
              compositionWidth={1080}
              compositionHeight={1920}
              fps={30}
              controls={false}
              loop
              acknowledgeRemotionLicense
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="playback-controls">
            <button className="icon-button" onClick={() => playerRef.current?.toggle()} aria-label={isPlaying ? 'Pause preview' : 'Play preview'}>{isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button>
            <span>{(frame / 30).toFixed(1)}s</span>
            <input aria-label="Preview position" type="range" min="0" max={totalFrames - 1} value={Math.min(frame, totalFrames - 1)} onChange={(event) => playerRef.current?.seekTo(Number(event.target.value))} />
            <span>{project.duration.toFixed(1)}s</span>
          </div>
        </section>

        <aside className="properties-panel" aria-label="Template controls">
          <div className="panel-heading"><span className="eyebrow"><SlidersHorizontal size={14} /> Properties</span></div>
          <div className="property-group ai-generator">
            <label htmlFor="ai-prompt"><span><Sparkles size={14} /> AI create</span><small>Local</small></label>
            <textarea
              id="ai-prompt"
              rows={4}
              maxLength={400}
              placeholder="Example: Announce a late-night coffee launch with bold, energetic copy."
              value={aiPrompt}
              disabled={aiState.status === 'loading'}
              onChange={(event) => { setAiPrompt(event.target.value); setAiState({ status: 'idle' }); }}
            />
            <button className="button ai-generate-button" disabled={!aiPrompt.trim() || aiState.status === 'loading'} onClick={generateWithAi}>
              {aiState.status === 'loading' ? <><LoaderCircle className="spin-inline" size={15} /> Creating…</> : <><Sparkles size={15} /> Create with Llama 3.2</>}
            </button>
            <div className={`ai-status ${aiState.status}`} role="status" aria-live="polite">
              {aiState.status === 'loading' ? 'Generating copy, color, alignment, and timing locally…' : aiState.message}
            </div>
          </div>
          <div className="property-group">
            <label htmlFor="headline">Headline <span>{project.title.length}/72</span></label>
            <textarea id="headline" rows={3} value={project.title} aria-invalid={Boolean(issues.title)} aria-describedby={issues.title ? 'headline-error' : undefined} onChange={(event) => change('title', event.target.value)} />
            {issues.title && <small className="field-error" id="headline-error">{issues.title}</small>}
          </div>
          <div className="property-group">
            <label htmlFor="subtitle">Supporting text <span>{project.subtitle.length}/120</span></label>
            <textarea id="subtitle" rows={3} value={project.subtitle} aria-invalid={Boolean(issues.subtitle)} aria-describedby={issues.subtitle ? 'subtitle-error' : undefined} onChange={(event) => change('subtitle', event.target.value)} />
            {issues.subtitle && <small className="field-error" id="subtitle-error">{issues.subtitle}</small>}
          </div>
          <fieldset className="property-group"><legend>Text alignment</legend><div className="segmented-control"><button className={project.alignment === 'left' ? 'selected' : ''} aria-pressed={project.alignment === 'left'} onClick={() => change('alignment', 'left')}><AlignLeft size={17} /> Left</button><button className={project.alignment === 'center' ? 'selected' : ''} aria-pressed={project.alignment === 'center'} onClick={() => change('alignment', 'center')}><AlignCenter size={17} /> Center</button></div></fieldset>
          <fieldset className="property-group"><legend>Accent color</legend><div className="swatches">{ACCENTS.map((color) => <button key={color} aria-label={`Use accent ${color}`} aria-pressed={project.accent === color} className={project.accent === color ? 'selected' : ''} style={{ '--swatch': color } as React.CSSProperties} onClick={() => change('accent', color)}><i /></button>)}</div></fieldset>
          <div className="property-group duration-control"><label htmlFor="duration">Duration <span>{project.duration}s</span></label><input id="duration" type="range" min="6" max="30" step="1" value={project.duration} onChange={(event) => change('duration', Number(event.target.value))} /><div><span>6s</span><span>30s</span></div></div>
          <button className="reset-button" onClick={() => setResetOpen(true)}><RotateCcw size={16} /> Reset template</button>
        </aside>

        <section className="timeline" aria-label="Timeline">
          <div className="timeline-heading"><span>Timeline</span><span>{frame + 1} / {totalFrames} frames</span></div>
          <div className="timeline-body">
            <div className="track-labels"><span>Text</span><span>Accent</span></div>
            <div className="tracks" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); playerRef.current?.seekTo(Math.round(((event.clientX - rect.left) / rect.width) * (totalFrames - 1))); }}>
              <div className="ruler">{[0, .25, .5, .75, 1].map((point) => <span key={point} style={{ left: `${point * 100}%` }}>{Math.round(project.duration * point)}s</span>)}</div>
              <div className="clip text-clip">Headline + supporting text</div><div className="clip accent-clip">Progress accent</div>
              <i className="playhead" style={{ left: `${(frame / Math.max(1, totalFrames - 1)) * 100}%` }} />
            </div>
          </div>
        </section>
      </main>

      <ExportDialog project={project} open={exportOpen} onClose={() => setExportOpen(false)} />
      <dialog ref={resetDialogRef} className="confirm-dialog" onCancel={() => setResetOpen(false)} onClose={() => setResetOpen(false)}>
        <span className="eyebrow">Reset template</span><h2>Discard these edits?</h2><p>This returns the current template to its original copy, timing, and style. The action cannot be undone.</p>
        <div className="dialog-actions"><button className="button secondary" onClick={() => setResetOpen(false)}>Keep editing</button><button className="button danger" onClick={reset}>Reset edits</button></div>
      </dialog>
    </div>
  );
}
