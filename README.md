# 📚 App Educativa — 3º Primaria

App web educativa offline-first para niños de 7-8 años. Currículo de 2º Primaria (España): Matemáticas, Lengua, Ciencias Naturales, Ciencias Sociales, Inglés y Valores Cívicos.

## 🎮 Funcionalidades

- **Modo alumno**: 6 asignaturas, fichas temáticas, 11 tipos de ejercicios interactivos
- **Modo administrador** (PIN `1234`): semáforos de progreso, vista detalle, estadísticas
- **Dificultad adaptativa** por asignatura (3 niveles)
- **Gamificación**: racha diaria, XP, insignias
- **Audio TTS bajo demanda** (botón 🔊)
- **Offline-first**: funciona sin conexión tras el primer arranque
- **Sin backend**: todo en IndexedDB del navegador

## 🚀 Stack

React 18 · Vite 5 · TailwindCSS 3 · Zustand · idb · @dnd-kit/core

## 🛠️ Desarrollo local

```bash
npm install
npm run dev
# abre http://localhost:5173
```

## 🌐 Despliegue automático

Cada `git push` a la rama `main` dispara GitHub Actions que:
1. Construye la app con `npm run build`
2. Sube el resultado a **GitHub Pages**
3. Tu app queda viva en `https://dalame-web.github.io/app-studio/` en ~1-2 minutos

**No hay que pulsar ningún botón** — el deploy es automático. Para forzar uno sin cambios usa la pestaña **Actions → Deploy → Run workflow**.

### Primera vez: activa GitHub Pages

1. Ve a **Settings → Pages** de este repo
2. En "Source" elige **GitHub Actions**
3. Listo — el siguiente push desplegará

## 📝 Contenido

Los ejercicios viven en `public/ejercicios.json`. Para añadir o modificar fichas, edita ese JSON y haz push. La app sincroniza la versión nueva automáticamente cuando el usuario abre la app con conexión.
