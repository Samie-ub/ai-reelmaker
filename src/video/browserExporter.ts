import { getProjectDuration, type ReelProject } from '../domain/project';
import { ReelComposition } from './ReelComposition';

export type ExportProgress = { frame: number; totalFrames: number };
export interface VideoExporter { isSupported(): boolean; export(project: ReelProject, onProgress: (progress: ExportProgress) => void, signal: AbortSignal): Promise<Blob>; }

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

export class BrowserRemotionExporter implements VideoExporter {
  isSupported() {
    return typeof globalThis.VideoEncoder !== 'undefined' && typeof globalThis.VideoFrame !== 'undefined';
  }

  async export(project: ReelProject, onProgress: (progress: ExportProgress) => void, signal: AbortSignal) {
    if (!this.isSupported()) throw new Error('This browser does not support local MP4 rendering. Download the project file instead.');

    try {
      const { canRenderMediaOnWeb, renderMediaOnWeb } = await import('@remotion/web-renderer');
      const capability = await canRenderMediaOnWeb({
        container: 'mp4', videoCodec: 'h264', width: WIDTH, height: HEIGHT, muted: true, videoBitrate: 'high',
      });
      if (!capability.canRender) {
        const reason = capability.issues.find((issue) => issue.severity === 'error')?.message;
        throw new Error(reason ?? 'This browser cannot render an H.264 MP4. Download the project file instead.');
      }

      const totalFrames = getProjectDuration(project) * FPS;
      const { getBlob } = await renderMediaOnWeb({
        composition: {
          id: 'reelmaker-project', component: ReelComposition, defaultProps: { project }, durationInFrames: totalFrames, fps: FPS, width: WIDTH, height: HEIGHT,
        },
        inputProps: { project },
        container: 'mp4',
        videoCodec: 'h264',
        muted: true,
        videoBitrate: 'high',
        hardwareAcceleration: 'no-preference',
        pageResponsiveness: 'high',
        signal,
        onProgress: ({ encodedFrames, progress }) => onProgress({
          frame: Math.min(totalFrames, Math.max(encodedFrames, Math.round(progress * totalFrames))), totalFrames,
        }),
        logLevel: 'warn',
      });
      onProgress({ frame: totalFrames, totalFrames });
      return await getBlob();
    } catch (error) {
      if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
      throw error;
    }
  }
}

export const browserExporter = new BrowserRemotionExporter();
