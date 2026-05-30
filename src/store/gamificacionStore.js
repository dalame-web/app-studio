import { create } from 'zustand';
import { getGamificacion, upsertGamificacion } from '../datos/db';

const HOY = () => new Date().toDateString();
const AYER = () => new Date(Date.now() - 86400000).toDateString();

const useGamificacionStore = create((set, get) => ({
  xpTotal: 0,
  rachaDias: 0,
  rachaMaxima: 0,
  ultimaSesionFecha: null,
  insignias: [],

  cargar: async (profileId) => {
    const data = await getGamificacion(profileId);
    if (data) set(data);
  },

  agregarXP: async (profileId, cantidad) => {
    const xpTotal = get().xpTotal + cantidad;
    set({ xpTotal });
    await upsertGamificacion(profileId, { xpTotal });
  },

  actualizarRacha: async (profileId) => {
    const { rachaDias, rachaMaxima, ultimaSesionFecha } = get();
    const hoy = HOY();
    const ayer = AYER();
    let nuevaRacha = rachaDias;
    if (ultimaSesionFecha === hoy) {
      nuevaRacha = rachaDias; // same day, no change
    } else if (ultimaSesionFecha === ayer) {
      nuevaRacha = rachaDias + 1;
    } else {
      nuevaRacha = 1;
    }
    const nuevaMax = Math.max(nuevaRacha, rachaMaxima);
    const updates = { rachaDias: nuevaRacha, rachaMaxima: nuevaMax, ultimaSesionFecha: hoy };
    set(updates);
    await upsertGamificacion(profileId, updates);
    return nuevaRacha;
  },

  desbloquearInsignia: async (profileId, id) => {
    const { insignias } = get();
    if (insignias.includes(id)) return false;
    const nuevas = [...insignias, id];
    set({ insignias: nuevas });
    await upsertGamificacion(profileId, { insignias: nuevas });
    return true;
  },

  calcularXPSesion: (correctas, total, rachaEjercicios) => {
    let xp = correctas * 10;
    if (rachaEjercicios >= 3) xp += 5;
    if (total > 0 && correctas / total >= 0.8) xp += 20;
    return xp;
  },
}));

export default useGamificacionStore;
