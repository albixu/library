# HU-041 — Eliminar tema claro y opción de cambio de tema

## Metadata

| Campo         | Valor                                           |
|---------------|-------------------------------------------------|
| **ID**        | HU-041                                          |
| **Épica**     | UI / Experiencia de usuario                     |
| **Prioridad** | Baja                                            |
| **Estado**    | Pendiente                                       |
| **Rama**      | `feature/HU-041-remove-light-theme`             |

---

## Historia de Usuario

**Como** usuario de la aplicación,  
**quiero** que la interfaz siempre use el tema oscuro,  
**para** tener una experiencia visual consistente y sin opciones innecesarias en la cabecera.

---

## Contexto y Motivación

La aplicación actualmente permite al usuario alternar entre el tema claro y el tema oscuro desde la cabecera. Esta funcionalidad añade complejidad de código y CSS sin aportar valor real al producto: el diseño está concebido y optimizado para el tema oscuro. Se decide eliminar el soporte para el tema claro por completo, quedando el tema oscuro como único tema de la aplicación, hardcodeado y sin posibilidad de cambio.

---

## Criterios de Aceptación

### CA-01 — El selector de tema ya no existe en la cabecera
- **Dado** que el usuario visualiza la cabecera de la aplicación,
- **cuando** está autenticado o no autenticado,
- **entonces** no aparece ningún botón, icono ni control para cambiar de tema.

### CA-02 — La aplicación siempre carga con el tema oscuro
- **Dado** que el usuario accede a la aplicación,
- **cuando** carga cualquier página,
- **entonces** la interfaz renderiza exclusivamente con los estilos del tema oscuro.

### CA-03 — No existe lógica de alternancia de tema en el código
- **Dado** el código fuente del cliente web,
- **cuando** se revisa la lógica de gestión de temas,
- **entonces** no existe ningún servicio, signal, variable de estado ni clase CSS relacionada con el tema claro o la alternancia entre temas.

### CA-04 — Los estilos CSS del tema claro han sido eliminados
- **Dado** el código CSS/SCSS del cliente web,
- **cuando** se revisan los estilos,
- **entonces** no existe ninguna variable CSS, clase, selector ni bloque de estilos correspondiente al tema claro (ej. `[data-theme="light"]`, `.light-theme`, `prefers-color-scheme: light` o equivalentes).

### CA-05 — Los estilos del tema oscuro permanecen funcionales
- **Dado** que el tema oscuro es el único tema,
- **cuando** se navega por todas las vistas de la aplicación,
- **entonces** todos los componentes se visualizan correctamente sin artefactos visuales ni variables CSS sin resolver.

---

## Tareas Técnicas

### T1 — Eliminar el componente/botón de cambio de tema de la cabecera
- Localizar el componente o elemento en el `HeaderComponent` responsable del toggle de tema.
- Eliminar el elemento del template HTML.
- Eliminar el código TypeScript asociado (handler, inyección de servicio, etc.).
- Eliminar el CSS/SCSS asociado al control dentro del header.

### T2 — Eliminar el servicio (o lógica) de gestión de temas
- Localizar el servicio, signal o store que gestiona el estado del tema activo.
- Eliminar el servicio completo si solo gestiona el tema.
- Si el servicio tiene más responsabilidades, eliminar únicamente la parte relacionada con el tema.
- Eliminar todas las referencias e inyecciones de dicho servicio en los componentes que lo consumen.

### T3 — Limpiar estilos CSS/SCSS del tema claro
- Localizar todos los archivos de estilos con definiciones de variables, clases o selectores del tema claro.
- Eliminar los bloques correspondientes al tema claro (ej. `[data-theme="light"]`, `@media (prefers-color-scheme: light)`, variables específicas del tema claro, etc.).
- Asegurarse de que las variables CSS del tema oscuro estén definidas de forma global y sin condicionales de tema.

### T4 — Verificación visual y limpieza final
- Navegar por todas las vistas de la aplicación (catálogo, detalle de libro, favoritos, recomendaciones, autenticación, perfil si aplica) y verificar que no hay roturas visuales.
- Ejecutar ESLint y corregir cualquier error o warning introducido por la limpieza.
- Verificar que no quedan imports, variables ni referencias a código eliminado.

---

## Definición de Hecho (DoD)

- [ ] El selector de tema ha sido eliminado del `HeaderComponent`.
- [ ] No existe ningún servicio ni lógica de gestión del tema activo.
- [ ] No existen clases, variables ni bloques CSS del tema claro en ningún archivo de estilos.
- [ ] El tema oscuro es el único tema y funciona correctamente en todas las vistas.
- [ ] ESLint: 0 errores, 0 warnings.
- [ ] TypeCheck: sin errores de tipos.
- [ ] Todos los tests existentes siguen en verde (no se añaden tests nuevos salvo que sean necesarios para verificar la ausencia de regresiones).
- [ ] Documentación en Notion actualizada (Product Overview: HU-041 completada).
