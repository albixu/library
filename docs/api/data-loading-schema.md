# Esquema de Carga de Datos Iniciales (JSON)

## Propósito

Este documento establece la estructura esperada para los archivos JSON utilizados en el proceso de consolidación y carga inicial de libros en el sistema (por ejemplo, `books_0001.json`).

El script de importación `apps/api/scripts/consolidate-books.ts` asume esta estructura para deserializar los libros, ignorar los duplicados (por ISBN) y preparar su posterior inserción o tratamiento en la base de datos y/u otros sistemas auxiliares (como embeddings u Ollama).

## Formato General

El archivo debe tener un array raíz de objetos JSON, donde cada objeto representará a un **Libro**.

```json
[
  { ... },
  { ... }
]
```

## Estructura del Objeto Libro

Cada objeto dentro del array debe o puede contener las siguientes propiedades:

| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :---: | :--- |
| **`id`** | `String` | Sí | El ISBN o identificador único del libro. Utilizado para deduplicación. |
| **`title`** | `String` | Sí | El título del libro. |
| **`authors`** | `Array<String>` | Sí | Lista de autores del libro (strings). |
| **`language`** | `String` | Sí | El idioma del libro (e.g., `"es"`, `"en"`). |
| **`pages`** | `String` | Sí | Número de páginas. Generalmente un string numérico, a veces puede venir con valores como `"star rating fill"`. El sistema asume string en ingesta. |
| **`publication_date`** | `String` | Sí | Fecha de publicación en un formato textual inteligible (e.g., `"September 2024"`). |
| **`description`** | `String` | Sí | La descripción o sinopsis del libro en el idioma original. |
| **`tags`** | `Array<String>` | Sí | Lista de etiquetas, temáticas o categorías a las que pertenece el libro. |
| **`type`** | `String` | Sí | El tipo general del contenido (e.g., `"technical"`). |
| **`format`** | `String` | Sí | El formato distribuido o importado (e.g., `"epub"`). |
| **`level`** | `String` / `null` | No | El nivel requerido de comprensión (e.g., `"Intermediate to advanced"`). Puede ser omitido o llegar como nulo en algunos registros. |
| **`translatedDescription`**| `String` / `null` | No | Contiene la descripción traducida a otro idioma (usualmente español en nuestro pipeline), frecuentemente adjunta posteriormente o provista directamente al final del proceso de IA. |

## Ejemplo Consolidado

A continuación se muestra un snippet de un registro válido:

```json
[
  {
    "id": "9781098181550",
    "language": "es",
    "level": "Intermediate to advanced",
    "title": "Estadística Práctica para Científicos de Datos, 2ª Edición",
    "authors": [
      "Peter Bruce",
      "Andrew Bruce",
      "Peter Gedeck"
    ],
    "pages": "368",
    "publication_date": "September 2024",
    "description": "Los métodos estadísticos son una parte clave de la ciencia de datos...",
    "tags": [
      "Data",
      "Data Science",
      "Data Science Tasks",
      "Statistics"
    ],
    "type": "technical",
    "format": "epub",
    "translatedDescription": "Este trabajo se ha traducido utilizando IA. Los métodos estadísticos..."
  }
]
```
