import { Campo, ListaTextos, BotonAñadir } from '../campos';
import { nuevaCuadriculaVacia } from '../plantillas';

const ABC = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

export default function EditorSopaLetras({ ejercicio, onChange }) {
  function set(campo, val) {
    onChange({ ...ejercicio, [campo]: val });
  }
  const grid = ejercicio.cuadricula ?? nuevaCuadriculaVacia();

  function setCelda(r, c, val) {
    const letra = val.slice(-1).toUpperCase();
    const next = grid.map((fila, ri) => (ri === r ? fila.map((cel, ci) => (ci === c ? letra : cel)) : fila));
    onChange({ ...ejercicio, cuadricula: next });
  }
  function rellenarAleatorio() {
    const next = grid.map(fila => fila.map(cel => cel || ABC[Math.floor(Math.random() * ABC.length)]));
    onChange({ ...ejercicio, cuadricula: next });
  }
  function reiniciar() {
    onChange({ ...ejercicio, cuadricula: nuevaCuadriculaVacia(grid.length || 8) });
  }

  return (
    <div className="space-y-3">
      <Campo label="Palabras a encontrar">
        <ListaTextos items={ejercicio.palabras} onChange={v => set('palabras', v)} min={1} />
      </Campo>
      <Campo label="Cuadrícula (escribe cada palabra letra a letra, en horizontal o vertical; luego rellena los huecos)">
        <div className="inline-block overflow-x-auto max-w-full">
          {grid.map((fila, r) => (
            <div key={r} className="flex">
              {fila.map((cel, c) => (
                <input
                  key={c}
                  value={cel ?? ''}
                  onChange={e => setCelda(r, c, e.target.value)}
                  onFocus={e => e.target.select()}
                  className="w-8 h-8 text-center text-sm font-bold border border-gray-200 focus:outline-none focus:border-blue-400 focus:bg-blue-50 uppercase shrink-0"
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <BotonAñadir onClick={rellenarAleatorio}>🔀 Rellenar huecos vacíos</BotonAñadir>
          <button
            type="button"
            onClick={reiniciar}
            className="text-xs font-semibold text-red-500 hover:bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            Vaciar cuadrícula
          </button>
        </div>
      </Campo>
    </div>
  );
}
