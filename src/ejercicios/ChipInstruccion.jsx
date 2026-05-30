import { INSTRUCCIONES } from './instrucciones';

export default function ChipInstruccion({ tipo }) {
  const texto = INSTRUCCIONES[tipo];
  if (!texto) return null;
  return (
    <span className="inline-block text-xs text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5 mt-1.5 mb-0.5 select-none">
      {texto}
    </span>
  );
}
