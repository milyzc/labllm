# Lab LLM · riesgos OWASP en la práctica

App web local para atacar (y defender) un asistente con LLM. Cubre **LLM01** Prompt injection, **LLM02** Divulgación de datos, **LLM05** Salida sin validar y **LLM09** Desinformación.

- Backend Node sin dependencias (`http` + `node:sqlite`). Requiere Node 22.5+.
- Datos en **SQLite** (`lab.db`, se crea y siembra solo la primera vez). Tablas: `customers`, `secrets`, `reviews`, `kb`, `packages`. Para resetear: borrá `lab.db` y reiniciá. Si editás la DB, los cambios se ven sin reiniciar.
- LLM: **Ollama** local. Si no está disponible, usa un **modo simulado** que se deja engañar a propósito (la UI muestra cuál se está usando).
- Todo corre en `127.0.0.1`. Datos y secretos 100% ficticios. **No lo expongas a la red**: es vulnerable a propósito.

## Uso

```bash
# (opcional) modelo real
ollama pull llama3.2:3b

node server.js          # http://127.0.0.1:3000
node test.js            # prueba de humo del modo simulado
```

Por consola, la API imprime en modo verbose cada request: el prompt enviado al modelo (por rol), la respuesta cruda del modelo, el efecto del filtro de salida, los flags y las consultas SQL a la base (consulta, filas devueltas y tiempo). `VERBOSE=0` lo silencia.

Las variables se leen de `lab-llm/.env` (si existe) o del entorno; el entorno tiene prioridad. Ejemplo de `.env`:

```
OLLAMA_MODEL=llama3.2:3b
VERBOSE=1
LOGGED_IN=1   # id del cliente logueado en el chat (tabla customers)
```

Cada request tiene un **request-id** (8 caracteres, o el header `x-request-id` si lo mandás) que prefija todas sus líneas de log, sale en el header de respuesta `x-request-id` y se muestra en la UI. Para seguir un request: `node server.js | grep '\[a1b2c3d4\]'`.

`VERBOSE_GRADER=1` muestra además las consultas del "corrector" (🧪), las que usa el lab para detectar fugas y redactar y que **no** son parte de la app. Por defecto solo se ven las consultas de la app (🗄️).

Variables: `LOGGED_IN`, `VERBOSE`, `VERBOSE_GRADER`, `PORT`, `OLLAMA_MODEL` (default `llama3.2:3b`), `OLLAMA_URL`, `FORCE_MOCK=1`, `DB_PATH`.

Con un modelo real las respuestas varían y los ataques pueden no funcionar a la primera: es parte del ejercicio. El modo simulado es el predecible para dar clase.

## Escenarios

| Pestaña | Ataque | Defensas para probar |
|---|---|---|
| LLM01 | Nota de reclamo con instrucciones plantadas (indirecta) e inyección directa | Delimitar, filtro de entrada, filtro de salida |
| LLM02 | Pedir datos de otro cliente / secretos que están en el contexto | Mínimo contexto (la que de verdad funciona), filtro de salida |
| LLM05 | Reseña con HTML; la app lo renderiza con `innerHTML` | Escapar la salida |
| LLM09 | Paquetes npm inventados | Grounding (RAG) y verificación contra la tabla `packages` |

El panel "Lo que realmente ve el modelo" muestra el prompt completo enviado en cada mensaje.
