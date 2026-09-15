// Plantillas en blanco para "+ Añadir ejercicio" en el editor visual.
export function nuevaCuadriculaVacia(n = 8) {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => ''));
}

export function nuevaPreguntaLectora(tipo = 'EleccionMultiple') {
  return tipo === 'EleccionMultiple'
    ? { tipo, enunciado: '', opciones: ['', ''], respuestaCorrecta: '' }
    : { tipo: 'RellenarHueco', enunciado: '[___]', respuestaCorrecta: '' };
}

export function nuevoEjercicio(tipo, ficha, indice) {
  const base = {
    id: `${ficha.id || 'nueva'}-ex-${String(indice + 1).padStart(3, '0')}`,
    fichaId: ficha.id,
    subject: ficha.subject,
    tipo,
    nivel: 1,
    tiempoEstimado: 30,
  };
  switch (tipo) {
    case 'EleccionMultiple':
      return { ...base, enunciado: '', opciones: ['', '', '', ''], respuestaCorrecta: '' };
    case 'RellenarHueco':
      return { ...base, enunciado: '[___]', respuestaCorrecta: '' };
    case 'ArrastrarPalabras':
      return { ...base, fraseConHuecos: '[___]', banco: [''], respuestasCorrectas: [''] };
    case 'OrdenarFrase':
      return { ...base, palabrasDesordenadas: ['', '', ''], fraseCorrecta: '' };
    case 'UnirColumnas':
      return {
        ...base,
        parejas: Array.from({ length: 4 }, () => ({ izquierda: '', derecha: '' })),
      };
    case 'ClasificarGrupos':
      return {
        ...base,
        grupos: [{ id: 'g1', nombre: '' }, { id: 'g2', nombre: '' }],
        items: [],
      };
    case 'CompletarSerie':
      return { ...base, serie: ['', '', null, ''], opciones: ['', ''], respuestaCorrecta: '' };
    case 'SopaLetras':
      return { ...base, palabras: [''], cuadricula: nuevaCuadriculaVacia() };
    case 'MemoriaPareja':
      return { ...base, parejas: Array.from({ length: 6 }, () => ({ a: '', b: '' })) };
    case 'ProblemaVisual':
      return { ...base, enunciado: '', esNumerico: true, respuestaCorrecta: 0 };
    case 'ComprensionLectora':
      return { ...base, texto: '', preguntas: [nuevaPreguntaLectora(), nuevaPreguntaLectora()] };
    default:
      return base;
  }
}
