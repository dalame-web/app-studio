import { Campo, TextArea, TextInput, NumberInput, Select, ListaOpcionesConRespuesta, BotonAñadir, SelectorRespuesta } from '../campos';

export default function EditorProblemaVisual({ ejercicio, onChange }) {
  function set(campo, val) {
    onChange({ ...ejercicio, [campo]: val });
  }
  const esNumerico = !!ejercicio.esNumerico;
  const visual = ejercicio.visual;
  const esBarras = visual?.tipo === 'barras';

  function setVisual(campo, val) {
    onChange({ ...ejercicio, visual: { ...(ejercicio.visual ?? {}), [campo]: val } });
  }
  function quitarVisual() {
    const resto = { ...ejercicio };
    delete resto.visual;
    onChange(resto);
  }
  function añadirVisualEmoji() {
    onChange({ ...ejercicio, visual: { emoji: '🔵', cantidad: 5 } });
  }

  return (
    <div className="space-y-3">
      <Campo label="Enunciado">
        <TextArea value={ejercicio.enunciado} onChange={v => set('enunciado', v)} rows={2} />
      </Campo>

      <Campo label="Tipo de respuesta">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={esNumerico}
            onChange={e => {
              const numerico = e.target.checked;
              // Al cambiar de modo se limpia lo del modo anterior — si no, queda
              // una respuestaCorrecta/opciones invisibles pero exportadas en el JSON.
              onChange(numerico
                ? { ...ejercicio, esNumerico: true, opciones: undefined, respuestaCorrecta: 0 }
                : { ...ejercicio, esNumerico: false, respuestaCorrecta: '', opciones: ['', ''] });
            }}
          />
          El niño escribe un número (en vez de elegir entre opciones)
        </label>
      </Campo>

      {esNumerico ? (
        <Campo label="Respuesta correcta (número)">
          <NumberInput value={ejercicio.respuestaCorrecta} onChange={v => set('respuestaCorrecta', v)} />
        </Campo>
      ) : (
        <>
          <Campo label="Opciones">
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
        </>
      )}

      <Campo label="Dibujo de apoyo (opcional)">
        {!visual && <BotonAñadir onClick={añadirVisualEmoji}>+ Añadir emojis de apoyo</BotonAñadir>}
        {visual && !esBarras && (
          <div className="space-y-2 bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 w-24 shrink-0">Emoji</span>
              <TextInput value={visual.emoji} onChange={v => setVisual('emoji', v)} className="!w-20" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 w-24 shrink-0">Cantidad</span>
              <NumberInput value={visual.cantidad} onChange={v => setVisual('cantidad', v)} className="!w-24" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 w-24 shrink-0">Operación</span>
              <Select
                value={visual.operacion ?? ''}
                onChange={v => setVisual('operacion', v || undefined)}
                options={[{ value: '', label: '(ninguna)' }, { value: 'suma', label: 'suma' }, { value: 'resta', label: 'resta' }]}
                className="!w-32"
              />
            </div>
            {visual.operacion && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 w-24 shrink-0">Cantidad op.</span>
                <NumberInput value={visual.cantidadOperacion} onChange={v => setVisual('cantidadOperacion', v)} className="!w-24" />
              </div>
            )}
            <button
              type="button"
              onClick={quitarVisual}
              className="text-xs font-semibold text-red-500 hover:bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 transition-colors"
            >
              Quitar dibujo
            </button>
          </div>
        )}
        {esBarras && (
          <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-800 space-y-2">
            <p>Este ejercicio usa un gráfico de barras — es un caso poco frecuente, edítalo como JSON:</p>
            <textarea
              key={ejercicio.id}
              defaultValue={JSON.stringify(visual, null, 2)}
              rows={6}
              onBlur={e => {
                try {
                  onChange({ ...ejercicio, visual: JSON.parse(e.target.value) });
                } catch {
                  /* JSON incompleto: se ignora el cambio hasta que sea válido */
                }
              }}
              className="w-full font-mono text-xs border-2 border-amber-200 rounded-xl p-2 bg-white"
            />
          </div>
        )}
      </Campo>

      <Campo label="Pista (opcional)">
        <TextInput value={ejercicio.pista} onChange={v => set('pista', v || undefined)} />
      </Campo>
    </div>
  );
}
