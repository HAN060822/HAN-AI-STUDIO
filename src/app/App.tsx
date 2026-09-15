import { baseline } from '../core/baseline';

export function App() {
  return <main><section aria-labelledby="page-title"><p className="eyebrow">Local-first multi-agent workspace</p><h1 id="page-title">HAN's AI STUDIO</h1><p>{baseline.message}</p><dl><div><dt>Current stage</dt><dd>{baseline.stage}</dd></div><div><dt>Status</dt><dd>{baseline.status}</dd></div></dl></section></main>;
}
