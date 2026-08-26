import { vi } from 'vitest';

const renderer = vi.hoisted(() => ({
  canRenderMediaOnWeb: vi.fn(),
  renderMediaOnWeb: vi.fn(),
}));

vi.mock('@remotion/web-renderer', () => renderer);

import { createProject, templates } from '../../src/domain/project';
import { BrowserRemotionExporter } from '../../src/video/browserExporter';
import { ReelComposition } from '../../src/video/ReelComposition';

describe('BrowserRemotionExporter', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports unsupported browser APIs instead of starting a fake export', () => {
    const original = globalThis.VideoEncoder;
    // @ts-expect-error deliberate capability removal
    delete globalThis.VideoEncoder;
    expect(new BrowserRemotionExporter().isSupported()).toBe(false);
    globalThis.VideoEncoder = original;
  });

  it('renders the exact preview composition as an H.264 MP4', async () => {
    vi.stubGlobal('VideoEncoder', class VideoEncoder {});
    vi.stubGlobal('VideoFrame', class VideoFrame {});
    renderer.canRenderMediaOnWeb.mockResolvedValue({ canRender: true, issues: [] });
    const output = new Blob(['video'], { type: 'video/mp4' });
    renderer.renderMediaOnWeb.mockResolvedValue({ getBlob: async () => output });
    const project = createProject(templates[0], 1);
    const onProgress = vi.fn();

    await expect(new BrowserRemotionExporter().export(project, onProgress, new AbortController().signal)).resolves.toBe(output);
    expect(renderer.renderMediaOnWeb).toHaveBeenCalledWith(expect.objectContaining({
      composition: expect.objectContaining({ component: ReelComposition, defaultProps: { project } }),
      inputProps: { project }, container: 'mp4', videoCodec: 'h264',
    }));
    expect(onProgress).toHaveBeenLastCalledWith({ frame: project.scenes[0].duration * 30, totalFrames: project.scenes[0].duration * 30 });
  });
});
