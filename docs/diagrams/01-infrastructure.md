# Diagrama de Infraestructura — Servicios del Sistema

Este diagrama representa la infraestructura de despliegue del sistema **Library** en entorno de desarrollo. Muestra los 5 contenedores Docker que componen el sistema, sus tecnologías base, los puertos expuestos al host y las dependencias de comunicación entre ellos dentro de la red Docker interna `library-network`.

```mermaid
graph TD
    %% ── External Actor ──────────────────────────────────────────
    Browser(["🌐 Browser\n(Usuario)"])
    Host(["💻 Host Machine\n(Developer)"])

    %% ── Docker Network: library-network ─────────────────────────
    subgraph Docker["🐳 Docker — library-network (bridge)"]

        subgraph WebClient["library-web-client"]
            WC["📦 Angular 21.2\nNode 20 (dev server)\n──────────────\n:4200 → Angular App\n:6006 → Storybook"]
        end

        subgraph API["library-api-dev"]
            AP["📦 Node.js 20 / Fastify 5\nTypeScript ESM\n──────────────\n:3000 → REST API"]
        end

        subgraph DB["library-postgres"]
            PG["📦 pgvector/pgvector:pg16\nPostgreSQL 16 + pgvector\n──────────────\n:5432 → TCP"]
        end

        subgraph OllamaEmb["library-ollama-embeddings"]
            OE["📦 ollama/ollama:latest\nModelo: nomic-embed-text\n768 dimensiones\n──────────────\n:11434 → HTTP API"]
        end

        subgraph OllaTrans["library-ollama-translations"]
            OT["📦 ollama/ollama:latest\nModelo: llama3.2:1b\nTraducción ES\n──────────────\n:11434 → HTTP API\n(host: 11435)"]
        end
    end

    %% ── Conexiones externas (host → containers) ─────────────────
    Browser -->|"HTTP :4200"| WC
    Browser -->|"HTTP :6006\n(Storybook)"| WC
    Host    -->|"HTTP :3000\n(REST API / dev)"| AP
    Host    -->|"TCP :5432\n(DB client)"| PG
    Host    -->|"HTTP :11434"| OE
    Host    -->|"HTTP :11435"| OT

    %% ── Conexiones internas (containers entre sí) ───────────────
    WC -->|"HTTP → api:3000\n(REST API calls)"| AP
    AP -->|"TCP → postgres:5432\n(Drizzle ORM / SQL)"| PG
    AP -->|"HTTP → ollama-embeddings:11434\nPOST /api/embeddings\n(nomic-embed-text)"| OE
    AP -->|"HTTP → ollama-translations:11434\nPOST /api/generate\n(llama3.2:1b, 3 retries)"| OT

    %% ── Healthcheck ─────────────────────────────────────────────
    AP -.->|"depends_on (healthy)"| PG

    %% ── Estilos ─────────────────────────────────────────────────
    classDef service fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#ffffff
    classDef db      fill:#1a4731,stroke:#4ade80,stroke-width:2px,color:#ffffff
    classDef ai      fill:#4a1a4a,stroke:#c084fc,stroke-width:2px,color:#ffffff
    classDef actor   fill:#374151,stroke:#9ca3af,stroke-width:2px,color:#ffffff

    class WC,AP service
    class PG db
    class OE,OT ai
    class Browser,Host actor
```

## Notas

| Servicio | Imagen base | Puerto host | Puerto interno | Red interna |
|---|---|---|---|---|
| `library-web-client` | Node 20 (custom) | 4200, 6006 | 4200, 6006 | `web-client:4200` |
| `library-api-dev` | Node 20 (custom) | 3000 | 3000 | `api:3000` |
| `library-postgres` | `pgvector/pgvector:pg16` | 5432 | 5432 | `postgres:5432` |
| `library-ollama-embeddings` | `ollama/ollama:latest` | 11434 | 11434 | `ollama-embeddings:11434` |
| `library-ollama-translations` | `ollama/ollama:latest` | 11435 | 11434 | `ollama-translations:11434` |

> **Nota sobre Ollama Translations**: el puerto interno del contenedor es siempre `11434` (puerto por defecto de Ollama), pero se mapea al puerto `11435` del host para evitar conflictos con el servicio de embeddings.
