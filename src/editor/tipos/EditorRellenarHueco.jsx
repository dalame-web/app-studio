import { Campo, TextArea, TextInput } from '../campos';

export default function EditorRellenarHueco({ ejercicio, onChange }) {
  function set(campo, val) {
    onChange({ ...ejercicio, [campo]: val });
  }
  const tieneHueco = typeof ejercicio.enunciado === 'string' && ejercicio.enunciado.includes('[___]');

  return (
    <div className="space-y-3">
      <Campo label="Enunciado (debe contener [___] donde va el hueco)">
        <TextArea value={ejercicio.enunciado} onChange={v => set('enunciado', v)} rows={2} />
        {!tieneHueco && (
          <button
            type="button"
            onClick={() => set('enunciado', `${ejercicio.enunciado ?? ''} [___]`.trim())}
            className="mt-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 transition-colors"
          >
            + Añadir hueco [___] al final
          </button>
        )}
      </Campo>
      <Campo label="Respuesta correcta">
        <TextInput value={ejercicio.respuestaCorrecta} onChange={v => set('respuestaCorrecta', v)} />
      </Campo>
      <Campo label="Pista (opcional)">
        <TextInput value={ejercicio.pista} onChange={v => set('pista', v || undefined)} />
      </Campo>
    </div>
  );
}
