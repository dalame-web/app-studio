import { describe, it, expect } from 'vitest';
import { validarFicha, validarImportacion } from './validacion';

function fichaBase(overrides = {}) {
  return {
    id: 'mat-999',
    subject: 'matematicas',
    titulo: 'Ficha de prueba',
    nivel: 1,
    curso: 4,
    contenido: 'Contenido de prueba con al menos algo de texto.',
    ejercicios: [
      {
        id: 'mat-999-ex-001',
        fichaId: 'mat-999',
        subject: 'matematicas',
        tipo: 'EleccionMultiple',
        nivel: 1,
        enunciado: '¿Cuánto es 2+2?',
        opciones: [{ texto: '3' }, { texto: '4' }, { texto: '5' }, { texto: '6' }],
        respuestaCorrecta: '4',
      },
    ],
    ...overrides,
  };
}

describe('validarFicha', () => {
  it('acepta una ficha mínima válida', () => {
    const r = validarFicha(fichaBase());
    expect(r.valida).toBe(true);
    expect(r.errores).toEqual([]);
  });

  it('rechaza ficha sin id/subject/titulo/nivel', () => {
    const r = validarFicha({ ejercicios: [] });
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('"id"'))).toBe(true);
    expect(r.errores.some(e => e.includes('"subject"'))).toBe(true);
    expect(r.errores.some(e => e.includes('"titulo"'))).toBe(true);
  });

  it('rechaza subject no válido', () => {
    const r = validarFicha(fichaBase({ subject: 'gimnasia' }));
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('subject'))).toBe(true);
  });

  it('rechaza ficha sin ejercicios', () => {
    const r = validarFicha(fichaBase({ ejercicios: [] }));
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('ejercicios'))).toBe(true);
  });

  it('detecta IDs de ejercicio duplicados dentro de la ficha', () => {
    const ej = fichaBase().ejercicios[0];
    const r = validarFicha(fichaBase({ ejercicios: [ej, { ...ej }] }));
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('duplicado'))).toBe(true);
  });
});

describe('validarFicha — EleccionMultiple', () => {
  it('rechaza respuestaCorrecta que no está en las opciones', () => {
    const ficha = fichaBase();
    ficha.ejercicios[0].respuestaCorrecta = '7';
    const r = validarFicha(ficha);
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('no está en las opciones'))).toBe(true);
  });

  it('rechaza opciones duplicadas', () => {
    const ficha = fichaBase();
    ficha.ejercicios[0].opciones = [{ texto: '4' }, { texto: '4' }, { texto: '5' }, { texto: '6' }];
    const r = validarFicha(ficha);
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('duplicadas'))).toBe(true);
  });

  it('rechaza emoji spoiler en una opción', () => {
    const ficha = fichaBase();
    ficha.ejercicios[0].opciones[1] = { texto: '4', emoji: '✅' };
    const r = validarFicha(ficha);
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('delata la respuesta'))).toBe(true);
  });
});

describe('validarFicha — RellenarHueco', () => {
  it('exige "[___]" en el enunciado', () => {
    const ficha = fichaBase({
      ejercicios: [{
        id: 'mat-999-ex-002', fichaId: 'mat-999', subject: 'matematicas',
        tipo: 'RellenarHueco', nivel: 1,
        enunciado: 'Sin hueco aquí', respuestaCorrecta: 'algo',
      }],
    });
    const r = validarFicha(ficha);
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('[___]'))).toBe(true);
  });
});

describe('validarFicha — ArrastrarPalabras', () => {
  it('exige que nº de huecos coincida con nº de respuestas', () => {
    const ficha = fichaBase({
      ejercicios: [{
        id: 'mat-999-ex-003', fichaId: 'mat-999', subject: 'matematicas',
        tipo: 'ArrastrarPalabras', nivel: 2,
        fraseConHuecos: '[___] casa.',
        banco: ['Esta', 'Aquella', 'Esa'],
        respuestasCorrectas: ['Esta', 'Aquella'],
      }],
    });
    const r = validarFicha(ficha);
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('huecos'))).toBe(true);
  });
});

describe('validarFicha — UnirColumnas', () => {
  it('exige exactamente 4 parejas', () => {
    const ficha = fichaBase({
      ejercicios: [{
        id: 'mat-999-ex-004', fichaId: 'mat-999', subject: 'matematicas',
        tipo: 'UnirColumnas', nivel: 2,
        parejas: [{ izquierda: 'a', derecha: '1' }, { izquierda: 'b', derecha: '2' }],
      }],
    });
    const r = validarFicha(ficha);
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('EXACTAMENTE 4 parejas'))).toBe(true);
  });
});

describe('validarFicha — CompletarSerie', () => {
  it('exige exactamente 1 null en la serie', () => {
    const ficha = fichaBase({
      ejercicios: [{
        id: 'mat-999-ex-005', fichaId: 'mat-999', subject: 'matematicas',
        tipo: 'CompletarSerie', nivel: 1,
        serie: ['1', '2', '3'], opciones: ['4', '5'], respuestaCorrecta: '4',
      }],
    });
    const r = validarFicha(ficha);
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('null'))).toBe(true);
  });
});

describe('validarFicha — SopaLetras', () => {
  it('rechaza cuadrícula que no es 8x8', () => {
    const ficha = fichaBase({
      ejercicios: [{
        id: 'mat-999-ex-006', fichaId: 'mat-999', subject: 'matematicas',
        tipo: 'SopaLetras', nivel: 3,
        palabras: ['SOL'], cuadricula: [['S', 'O', 'L']],
      }],
    });
    const r = validarFicha(ficha);
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('8 filas'))).toBe(true);
  });

  it('rechaza si una palabra no aparece en la cuadrícula', () => {
    const fila = Array(8).fill('X');
    const grid = Array.from({ length: 8 }, () => [...fila]);
    const ficha = fichaBase({
      ejercicios: [{
        id: 'mat-999-ex-006', fichaId: 'mat-999', subject: 'matematicas',
        tipo: 'SopaLetras', nivel: 3,
        palabras: ['SOL'], cuadricula: grid,
      }],
    });
    const r = validarFicha(ficha);
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('no aparece en la cuadrícula'))).toBe(true);
  });
});

describe('validarFicha — MemoriaPareja', () => {
  it('exige exactamente 6 parejas', () => {
    const ficha = fichaBase({
      ejercicios: [{
        id: 'mat-999-ex-007', fichaId: 'mat-999', subject: 'matematicas',
        tipo: 'MemoriaPareja', nivel: 3,
        parejas: [{ a: '1', b: '2' }],
      }],
    });
    const r = validarFicha(ficha);
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('EXACTAMENTE 6 parejas'))).toBe(true);
  });
});

describe('validarImportacion', () => {
  it('acepta un array de fichas válidas', () => {
    const r = validarImportacion([fichaBase()], 'matematicas');
    expect(r.valida).toBe(true);
    expect(r.stats.numFichas).toBe(1);
  });

  it('acepta una ficha suelta (objeto con id+ejercicios)', () => {
    const r = validarImportacion(fichaBase(), 'matematicas');
    expect(r.valida).toBe(true);
  });

  it('rechaza formato no reconocido', () => {
    const r = validarImportacion({ algo: 'raro' }, 'matematicas');
    expect(r.valida).toBe(false);
  });

  it('detecta subject distinto al esperado', () => {
    const r = validarImportacion([fichaBase({ subject: 'lengua' })], 'matematicas');
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('se está importando en'))).toBe(true);
  });

  it('detecta IDs de ficha duplicados en el mismo bloque', () => {
    const ficha = fichaBase();
    const r = validarImportacion([ficha, { ...ficha }], 'matematicas');
    expect(r.valida).toBe(false);
    expect(r.errores.some(e => e.includes('ID de ficha duplicado'))).toBe(true);
  });
});
