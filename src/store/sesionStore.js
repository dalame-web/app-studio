import { create } from 'zustand';

const useSesionStore = create((set, get) => ({
  pantallaActual: 'inicio',
  profileId: null,
  asignaturaActual: null,
  fichaActual: null,

  // Active session
  sesionId: null,
  ejercicios: [],
  ejerciciosBaseLength: 0, // cuántos son "principales" (el resto son repaso rápido)
  ejercicioIdx: 0,
  correctas: 0,
  incorrectas: 0,
  rachaActual: 0,
  nivelAnterior: null,
  nivelNuevo: null,

  setProfileId: (id) => set({ profileId: id }),

  irA: (pantalla) => set({ pantallaActual: pantalla }),

  seleccionarAsignatura: (subject) => set({ asignaturaActual: subject, pantallaActual: 'fichas' }),

  seleccionarFicha: (ficha, esRepaso = false) =>
    set({ fichaActual: ficha, esRepaso: !!esRepaso, pantallaActual: 'visorFicha' }),

  iniciarSesion: (sesionId, ejercicios, baseLength) =>
    set({
      sesionId,
      ejercicios,
      ejerciciosBaseLength: baseLength ?? ejercicios.length,
      ejercicioIdx: 0,
      correctas: 0,
      incorrectas: 0,
      rachaActual: 0,
      nivelAnterior: null,
      nivelNuevo: null,
      pantallaActual: 'ejercicio',
    }),

  registrarCorrecto: () => {
    const { correctas, rachaActual, ejercicioIdx, ejercicios } = get();
    const siguienteIdx = ejercicioIdx + 1;
    const terminado = siguienteIdx >= ejercicios.length;
    set({
      correctas: correctas + 1,
      rachaActual: rachaActual + 1,
      ejercicioIdx: siguienteIdx,
      ...(terminado ? { pantallaActual: 'resultado' } : {}),
    });
    return terminado;
  },

  registrarIncorrecto: () => {
    const { incorrectas, ejercicioIdx, ejercicios } = get();
    const siguienteIdx = ejercicioIdx + 1;
    const terminado = siguienteIdx >= ejercicios.length;
    set({
      incorrectas: incorrectas + 1,
      rachaActual: 0,
      ejercicioIdx: siguienteIdx,
      ...(terminado ? { pantallaActual: 'resultado' } : {}),
    });
    return terminado;
  },

  setNivelResultado: (anterior, nuevo) => set({ nivelAnterior: anterior, nivelNuevo: nuevo }),

  volverAInicio: () =>
    set({
      pantallaActual: 'inicio',
      asignaturaActual: null,
      fichaActual: null,
      sesionId: null,
      ejercicios: [],
      ejerciciosBaseLength: 0,
      ejercicioIdx: 0,
      correctas: 0,
      incorrectas: 0,
      rachaActual: 0,
      nivelAnterior: null,
      nivelNuevo: null,
    }),

  get ejercicioActual() {
    const { ejercicios, ejercicioIdx } = get();
    return ejercicios[ejercicioIdx] ?? null;
  },

  get accuracy() {
    const { correctas, incorrectas } = get();
    const total = correctas + incorrectas;
    return total === 0 ? 0 : correctas / total;
  },
}));

export default useSesionStore;
