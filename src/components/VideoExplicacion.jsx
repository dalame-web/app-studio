// Vídeo explicativo opcional por ficha (p.ej. generado con NotebookLM y subido a
// YouTube como "no listado"). Si es un enlace de YouTube reconocible se incrusta
// con youtube-nocookie.com, con los vídeos relacionados/tarjetas/subtítulos
// automáticos/pantalla completa desactivados por parámetros — solo queda
// reproducir/pausar; si no, enlace simple.
//
// Lo que el iframe de YouTube NO permite desactivar por parámetro (política de
// la plataforma, no una limitación de este código): el título/canal que
// aparece un instante al cargar o pausar, el icono "i" de aviso de contenido
// generado por IA, y los anuncios del propio vídeo (esto último se configura
// en YouTube Studio → Monetización, si el canal los tiene activados).
export function extraerYoutubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null;
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1] || null;
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/shorts/')[1] || null;
    }
  } catch {
    return null;
  }
  return null;
}

export default function VideoExplicacion({ url }) {
  if (!url) return null;
  const videoId = extraerYoutubeId(url);

  if (!videoId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 hover:bg-red-100 border-2 border-red-200 text-red-700 font-bold rounded-2xl transition-colors my-4"
      >
        🎬 Ver explicación en vídeo
      </a>
    );
  }

  return (
    <div className="my-4">
      <p className="text-sm font-semibold text-gray-500 mb-2">🎬 Explicación en vídeo</p>
      <div className="relative w-full rounded-2xl overflow-hidden shadow-md" style={{ paddingTop: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&cc_load_policy=0`}
          title="Vídeo explicación"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    </div>
  );
}
