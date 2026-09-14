import { describe, it, expect } from 'vitest';
import { rebalancearPosicionesEM } from './rebalanceo';

function em(id, respuestaCorrecta) {
  return {
    id, tipo: 'EleccionMultiple',
    opciones: [{ texto: 'a' }, { texto: 'b' }, { texto: 'c' }, { texto: 'd' }],
    respuestaCorrecta,
  };
}

describe('rebalancearPosicionesEM', () => {
  it('reparte las posiciones en round-robin 0,1,2,3,0,1,2,3...', () => {
    // Las 8 respuestas correctas empiezan todas en "a" (posición 0) — el sesgo real que se encontró.
    const ficha = {
      id: 'f1',
      ejercicios: Array.from({ length: 8 }, (_, i) => em(`e${i}`, 'a')),
    };
    const [resultado] = rebalancearPosicionesEM([ficha]);
    const posiciones = resultado.ejercicios.map(ej =>
      ej.opciones.findIndex(o => o.texto === ej.respuestaCorrecta)
    );
    expect(posiciones).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
  });

  it('no toca los ejercicios que no son EleccionMultiple', () => {
    const ficha = { id: 'f1', ejercicios: [{ id: 'e1', tipo: 'RellenarHueco', respuestaCorrecta: 'x' }] };
    const [resultado] = rebalancearPosicionesEM([ficha]);
    expect(resultado.ejercicios[0]).toEqual(ficha.ejercicios[0]);
  });

  it('conserva el mismo conjunto de opciones, solo cambia el orden', () => {
    const ficha = { id: 'f1', ejercicios: [em('e1', 'a'), em('e2', 'a')] };
    const [resultado] = rebalancearPosicionesEM([ficha]);
    for (const ej of resultado.ejercicios) {
      expect(ej.opciones.map(o => o.texto).sort()).toEqual(['a', 'b', 'c', 'd']);
      expect(ej.opciones.find(o => o.texto === ej.respuestaCorrecta)).toBeDefined();
    }
  });

  it('deja pasar sin tocar un ejercicio con respuestaCorrecta que no está en las opciones', () => {
    const ficha = { id: 'f1', ejercicios: [em('e1', 'no-existe')] };
    const [resultado] = rebalancearPosicionesEM([ficha]);
    expect(resultado.ejercicios[0].opciones).toEqual(ficha.ejercicios[0].opciones);
  });

  it('también reparte las subpreguntas EleccionMultiple dentro de ComprensionLectora', () => {
    // Las opciones aquí son strings planos, no {texto}, como exige el schema de subpreguntas.
    const subpregunta = (respuestaCorrecta) => ({
      tipo: 'EleccionMultiple', opciones: ['a', 'b', 'c', 'd'], respuestaCorrecta,
    });
    const ficha = {
      id: 'f1',
      ejercicios: [
        em('e1', 'a'), // EleccionMultiple normal, cuenta primero
        {
          id: 'e2', tipo: 'ComprensionLectora',
          preguntas: [
            subpregunta('a'),
            { tipo: 'RellenarHueco', respuestaCorrecta: 'x' }, // no debe tocarse
            subpregunta('a'),
          ],
        },
        em('e3', 'a'),
      ],
    };
    const [resultado] = rebalancearPosicionesEM([ficha]);
    const [top1, comp, top2] = resultado.ejercicios;
    expect(top1.opciones.findIndex(o => o.texto === top1.respuestaCorrecta)).toBe(0);
    expect(comp.preguntas[0].opciones.indexOf(comp.preguntas[0].respuestaCorrecta)).toBe(1);
    expect(comp.preguntas[1]).toEqual({ tipo: 'RellenarHueco', respuestaCorrecta: 'x' });
    expect(comp.preguntas[2].opciones.indexOf(comp.preguntas[2].respuestaCorrecta)).toBe(2);
    expect(top2.opciones.findIndex(o => o.texto === top2.respuestaCorrecta)).toBe(3);
  });
});
