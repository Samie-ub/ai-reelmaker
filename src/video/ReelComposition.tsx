import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { getProjectDuration, type ReelProject, type ReelScene } from '../domain/project';

export type ReelCompositionProps = { project: ReelProject };

const sceneMotion = (scene: ReelScene, entrance: number) => {
  if (scene.animation === 'fade') return { transform: 'none', opacity: entrance };
  if (scene.animation === 'scale') return { transform: `scale(${interpolate(entrance, [0, 1], [0.78, 1])})`, opacity: entrance };
  if (scene.animation === 'slide-left') return { transform: `translateX(${interpolate(entrance, [0, 1], [150, 0])}px)`, opacity: entrance };
  return { transform: `translateY(${interpolate(entrance, [0, 1], [90, 0])}px)`, opacity: entrance };
};

function ReelSceneFrame({ scene, templateId, startFrame, totalFrames }: { scene: ReelScene; templateId: ReelProject['templateId']; startFrame: number; totalFrames: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });
  const sceneFrames = scene.duration * fps;
  const exit = interpolate(frame, [Math.max(0, sceneFrames - Math.round(fps * 0.45)), sceneFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const motion = sceneMotion(scene, entrance);
  const progress = interpolate(startFrame + frame, [0, totalFrames], [0, 100], { extrapolateRight: 'clamp' });
  const isLight = scene.background === '#ededeb';
  const titleLines = scene.title.split('\n');

  return (
    <AbsoluteFill style={{ backgroundColor: scene.background, color: isLight ? '#0a0a0a' : '#ffffff', fontFamily: 'Inter, Arial, sans-serif', padding: 84, justifyContent: templateId === 'metric' ? 'space-between' : 'center', textAlign: scene.alignment }}>
      <div style={{ position: 'absolute', inset: templateId === 'signal' ? '80px 80px auto auto' : 'auto 80px 90px 80px', width: templateId === 'signal' ? 154 : 'auto', height: templateId === 'signal' ? 154 : 10, background: scene.accent, transform: templateId === 'signal' ? `rotate(${frame * 0.5}deg)` : undefined }} />
      {templateId === 'metric' && <div style={{ fontSize: 27, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: isLight ? '#555' : '#888' }}>Proof / scene</div>}
      <div style={{ ...motion, opacity: motion.opacity * exit }}>
        <div style={{ color: scene.accent, fontSize: 26, fontWeight: 700, letterSpacing: 4, marginBottom: 30, textTransform: 'uppercase' }}>
          {templateId === 'metric' ? 'The result' : templateId === 'editorial' ? 'A short story' : 'New / now'}
        </div>
        <h1 style={{ fontSize: templateId === 'metric' ? 154 : 104, lineHeight: 0.94, letterSpacing: -6, margin: 0, fontWeight: 700 }}>
          {titleLines.map((line, index) => <span key={`${line}-${index}`} style={{ display: 'block' }}>{line}</span>)}
        </h1>
        <p style={{ fontSize: 34, lineHeight: 1.35, margin: '48px 0 0', color: isLight ? '#444' : '#c7c7c7' }}>{scene.subtitle}</p>
      </div>
      {templateId === 'metric' && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: isLight ? '#555' : '#888' }}><span>REELMAKER</span><span>9:16</span></div>}
      <div style={{ position: 'absolute', bottom: 0, left: 0, height: 10, width: `${progress}%`, background: scene.accent }} />
    </AbsoluteFill>
  );
}

export function ReelComposition({ project }: ReelCompositionProps) {
  const { fps } = useVideoConfig();
  const totalFrames = getProjectDuration(project) * fps;
  let startFrame = 0;
  return (
    <AbsoluteFill>
      {project.scenes.map((scene) => {
        const durationInFrames = scene.duration * fps;
        const from = startFrame;
        startFrame += durationInFrames;
        return <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}><ReelSceneFrame scene={scene} templateId={project.templateId} startFrame={from} totalFrames={totalFrames} /></Sequence>;
      })}
    </AbsoluteFill>
  );
}
