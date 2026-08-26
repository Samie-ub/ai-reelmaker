import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { EditorScreen } from './features/editor/EditorScreen';
import { LibraryScreen } from './features/library/LibraryScreen';

type Route = { screen: 'library' } | { screen: 'editor'; templateId: string };

const parseRoute = (): Route => {
  const match = window.location.pathname.match(/^\/editor\/([^/]+)$/);
  return match ? { screen: 'editor', templateId: decodeURIComponent(match[1]) } : { screen: 'library' };
};

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ReelMaker render failure', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="fatal-state">
          <span className="eyebrow">Workspace interrupted</span>
          <h1>Something slipped out of frame.</h1>
          <p>Your locally saved draft is still available. Reload the workspace to recover it.</p>
          <button className="button primary" onClick={() => window.location.reload()}>Reload workspace</button>
        </main>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const [route, setRoute] = useState<Route>(parseRoute);
  useEffect(() => {
    const handleRoute = () => setRoute(parseRoute());
    window.addEventListener('popstate', handleRoute);
    return () => window.removeEventListener('popstate', handleRoute);
  }, []);

  return (
    <ErrorBoundary>
      {route.screen === 'editor' ? <EditorScreen templateId={route.templateId} /> : <LibraryScreen />}
    </ErrorBoundary>
  );
}
