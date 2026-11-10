# LEVI · Panel docente (frontend)

Panel web para ver lo que registra el simulador VR de electrónica (proyecto Unity
[SimuladorVR](https://github.com/FUKARLOS/SimuladorVR)) en los Meta Quest.

## Ejecutar

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

`npm run build` genera la versión estática en `dist/`.

## Qué hace

Dos pantallas, nada más:

- **Alumnos**: formulario de una línea para agregar (nombre, asignatura, código del
  visor) y la lista de alumnos.
- **Ficha del alumno**: sus sesiones, cada una con 4 datos: **tiempo, mediciones,
  correctas y errores**. Al hacer clic se ve el resultado de cada medición y de
  dónde vienen los errores.

Arriba a la derecha, **Cargar sesiones** permite subir los `.json` del visor
mientras no esté conectado Supabase.

## Cómo se une un alumno con sus sesiones

Unity no guarda nombres: cada sesión trae un `participantCode` (A001, B002…), que
el operador ve en el menú del visor. Al agregar un alumno aquí se le asigna ese
mismo código, y todas las sesiones con ese código aparecen en su ficha. Las sesiones
de códigos sin alumno se señalan en el inicio.

## Formato de datos

`src/types.ts` replica exactamente `SessionLog.cs` de Unity. Los 4 datos se
calculan en `src/lib/metrics.ts`:

| Dato | Cómo se calcula |
|---|---|
| Tiempo | `durationSeconds` |
| Mediciones | eventos `lectura` |
| Correctas | tareas cuyo resultado final es `Correct` |
| Errores | lecturas incorrectas + eventos `rechazo` (multímetro mal usado) + fallas graves del circuito (cortocircuito, sobrecarga, LED quemado) |

## Conectar Supabase (pendiente)

Por ahora los datos viven en `localStorage` y se cargan datos de ejemplo. Toda la
interfaz usa la interfaz `Repository` de `src/data/repository.ts`; para pasar a
Supabase hay que escribir otra implementación de esa interfaz y cambiar la última
línea del archivo. No hay que tocar las pantallas.

Por el lado de Unity ya existe `SessionUploader` + el asset `EnvioSesiones`, que
hace un POST con el JSON de la sesión a una URL configurable y trata el 409 como
"ya entregada". Sirve para la API REST de Supabase con una tabla con restricción
de unicidad en (participantCode, experimentId, startedAt).
