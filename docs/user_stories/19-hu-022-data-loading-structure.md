# HU-022: Documentación de la Estructura de Carga de Datos

## Descripción

**Como** desarrollador y/o Data Engineer,  
**Quiero** disponer de una definición clara de la estructura requerida para los archivos JSON de carga de datos,  
**Para** garantizar que los futuros archivos proporcionados cumplan con las restricciones del sistema de consolidación y evitar errores al ingerir nuevos libros en la base de datos.
  
## Contexto

Actualmente, el sistema ingesta la información bibliográfica utilizando el script `consolidate-books.ts` sobre archivos remotos o locales (como `books_0001.json`). Pese a que el código asume una estructura fija en estos archivos, esta estructura no se encuentra formalmente documentada. Documentarla facilitará enormemente la futura provisión y auditoría de datos, definiendo campos obligatorios y opcionales.

## Documentación Relacionada

- **Afectación**: `docs/api/`
- **Fichero de Origen de Referencia**: `docs/db/initial_data/books_0001.json`

---

## Criterios de Aceptación

### AC-1: Creación del documento de esquema

- [ ] Se crea un archivo dedicado a la estructura de carga (ej: `docs/api/data-loading-schema.md`).
- [ ] El documento desglosa el tipo JSON esperado (Array de Objetos).
- [ ] El documento detalla cada campo utilizado (`id`, `language`, `level`, `title`, `authors`, `pages`, `publication_date`, `description`, `tags`, `type`, `format`, `translatedDescription`) indicando su tipo de dato (string, array) y si es opcional (como ocurrió con `level` en algunos registros o `translatedDescription`).
- [ ] Se incorpora un ejemplo representativo JSON extraído y simplificado de `books_0001.json`.

---

## Tareas de Implementación

### Tarea 1: Redactar la documentación del esquema JSON

**Estimación**: 1 hora  
**Branch**: `task/HU-022-data-loading-schema`

- [ ] Crear el archivo `docs/api/data-loading-schema.md` y agregar la definición técnica de los campos soportados.
- [ ] Incluir un contexto de por qué y cómo es utilizado por las utilidades de consola o scripts de ingestión.

## Definition of Done

- ✅ Documentación oficial generada, revisada y clara.
- ✅ Ejemplo de snippet JSON validísimo insertado.

---

**Historia creada**: Martes, 1 de Marzo, 2026  
**Estimación**: 1 hora  
**Prioridad**: Media  
**Complejidad**: Baja
