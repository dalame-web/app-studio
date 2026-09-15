import { Campo, TextArea, TextInput, Select, ListaOpcionesConRespuesta, BotonAñadir, BotonBorrar, SelectorRespuesta } from '../campos';
import { nuevaPreguntaLectora } from '../plantillas';

function cambiarTipoPregunta(p, tipo) {
  if (tipo === p.tipo) return p;
  return tipo === 'EleccionMultiple'
    ? { tipo, enunciado: p.enunciado ?? '', opciones: ['', ''], respuestaCorrecta: '' }
    : { tipo: 'RellenarHueco', enunciado: p.enunciado?.includes('[___]') ? p.enunciado : `${p.enunciado ?? ''} [___]`.trim(), respuestaCorrecta: '' };
}

export default function EditorComprensionLectora({ ejercicio, onChange }) {
  function set(campo, val) {
    onChange({ ...ejercicio, [campo]: val });
  }
  const preguntas = ejercicio.preguntas ?? [];

  function setPregunta(i, nuevaP) {
    const next = preguntas.map((p, idx) => (idx === i ? nuevaP : p));
    onChange({ ...ejercicio, preguntas: next });
  }
  function añadirPregunta() {
    onChange({ ...ejercicio, preguntas: [...preguntas, nuevaPreguntaLectora()] });
  }
  function quitarPregunta(i) {
    onChange({ ...ejercicio, preguntas: preguntas.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-3">
      <Campo label="Texto de lectura">
        <TextArea value={ejercicio.texto} onChange={v => set('texto', v)} rows={5} />
      </Campo>
      <Campo label={`Preguntas (${preguntas.length}, mínimo 2)`}>
        <div className="space-y-3">
          {preguntas.map((p, i) => (
            <div key={i} className="border-2 border-gray-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Select
                  value={p.tipo}
                  onChange={v => setPregunta(i, cambiarTipoPregunta(p, v))}
                  options={[{ value: 'EleccionMultiple', label: 'Elección múltiple' }, { value: 'RellenarHueco', label: 'Rellenar hueco' }]}
                  className="!w-44"
                />
                <BotonBorrar onClick={() => quitarPregunta(i)} />
              </div>
              <TextArea value={p.enunciado} onChange={v => setPregunta(i, { ...p, enunciado: v })} rows={2} placeholder="Enunciado de la pregunta" />
              {p.tipo === 'EleccionMultiple' ? (
                <>
                  <ListaOpcionesConRespuesta
                    items={p.opciones}
                    respuesta={p.respuestaCorrecta}
                    onChangeItems={v => setPregunta(i, { ...p, opciones: v })}
                    onChangeRespuesta={v => setPregunta(i, { ...p, respuestaCorrecta: v })}
                    min={2}
                  />
                  <SelectorRespuesta opciones={p.opciones ?? []} valor={p.respuestaCorrecta} onChange={v => setPregunta(i, { ...p, respuestaCorrecta: v })} />
                </>
              ) : (
                <TextInput value={p.respuestaCorrecta} onChange={v => setPregunta(i, { ...p, respuestaCorrecta: v })} placeholder="Respuesta correcta" />
              )}
            </div>
          ))}
          <BotonAñadir onClick={añadirPregunta}>+ Añadir pregunta</BotonAñadir>
        </div>
      </Campo>
    </div>
  );
}
