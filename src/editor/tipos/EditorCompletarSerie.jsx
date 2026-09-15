import { Campo, TextInput, ListaOpcionesConRespuesta, BotonAñadir, SelectorRespuesta, mantenerTipo } from '../campos';

export default function EditorCompletarSerie({ ejercicio, onChange }) {
  function set(campo, val) {
    onChange({ ...ejercicio, [campo]: val });
  }
  const serie = ejercicio.serie ?? [];

  function setCelda(i, val) {
    const next = [...serie];
    next[i] = mantenerTipo(serie[i], val);
    onChange({ ...ejercicio, serie: next });
  }
  function marcarHueco(i) {
    const next = serie.map((v, idx) => (idx === i ? null : v));
    onChange({ ...ejercicio, serie: next });
  }
  function añadirCelda() {
    onChange({ ...ejercicio, serie: [...serie, ''] });
  }
  function quitarCelda(i) {
    onChange({ ...ejercicio, serie: serie.filter((_, idx) => idx !== i) });
  }

  const tieneHueco = serie.some(v => v === null);

  return (
    <div className="space-y-3">
      <Campo label="Serie (toca 'hueco' en la casilla que debe adivinar el niño — solo puede haber una)">
        <div className="flex flex-wrap gap-2 items-end">
          {serie.map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              {v === null ? (
                <div className="w-14 h-10 flex items-center justify-center rounded-xl border-2 border-dashed border-blue-400 bg-blue-50 text-blue-400 font-bold">?</div>
              ) : (
                <input
                  value={v ?? ''}
                  onChange={e => setCelda(i, e.target.value)}
                  className="w-14 h-10 text-center border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                />
              )}
              <div className="flex gap-1">
                {v !== null && !tieneHueco && (
                  <button type="button" onClick={() => marcarHueco(i)} className="text-[10px] text-blue-600 hover:underline">hueco</button>
                )}
                <button type="button" onClick={() => quitarCelda(i)} className="text-[10px] text-red-400 hover:underline">quitar</button>
              </div>
            </div>
          ))}
          <BotonAñadir onClick={añadirCelda}>+</BotonAñadir>
        </div>
      </Campo>
      <Campo label="Opciones para el hueco">
        <ListaOpcionesConRespuesta
          items={ejercicio.opciones}
          respuesta={ejercicio.respuestaCorrecta}
          onChangeItems={v => set('opciones', v)}
          onChangeRespuesta={v => set('respuestaCorrecta', v)}
          min={2}
        />
      </Campo>
      <Campo label="Respuesta correcta">
        <SelectorRespuesta opciones={ejercicio.opciones ?? []} valor={ejercicio.respuestaCorrecta} onChange={v => set('respuestaCorrecta', v)} getValor={o => o} />
      </Campo>
      <Campo label="Pista (opcional)">
        <TextInput value={ejercicio.pista} onChange={v => set('pista', v || undefined)} />
      </Campo>
    </div>
  );
}
