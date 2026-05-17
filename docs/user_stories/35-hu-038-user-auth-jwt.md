# HU-038: Gestión de Usuarios con Autenticación JWT

## Descripción

**Como** usuario registrado de la biblioteca digital,  
**Quiero** poder autenticarme en el sistema,  
**Para** acceder a las funcionalidades personalizadas de la aplicación.

---

## Contexto y motivación

Actualmente la aplicación no tiene ningún mecanismo de autenticación — todas las rutas son públicas. Esta historia introduce el sistema de identidad base del proyecto:

- Solo existe un tipo de usuario: `user` (usuarios comunes).
- No hay registro público — los usuarios son creados por el administrador vía un CLI script.
- El CLI script recibe un email, genera una contraseña aleatoria segura y la envía al usuario por email (Gmail).

En HU-037 se descomentó el icono `account_circle` en el header de forma decorativa. Esta historia le da funcionalidad completa: abre un modal de login y refleja el estado de sesión activa.

---

## Criterios de Aceptación

### CA-1: Icono de usuario — estado desconectado
- El icono `account_circle` en el header es clickable.
- Al hacer click se abre un modal con:
  - Campo `email`.
  - Campo `password`.
  - Link "Olvidé mi contraseña".
- Si las credenciales son incorrectas → mensaje genérico `"Credenciales incorrectas"` sin revelar detalles (no indicar si el email existe o no).

### CA-2: Login exitoso
- Si las credenciales son correctas → el modal se cierra.
- El icono `account_circle` cambia visualmente para indicar sesión activa.
- Se muestra el email del usuario autenticado junto al icono.

### CA-3: Menú de usuario autenticado
- El email / icono del usuario logueado es clickable.
- Al hacer click se muestra un menú desplegable con la opción `"Desconectarse"`.
- Al seleccionar `"Desconectarse"` → la sesión se cierra completamente (cookies eliminadas, estado limpiado).

### CA-4: Recuperación de contraseña
- El link "Olvidé mi contraseña" en el modal de login lleva al flujo de recuperación.
- El usuario introduce su email y recibe un link de reset por Gmail.
- El link lleva a una página donde puede ingresar su nueva contraseña.
- El token de reset es de un solo uso y tiene expiración.
- Tras el reset exitoso → el usuario es redirigido al login.

### CA-5: Creación de usuarios (CLI)
- Existe un script CLI ejecutable desde `apps/api/`.
- Recibe un email como parámetro obligatorio: `npm run create-user -- --email usuario@example.com`.
- Genera una contraseña aleatoria con política segura (mínimo 16 caracteres, letras, números y símbolos).
- Crea el usuario en la base de datos con la contraseña hasheada.
- Envía la contraseña generada al email indicado vía Gmail.
- Si el email ya existe en la base de datos → error descriptivo, sin duplicar el usuario.

### CA-6: Seguridad
- El JWT se almacena en una `httpOnly` cookie (no accesible desde JavaScript).
- Expiración del access token: 7 días.
- Refresh token implementado para renovación silenciosa de la sesión.
- Las contraseñas se hashean con `argon2` o `bcryptjs`.
- El endpoint de login aplica rate limiting para mitigar fuerza bruta.

### CA-7: Endpoints de API
- `POST /api/auth/login` — autenticación con email y password.
- `POST /api/auth/logout` — invalidación de la sesión (limpia cookies).
- `POST /api/auth/refresh` — renovación silenciosa del access token usando el refresh token.
- `POST /api/auth/forgot-password` — solicitud de reset; envía email con token.
- `POST /api/auth/reset-password` — reset efectivo de contraseña con token de un solo uso.

### CA-8: Tests
- Tests unitarios para toda la lógica de dominio (entidad `User`, Value Objects, casos de uso).
- Tests de integración para los endpoints de autenticación.
- Tests E2E para los flujos de login, logout y refresh.
- Cobertura mínima del 80% en el código nuevo.

---

## Diseño técnico de alto nivel

### Entidad de dominio: `User`

```typescript
// src/domain/user/User.ts
User {
  id: UserId          // Value Object (UUID)
  email: EmailAddress // Value Object (validado)
  passwordHash: string
  createdAt: Date
}
```

### Flujos de autenticación (Hexagonal Architecture)

```
POST /api/auth/login
  → LoginUseCase
      → UserRepository.findByEmail()   [Port]
      → PasswordHasher.verify()        [Port]
      → JwtService.signTokens()        [Port]
      → Response: set httpOnly cookies

POST /api/auth/refresh
  → RefreshTokenUseCase
      → JwtService.verifyRefresh()     [Port]
      → JwtService.signTokens()        [Port]
      → Response: nuevas cookies

POST /api/auth/logout
  → LogoutUseCase
      → Response: clear cookies

POST /api/auth/forgot-password
  → ForgotPasswordUseCase
      → UserRepository.findByEmail()   [Port]
      → PasswordResetTokenRepository.create() [Port]
      → EmailPort.send()               [Port]

POST /api/auth/reset-password
  → ResetPasswordUseCase
      → PasswordResetTokenRepository.findValid() [Port]
      → PasswordHasher.hash()          [Port]
      → UserRepository.updatePassword() [Port]
      → PasswordResetTokenRepository.invalidate() [Port]
```

### Esquema de base de datos

```sql
-- Tabla users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla password_reset_tokens
CREATE TABLE password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at    TIMESTAMP WITH TIME ZONE
);
```

### Cookies JWT

| Cookie | Tipo | Expiración |
|---|---|---|
| `access_token` | httpOnly, Secure, SameSite=Strict | 7 días |
| `refresh_token` | httpOnly, Secure, SameSite=Strict | 30 días |

### Variables de entorno nuevas

| Variable | Descripción | Ejemplo |
|---|---|---|
| `JWT_SECRET` | Secreto para firmar access tokens | `super-secret-key-256bits` |
| `JWT_REFRESH_SECRET` | Secreto para firmar refresh tokens | `another-secret-key-256bits` |
| `PASSWORD_RESET_TOKEN_EXPIRY_HOURS` | Expiración del token de reset | `24` |

---

## Tareas técnicas

### Tarea 1 — DB: migración y schema Drizzle para `users` y `password_reset_tokens`
**Branch**: `task/HU-038-01-db-schema`

- [ ] Crear migración Drizzle con las tablas `users` y `password_reset_tokens`.
- [ ] Definir los schemas Drizzle correspondientes en `src/infrastructure/db/schema/`.
- [ ] Ejecutar `npm run db:generate && npm run db:migrate` y verificar que aplica correctamente.

### Tarea 2 — Dominio: entidad `User`, Value Objects y errores
**Branch**: `task/HU-038-02-domain-user`

- [ ] Crear Value Object `UserId` en `src/domain/user/value-objects/UserId.ts`.
- [ ] Reutilizar o verificar `EmailAddress` creado en HU-036.
- [ ] Crear entidad `User` en `src/domain/user/User.ts` con constructor privado y métodos factoría `create()` / `fromPersistence()`.
- [ ] Crear errores de dominio específicos:
  - `InvalidCredentialsError`
  - `UserAlreadyExistsError`
  - `PasswordResetTokenExpiredError`
  - `PasswordResetTokenInvalidError`
- [ ] Tests unitarios para la entidad y Value Objects.

### Tarea 3 — Dominio: puertos de autenticación
**Branch**: `task/HU-038-03-domain-ports`

- [ ] Definir interfaz `UserRepository` en `src/domain/user/ports/UserRepository.ts`.
- [ ] Definir interfaz `PasswordHasher` en `src/domain/user/ports/PasswordHasher.ts`.
- [ ] Definir interfaz `JwtService` en `src/domain/user/ports/JwtService.ts`.
- [ ] Definir interfaz `PasswordResetTokenRepository` en `src/domain/user/ports/PasswordResetTokenRepository.ts`.
- [ ] Tests unitarios con mocks de los puertos.

### Tarea 4 — Casos de uso: login, logout, refresh
**Branch**: `task/HU-038-04-use-cases-auth`

- [ ] Implementar `LoginUseCase` en `src/application/use-cases/auth/LoginUseCase.ts`.
- [ ] Implementar `LogoutUseCase` en `src/application/use-cases/auth/LogoutUseCase.ts`.
- [ ] Implementar `RefreshTokenUseCase` en `src/application/use-cases/auth/RefreshTokenUseCase.ts`.
- [ ] Tests unitarios para los tres casos de uso cubriendo casos feliz y de error.

### Tarea 5 — Casos de uso: recuperación de contraseña
**Branch**: `task/HU-038-05-use-cases-password-reset`

- [ ] Implementar `ForgotPasswordUseCase` en `src/application/use-cases/auth/ForgotPasswordUseCase.ts`.
- [ ] Implementar `ResetPasswordUseCase` en `src/application/use-cases/auth/ResetPasswordUseCase.ts`.
- [ ] Tests unitarios cubriendo token expirado, token inválido y flujo exitoso.

### Tarea 6 — Infraestructura: adaptadores de autenticación
**Branch**: `task/HU-038-06-infra-adapters`

- [ ] Instalar dependencias: `jsonwebtoken`, `argon2` (o `bcryptjs`) y sus tipos.
- [ ] Implementar `DrizzleUserRepository` en `src/infrastructure/db/repositories/DrizzleUserRepository.ts`.
- [ ] Implementar `DrizzlePasswordResetTokenRepository` en `src/infrastructure/db/repositories/DrizzlePasswordResetTokenRepository.ts`.
- [ ] Implementar `Argon2PasswordHasher` (o `BcryptPasswordHasher`) en `src/infrastructure/auth/`.
- [ ] Implementar `JwtServiceImpl` en `src/infrastructure/auth/JwtServiceImpl.ts`.
- [ ] Añadir `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PASSWORD_RESET_TOKEN_EXPIRY_HOURS` al `.env.example`.
- [ ] Validación fail-fast en arranque si `JWT_SECRET` o `JWT_REFRESH_SECRET` no están definidos.
- [ ] Tests de integración de los repositorios y del `JwtServiceImpl`.

### Tarea 7 — HTTP: rutas de autenticación
**Branch**: `task/HU-038-07-http-routes`

- [ ] Registrar rutas en Fastify bajo el prefijo `/api/auth/`:
  - `POST /login`, `POST /logout`, `POST /refresh`, `POST /forgot-password`, `POST /reset-password`.
- [ ] Schemas Zod para bodies y respuestas.
- [ ] Configurar cookies `httpOnly`, `Secure`, `SameSite=Strict`.
- [ ] Aplicar rate limiting al endpoint de login.
- [ ] Mapear errores de dominio a códigos HTTP (`401`, `400`, `409`, `422`).
- [ ] Tests E2E de todos los endpoints.

### Tarea 8 — CLI: script de creación de usuarios
**Branch**: `task/HU-038-08-cli-create-user`

- [ ] Crear script `apps/api/scripts/create-user.ts` (o `.js`) ejecutable con `npm run create-user`.
- [ ] Parámetro obligatorio `--email`.
- [ ] Generar contraseña aleatoria segura (≥ 16 caracteres: letras, números, símbolos).
- [ ] Hashear la contraseña y crear el usuario en DB.
- [ ] Enviar email con la contraseña generada usando el `GmailEmailAdapter` de HU-036.
- [ ] Manejo de error si el email ya existe.
- [ ] Añadir script en `package.json`: `"create-user": "tsx scripts/create-user.ts"`.

### Tarea 9 — Web client: modal de login y estado de sesión
**Branch**: `task/HU-038-09-web-login-modal`

- [ ] Crear `LoginModalComponent` (standalone) con campos email, password y link "Olvidé mi contraseña".
- [ ] Crear `AuthService` en `apps/web-client/src/app/auth/` con métodos `login()`, `logout()`, `refreshToken()`.
- [ ] Gestionar el estado de sesión con un Signal o BehaviorSubject (email del usuario autenticado).
- [ ] Conectar el icono `account_circle` del header: click → abre modal si no autenticado.
- [ ] Tras login exitoso → icono cambia de estado y muestra el email del usuario.
- [ ] Menú desplegable con opción "Desconectarse" al hacer click en el email/icono de usuario logueado.
- [ ] Tests unitarios del `LoginModalComponent` y del `AuthService`.

### Tarea 10 — Web client: página de reset de contraseña
**Branch**: `task/HU-038-10-web-password-reset`

- [ ] Crear ruta `/reset-password?token=...` en el router de Angular.
- [ ] Crear `ResetPasswordPageComponent` con campo de nueva contraseña y confirmación.
- [ ] Al enviar → llamar a `POST /api/auth/reset-password` con el token de la URL.
- [ ] Redirigir al login tras reset exitoso.
- [ ] Mostrar error descriptivo si el token es inválido o expirado.
- [ ] Tests unitarios del componente.

### Tarea 11 — Documentación OpenAPI
**Branch**: `task/HU-038-11-openapi-docs`

- [ ] Documentar los cinco endpoints de `/api/auth/` en el fichero OpenAPI de `docs/api/`.
- [ ] Incluir schemas de request body y todas las respuestas posibles.

---

## Dependencias externas

| Dependencia | Motivo |
|---|---|
| `jsonwebtoken` + `@types/jsonwebtoken` | Firma y verificación de JWTs |
| `argon2` o `bcryptjs` | Hashing seguro de contraseñas |
| `nodemailer` (HU-036, ya instalado) | Envío de emails de reset y bienvenida |
| Cuenta Gmail (HU-036, ya configurada) | SMTP para envío de emails |

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Rotación de refresh tokens no implementada (token reuse attack) | Aceptado en MVP; implementar rotación en una HU posterior |
| El script CLI requiere acceso a la base de datos en producción | Documentar que debe ejecutarse en el contenedor de la API o con las variables de entorno correctas |
| Rate limiting en login puede afectar flujos de testing | Deshabilitar rate limiting en entorno `test` mediante variable de entorno o config |

---

**Historia creada**: Domingo, 10 de Mayo, 2026
**Estimación**: 8-10 horas
**Prioridad**: Alta
**Complejidad**: Alta
