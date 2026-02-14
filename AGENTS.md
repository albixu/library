# AGENTS.md - AI Coding Agent Guidelines

Este documento es la fuente de verdad para los agentes de IA que trabajan en este repositorio. Define los estándares técnicos, el protocolo de interacción y los flujos de trabajo obligatorios.

## 1. Protocolo de Interacción y Errores
- **Detección de Errores:** Si detectas un error en el código existente o una vulnerabilidad:
    1. **Detente** inmediatamente.
    2. Explica el error y la causa raíz.
    3. Propón la solución técnica siguiendo los estándares del proyecto.
    4. **Solicita confirmación explícita** antes de aplicar cualquier cambio correctivo.
- **Concisión:** Sé directo y evita explicaciones innecesarias a menos que se trate de una corrección de error crítico.

## 2. Project Overview
**Library** es un sistema de gestión de biblioteca digital personal compuesto por:
- **API (Node.js 20+ / Fastify)**: Lógica central y persistencia.
- **CLI (Commander.js)**: Herramientas de terminal.
- **Client Web (Angular)**: Interfaz de usuario (Última versión estable).
- **Core Técnico**: TypeScript (ESM), PostgreSQL 16 + pgvector, Drizzle ORM, Zod, Vitest.
- **Arquitectura**: Hexagonal (Ports & Adapters) y estrictamente **Domain-Driven Design (DDD)**.

## 3. Git Workflow & Commits
Se debe seguir esta estructura de ramas jerárquica para cada desarrollo:
1. **Dev:** Rama de desarrollo que sale desde `main`. Esta rama existirá siempre, y es desde donde saldran las ramas de nuevos desarrollos y donde se mergearan para ser probados antes de pasarlos a `main` para ponerlos en producción
2. **Historia de Usuario:** Rama base desde `dev` (ej. `feature/US-123-titulo`). Es la rama que representa la historia de usuario. Cada historia de usuario tendrá su rama
3. **Subtareas:** Ramas técnicas desde la rama de historia (ej. `task/US-123-db-schema`).
4. **Integración:** Cada subtarea se integra en la rama de historia mediante **merge**. La rama de la historia se integra con la rama `dev` mediante una **Pull request**
5. **Commits:** Seguir el estándar de **Conventional Commits**:
   - `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `style:`.
6. **Pase a producción:** Tras probar la funcionalidades completas en la rama `dev` se mergearán a `main` mediante un **Pull Request**

### 3.1 Cosas trabajar con las tareas y las ramas.
1. Una vez realizada una subtarea, se realizará un merge automático de la subtarea a la rama de la historia correspondiente.
2. A continuación se actualizará la rama de la historia y se realizará la siguiente subtarea siguiendo el mismo proceso.
3. Así hasta terminar con todas las subtareas.
4. Una vez realizadas todas las subtareas y estar todas estas mergeadas en la rama de la historia, se creará un PR de la rama de la historia a la rama dev. Esta no podrá ser aprobada ni mergeada por el agente. Requiere de una revisión y aprobado manual.

**Importante**
Ten en cuenta que SI tienes permisos para mergear las ramas de las subtareas en las ramas de las historias.
NO tienes permisos para aprobar ni mergear PR de historias que van a la rama dev.

## 4. Build/Lint/Test Commands (apps/api-cli/)

```bash
# Desarrollo y Build
npm run dev              # Server con hot reload
npm run build            # Compilar TS
npm run lint:fix         # ESLint con auto-fix (Estilo Prettier)

# Testing (Ejecutar preferiblemente en Docker)
docker exec library-api-dev npm test                 # Tests unitarios
docker exec library-api-dev npm run test:integration # Tests de integración (PostgreSQL + Ollama)
docker exec library-api-dev npm run test:e2e         # Tests end-to-end (HTTP + CLI)
docker exec library-api-dev npm run test:coverage    # Cobertura de código

# Test específico
docker exec library-api-dev npx vitest run tests/unit/domain/entities/Book.test.ts
docker exec library-api-dev npx vitest run --config vitest.integration.config.ts tests/integration/...

# Database (Drizzle)
npm run db:generate && npm run db:migrate

```

## 5. Project Structure

```
/
├── apps/
│   ├── api-cli/             # Backend & Terminal Tools
│   │   ├── src/
│   │   │   ├── domain/      # Business Logic (Pure TS, NO dependencies)
│   │   │   └── shared/      # Utilities
│   │   └── tests/           # Unit & Functional tests
│   └── web-client/          # Angular Application (DDD structure)
├── docs/                    
|   |__ api                  # API Documentation (OpenAPI)
|   |__ desing_docs          # Design docs & Architecture
|   |__ bd                   # DB structure and initial data
|
└── docker/

```


## 6. Critical Configurations

### tsconfig.app.json

```json
{ "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**"] }
```

## 7. Code Style & Standards

* **JavaScript/TS:** Usar los últimos estándares (ES2024+).
* **Imports:** Requisito ESM: **Siempre usar extensión `.js**` en imports locales.
* **Naming:**
* Clases/Entidades: `PascalCase` (ej. `Book.ts`).
* Utils/Functions: `camelCase`.
* Booleans: prefijo `is`/`has`.


* **Inmutabilidad:**
* Constructores privados + métodos factoría estáticos.
* Uso de `readonly` y `Object.freeze(this)`.


* **Seguridad (Prioridad Máxima):**
* Aplicar medidas contra **OWASP Top 10** (Inyección, XSS, etc.).
* API: Validación estricta con Zod y sanitización de inputs.
* Web: Uso de mecanismos nativos de Angular para evitar XSS (no usar `innerHTML`).



## 8. Testing Strategy

* **Lógica de negocio crítica:** 100% cubierto por tests.
* **Funcionalidades visibles para el usuario:** Un mínimo del 80% de cobertura.
* **Unit Tests:** Obligatorios para toda la lógica de negocio en el Domain Layer.
* **Functional Tests:** Obligatorios para probar la integración de componentes y flujos de la API/Web.
* **Patrón:** Seguir el formato `describe/it` con nombres claros: `should {expected behavior}`.

### 8.1 Cosas a evitar en el testing.
El agente no borrará ningún test que falle para hacer que pasen todos los tests.

### TDD Mandatory
1. Write test FIRST → run → MUST FAIL
2. Implement MINIMUM code to pass
3. Refactor keeping tests green

### Expected Test Counts

- Unit: ~345
- Integration: ~63
- E2E: ~30 (+ 2 skipped for 503 scenarios)


## 9. Domain-Driven Design (DDD) Rules

1. **Domain Isolation:** La capa de dominio no tiene dependencias externas.
2. **Value Objects:** Inmutables, se validan a sí mismos y se comparan por valor.
3. **Entities:** Identificadas por ID único.
4. **Factories:** Usar `create()` para entrada de usuario (valida) y `fromPersistence()` para DB (confía).
5. **Errors:** Propagar errores de dominio específicos (`DomainError`) hacia arriba.

## 10. Definition of Done (DoD)

Una tarea solo se considera finalizada si cumple:

* [ ] Código limpio (Lint/Typecheck OK).
* [ ] Mínimo **80% de tests unitarios** y **100% de tests funcionales** nuevos/afectados.
* [ ] Actualización de `README.md` y documentos en `/docs` si el diseño ha cambiado.
* [ ] Commits realizados con el estándar Conventional Commits.
* [ ] 0 lint errors, 0 type errors, all tests green, build success.
