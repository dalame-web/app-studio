// G6: instrucción + G7: elementos más pequeños
import { useState } from 'react';
import { DndContext, useDraggable, useDroppable, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import BotonAudio from '../../components/BotonAudio';
import ChipInstruccion from '../ChipInstruccion';
import MediaRender from '../MediaRender';

function DraggableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = {
    touchAction: 'none',
    ...(transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` } : {}),
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`inline-block px-2 py-1 bg-white border-2 border-gray-200 rounded-lg text-xs font-semibold cursor-grab active:cursor-grabbing select-none shadow-sm transition-colors ${isDragging ? 'shadow-lg border-blue-400 opacity-70' : 'hover:border-blue-300'}`}
    >
      {children}
    </div>
  );
}

function DropZone({ id, label, items, error }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-28 rounded-2xl border-2 p-3 transition-all ${
        error ? 'border-red-400 bg-red-50' :
        isOver ? 'border-blue-400 bg-blue-50' :
        'border-dashed border-gray-300 bg-gray-50'
      }`}
    >
      <p className="text-xs font-bold text-gray-600 mb-2 text-center">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <DraggableItem key={item.id} id={item.id}>{item.texto}</DraggableItem>
        ))}
      </div>
    </div>
  );
}

export default function ClasificarGrupos({ ejercicio, intentos, fichaContenido, asignatura, onCorrecto, onIncorrecto }) {
  const grupos = ejercicio.grupos ?? [];
  const items  = ejercicio.items ?? [];
  const [ubicaciones, setUbicaciones] = useState(() => {
    const init = { banco: items };
    grupos.forEach(g => { init[g.id] = []; });
    return init;
  });
  const [errorGrupo, setErrorGrupo] = useState(null);
  const idioma = asignatura === 'ingles' ? 'en-US' : 'es-ES';
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  function handleDragEnd({ active, over }) {
    if (!over) return;
    const itemId   = active.id;
    const targetId = over.id;

    setUbicaciones(prev => {
      const nuevo = {};
      for (const key of Object.keys(prev)) {
        nuevo[key] = prev[key].filter(i => i.id !== itemId);
      }
      const item = items.find(i => i.id === itemId);
      if (item) {
        nuevo[targetId] = [...(nuevo[targetId] ?? []), item];
      }
      if (targetId !== 'banco' && item && item.grupoId !== targetId) {
        setErrorGrupo(targetId);
        setTimeout(() => {
          setErrorGrupo(null);
          setUbicaciones(prev2 => {
            const rev = {};
            for (const k of Object.keys(prev2)) {
              rev[k] = prev2[k].filter(i => i.id !== itemId);
            }
            rev.banco = [...(rev.banco ?? []), item];
            return rev;
          });
          onIncorrecto();
        }, 700);
      } else {
        setErrorGrupo(null);
      }
      return nuevo;
    });
  }

  const todosColocados = (ubicaciones.banco?.length ?? 0) === 0;

  function comprobar() {
    const correcto = grupos.every(g =>
      ubicaciones[g.id]?.every(item => item.grupoId === g.id) &&
      items.filter(i => i.grupoId === g.id).length === (ubicaciones[g.id]?.length ?? 0)
    );
    if (correcto) onCorrecto();
    else {
      onIncorrecto();
      const init = { banco: items };
      grupos.forEach(g => { init[g.id] = []; });
      setUbicaciones(init);
    }
  }

  const pistaTexto = ejercicio.pista ?? 'Fíjate en las categorías.';
  const pista = intentos === 1 ? pistaTexto : intentos >= 2 ? 'Revisa dónde va cada elemento.' : null;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-3 py-4">
        <div className="relative bg-white rounded-2xl shadow-sm p-5">
          <BotonAudio texto={ejercicio.enunciado ?? 'Clasifica los elementos'} idioma={idioma} />
          <p className="text-base font-semibold text-gray-600 pr-12">{ejercicio.enunciado ?? 'Arrastra cada elemento al grupo correcto:'}</p>
          <MediaRender imagen={ejercicio.imagenEnunciado} svg={ejercicio.svgEnunciado} />
          {/* G6 */}
          <ChipInstruccion tipo="ClasificarGrupos" />
          {pista && <p className="mt-2 text-sm text-amber-600 font-medium">{pista}</p>}
        </div>

        {/* Banco */}
        {ubicaciones.banco?.length > 0 && (
          <DropZone id="banco" label="Elementos para clasificar" items={ubicaciones.banco ?? []} />
        )}

        {/* Grupos */}
        <div className="flex gap-2">
          {grupos.map(g => (
            <DropZone
              key={g.id}
              id={g.id}
              label={g.nombre}
              items={ubicaciones[g.id] ?? []}
              error={errorGrupo === g.id}
            />
          ))}
        </div>

        {todosColocados && (
          <button
            onClick={comprobar}
            className="py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow active:scale-95 transition-all"
          >
            Comprobar ✓
          </button>
        )}
      </div>
    </DndContext>
  );
}
