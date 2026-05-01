# HU-036: Envío de libro por email

## Descripción

**Como** usuario de la biblioteca digital,  
**Quiero** poder enviar el archivo de un libro a una dirección de email,  
**Para** poder leerlo en cualquier dispositivo o cliente de lectura (p. ej. Kindle via email).

---

## Contexto y motivación

La tabla `books` dispone de una columna `path` que almacena la ruta física del archivo asociado a cada libro. Actualmente ese dato existe en base de datos pero no se expone mediante ninguna acción útil al usuario.

Esta historia implementa el endpoint `POST /books/:id/send` que, dado el ID de un libro y una dirección de email destino, adjunta el archivo del libro en un correo y lo envía usando la cuenta Gmail preconfigurada en la API.

Para que esto sea posible se requieren dos cambios de infraestructura:

1. **Volumen físico**: el contenedor de la API necesita acceso al directorio del host donde residen los archivos de los libros. Esto se configura mediante un `bind mount` en el `docker-compose` de desarrollo y producción.
2. **Servicio de correo**: la API necesita credenciales de Gmail (usuario + contraseña de aplicación) inyectadas como variables de entorno.

---

## Criterios de Aceptación

### CA-1: Endpoint disponible
- Existe el endpoint `POST /api/books/:id/send`.
- Acepta un body JSON con el campo `email` (string, formato email válido).
- Devuelve `200 OK` cuando el correo se ha enviado correctamente (flujo sincrónico).

### CA-2: Validaciones de negocio
- Si el libro no existe → `404 Not Found` con mensaje descriptivo.
- Si el libro no tiene `path` definido (null o vacío) → `422 Unprocessable Entity` indicando que el libro no tiene archivo asociado.
- Si el archivo físico no existe en la ruta indicada por `path` → `422 Unprocessable Entity` indicando que el archivo no está disponible.
- Si el `email` recibido no es válido → `400 Bad Request` con detalle de validación Zod.

### CA-3: Envío del correo
- El correo se envía desde la cuenta Gmail configurada en las variables de entorno (`GMAIL_USER`, `GMAIL_APP_PASSWORD`).
- El correo incluye el archivo del libro como adjunto.
- El asunto del correo sigue el patrón: `[Library] {título del libro}`.
- El cuerpo del correo incluye el título y el autor del libro.

### CA-4: Infraestructura — volumen de libros
- El `docker-compose.dev.yml` monta un volumen tipo `bind mount` desde la variable de entorno `BOOKS_PATH` del host hacia `/books` dentro del contenedor.
- El `docker-compose.prod.yml` aplica el mismo bind mount.
- La variable `BOOKS_PATH` se documenta en el `.env.example` de la API.

### CA-5: Infraestructura — credenciales Gmail
- Las variables `GMAIL_USER` y `GMAIL_APP_PASSWORD` se añaden al `.env.example` de la API.
- La aplicación falla al arrancar con un error descriptivo si alguna de estas variables no está definida (fail-fast).

### CA-6: Documentación OpenAPI
- El endpoint `POST /api/books/:id/send` está documentado en el fichero OpenAPI existente (`docs/api/`).
- Se documentan los esquemas de request body, respuestas `200`, `400`, `404` y `422`.

### CA-7: Tests
- Tests unitarios para la lógica de dominio / casos de error (libro no encontrado, sin path, archivo inexistente, email inválido).
- Tests de integración que verifiquen el flujo completo con un mock del servicio de email (no se envían emails reales en tests).
- Cobertura mínima del 80% en el código nuevo.

---

## Diseño técnico de alto nivel

### Nuevo endpoint

```
POST /api/books/:id/send
Content-Type: application/json

{ "email": "usuario@example.com" }
```

### Flujo interno (Hexagonal Architecture)

```
HTTP Route (Fastify)
  → SendBookByEmailUseCase
      → BookRepository.findById()        [Port]
      → FileSystemPort.fileExists()      [Port]
      → EmailPort.sendWithAttachment()   [Port]
```

### Nuevos puertos (interfaces de dominio)
- `EmailPort` — `sendWithAttachment(to, subject, body, filePath): Promise<void>`
- `FileSystemPort` — `fileExists(path: string): Promise<boolean>`

### Nuevos adaptadores de infraestructura
- `GmailEmailAdapter` — implementa `EmailPort` usando `nodemailer` con transporte Gmail.
- `NodeFileSystemAdapter` — implementa `FileSystemPort` usando `fs/promises`.

### Variables de entorno nuevas

| Variable | Descripción | Ejemplo |
|---|---|---|
| `GMAIL_USER` | Cuenta Gmail remitente | `biblioteca@gmail.com` |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de Google | `abcd efgh ijkl mnop` |
| `BOOKS_PATH` | Ruta absoluta en el host donde residen los archivos | `/home/user/books` |

---

## Tareas técnicas

### Tarea 1 — Infraestructura: volumen de libros y variables de entorno
**Branch**: `task/HU-036-01-infra-volumes-and-env`

- [ ] Añadir bind mount en `docker/docker-compose.dev.yml`: `${BOOKS_PATH}:/books:ro`.
- [ ] Añadir bind mount en `docker/docker-compose.prod.yml`: `${BOOKS_PATH}:/books:ro`.
- [ ] Añadir `BOOKS_PATH`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` al `apps/api/.env.example` con comentarios descriptivos.
- [ ] Añadir validación fail-fast en el arranque de la API para `GMAIL_USER` y `GMAIL_APP_PASSWORD`.

### Tarea 2 — Dominio: Value Object `EmailAddress` y errores de dominio
**Branch**: `task/HU-036-02-domain-email-vo-and-errors`

- [ ] Crear Value Object `EmailAddress` en `src/domain/shared/value-objects/EmailAddress.ts` con validación de formato.
- [ ] Crear errores de dominio específicos:
  - `BookFileNotFoundError` — libro sin `path` o archivo físico inexistente.
  - `EmailSendError` — fallo al enviar el correo.
- [ ] Tests unitarios para `EmailAddress` y los nuevos errores.

### Tarea 3 — Dominio: puertos `EmailPort` y `FileSystemPort`
**Branch**: `task/HU-036-03-domain-ports`

- [ ] Definir interfaz `EmailPort` en `src/domain/ports/EmailPort.ts`.
- [ ] Definir interfaz `FileSystemPort` en `src/domain/ports/FileSystemPort.ts`.
- [ ] Tests unitarios con mocks de ambos puertos.

### Tarea 4 — Caso de uso: `SendBookByEmailUseCase`
**Branch**: `task/HU-036-04-use-case`

- [ ] Implementar `SendBookByEmailUseCase` en `src/application/use-cases/SendBookByEmailUseCase.ts`.
- [ ] Orquesta: buscar libro → verificar path → verificar archivo → enviar email.
- [ ] Tests unitarios cubriendo todos los casos de error de CA-2 y el caso feliz.

### Tarea 5 — Infraestructura: adaptadores `GmailEmailAdapter` y `NodeFileSystemAdapter`
**Branch**: `task/HU-036-05-adapters`

- [ ] Instalar dependencia `nodemailer` y sus tipos (`@types/nodemailer`).
- [ ] Implementar `GmailEmailAdapter` en `src/infrastructure/email/GmailEmailAdapter.ts`.
- [ ] Implementar `NodeFileSystemAdapter` en `src/infrastructure/filesystem/NodeFileSystemAdapter.ts`.
- [ ] Tests de integración del adaptador de email con un mock del transporte `nodemailer`.

### Tarea 6 — HTTP: ruta `POST /api/books/:id/send`
**Branch**: `task/HU-036-06-http-route`

- [ ] Crear el schema Zod para el body `{ email: string }`.
- [ ] Registrar la ruta en Fastify con validación de schema.
- [ ] Mapear errores de dominio a códigos HTTP (`404`, `422`).
- [ ] Tests E2E del endpoint cubriendo todos los casos de CA-1 y CA-2 (`200` en el happy path).

### Tarea 7 — Documentación OpenAPI
**Branch**: `task/HU-036-07-openapi-docs`

- [ ] Documentar `POST /api/books/{id}/send` en el fichero OpenAPI de `docs/api/`.
- [ ] Incluir esquemas de request body, y respuestas `200`, `400`, `404`, `422`.

---

## Dependencias externas

| Dependencia | Motivo |
|---|---|
| `nodemailer` | Envío de email con adjunto via Gmail SMTP |
| Cuenta Gmail con contraseña de aplicación habilitada | Autenticación SMTP con 2FA activo |

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Gmail puede bloquear el envío si la contraseña de app no está bien configurada | Documentar el proceso de creación de contraseña de app en el `.env.example` |
| El archivo del libro puede ser muy grande para adjuntar por email | Aceptado en MVP; se puede añadir límite de tamaño en futuras HUs |
| El path del libro en DB es relativo al mount point `/books` del contenedor | El path en DB se concatena como `/books/{path}` dentro del contenedor; documentar esta convención en el `.env.example` |
