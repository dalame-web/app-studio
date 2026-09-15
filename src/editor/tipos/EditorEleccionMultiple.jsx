import { Campo, TextArea, TextInput, BotonAñadir, BotonBorrar, SelectorRespuesta, textoDeOpcion, actualizarTextoOpcion } from '../campos';

export default function EditorEleccionMultiple({ ejercicio, onChange }) {
  const opciones = ejercicio.opciones ?? [];

  function set(campo, val) {
    onChange({ ...ejercicio, [campo]: val });
  }
  function setOpcionTexto(i, val) {
    const eraLaCorrecta = textoDeOpcion(opciones[i]) === ejercicio.respuestaCorrecta;
    const next = opciones.map((op, idx) => (idx === i ? actualizarTextoOpcion(op, val) : op));
    onChange({ ...ejercicio, opciones: next, ...(eraLaCorrecta ? { respuestaCorrecta: val } : {}) });
  }
  function añadirOpcion() {
    onChange({ ...ejercicio, opciones: [...opciones, ''] });
  }
  function quitarOpcion(i) {
    const eraLaCorrecta = textoDeOpcion(opciones[i]) === ejercicio.respuestaCorrecta;
    onChange({
      ...ejercicio,
      opciones: opciones.filter((_, idx) => idx !== i),
      ...(eraLaCorrecta ? { respuestaCorrecta: '' } : {}),
    });
  }

  return (
    <div className="space-y-3">
      <Campo label="Enunciado">
        <TextArea value={ejercicio.enunciado} onChange={v => set('enunciado', v)} rows={2} />
      </Campo>
      <Campo label="Opciones">
        <div className="space-y-1.5">
          {opciones.map((op, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={textoDeOpcion(op)}
                onChange={e => setOpcionTexto(i, e.target.value)}
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
              {opciones.length > 2 && <BotonBorrar onClick={() => quitarOpcion(i)} />}
            </div>
          ))}
          <BotonAñadir onClick={añadirOpcion}>+ Añadir opción</BotonAñadir>
        </div>
      </Campo>
      <Campo label="Respuesta correcta (toca la opción correcta)">
        <SelectorRespuesta opciones={opciones} valor={ejercicio.respuestaCorrecta} onChange={v => set('respuestaCorrecta', v)} />
      </Campo>
      <Campo label="Pista (opcional)">
        <TextInput value={ejercicio.pista} onChange={v => set('pista', v || undefined)} />
      </Campo>
    </div>
  );
}
