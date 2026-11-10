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
| `api` | backend Django (`proyecto-backend`) | sí: solo la cuenta del profesor |
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
junto con el backend y la base de datos.

| Archivo | Para qué sirve |
|---|---|
| `Dockerfile` | 2 etapas: Node compila la página (`npm run build`) y Nginx sirve el resultado |
| `nginx.conf` | `/` → la página; `/api/`, `/admin/` y `/static/` → backend Django. Límite de 50 MB por petición y de intentos de login |
| `.dockerignore` | lo que no entra a la imagen (`node_modules`, `.env.local`…) |

En Docker siempre se compila con `VITE_DATA_SOURCE=api` (con login), sin importar
lo que diga tu `.env.local`.

## Qué hace

Tres pantallas:

- **Login** (solo en modo `api`): usuario y contraseña del profesor. No hay registro.
- **Alumnos**: formulario de una línea para agregar (nombre, asignatura, código del
  visor) y la lista de alumnos.
- **Ficha del alumno**: sus sesiones, cada una con 4 datos: **tiempo, mediciones,
  correctas y errores**. Al hacer clic se ve el resultado de cada medición y de
  dónde vienen los errores.

Arriba a la derecha:
- **Cargar sesiones** sube a mano los `.json` del visor. Sirve de respaldo del envío
  automático desde Unity.
- **Cerrar sesión** (solo en modo `api`).

## Cómo funciona el login

1. El profesor ingresa usuario y contraseña. El backend responde con dos tokens JWT:
   - **access**: dura 30 minutos y viaja en cada petición (`Authorization: Bearer …`).
   - **refresh**: dura 8 horas y sirve para pedir un access nuevo.
2. Los tokens se guardan en el navegador (localStorage).
3. Cuando el access vence, el panel pide uno nuevo sin que el profesor lo note.
   Si el refresh también venció, o se cerró la sesión, vuelve a la pantalla de login.
4. **Cerrar sesión** borra los tokens del navegador y le pide al backend que
   invalide el refresh.

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

## Archivos de la capa de datos

| Archivo | Para qué sirve |
|---|---|
| `src/data/repository.ts` | contrato `Repository`, versión demo con localStorage y elección según `VITE_DATA_SOURCE` |
| `src/data/apiRepository.ts` | versión que usa la API de Django (mismo contrato, las pantallas no cambian) |
| `src/data/api.ts` | cliente HTTP: tokens, renovación automática y mensajes de error legibles |
| `src/data/AuthContext.tsx` | estado de la sesión del profesor (comprobando / fuera / dentro) |
| `src/data/DataContext.tsx` | entrega los datos y acciones a las pantallas |
| `src/pages/LoginPage.tsx` | pantalla de inicio de sesión |
