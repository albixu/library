# HU-029: Flexibilizar la validación del identificador de libro

## Contexto y motivación

Durante la carga inicial de datos en producción (HU-019 / script `seed:database`), se detectó que **1.310 de los 55.315 libros del catálogo fueron rechazados** por el Value Object `ISBN`, que valida estrictamente el checksum de ISBN-10 e ISBN-13.

El análisis de esos 1.310 identificadores revela que **no son ISBNs inválidos por error**, sino que pertenecen a distintas categorías de identificadores legítimos usados por editoriales, plataformas de distribución y colecciones institucionales:

| Categoría | Cantidad | Ejemplo |
|---|---|---|
| ISBN-13 alfanumérico (ej. MIT Sloan) | 1.168 | `53863MIT61304` |
| ISBN-13 numérico con checksum incorrecto | 49 | `9780240812939` |
| ISBN-10 numérico con checksum incorrecto | 11 | `0783442119` |
| Códigos cortos (< 10 chars) | 76 | `750004`, `56203` |
| Alfanuméricos longitud 10 | 2 | — |
| Longitud 11-12 | 3 | — |
| Longitud > 13 | 1 | `43574CHAZAUSTIN` |

La causa raíz es que el concepto de "ISBN" en el dominio es demasiado estricto para una biblioteca digital personal, donde el identificador único de un libro no tiene por qué cumplir el estándar ISO 2108. Lo que el dominio realmente necesita es un **identificador único de libro** (`BookIdentifier`) que:

1. Garantice unicidad dentro del catálogo.
2. Sea no vacío y tenga una longitud razonable.
3. Acepte el formato ISBN-10 e ISBN-13 cuando se proporcione uno válido, pero también cualquier otro código de identificación usado por editoriales o distribuidores.

---

## Historia de usuario

**Como** administrador del sistema,  
**quiero** que el sistema acepte cualquier código de identificación de libro que sea único y no vacío (no solo ISBNs con checksum válido),  
**para** poder cargar en la biblioteca todos los libros del catálogo, independientemente del sistema de identificación que haya usado su editorial o distribuidor.

---

## Criterios de aceptación

### CA-1: Renombrado conceptual
- El Value Object `ISBN` pasa a llamarse `BookIdentifier`.
- Todos los usos internos (entidades, repositorios, casos de uso, tests) se actualizan al nuevo nombre.
- El campo sigue llamándose `isbn` en la base de datos y en la API (compatibilidad hacia atrás).

### CA-2: Nueva regla de validación
El `BookIdentifier` acepta cualquier valor que cumpla:
- No está vacío ni es solo espacios en blanco.
- Longitud mínima: **1 carácter** (tras strip).
- Longitud máxima: **32 caracteres**.
- Solo contiene caracteres alfanuméricos, guiones (`-`) y guiones bajos (`_`).
- La validación es **case-insensitive** (se normaliza a mayúsculas).

### CA-3: Compatibilidad con ISBNs existentes
- Los 54.005 libros ya cargados en la DB con ISBNs válidos siguen funcionando sin cambios.
- `fromPersistence()` sigue sin validar (confía en la DB).

### CA-4: Mensajes de error claros
- El error cuando el identificador no cumple las reglas indica claramente el motivo: `Invalid book identifier: "XXX". Must be 1-32 alphanumeric characters (hyphens and underscores allowed).`

### CA-5: El seed carga los 1.310 libros faltantes
- Al re-ejecutar `seed:database` tras el cambio, los 1.310 libros previamente rechazados se insertan correctamente.
- El total de libros en la DB pasa de 54.005 a 55.315.

### CA-6: Tests actualizados
- Los tests unitarios del Value Object se actualizan para cubrir:
  - Identificadores alfanuméricos válidos (ej. `53863MIT61304`).
  - Códigos cortos válidos (ej. `750004`).
  - Identificadores con checksum de ISBN incorrecto que ahora son aceptados.
  - Valores que deben seguir siendo rechazados: vacíos, demasiado largos (>32), caracteres especiales no permitidos.
- Cobertura mínima: 100% del Value Object.

---

## Tareas técnicas

### Tarea 1: Actualizar el Value Object `ISBN` → `BookIdentifier`
- Renombrar la clase y el fichero.
- Implementar la nueva lógica de validación (CA-2).
- Mantener `create()` y `fromPersistence()`.
- Actualizar/añadir tests unitarios (CA-6).

### Tarea 2: Propagar el renombrado al dominio y la infraestructura
- Actualizar la entidad `Book` para usar `BookIdentifier`.
- Actualizar repositorios, casos de uso y cualquier otro componente que referencie `ISBN`.
- Verificar que lint y typecheck pasen.

### Tarea 3: Verificación del seed
- Re-ejecutar `seed:database` en el entorno de seed.
- Confirmar que el total de libros en DB es 55.315 y que `embedding IS NULL = 0`.

---

## Notas técnicas

- El campo en la DB se mantiene como `isbn` (no requiere migración).
- La columna tiene constraint `UNIQUE` — la unicidad sigue garantizada a nivel de DB.
- El web client no necesita cambios: trabaja con el campo `isbn` como string opaco.
- Los tests de integración y E2E no requieren cambios salvo que referencien la clase `ISBN` directamente.
