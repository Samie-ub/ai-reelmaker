import { ArrowRight, Clock3, Play, Search, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { navigate } from '../../navigation';
import { templates } from '../../domain/project';
import { projectRepository } from '../../infrastructure/projectRepository';
import { Logo } from '../../ui/Logo';
import { TemplateArtwork } from '../../ui/TemplateArtwork';

const categories = ['All', 'Launch', 'Editorial', 'Insights'] as const;

export function LibraryScreen() {
  const [category, setCategory] = useState<(typeof categories)[number]>('All');
  const [query, setQuery] = useState('');
  const draft = projectRepository.load();
  const visible = useMemo(() => templates.filter((template) =>
    (category === 'All' || template.category === category) &&
    `${template.name} ${template.description}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [category, query]);

  return (
    <div className="library-shell">
      <header className="library-nav container">
        <Logo />
        <div className="nav-actions">
          <span className="status-dot"><i /> Local workspace</span>
          {draft && <button className="button secondary" onClick={() => navigate(`/editor/${draft.templateId}`)}>Continue editing</button>}
        </div>
      </header>

      <main>
        <section className="library-hero container">
          <div>
            <span className="eyebrow"><Sparkles size={14} /> Template studio</span>
            <h1>Start with a structure.<br />Make it unmistakably yours.</h1>
          </div>
          <p>Choose a motion-ready format, shape the message, and export a vertical video without rebuilding the edit every time.</p>
        </section>

        <section className="template-section container" aria-labelledby="templates-title">
          <div className="section-toolbar">
            <div>
              <span className="section-index">01 / Templates</span>
              <h2 id="templates-title">Choose your starting point</h2>
            </div>
            <label className="search-field">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search templates</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates" />
            </label>
          </div>
          <div className="category-tabs" role="group" aria-label="Filter by category">
            {categories.map((item) => (
              <button key={item} className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
          {visible.length ? (
            <div className="template-grid">
              {visible.map((template, index) => (
                <article className="template-card" key={template.id}>
                  <button className="art-button" aria-label={`Use ${template.name} template`} onClick={() => navigate(`/editor/${template.id}`)}>
                    <TemplateArtwork template={template} />
                    <span className="play-affordance"><Play size={16} fill="currentColor" /> Preview</span>
                    <span className="card-number">0{index + 1}</span>
                  </button>
                  <div className="template-meta">
                    <div><h3>{template.name}</h3><p>{template.description}</p></div>
                    <div className="template-facts"><span>9:16</span><span><Clock3 size={14} /> {template.duration}s</span></div>
                    <button className="use-template" onClick={() => navigate(`/editor/${template.id}`)}>Use template <ArrowRight size={17} /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state" role="status">
              <Search size={24} />
              <h3>No templates match that search</h3>
              <p>Try another phrase or clear the active category.</p>
              <button className="button secondary" onClick={() => { setQuery(''); setCategory('All'); }}>Clear filters</button>
            </div>
          )}
        </section>

        <section className="promise-band container">
          <div><span className="section-index dark">02 / Repeatable workflow</span><h2>One good structure.<br />A hundred fresh stories.</h2></div>
          <div className="promise-metric"><strong>30 fps</strong><span>Frame-accurate Remotion preview</span></div>
          <button className="button dark" onClick={() => navigate('/editor/signal')}>Create your first reel <ArrowRight size={18} /></button>
        </section>
      </main>
    </div>
  );
}
