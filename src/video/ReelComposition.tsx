import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ReelProject } from '../domain/project';

export type ReelCompositionProps = { project: ReelProject };

export function ReelComposition({ project }: ReelCompositionProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });
  const exit = interpolate(frame, [durationInFrames - fps, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = Math.min(entrance, exit);
  const translateY = interpolate(entrance, [0, 1], [90, 0]);
  const progress = interpolate(frame, [0, durationInFrames], [0, 100]);
  const titleLines = project.title.split('\n');

  return (
    <AbsoluteFill
      style={{
        backgroundColor: project.templateId === 'editorial' ? '#ededeb' : '#0a0a0a',
        color: project.templateId === 'editorial' ? '#0a0a0a' : '#ffffff',
        fontFamily: 'Inter, Arial, sans-serif',
        padding: 84,
        justifyContent: project.templateId === 'metric' ? 'space-between' : 'center',
        textAlign: project.alignment,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: project.templateId === 'signal' ? '80px 80px auto auto' : 'auto 80px 90px 80px',
          width: project.templateId === 'signal' ? 154 : 'auto',
          height: project.templateId === 'signal' ? 154 : 10,
          background: project.accent,
          transform: project.templateId === 'signal' ? `rotate(${frame * 0.5}deg)` : undefined,
        }}
      />
      {project.templateId === 'metric' && (
        <div style={{ fontSize: 27, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: '#888' }}>
          Proof / 01
        </div>
      )}
      <div style={{ opacity, transform: `translateY(${translateY}px)` }}>
        <div
          style={{
            color: project.accent,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 4,
            marginBottom: 30,
            textTransform: 'uppercase',
          }}
        >
          {project.templateId === 'metric' ? 'The result' : project.templateId === 'editorial' ? 'A short story' : 'New / now'}
        </div>
        <h1
          style={{
            fontSize: project.templateId === 'metric' ? 154 : 104,
            lineHeight: 0.94,
            letterSpacing: -6,
            margin: 0,
            fontWeight: 700,
          }}
        >
          {titleLines.map((line, index) => <span key={`${line}-${index}`} style={{ display: 'block' }}>{line}</span>)}
        </h1>
        <p style={{ fontSize: 34, lineHeight: 1.35, margin: '48px 0 0', color: project.templateId === 'editorial' ? '#444' : '#c7c7c7' }}>
          {project.subtitle}
        </p>
      </div>
      {project.templateId === 'metric' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: '#888' }}>
          <span>REELMAKER</span><span>9:16</span>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, height: 10, width: `${progress}%`, background: project.accent }} />
    </AbsoluteFill>
  );
}
