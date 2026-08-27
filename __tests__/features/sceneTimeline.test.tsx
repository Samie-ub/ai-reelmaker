import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { ReelScene } from '../../src/domain/project';
import { SceneTimeline } from '../../src/features/editor/SceneTimeline';

const scenes: ReelScene[] = [
  { id: 'one', title: 'Opening beat', subtitle: '', accent: '#faff69', background: '#0a0a0a', alignment: 'left', duration: 4, animation: 'rise' },
  { id: 'two', title: 'Closing beat', subtitle: '', accent: '#3b82f6', background: '#172554', alignment: 'center', duration: 2, animation: 'fade' },
];

const renderTimeline = () => {
  const handlers = { onSelect: vi.fn(), onSeek: vi.fn(), onReorder: vi.fn(), onDurationChange: vi.fn() };
  const result = render(<SceneTimeline scenes={scenes} selectedSceneId="one" frame={0} {...handlers} />);
  const track = result.container.querySelector('.timeline-scenes') as HTMLDivElement;
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 58, width: 600, height: 58, toJSON: () => ({}) });
  return { ...handlers, ...result };
};

describe('scene timeline', () => {
  beforeAll(() => {
    if (!window.PointerEvent) window.PointerEvent = MouseEvent as typeof PointerEvent;
  });

  it('seeks to the precise clicked frame instead of the scene start', () => {
    const { onSeek, onSelect } = renderTimeline();
    fireEvent.click(screen.getByRole('listitem', { name: /Scene 1: Opening beat/ }), { clientX: 300 });

    expect(onSelect).toHaveBeenCalledWith('one');
    expect(onSeek).toHaveBeenCalledWith(90);
  });

  it('steps the playhead one frame from the keyboard', () => {
    const { onSeek } = renderTimeline();
    fireEvent.keyDown(screen.getByRole('slider', { name: /Timeline playhead/ }), { key: 'ArrowRight' });
    expect(onSeek).toHaveBeenCalledWith(1);
  });

  it('reorders scenes through drag and drop', () => {
    const { onReorder } = renderTimeline();
    const source = screen.getByRole('listitem', { name: /Scene 1: Opening beat/ });
    const target = screen.getByRole('listitem', { name: /Scene 2: Closing beat/ });
    const data = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: 'none', dropEffect: 'none',
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? '',
    };

    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(onReorder).toHaveBeenCalledWith('one', 'two');
  });

  it('accepts an exact duration from the inline scene control', async () => {
    const user = userEvent.setup();
    const { onDurationChange } = renderTimeline();
    const input = screen.getByRole('spinbutton', { name: /Opening beat duration/ });

    await user.clear(input);
    await user.type(input, '7');
    await user.tab();

    expect(onDurationChange).toHaveBeenCalledWith('one', 7);
  });

  it('resizes a scene from its right edge', () => {
    const { onDurationChange } = renderTimeline();
    const handle = screen.getByRole('button', { name: 'Resize scene 1' });
    Object.assign(handle, { setPointerCapture: vi.fn(), hasPointerCapture: vi.fn(() => true), releasePointerCapture: vi.fn() });

    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 0 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 150 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 150 });

    expect(onDurationChange).toHaveBeenCalledWith('one', 6);
  });
});
