// Redistribuye la posición de la respuesta correcta en EleccionMultiple de forma
// determinista (round-robin 0,1,2,3,0,1,2,3...) en vez de confiar en que el LLM
// reparta bien las posiciones por sí solo.
//
// Por qué existe: PROMPT-FICHAS.md le pide a Claude "reparte ~25% en cada posición"
// y se lo hace auto-comprobar dos veces más (FASE 3 y el checklist final). Aun así,
// al auditar las 16 fichas ya publicadas, 15 de 16 incumplían la regla — la respuesta
// se concentraba en la posición 2 hasta en el 88% de los ejercicios de una ficha.
// Pedirle a un LLM que audite una propiedad estadística sobre su propia respuesta larga
// es poco fiable; el reparto determinista por código no puede fallar.
const valorOpcion = (o) => (typeof o === 'string' ? o : o?.texto);

// Redistribuye un único objeto con opciones/respuestaCorrecta (un EleccionMultiple
// de primer nivel, o una subpregunta EleccionMultiple dentro de ComprensionLectora).
// contadorRef es un objeto { n } compartido para que el reparto 0,1,2,3... siga
// una única secuencia a lo largo de toda la ficha, no una por exercise.
function rebalancearUno(objConOpciones, contadorRef) {
  if (!Array.isArray(objConOpciones.opciones) || objConOpciones.opciones.length === 0) {
    return objConOpciones;
  }
  const idxActual = objConOpciones.opciones.findIndex(o => valorOpcion(o) === objConOpciones.respuestaCorrecta);
  if (idxActual === -1) return objConOpciones; // respuesta inválida: que lo detecte validacion.js, no tocar

  const idxObjetivo = contadorRef.n % objConOpciones.opciones.length;
  contadorRef.n++;
  if (idxActual === idxObjetivo) return objConOpciones;

  const opciones = [...objConOpciones.opciones];
  const [correcta] = opciones.splice(idxActual, 1);
  opciones.splice(idxObjetivo, 0, correcta);
  return { ...objConOpciones, opciones };
}

export function rebalancearPosicionesEM(fichas) {
  return fichas.map(ficha => {
    if (!Array.isArray(ficha.ejercicios)) return ficha;

    const contador = { n: 0 };
    const ejercicios = ficha.ejercicios.map(ej => {
      if (ej?.tipo === 'EleccionMultiple') {
        return rebalancearUno(ej, contador);
      }

      // ComprensionLectora anida sus propias subpreguntas EleccionMultiple —
      // antes se quedaban todas en la posición 0 porque este código no bajaba
      // a mirar dentro de `preguntas`.
      if (ej?.tipo === 'ComprensionLectora' && Array.isArray(ej.preguntas)) {
        const preguntas = ej.preguntas.map(p =>
          p?.tipo === 'EleccionMultiple' ? rebalancearUno(p, contador) : p
        );
        return { ...ej, preguntas };
      }

      return ej;
    });

    return { ...ficha, ejercicios };
  });
}
