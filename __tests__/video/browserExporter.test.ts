import { BrowserWebmExporter } from '../../src/video/browserExporter';

describe('BrowserWebmExporter', () => {
  it('reports unsupported browser APIs instead of starting a fake export', () => {
    const original = globalThis.MediaRecorder;
    // @ts-expect-error deliberate capability removal
    delete globalThis.MediaRecorder;
    expect(new BrowserWebmExporter().isSupported()).toBe(false);
    globalThis.MediaRecorder = original;
  });
});
