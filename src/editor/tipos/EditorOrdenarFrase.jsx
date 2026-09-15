import { Campo, TextInput, ListaTextos, BotonAñadir } from '../campos';

function barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function EditorOrdenarFrase({ ejercicio, onChange }) {
  function set(campo, val) {
    onChange({ ...ejercicio, [campo]: val });
  }
  function generarDesordenadas() {
    const palabras = String(ejercicio.fraseCorrecta ?? '').trim().split(/\s+/).filter(Boolean);
    onChange({ ...ejercicio, palabrasDesordenadas: barajar(palabras) });
  }

  return (
    <div className="space-y-3">
      <Campo label="Enunciado (opcional)">
        <TextInput value={ejercicio.enunciado} onChange={v => set('enunciado', v || undefined)} />
      </Campo>
      <Campo label="Frase correcta">
        <TextInput value={ejercicio.fraseCorrecta} onChange={v => set('fraseCorrecta', v)} />
      </Campo>
      <BotonAñadir onClick={generarDesordenadas}>🔀 Generar palabras desordenadas desde la frase correcta</BotonAñadir>
      <Campo label="Palabras desordenadas (las que verá el niño)">
        <ListaTextos items={ejercicio.palabrasDesordenadas} onChange={v => set('palabrasDesordenadas', v)} min={3} />
      </Campo>
      <Campo label="Pista (opcional)">
        <TextInput value={ejercicio.pista} onChange={v => set('pista', v || undefined)} />
      </Campo>
    </div>
  );
}
