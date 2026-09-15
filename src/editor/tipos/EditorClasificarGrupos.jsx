import { Campo, TextInput, BotonAñadir, BotonBorrar } from '../campos';

function slugify(s) {
  return String(s ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Basarse en length+1 para el siguiente id repite ids ya usados en cuanto se borra
// algo del medio (g1,g2,g3 → borrar g2 → "nuevo" vuelve a ser g3). Se busca el
// número más alto ya usado con ese prefijo en vez de contar cuántos hay.
function siguienteId(prefijo, existentes) {
  let max = 0;
  for (const id of existentes) {
    const m = /^[a-z]*(\d+)$/i.exec(id || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefijo}${max + 1}`;
}

export default function EditorClasificarGrupos({ ejercicio, onChange }) {
  function set(campo, val) {
    onChange({ ...ejercicio, [campo]: val });
  }
  const grupos = ejercicio.grupos ?? [];
  const items = ejercicio.items ?? [];

  function setGrupoNombre(i, val) {
    const next = grupos.map((g, idx) => (idx === i ? { ...g, nombre: val, id: g.id || slugify(val) || `g${idx + 1}` } : g));
    onChange({ ...ejercicio, grupos: next });
  }
  function añadirGrupo() {
    const id = siguienteId('g', grupos.map(g => g.id));
    onChange({ ...ejercicio, grupos: [...grupos, { id, nombre: '' }] });
  }
  function quitarGrupo(i) {
    const idQuitado = grupos[i]?.id;
    onChange({
      ...ejercicio,
      grupos: grupos.filter((_, idx) => idx !== i),
      items: items.map(it => (it.grupoId === idQuitado ? { ...it, grupoId: '' } : it)),
    });
  }
  function setItem(i, campo, val) {
    const next = items.map((it, idx) => (idx === i ? { ...it, [campo]: val } : it));
    onChange({ ...ejercicio, items: next });
  }
  function añadirItem() {
    const id = siguienteId('i', items.map(it => it.id));
    onChange({ ...ejercicio, items: [...items, { id, texto: '', grupoId: grupos[0]?.id ?? '' }] });
  }
  function quitarItem(i) {
    onChange({ ...ejercicio, items: items.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-3">
      <Campo label="Enunciado (opcional)">
        <TextInput value={ejercicio.enunciado} onChange={v => set('enunciado', v || undefined)} />
      </Campo>
      <Campo label={`Grupos (2 o 3 — tiene ${grupos.length})`}>
        <div className="space-y-1.5">
          {grupos.map((g, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={g.nombre ?? ''}
                onChange={e => setGrupoNombre(i, e.target.value)}
                placeholder="Nombre del grupo"
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
              {grupos.length > 2 && <BotonBorrar onClick={() => quitarGrupo(i)} />}
            </div>
          ))}
          {grupos.length < 3 && <BotonAñadir onClick={añadirGrupo}>+ Añadir grupo</BotonAñadir>}
        </div>
      </Campo>
      <Campo label="Elementos a clasificar (mínimo 4)">
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={it.texto ?? ''}
                onChange={e => setItem(i, 'texto', e.target.value)}
                placeholder="Texto del elemento"
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
              <select
                value={it.grupoId ?? ''}
                onChange={e => setItem(i, 'grupoId', e.target.value)}
                className="border-2 border-gray-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400 bg-white"
              >
                <option value="">— grupo —</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre || g.id}</option>)}
              </select>
              <BotonBorrar onClick={() => quitarItem(i)} />
            </div>
          ))}
          <BotonAñadir onClick={añadirItem}>+ Añadir elemento</BotonAñadir>
        </div>
      </Campo>
      <Campo label="Pista (opcional)">
        <TextInput value={ejercicio.pista} onChange={v => set('pista', v || undefined)} />
      </Campo>
    </div>
  );
}
