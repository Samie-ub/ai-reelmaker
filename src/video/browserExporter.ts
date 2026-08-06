import type { ReelProject } from '../domain/project';

export type ExportProgress = { frame: number; totalFrames: number };

export interface VideoExporter {
  isSupported(): boolean;
  export(project: ReelProject, onProgress: (progress: ExportProgress) => void, signal: AbortSignal): Promise<Blob>;
}

const FPS = 30;

const drawFrame = (context: CanvasRenderingContext2D, project: ReelProject, frame: number, totalFrames: number) => {
  const isEditorial = project.templateId === 'editorial';
  context.fillStyle = isEditorial ? '#ededeb' : '#0a0a0a';
  context.fillRect(0, 0, 1080, 1920);
  context.textAlign = project.alignment;
  context.textBaseline = 'top';
  const x = project.alignment === 'center' ? 540 : 84;
  const elapsed = frame / FPS;
  const inEase = Math.min(1, elapsed / 0.45);
  const yOffset = 70 * (1 - inEase);
  context.globalAlpha = inEase;
  context.fillStyle = project.accent;
  context.font = '700 26px Arial';
  context.fillText(project.templateId === 'metric' ? 'THE RESULT' : project.templateId === 'editorial' ? 'A SHORT STORY' : 'NEW / NOW', x, 590 + yOffset);
  context.fillStyle = isEditorial ? '#0a0a0a' : '#ffffff';
  context.font = `700 ${project.templateId === 'metric' ? 148 : 104}px Arial`;
  project.title.split('\n').forEach((line, index) => context.fillText(line, x, 660 + yOffset + index * 110));
  context.fillStyle = isEditorial ? '#444444' : '#cccccc';
  context.font = '400 34px Arial';
  context.fillText(project.subtitle, x, 930 + yOffset, 900);
  context.globalAlpha = 1;
  context.fillStyle = project.accent;
  context.fillRect(0, 1910, (frame / totalFrames) * 1080, 10);
};

export class BrowserWebmExporter implements VideoExporter {
  isSupported() {
    return typeof MediaRecorder !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype;
  }

  async export(project: ReelProject, onProgress: (progress: ExportProgress) => void, signal: AbortSignal) {
    if (!this.isSupported()) throw new Error('This browser does not support local video export. Download the project file instead.');
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The video canvas could not be created.');
    const stream = canvas.captureStream(FPS);
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error('No supported WebM codec is available in this browser.');
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);
    const totalFrames = project.duration * FPS;
    const completed = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('The browser encoder stopped unexpectedly.'));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });
    const stop = () => recorder.state !== 'inactive' && recorder.stop();
    signal.addEventListener('abort', stop, { once: true });
    recorder.start(500);
    const startedAt = performance.now();
    for (let frame = 0; frame <= totalFrames; frame += 1) {
      if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
      const target = startedAt + (frame / FPS) * 1000;
      await new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, target - performance.now())));
      drawFrame(context, project, frame, totalFrames);
      onProgress({ frame, totalFrames });
    }
    stop();
    signal.removeEventListener('abort', stop);
    return completed;
  }
}

export const browserExporter = new BrowserWebmExporter();
