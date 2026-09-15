import { Campo, BotonAñadir, BotonBorrar } from '../campos';

export default function EditorMemoriaPareja({ ejercicio, onChange }) {
  const parejas = ejercicio.parejas ?? [];

  function setPareja(i, lado, val) {
    const next = parejas.map((p, idx) => (idx === i ? { ...p, [lado]: val } : p));
    onChange({ ...ejercicio, parejas: next });
  }
  function añadir() {
    onChange({ ...ejercicio, parejas: [...parejas, { a: '', b: '' }] });
  }
  function quitar(i) {
    onChange({ ...ejercicio, parejas: parejas.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-3">
      <Campo label={`Parejas de tarjetas (exactamente 6 — tiene ${parejas.length})`}>
        <div className="space-y-1.5">
          {parejas.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={p.a ?? ''}
                onChange={e => setPareja(i, 'a', e.target.value)}
                placeholder="Tarjeta A"
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
              <span className="text-gray-300">↔</span>
              <input
                value={p.b ?? ''}
                onChange={e => setPareja(i, 'b', e.target.value)}
                placeholder="Tarjeta B"
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
              {parejas.length > 6 && <BotonBorrar onClick={() => quitar(i)} />}
            </div>
          ))}
          {parejas.length < 6 && <BotonAñadir onClick={añadir}>+ Añadir pareja</BotonAñadir>}
        </div>
      </Campo>
    </div>
  );
}
