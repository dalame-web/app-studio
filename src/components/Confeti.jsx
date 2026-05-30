import { useEffect, useState } from 'react';

const COLORES = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8'];
const FORMAS = ['●', '■', '▲', '★', '♦'];

function Pieza({ color, forma, x, delay, animClass }) {
  return (
    <span
      className={`fixed top-0 text-xl pointer-events-none select-none ${animClass}`}
      style={{ left: `${x}%`, color, animationDelay: `${delay}s`, zIndex: 9999 }}
    >
      {forma}
    </span>
  );
}

export default function Confeti({ activo, onFin }) {
  const [piezas, setPiezas] = useState([]);

  useEffect(() => {
    if (!activo) return;
    const nuevas = Array.from({ length: 36 }, (_, i) => ({
      id: i,
      color: COLORES[i % COLORES.length],
      forma: FORMAS[i % FORMAS.length],
      x: (i * 2.8) % 100,
      delay: (i * 0.05) % 0.8,
      animClass: `animate-confeti-${(i % 3) + 1}`,
    }));
    setPiezas(nuevas);
    const t = setTimeout(() => { setPiezas([]); onFin?.(); }, 2000);
    return () => clearTimeout(t);
  }, [activo]);

  if (piezas.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 9998 }}>
      {piezas.map(p => (
        <Pieza key={p.id} {...p} />
      ))}
    </div>
  );
}
