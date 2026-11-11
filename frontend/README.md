# LEVI · Panel docente (frontend)

Panel web para ver lo que registra el simulador VR de electrónica (proyecto Unity
[SimuladorVR](https://github.com/FUKARLOS/SimuladorVR)) en los Meta Quest.

Es uno de 3 repositorios que van uno al lado del otro:

```
carpeta/
├── Aplicacion_tesis/     este repositorio (frontend React + Nginx)
├── proyecto-backend/     API Django + Docker Compose (deploy/)
└── proyecto-db/          base de datos PostgreSQL
```

## Dos modos de funcionamiento

La variable `VITE_DATA_SOURCE` elige de dónde salen los datos:

| Valor | Datos | Login |
|---|---|---|
| `api` | backend Django (`proyecto-backend`) | sí: correo y clave de la tabla `lector` (docente o equipo) |
| `local` (o sin definir) | datos de ejemplo en el navegador (localStorage) | no (demo) |

## Ejecutar en tu PC

```powershell
cd frontend
npm install
copy .env.example .env.local   # deja VITE_DATA_SOURCE=api (o local para la demo)
npm run dev                     # http://localhost:5173
```

En modo `api` el backend tiene que estar encendido en otra terminal
(`proyecto-backend`: `.venv\Scripts\python manage.py runserver`). Vite reenvía todas
las llamadas a `/api/...` hacia `http://localhost:8000` (ver `vite.config.ts`).

`npm run build` genera la versión estática en `dist/`.

## En el servidor (Docker + Nginx)

No se arranca solo: lo enciende el `docker-compose.yml` de `proyecto-backend/deploy/`
junto con el backend y la base de datos. La instalación paso a paso está en
`DEPLOY.md` del repositorio `proyecto-backend`.

| Archivo | Para qué sirve |
|---|---|
| `Dockerfile` | 2 etapas: Node compila la página (`npm run build`) y Nginx sirve el resultado |
| `nginx.conf` | `/` → la página; `/api/`, `/admin/` y `/static/` → backend Django. Límite de 50 MB por petición y de intentos de login |
| `.dockerignore` | lo que no entra a la imagen (`node_modules`, `.env.local`…) |

En Docker siempre se compila con `VITE_DATA_SOURCE=api` (con login), sin importar
lo que diga tu `.env.local`.

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
