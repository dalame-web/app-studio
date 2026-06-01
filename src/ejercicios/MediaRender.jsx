/**
 * MediaRender — renderiza imagen (ruta public/img/) o SVG inline en ejercicios.
 * Usado en el enunciado y en las opciones de todos los tipos de ejercicio.
 */

const BASE_URL = import.meta.env.BASE_URL;

/** Imagen o SVG en el enunciado */
export default function MediaRender({ imagen, svg, className = '' }) {
  if (svg) {
    return (
      <div
        className={`flex justify-center my-2 [&_svg]:max-w-full [&_svg]:max-h-48 ${className}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }
  if (imagen) {
    const src = imagen.startsWith('http') ? imagen : `${BASE_URL}${imagen}`;
    return (
      <img
        src={src}
        alt=""
        className={`max-h-48 mx-auto rounded-xl object-contain my-2 ${className}`}
      />
    );
  }
  return null;
}

/**
 * Renderiza una opción que puede ser:
 *   - string: "Mamífero"
 *   - objeto: { texto, imagen?, svg? }
 */
export function OpcionMedia({ op, className = '' }) {
  if (typeof op === 'string') return <span className={className}>{op}</span>;
  const { texto, imagen, svg } = op;
  const src = imagen
    ? (imagen.startsWith('http') ? imagen : `${BASE_URL}${imagen}`)
    : null;
  return (
    <span className={`flex flex-col items-center gap-1 ${className}`}>
      {svg && (
        <span
          className="[&_svg]:max-h-16 [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      {src && (
        <img src={src} alt={texto ?? ''} className="max-h-16 max-w-full object-contain" />
      )}
      {texto && <span>{texto}</span>}
    </span>
  );
}

/** Extrae el valor string de una opción (para comparar con respuestaCorrecta) */
export function getValorOpcion(op) {
  if (typeof op === 'string') return op;
  return op.texto ?? op.imagen ?? '';
}
