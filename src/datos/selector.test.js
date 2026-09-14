import { describe, it, expect } from 'vitest';
import { calcRecencyScore, calcWeight, weightedShuffle, muestraAleatoria } from './selector';

describe('calcRecencyScore', () => {
  it('devuelve 1 si nunca se ha intentado (sin timestamp)', () => {
    expect(calcRecencyScore(null)).toBe(1);
    expect(calcRecencyScore(undefined)).toBe(1);
  });

  it('es más alto cuanto más reciente es el intento', () => {
    const ahora = Date.now();
    const hace1Dia = ahora - 86400000;
    const hace10Dias = ahora - 86400000 * 10;
    expect(calcRecencyScore(hace1Dia)).toBeGreaterThan(calcRecencyScore(hace10Dias));
  });
});

describe('calcWeight', () => {
  it('da peso 0.5 de acierto base a un ejercicio sin historial (nunca intentado antes)', () => {
    const peso = calcWeight({ id: 'ex-1' }, {});
    // accuracy=0.5 -> (1-0.5)*0.7 + recency(sin log)=1 * 0.3 = 0.65
    expect(peso).toBeCloseTo(0.65, 5);
  });

  it('da más peso a un ejercicio que se falla que a uno que se acierta siempre', () => {
    const ahora = Date.now();
    const logMap = {
      'ex-acertado': [{ correct: true, timestamp: ahora }],
      'ex-fallado':  [{ correct: false, timestamp: ahora }],
    };
    const pesoAcertado = calcWeight({ id: 'ex-acertado' }, logMap);
    const pesoFallado  = calcWeight({ id: 'ex-fallado' }, logMap);
    expect(pesoFallado).toBeGreaterThan(pesoAcertado);
  });
});

describe('muestraAleatoria', () => {
  it('devuelve exactamente n elementos, sin duplicar', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const resultado = muestraAleatoria(items, 2);
    expect(resultado).toHaveLength(2);
    expect(new Set(resultado).size).toBe(2);
    resultado.forEach(x => expect(items).toContain(x));
  });

  it('con muchas repeticiones, todos los elementos tienen alguna posibilidad de salir (no solo los primeros)', () => {
    // Antes del arreglo, un slice(0, n) sin mezclar habría dado SIEMPRE ['a','b'] aquí.
    const items = ['a', 'b', 'c', 'd', 'e'];
    const vistos = new Set();
    for (let i = 0; i < 200; i++) {
      muestraAleatoria(items, 2).forEach(x => vistos.add(x));
    }
    expect(vistos.size).toBe(items.length);
  });

  it('si n es mayor que la lista, devuelve todos los elementos', () => {
    expect(muestraAleatoria(['a', 'b'], 5)).toHaveLength(2);
  });
});

describe('weightedShuffle', () => {
  it('devuelve todos los elementos, sin perder ni duplicar ninguno', () => {
    const items = ['a', 'b', 'c', 'd'];
    const weights = [1, 1, 1, 1];
    const resultado = weightedShuffle(items, weights);
    expect(resultado.sort()).toEqual([...items].sort());
  });

  it('con un solo elemento, lo devuelve tal cual', () => {
    expect(weightedShuffle(['x'], [1])).toEqual(['x']);
  });

  it('con lista vacía, devuelve lista vacía', () => {
    expect(weightedShuffle([], [])).toEqual([]);
  });
});
