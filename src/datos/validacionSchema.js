// Validación estructural formal con JSON Schema (ajv) — capa complementaria a validacion.js.
// validacion.js sigue teniendo las reglas SEMÁNTICAS (duplicados, "la palabra existe en
// la sopa de letras", "la respuesta aparece en el contenido de la ficha"...), que un JSON
// Schema no puede expresar. Este archivo solo formaliza tipos/campos obligatorios/longitudes
// fijas — y de paso deja el schema como artefacto reutilizable fuera de esta app si hace falta.
import Ajv from 'ajv';
import schema from './schema/ejercicios.schema.json' with { type: 'json' };

const DEF_POR_TIPO = {
  EleccionMultiple:   'eleccionMultiple',
  RellenarHueco:      'rellenarHueco',
  ArrastrarPalabras:  'arrastrarPalabras',
  OrdenarFrase:       'ordenarFrase',
  UnirColumnas:       'unirColumnas',
  ClasificarGrupos:   'clasificarGrupos',
  CompletarSerie:     'completarSerie',
  SopaLetras:         'sopaLetras',
  MemoriaPareja:      'memoriaPareja',
  ProblemaVisual:     'problemaVisual',
  ComprensionLectora: 'comprensionLectora',
};

const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(schema, 'ejercicios');

// Un validador compilado por tipo, cada uno solo contra SU propio $def
// (evita el ruido de un oneOf reportando fallos contra los otros 10 tipos).
const validadorPorTipo = {};
for (const [tipo, defKey] of Object.entries(DEF_POR_TIPO)) {
  validadorPorTipo[tipo] = ajv.compile({ $ref: `ejercicios#/$defs/${defKey}` });
}

// Devuelve { errores: string[] } — solo errores estructurales, sin concepto de warning
// (eso sigue siendo cosa de validacion.js).
export function validarConSchema(ficha) {
  const errores = [];
  const ref = `ficha "${ficha?.id ?? '?'}"`;

  for (const ej of ficha?.ejercicios ?? []) {
    const validador = validadorPorTipo[ej?.tipo];
    if (!validador) continue; // tipo inválido/desconocido: ya lo detecta validacion.js

    if (!validador(ej)) {
      for (const err of validador.errors ?? []) {
        const ruta = err.instancePath || '(raíz)';
        errores.push(`[schema] ${ref} → ejercicio "${ej.id ?? '?'}" (${ej.tipo}) ${ruta}: ${err.message}`);
      }
    }
  }

  return { errores };
}

export { schema as ejerciciosSchema };
