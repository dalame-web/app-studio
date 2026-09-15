// Piezas de formulario reutilizadas por los 11 editores de tipo de ejercicio.
// Solo se usan dentro de la herramienta local (src/editor/) — no tocan la app.
export function Campo({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 ${className}`}
    />
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3, className = '' }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-y ${className}`}
    />
  );
}

export function NumberInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      placeholder={placeholder}
      className={`w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 ${className}`}
    />
  );
}

export function Select({ value, onChange, options, className = '' }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className={`w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white ${className}`}
    >
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}

export function BotonBorrar({ onClick, title = 'Eliminar' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
    >
      ✕
    </button>
  );
}

export function BotonAñadir({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 transition-colors"
    >
      {children}
    </button>
  );
}

// Convierte un texto nuevo al mismo tipo (number/string) que ya tenía el valor original —
// evita que "5" (string) deje de ser igual a 5 (number) al comparar respuestaCorrecta.
export function mantenerTipo(original, textoNuevo) {
  if (typeof original === 'number' && textoNuevo.trim() !== '') {
    const n = Number(textoNuevo);
    return Number.isNaN(n) ? textoNuevo : n;
  }
  return textoNuevo;
}

// Lista editable de textos sueltos (opciones, palabras, ejemplos, palabrasClave...).
export function ListaTextos({ items, onChange, placeholder = '', min = 0 }) {
  const lista = Array.isArray(items) ? items : [];
  function setItem(i, val) {
    const next = [...lista];
    next[i] = mantenerTipo(lista[i], val);
    onChange(next);
  }
  function quitar(i) {
    onChange(lista.filter((_, idx) => idx !== i));
  }
  function añadir() {
    onChange([...lista, '']);
  }
  return (
    <div className="space-y-1.5">
      {lista.map((val, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            type="text"
            value={val ?? ''}
            onChange={e => setItem(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
          />
          {lista.length > min && <BotonBorrar onClick={() => quitar(i)} />}
        </div>
      ))}
      <BotonAñadir onClick={añadir}>+ Añadir</BotonAñadir>
    </div>
  );
}

// Como ListaTextos, pero para listas de opciones que además tienen una
// "respuesta correcta" apuntando a uno de sus valores: si se edita o se borra
// justo la opción que era la correcta, actualiza/limpia la respuesta también
// (si no, queda apuntando a un texto que ya no existe y la ficha deja de validar).
export function ListaOpcionesConRespuesta({ items, respuesta, onChangeItems, onChangeRespuesta, min = 0, placeholder = '' }) {
  const lista = Array.isArray(items) ? items : [];
  function setItem(i, val) {
    const viejo = lista[i];
    const nuevoVal = mantenerTipo(viejo, val);
    const next = [...lista];
    next[i] = nuevoVal;
    onChangeItems(next);
    if (viejo === respuesta) onChangeRespuesta(nuevoVal);
  }
  function quitar(i) {
    const viejo = lista[i];
    onChangeItems(lista.filter((_, idx) => idx !== i));
    if (viejo === respuesta) onChangeRespuesta('');
  }
  function añadir() {
    onChangeItems([...lista, '']);
  }
  return (
    <div className="space-y-1.5">
      {lista.map((val, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            type="text"
            value={val ?? ''}
            onChange={e => setItem(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
          />
          {lista.length > min && <BotonBorrar onClick={() => quitar(i)} />}
        </div>
      ))}
      <BotonAñadir onClick={añadir}>+ Añadir</BotonAñadir>
    </div>
  );
}

// texto/valor de una opción, tanto si es un string suelto como si es {texto, emoji, ...}
export function textoDeOpcion(op) {
  if (op && typeof op === 'object') return op.texto ?? '';
  return op ?? '';
}

// Edita solo el texto de una opción, conservando emoji/svg/imagen si los tenía.
export function actualizarTextoOpcion(op, nuevoTexto) {
  return op && typeof op === 'object' ? { ...op, texto: nuevoTexto } : nuevoTexto;
}

// Chips seleccionables para marcar cuál de las opciones/valores es la respuesta correcta.
// getValor: opción → valor real a guardar en respuestaCorrecta (string u objeto→texto).
export function SelectorRespuesta({ opciones, valor, onChange, getValor = textoDeOpcion, getLabel }) {
  const label = getLabel ?? (op => String(getValor(op) ?? ''));
  return (
    <div className="flex flex-wrap gap-2">
      {(opciones ?? []).map((op, i) => {
        const v = getValor(op);
        const activo = v === valor;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
              activo ? 'bg-green-100 border-green-400 text-green-800' : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'
            }`}
          >
            {activo ? '✓ ' : ''}{label(op) || '(vacío)'}
          </button>
        );
      })}
    </div>
  );
}
