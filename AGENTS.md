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
1. **Historia de Usuario:** Rama base desde `main` (ej. `feature/US-123-titulo`).
2. **Subtareas:** Ramas técnicas desde la rama de historia (ej. `task/US-123-db-schema`).
3. **Integración:** Cada tarea se integra en la rama de historia mediante **Pull Request**.
4. **Commits:** Seguir el estándar de **Conventional Commits**:
   - `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `style:`.

## 4. Build/Lint/Test Commands (apps/api-cli/)

```bash
# Desarrollo y Build
npm run dev              # Server con hot reload
npm run build            # Compilar TS
npm run lint:fix         # ESLint con auto-fix (Estilo Prettier)

# Testing (Ejecutar preferiblemente en Docker)
docker exec -it library-api-dev npm test                 # Todos los tests
docker exec -it library-api-dev npm run test:coverage    # Cobertura
npx vitest run tests/unit/domain/entities/Book.test.ts   # Test específico

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
├── docs/                    # Design docs & Architecture
└── docker/

```

## 6. Code Style & Standards

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



## 7. Testing Strategy

* **Unit Tests:** Obligatorios para toda la lógica de negocio en el Domain Layer.
* **Functional Tests:** Obligatorios para probar la integración de componentes y flujos de la API/Web.
* **Patrón:** Seguir el formato `describe/it` con nombres claros: `should {expected behavior}`.
* **Métricas:** Mínimo **80% de cobertura** en lógica de negocio.

## 8. Domain-Driven Design (DDD) Rules

1. **Domain Isolation:** La capa de dominio no tiene dependencias externas.
2. **Value Objects:** Inmutables, se validan a sí mismos y se comparan por valor.
3. **Entities:** Identificadas por ID único.
4. **Factories:** Usar `create()` para entrada de usuario (valida) y `fromPersistence()` para DB (confía).
5. **Errors:** Propagar errores de dominio específicos (`DomainError`) hacia arriba.

## 9. Definition of Done (DoD)

Una tarea solo se considera finalizada si cumple:

* [ ] Código limpio (Lint/Typecheck OK).
* [ ] Mínimo **80% de tests unitarios** y **100% de tests funcionales** nuevos/afectados.
* [ ] Actualización de `README.md` y documentos en `/docs` si el diseño ha cambiado.
* [ ] Commits realizados con el estándar Conventional Commits.
