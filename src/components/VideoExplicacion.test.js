import { describe, it, expect } from 'vitest';
import { extraerYoutubeId } from './VideoExplicacion';

describe('extraerYoutubeId', () => {
  it('extrae el id de un enlace youtu.be', () => {
    expect(extraerYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extrae el id de un enlace youtube.com/watch?v=', () => {
    expect(extraerYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe('dQw4w9WgXcQ');
  });

  it('extrae el id de un enlace ya en formato embed', () => {
    expect(extraerYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extrae el id de un enlace youtube.com/shorts/', () => {
    expect(extraerYoutubeId('https://www.youtube.com/shorts/BPvKDfaSZSw')).toBe('BPvKDfaSZSw');
  });

  it('devuelve null para una URL que no es de YouTube', () => {
    expect(extraerYoutubeId('https://vimeo.com/12345')).toBe(null);
  });

  it('devuelve null para una URL inválida', () => {
    expect(extraerYoutubeId('no-es-una-url')).toBe(null);
  });
});
