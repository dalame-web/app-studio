import { Campo, TextArea, TextInput, BotonAñadir, BotonBorrar } from '../campos';

function contarHuecos(frase) {
  return (String(frase ?? '').match(/\[___\]/g) ?? []).length;
}

export default function EditorArrastrarPalabras({ ejercicio, onChange }) {
  function set(campo, val) {
    onChange({ ...ejercicio, [campo]: val });
  }
  const huecos = contarHuecos(ejercicio.fraseConHuecos);
  // Siempre del mismo tamaño que los huecos detectados — evita arrays con agujeros
  // (null de más) si se borran huecos de la frase sin recortar las respuestas.
  const respuestas = Array.from({ length: huecos }, (_, i) => (ejercicio.respuestasCorrectas ?? [])[i] ?? '');
  const banco = ejercicio.banco ?? [];

  function setRespuesta(i, val) {
    const next = [...respuestas];
    next[i] = val;
    onChange({ ...ejercicio, respuestasCorrectas: next });
  }
  function setPalabraBanco(i, val) {
    const viejo = banco[i];
    const nuevoBanco = banco.map((b, idx) => (idx === i ? val : b));
    const nuevasRespuestas = respuestas.map(r => (r === viejo ? val : r));
    onChange({ ...ejercicio, banco: nuevoBanco, respuestasCorrectas: nuevasRespuestas });
  }
  function quitarPalabraBanco(i) {
    const quitada = banco[i];
    const nuevoBanco = banco.filter((_, idx) => idx !== i);
    const nuevasRespuestas = respuestas.map(r => (r === quitada ? '' : r));
    onChange({ ...ejercicio, banco: nuevoBanco, respuestasCorrectas: nuevasRespuestas });
  }

  return (
    <div className="space-y-3">
      <Campo label="Frase con huecos (usa [___] para cada hueco)">
        <TextArea value={ejercicio.fraseConHuecos} onChange={v => set('fraseConHuecos', v)} rows={2} />
        <button
          type="button"
          onClick={() => set('fraseConHuecos', `${ejercicio.fraseConHuecos ?? ''} [___]`.trim())}
          className="mt-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 transition-colors"
        >
          + Añadir hueco [___]
        </button>
      </Campo>
      <Campo label="Banco de palabras (las que se pueden arrastrar, incluye distractores)">
        <div className="space-y-1.5">
          {banco.map((b, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={b ?? ''}
                onChange={e => setPalabraBanco(i, e.target.value)}
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
              {banco.length > huecos && <BotonBorrar onClick={() => quitarPalabraBanco(i)} />}
            </div>
          ))}
          <BotonAñadir onClick={() => set('banco', [...banco, ''])}>+ Añadir palabra</BotonAñadir>
        </div>
      </Campo>
      <Campo label={`Respuesta correcta de cada hueco (${huecos} hueco${huecos === 1 ? '' : 's'} detectado${huecos === 1 ? '' : 's'})`}>
        <div className="space-y-1.5">
          {Array.from({ length: huecos }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-16 shrink-0">Hueco {i + 1}</span>
              <select
                value={respuestas[i] ?? ''}
                onChange={e => setRespuesta(i, e.target.value)}
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 bg-white"
              >
                <option value="">— elige del banco —</option>
                {banco.map((b, bi) => <option key={bi} value={b}>{b}</option>)}
              </select>
            </div>
          ))}
          {huecos === 0 && <p className="text-xs text-gray-400">Añade un hueco [___] en la frase primero.</p>}
        </div>
      </Campo>
      <Campo label="Pista (opcional)">
        <TextInput value={ejercicio.pista} onChange={v => set('pista', v || undefined)} />
      </Campo>
    </div>
  );
}
