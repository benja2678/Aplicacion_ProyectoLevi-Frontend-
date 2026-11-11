# LEVI · Panel docente (frontend)

Panel web para ver lo que registra el simulador VR de electrónica (proyecto Unity
[SimuladorVR](https://github.com/FUKARLOS/SimuladorVR)) en los Meta Quest.

Es uno de 3 repositorios que van uno al lado del otro:

```
carpeta/
├── Aplicacion_tesis/     este repositorio (frontend React)
├── proyecto-backend/     API Django + Docker Compose (deploy/)
└── proyecto-db/          base de datos PostgreSQL
```

## Entornos: `.env.dev` y `.env.prod`

| Archivo | Lo usan | Para qué |
|---|---|---|
| `.env.dev` | `npm run dev` y `npm run build:dev` | desarrollo en tu PC |
| `.env.prod` | `npm run build` | la versión que se copia al servidor |

| Variable | Qué hace |
|---|---|
| `VITE_DATA_SOURCE` | `api` = backend Django con login (correo y clave de la tabla `lector`) · `local` = demo con datos de ejemplo en el navegador, sin login |
| `VITE_API_URL` | dirección de la API. `/api` = la misma dirección de la página. Si el backend está en otra dirección, la completa (ej. `https://laboratorio.uta.cl/api`; el backend debe permitirlo con CORS) |
| `BACKEND_URL` | solo en `.env.dev`: a qué backend reenvía Vite las llamadas a `/api` (por defecto `http://localhost:8000`) |

- **No hay secretos aquí**: todo lo que empieza con `VITE_` queda dentro de la página y
  cualquiera puede verlo. Por eso `.env.dev` y `.env.prod` sí se suben a git.
- Para cambiar algo **solo en tu PC** sin tocarlos, crea `.env.dev.local` o
  `.env.prod.local` (no se suben a git). Ojo: un `.env.local` afecta a **los dos** entornos.
- En el código, el único archivo que lee estas variables es `src/config.ts`.

## Ejecutar en tu PC (desarrollo)

```powershell
cd frontend
npm install
npm run dev        # usa .env.dev -> http://localhost:5173
```

Con `VITE_DATA_SOURCE=api` el backend tiene que estar encendido en otra terminal
(`proyecto-backend`: `.venvScriptspython manage.py runserver`).

## Compilar para el servidor (producción)

La página no corre en Docker: se compila en tu PC y se copian los archivos generados.

```powershell
cd frontend
npm run build      # usa .env.prod -> carpeta dist/ (index.html + assets/*.js, *.css)
```

Copia **todo el contenido de `dist/`** a la carpeta que publica el servidor web.
Con `VITE_API_URL=/api`, ese servidor web debe además reenviar `/api/` (y `/admin/`,
`/static/`) al backend Django.

`npm run build:dev` compila igual pero con `.env.dev` (para probar una compilación de desarrollo).

## Qué hace

Tres pantallas:

- **Login** (solo en modo `api`): correo y contraseña del lector (docente o equipo). No hay registro.
- **Alumnos**: formulario de una línea para agregar (nombre, apellido, asignatura,
  código del visor) y la lista de alumnos.
- **Ficha del alumno**: sus sesiones, cada una con 4 datos: **tiempo, mediciones,
  correctas y errores**. Al hacer clic se ve el resultado de cada medición y de
  dónde vienen los errores.

Arriba a la derecha:
- **Cargar sesiones** sube a mano los `.json` del visor. Sirve de respaldo del envío
  automático desde Unity.
- Nombre y rol del lector conectado, y **Cerrar sesión** (solo en modo `api`).

## Cómo funciona el login

1. El lector ingresa su correo y contraseña (el backend los revisa en la tabla `lector`). El backend responde con dos tokens JWT:
   - **access**: dura 30 minutos y viaja en cada petición (`Authorization: Bearer …`).
   - **refresh**: dura 8 horas y sirve para pedir un access nuevo.
2. Los tokens se guardan en el navegador (localStorage).
3. Cuando el access vence, el panel pide uno nuevo sin que el lector lo note.
   Si el refresh también venció, se cerró la sesión o le quitaron el acceso en la base,
   vuelve a la pantalla de login.
4. **Cerrar sesión** borra los tokens del navegador y le pide al backend que
   invalide el refresh.

## Cómo se une un alumno con sus sesiones

Unity no guarda nombres: cada sesión trae un `participantCode` (A001, B002…), que
el operador ve en el menú del visor. Al agregar un alumno aquí se le asigna ese
mismo código, y todas las sesiones con ese código aparecen en su ficha. Las sesiones
de códigos sin alumno se señalan en el inicio.

## Formato de datos

`src/types.ts` replica exactamente `SessionLog.cs` de Unity. Los 4 datos se
calculan en `src/domain/metrics.ts`:

| Dato | Cómo se calcula |
|---|---|
| Tiempo | `durationSeconds` |
| Mediciones | eventos `lectura` |
| Correctas | tareas cuyo resultado final es `Correct` |
| Errores | lecturas incorrectas + eventos `rechazo` (multímetro mal usado) + fallas graves del circuito (cortocircuito, sobrecarga, LED quemado) |

## Cómo está organizado el código (`src/`)

Cada carpeta tiene una sola responsabilidad. Las de arriba usan a las de abajo, nunca al revés:

```
pages/ · components/   pantallas: solo muestran datos y llaman acciones
context/               estado de React: sesión del lector y datos del panel
repositories/          de dónde salen los datos: backend o demo local
api/                   lo único que habla HTTP con el backend
domain/ · utils/       reglas y formato: funciones puras, sin React ni red
```

| Archivo | Para qué sirve |
|---|---|
| `api/http.ts` | cliente HTTP: token en cada petición, renovación automática y mensajes de error legibles |
| `api/tokens.ts` | guarda los tokens y avisa cuando la sesión venció |
| `api/authApi.ts` | login, logout y "quién soy" (correo, nombre y rol del lector) |
| `api/studentsApi.ts` · `api/sessionsApi.ts` | un archivo por recurso del backend (`/api/students/`, `/api/sessions/`) |
| `repositories/Repository.ts` | el contrato que usan las pantallas |
| `repositories/apiRepository.ts` · `localRepository.ts` | versión backend y versión demo (localStorage + `demoData.ts`) |
| `repositories/index.ts` | elige una según `VITE_DATA_SOURCE` |
| `context/AuthProvider.tsx` + `authState.ts` | sesión del lector (comprobando / fuera / dentro) y el hook `useAuth` |
| `context/DataProvider.tsx` + `dataState.ts` | alumnos, sesiones y sus acciones, y el hook `useData` |
| `domain/students.ts` | nombre completo, búsqueda, código libre, estadísticas por código, códigos sin alumno |
| `domain/sessions.ts` · `domain/metrics.ts` · `domain/catalog.ts` | id de sesión, los 4 datos de cada sesión, experimentos y etiquetas |
| `utils/format.ts` | fechas y duraciones legibles |
| `types.ts` | tipos de datos (los de Unity y los del panel) |

---------------------------------

compilar y subir al servidor:
cd C:\Users\Usuario\Desktop\Proyecto_levi\Aplicacion_tesis\frontend
$env:VITE_DATA_SOURCE = 'api'
npm run build

------------------------------