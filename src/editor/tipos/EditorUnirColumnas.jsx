import { Campo, TextInput, BotonAñadir, BotonBorrar } from '../campos';

export default function EditorUnirColumnas({ ejercicio, onChange }) {
  function set(campo, val) {
    onChange({ ...ejercicio, [campo]: val });
  }
  const parejas = ejercicio.parejas ?? [];

  function setPareja(i, lado, val) {
    const next = parejas.map((p, idx) => (idx === i ? { ...p, [lado]: val } : p));
    onChange({ ...ejercicio, parejas: next });
  }
  function añadir() {
    onChange({ ...ejercicio, parejas: [...parejas, { izquierda: '', derecha: '' }] });
  }
  function quitar(i) {
    onChange({ ...ejercicio, parejas: parejas.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-3">
      <Campo label="Enunciado (opcional)">
        <TextInput value={ejercicio.enunciado} onChange={v => set('enunciado', v || undefined)} />
      </Campo>
      <Campo label={`Parejas (exactamente 4 — tiene ${parejas.length})`}>
        <div className="space-y-1.5">
          {parejas.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={p.izquierda ?? ''}
                onChange={e => setPareja(i, 'izquierda', e.target.value)}
                placeholder="Izquierda"
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
              <span className="text-gray-300">↔</span>
              <input
                value={p.derecha ?? ''}
                onChange={e => setPareja(i, 'derecha', e.target.value)}
                placeholder="Derecha"
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
              {parejas.length > 4 && <BotonBorrar onClick={() => quitar(i)} />}
            </div>
          ))}
          {parejas.length < 4 && <BotonAñadir onClick={añadir}>+ Añadir pareja</BotonAñadir>}
        </div>
      </Campo>
      <Campo label="Pista (opcional)">
        <TextInput value={ejercicio.pista} onChange={v => set('pista', v || undefined)} />
      </Campo>
    </div>
  );
}
