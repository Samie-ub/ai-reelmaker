import { AlignCenter, AlignLeft, ArrowDown, ArrowUp, Check, ChevronDown, Copy, Download, LoaderCircle, Pause, Play, Plus, RotateCcw, SlidersHorizontal, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { navigate } from '../../navigation';
import { ACCENTS, ANIMATIONS, BACKGROUNDS, createProject, createScene, getProjectDuration, getTemplate, projectSchema, reelSceneSchema, type ReelProject, type ReelScene } from '../../domain/project';
import { projectRepository } from '../../infrastructure/projectRepository';
import { generateReelSuggestion } from '../../infrastructure/ollamaReelGenerator';
import { aiMemory } from '../../infrastructure/aiMemory';
import { cloudProjectRepository } from '../../infrastructure/cloudProjectRepository';
import { Logo } from '../../ui/Logo';
import { ReelComposition } from '../../video/ReelComposition';
import { ExportDialog } from './ExportDialog';

const animationLabels: Record<ReelScene['animation'], string> = { rise: 'Rise up', fade: 'Fade in', scale: 'Scale in', 'slide-left': 'Slide from right' };

export function EditorScreen({ templateId }: { templateId: string }) {
  const template = getTemplate(templateId);
  const persisted = useMemo(() => projectRepository.load(), []);
  const initial = useMemo(() => template ? (persisted?.templateId === template.id ? persisted : createProject(template)) : null, [template, persisted]);
  const [project, setProject] = useState<ReelProject | null>(initial);
  const [selectedSceneId, setSelectedSceneId] = useState(initial?.scenes[0]?.id ?? '');
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'invalid'>('saved');
  const [cloudState, setCloudState] = useState<'disabled' | 'syncing' | 'synced' | 'error'>(cloudProjectRepository.isConfigured() ? 'syncing' : 'disabled');
  const [cloudReady, setCloudReady] = useState(!cloudProjectRepository.isConfigured() || Boolean(persisted));
  const [isPlaying, setIsPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiState, setAiState] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ status: 'idle' });
  const playerRef = useRef<PlayerRef>(null);
  const resetDialogRef = useRef<HTMLDialogElement>(null);

  const parsed = project ? projectSchema.safeParse(project) : null;
  const scene = project?.scenes.find((item) => item.id === selectedSceneId) ?? project?.scenes[0] ?? null;
  const selectedIndex = project && scene ? project.scenes.findIndex((item) => item.id === scene.id) : -1;
  const sceneParsed = scene ? reelSceneSchema.safeParse(scene) : null;
  const issues = sceneParsed && !sceneParsed.success ? Object.fromEntries(sceneParsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])) : {};

  useEffect(() => {
    if (cloudReady || !template || !cloudProjectRepository.isConfigured()) return;
    let cancelled = false;
    void cloudProjectRepository.loadProject(template.id)
      .then((cloudProject) => {
        if (cancelled) return;
        if (cloudProject) {
          setProject(cloudProject);
          setSelectedSceneId(cloudProject.scenes[0].id);
          projectRepository.save(cloudProject);
          setCloudState('synced');
        }
      })
      .catch(() => { if (!cancelled) setCloudState('error'); })
      .finally(() => { if (!cancelled) setCloudReady(true); });
    return () => { cancelled = true; };
  }, [cloudReady, template]);

  useEffect(() => {
    if (!project || !cloudReady) return;
    const valid = projectSchema.safeParse(project);
    if (!valid.success) { setSaveState('invalid'); return; }
    setSaveState('saving');
    const timeout = window.setTimeout(() => {
      projectRepository.save(valid.data); setSaveState('saved');
      if (cloudProjectRepository.isConfigured()) {
        setCloudState('syncing');
        void cloudProjectRepository.saveProject(valid.data).then(() => setCloudState('synced')).catch(() => setCloudState('error'));
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [cloudReady, project]);

  useEffect(() => {
    const dialog = resetDialogRef.current;
    if (resetOpen && dialog && !dialog.open) dialog.showModal();
    if (!resetOpen && dialog?.open) dialog.close();
  }, [resetOpen]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = ({ detail }: { detail: { frame: number } }) => setFrame(detail.frame);
    const onPlay = () => setIsPlaying(true); const onPause = () => setIsPlaying(false);
    player.addEventListener('frameupdate', onFrame); player.addEventListener('play', onPlay); player.addEventListener('pause', onPause); player.addEventListener('ended', onPause);
    return () => { player.removeEventListener('frameupdate', onFrame); player.removeEventListener('play', onPlay); player.removeEventListener('pause', onPause); player.removeEventListener('ended', onPause); };
  }, [project]);

  if (!template || !project || !scene) {
    return <main className="fatal-state"><span className="eyebrow">Template unavailable</span><h1>That starting point doesn’t exist.</h1><p>Return to the library and choose an available template.</p><button className="button primary" onClick={() => navigate('/')}>Browse templates</button></main>;
  }

  const duration = getProjectDuration(project);
  const totalFrames = duration * 30;
  const sceneStartFrame = (index: number) => project.scenes.slice(0, index).reduce((total, item) => total + item.duration * 30, 0);
  const selectScene = (id: string, index: number) => { setSelectedSceneId(id); playerRef.current?.seekTo(sceneStartFrame(index)); };
  const changeScene = <K extends keyof ReelScene>(key: K, value: ReelScene[K]) => setProject((current) => current ? { ...current, scenes: current.scenes.map((item) => item.id === scene.id ? { ...item, [key]: value } : item), updatedAt: Date.now() } : current);
  const addScene = () => {
    if (project.scenes.length >= 8) return;
    const next = createScene({ title: 'New scene', subtitle: 'Add the next beat of your story.', accent: scene.accent, background: scene.background, alignment: scene.alignment, duration: 4, animation: scene.animation });
    setProject((current) => current ? { ...current, scenes: [...current.scenes, next], updatedAt: Date.now() } : current); setSelectedSceneId(next.id); playerRef.current?.seekTo(totalFrames);
  };
  const duplicateScene = () => {
    if (project.scenes.length >= 8) return;
    const copy = createScene({ title: scene.title, subtitle: scene.subtitle, accent: scene.accent, background: scene.background, alignment: scene.alignment, duration: scene.duration, animation: scene.animation });
    const copyStart = sceneStartFrame(selectedIndex) + scene.duration * 30;
    setProject((current) => current ? { ...current, scenes: [...current.scenes.slice(0, selectedIndex + 1), copy, ...current.scenes.slice(selectedIndex + 1)], updatedAt: Date.now() } : current); setSelectedSceneId(copy.id); playerRef.current?.seekTo(copyStart);
  };
  const removeScene = () => {
    if (project.scenes.length === 1) return;
    const remaining = project.scenes.filter((item) => item.id !== scene.id); const next = remaining[Math.min(selectedIndex, remaining.length - 1)];
    const nextIndex = remaining.findIndex((item) => item.id === next.id);
    const nextStart = remaining.slice(0, nextIndex).reduce((total, item) => total + item.duration * 30, 0);
    setProject({ ...project, scenes: remaining, updatedAt: Date.now() }); setSelectedSceneId(next.id); playerRef.current?.seekTo(nextStart);
  };
  const moveScene = (direction: -1 | 1) => {
    const target = selectedIndex + direction; if (target < 0 || target >= project.scenes.length) return;
    const scenes = [...project.scenes]; [scenes[selectedIndex], scenes[target]] = [scenes[target], scenes[selectedIndex]];
    const targetFrame = scenes.slice(0, target).reduce((total, item) => total + item.duration * 30, 0);
    setProject({ ...project, scenes, updatedAt: Date.now() }); playerRef.current?.seekTo(targetFrame);
  };
  const reset = () => { const next = createProject(template); setProject(next); setSelectedSceneId(next.scenes[0].id); setResetOpen(false); playerRef.current?.seekTo(0); };
  const generateWithAi = async (mode: 'project' | 'scene' = 'project') => {
    if (!aiPrompt.trim() || aiState.status === 'loading') return;
    setAiState({ status: 'loading' });
    try {
      const brief = mode === 'scene'
        ? `Create exactly one replacement scene based on this request: ${aiPrompt}. Current scene headline: ${scene.title}. Keep it coherent with the surrounding reel.`
        : aiPrompt;
      const suggestion = await generateReelSuggestion(await aiMemory.enrichBrief(brief), project.templateId);
      void aiMemory.recordGeneration(project, mode, aiPrompt, suggestion);
      if (mode === 'scene') {
        const replacement = { id: scene.id, ...suggestion.scenes[0] };
        setProject((current) => current ? { ...current, scenes: current.scenes.map((item) => item.id === scene.id ? replacement : item), updatedAt: Date.now() } : current);
        playerRef.current?.seekTo(sceneStartFrame(selectedIndex));
        setAiState({ status: 'success', message: 'Selected scene rewritten and remains fully editable.' });
      } else {
        const scenes = suggestion.scenes.map((creative) => createScene(creative));
        setProject((current) => current ? { ...current, scenes, updatedAt: Date.now() } : current); setSelectedSceneId(scenes[0].id); playerRef.current?.seekTo(0);
        setAiState({ status: 'success', message: `${scenes.length} editable AI scene${scenes.length === 1 ? '' : 's'} applied.` });
      }
    } catch (error) { setAiState({ status: 'error', message: error instanceof Error ? error.message : 'Could not generate this reel.' }); }
  };

  return (
    <div className="editor-shell">
      <header className="editor-header">
        <div className="editor-header-left"><Logo /><span className="header-rule" /><button className="project-name">Untitled reel <ChevronDown size={15} /></button></div>
        <div className="save-state" aria-live="polite">{saveState === 'saved' ? <><Check size={14} /> Saved locally{cloudState === 'synced' ? ' · Cloud synced' : cloudState === 'syncing' ? ' · Syncing…' : cloudState === 'error' ? ' · Cloud unavailable' : ''}</> : saveState === 'saving' ? 'Saving…' : 'Fix validation to save'}</div>
        <div className="editor-actions"><button className="button secondary download-project" onClick={() => setExportOpen(true)}><Download size={17} /> <span>Download</span></button><button className="button primary" disabled={!parsed?.success} onClick={() => setExportOpen(true)}>Export video</button></div>
      </header>

      <main className="workbench">
        <aside className="template-rail scene-rail" aria-label="Scenes">
          <div className="panel-heading"><span className="eyebrow">Scenes <small>{project.scenes.length}/8</small></span><button className="mini-add" disabled={project.scenes.length >= 8} onClick={addScene}><Plus size={14} /> Add</button></div>
          <div className="scene-list">
            {project.scenes.map((item, index) => <div key={item.id} className={`scene-item ${item.id === scene.id ? 'selected' : ''}`}>
              <button className="scene-select" aria-pressed={item.id === scene.id} onClick={() => selectScene(item.id, index)}><span className="scene-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{item.title.replace('\n', ' ')}</strong><small>{item.duration}s · {animationLabels[item.animation]}</small></span></button>
              {item.id === scene.id && <div className="scene-actions"><button aria-label="Move scene up" disabled={index === 0} onClick={() => moveScene(-1)}><ArrowUp size={13} /></button><button aria-label="Move scene down" disabled={index === project.scenes.length - 1} onClick={() => moveScene(1)}><ArrowDown size={13} /></button><button aria-label="Duplicate scene" disabled={project.scenes.length >= 8} onClick={duplicateScene}><Copy size={13} /></button><button aria-label="Delete scene" disabled={project.scenes.length === 1} onClick={removeScene}><Trash2 size={13} /></button></div>}
            </div>)}
          </div>
        </aside>

        <section className="preview-stage" aria-label="Video preview">
          <div className="stage-toolbar"><span className="aspect-badge">9:16 · Vertical</span><span>{project.scenes.length} scenes · {duration}s</span></div>
          <div className="player-frame"><Player ref={playerRef} component={ReelComposition} inputProps={{ project }} durationInFrames={totalFrames} compositionWidth={1080} compositionHeight={1920} fps={30} controls={false} loop acknowledgeRemotionLicense style={{ width: '100%', height: '100%' }} /></div>
          <div className="playback-controls"><button className="icon-button" onClick={() => playerRef.current?.toggle()} aria-label={isPlaying ? 'Pause preview' : 'Play preview'}>{isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button><span>{(frame / 30).toFixed(1)}s</span><input aria-label="Preview position" type="range" min="0" max={totalFrames - 1} value={Math.min(frame, totalFrames - 1)} onChange={(event) => playerRef.current?.seekTo(Number(event.target.value))} /><span>{duration.toFixed(1)}s</span></div>
        </section>

        <aside className="properties-panel" aria-label="Scene controls">
          <div className="panel-heading"><span className="eyebrow"><SlidersHorizontal size={14} /> Scene {selectedIndex + 1}</span><span>{template.name}</span></div>
          <div className="property-group ai-generator">
            <label htmlFor="ai-prompt"><span><Sparkles size={14} /> AI scene builder</span><small>Local</small></label>
            <textarea id="ai-prompt" rows={4} maxLength={400} placeholder="Describe the complete reel—or how AI should rewrite this scene." value={aiPrompt} disabled={aiState.status === 'loading'} onChange={(event) => { setAiPrompt(event.target.value); setAiState({ status: 'idle' }); }} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') generateWithAi(); }} />
            <div className="ai-button-row"><button className="button ai-generate-button" disabled={!aiPrompt.trim() || aiState.status === 'loading'} onClick={() => generateWithAi('project')}>{aiState.status === 'loading' ? <><LoaderCircle className="spin-inline" size={15} /> Building…</> : <><Sparkles size={15} /> Full reel</>}</button><button className="button ai-scene-button" disabled={!aiPrompt.trim() || aiState.status === 'loading'} onClick={() => generateWithAi('scene')}>Rewrite scene</button></div>
            <div className={`ai-status ${aiState.status}`} role="status" aria-live="polite">{aiState.status === 'loading' ? 'Writing and directing an editable scene sequence locally…' : aiState.message}</div>
          </div>
          <div className="property-group"><label htmlFor="headline">Headline <span>{scene.title.length}/72</span></label><textarea id="headline" rows={3} value={scene.title} aria-invalid={Boolean(issues.title)} aria-describedby={issues.title ? 'headline-error' : undefined} onChange={(event) => changeScene('title', event.target.value)} />{issues.title && <small className="field-error" id="headline-error">{issues.title}</small>}</div>
          <div className="property-group"><label htmlFor="subtitle">Supporting text <span>{scene.subtitle.length}/120</span></label><textarea id="subtitle" rows={3} value={scene.subtitle} aria-invalid={Boolean(issues.subtitle)} onChange={(event) => changeScene('subtitle', event.target.value)} /></div>
          <fieldset className="property-group"><legend>Text alignment</legend><div className="segmented-control"><button className={scene.alignment === 'left' ? 'selected' : ''} aria-pressed={scene.alignment === 'left'} onClick={() => changeScene('alignment', 'left')}><AlignLeft size={17} /> Left</button><button className={scene.alignment === 'center' ? 'selected' : ''} aria-pressed={scene.alignment === 'center'} onClick={() => changeScene('alignment', 'center')}><AlignCenter size={17} /> Center</button></div></fieldset>
          <fieldset className="property-group"><legend>Accent color</legend><div className="swatches">{ACCENTS.map((color) => <button key={color} aria-label={`Use accent ${color}`} aria-pressed={scene.accent === color} className={scene.accent === color ? 'selected' : ''} style={{ '--swatch': color } as React.CSSProperties} onClick={() => changeScene('accent', color)}><i /></button>)}</div></fieldset>
          <fieldset className="property-group"><legend>Background</legend><div className="swatches">{BACKGROUNDS.map((color) => <button key={color} aria-label={`Use background ${color}`} aria-pressed={scene.background === color} className={scene.background === color ? 'selected' : ''} style={{ '--swatch': color } as React.CSSProperties} onClick={() => changeScene('background', color)}><i /></button>)}</div></fieldset>
          <div className="property-group select-control"><label htmlFor="animation">Entrance animation</label><select id="animation" value={scene.animation} onChange={(event) => changeScene('animation', event.target.value as ReelScene['animation'])}>{ANIMATIONS.map((animation) => <option key={animation} value={animation}>{animationLabels[animation]}</option>)}</select></div>
          <div className="property-group duration-control"><label htmlFor="duration">Scene duration <span>{scene.duration}s</span></label><input id="duration" type="range" min="2" max="15" step="1" value={scene.duration} onChange={(event) => changeScene('duration', Number(event.target.value))} /><div><span>2s</span><span>15s</span></div></div>
          <div className="scene-property-actions"><button onClick={duplicateScene} disabled={project.scenes.length >= 8}><Copy size={15} /> Duplicate</button><button onClick={removeScene} disabled={project.scenes.length === 1}><Trash2 size={15} /> Delete</button></div>
          <button className="reset-button" onClick={() => setResetOpen(true)}><RotateCcw size={16} /> Reset project</button>
        </aside>

        <section className="timeline" aria-label="Timeline">
          <div className="timeline-heading"><span>Scene timeline</span><span>{frame + 1} / {totalFrames} frames</span></div>
          <div className="timeline-body scene-timeline-body"><div className="track-labels"><span>Scenes</span></div><div className="tracks"><div className="ruler">{[0, .25, .5, .75, 1].map((point) => <span key={point} style={{ left: `${point * 100}%` }}>{Math.round(duration * point)}s</span>)}</div><div className="timeline-scenes">{project.scenes.map((item, index) => <button key={item.id} className={`clip scene-clip ${item.id === scene.id ? 'selected' : ''}`} style={{ width: `${(item.duration / duration) * 100}%`, background: item.accent }} onClick={() => selectScene(item.id, index)}><span>{index + 1}</span>{item.title.replace('\n', ' ')}</button>)}</div><i className="playhead" style={{ left: `${(frame / Math.max(1, totalFrames - 1)) * 100}%` }} /></div></div>
        </section>
      </main>

      <ExportDialog project={project} open={exportOpen} onClose={() => setExportOpen(false)} />
      <dialog ref={resetDialogRef} className="confirm-dialog" onCancel={() => setResetOpen(false)} onClose={() => setResetOpen(false)}><span className="eyebrow">Reset project</span><h2>Discard every scene?</h2><p>This returns the project to its original single-scene template. The action cannot be undone.</p><div className="dialog-actions"><button className="button secondary" onClick={() => setResetOpen(false)}>Keep editing</button><button className="button danger" onClick={reset}>Reset project</button></div></dialog>
    </div>
  );
}
