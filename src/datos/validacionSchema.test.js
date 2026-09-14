import { describe, it, expect } from 'vitest';
import { validarConSchema } from './validacionSchema';

function ficha(ejercicio) {
  return { id: 'mat-999', ejercicios: [ejercicio] };
}

describe('validarConSchema', () => {
  it('no da errores para un EleccionMultiple bien formado', () => {
    const r = validarConSchema(ficha({
      id: 'e1', fichaId: 'mat-999', subject: 'matematicas', tipo: 'EleccionMultiple', nivel: 1,
      enunciado: '¿Cuánto es 2+2?',
      opciones: [{ texto: '3' }, { texto: '4' }],
      respuestaCorrecta: '4',
    }));
    expect(r.errores).toEqual([]);
  });

  it('detecta campo obligatorio ausente (MemoriaPareja sin "parejas")', () => {
    const r = validarConSchema(ficha({
      id: 'e1', fichaId: 'mat-999', subject: 'matematicas', tipo: 'MemoriaPareja', nivel: 3,
    }));
    expect(r.errores.length).toBeGreaterThan(0);
    expect(r.errores[0]).toContain('[schema]');
  });

  it('detecta longitud fija incorrecta (UnirColumnas con 2 parejas en vez de 4)', () => {
    const r = validarConSchema(ficha({
      id: 'e1', fichaId: 'mat-999', subject: 'matematicas', tipo: 'UnirColumnas', nivel: 2,
      parejas: [{ izquierda: 'a', derecha: '1' }, { izquierda: 'b', derecha: '2' }],
    }));
    expect(r.errores.some(e => e.includes('fewer than 4 items'))).toBe(true);
  });

  it('ignora ejercicios de tipo desconocido (ya los detecta validacion.js)', () => {
    const r = validarConSchema(ficha({ id: 'e1', fichaId: 'mat-999', tipo: 'TipoInventado' }));
    expect(r.errores).toEqual([]);
  });
});
