import type { ReelTemplate } from '../domain/project';

export function TemplateArtwork({ template, compact = false }: { template: ReelTemplate; compact?: boolean }) {
  return (
    <div className={`template-art art-${template.id}${compact ? ' compact' : ''}`} aria-hidden="true">
      <span className="art-kicker">{template.id === 'metric' ? 'THE RESULT' : template.id === 'editorial' ? 'A SHORT STORY' : 'NEW / NOW'}</span>
      <strong>{template.title.split('\n').map((line) => <span key={line}>{line}</span>)}</strong>
      {!compact && <small>{template.subtitle}</small>}
      <i className="art-accent" />
    </div>
  );
}
