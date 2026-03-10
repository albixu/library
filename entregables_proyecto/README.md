# Documentación a entregar 📚

## Presentación
Se puede ver en la siguiente url:
- **https://biblioteca-digital-perso-t0jbnnz.gamma.site/**


## Design docs
Design docs del proyecto:
- **docs/design_docs/**


En caso de que no se pueda acceder al enlace anterior se puede encontrar un archivo .pptx en este mismo proyecto: 
- **entregables_proyecto/Biblioteca-digital-personal-con-busqueda-semantica-basada-en-IA.pptx**


## API
### OpenApi:

- **docs/api/openapi.yaml**
- Acceso a la interface de swagger (hay que levantar el entorno de desarrollo): http://localhost:3000/docs

```bash
docker-compose up -d
```

### Esquema para la carga de datos:
- **docs/api/data-loading-schema.md**


## Diagramas
Diagramas del proyecto:
- **docs/diagrams/**


## Diseño cliente web
Diseños generados con stitch:
- **docs/web/designs/**

Documentación sobre los componentes (storybooks):
- **docs/web/story_books/**
- Acceso a la herramiento storyBook (hay que levantar el entorno de desarrollo): http://localhost:6006/

```bash
docker-compose up -d
docker exec -it library-web-client npm run storybook
```