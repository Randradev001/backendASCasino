# Documentación ADP Casino

Este es el índice de entrada para personas y asistentes que continúen el proyecto. La
documentación distingue el estado actual de ADP Casino de estudios históricos de CONEX.

## Lectura rápida

1. [Estado actual](ai/CURRENT-STATE.md): qué está implementado, rutas, datos observados y
   pendientes.
2. [API y permisos](ai/API-AND-PERMISSIONS.md): contratos HTTP y códigos de Seguridad.
3. [Manual para asistentes](ai/ASSISTANT-RUNBOOK.md): cómo investigar, cambiar, probar y
   entregar trabajo.
4. [Base independiente Casino](migration/casino-database-scope.md): alcance de la base y
   exclusión de maestros CONEX.
5. [Solicitud de pedidos](migration/solicitud-pedidos-implementation.md): reglas del flujo
   operativo y menús.
6. [Dashboard BI](migration/casino-bi-dashboard.md): fuentes e indicadores ejecutivos.
7. [Arquitectura de Seguridad](architecture/security.md): autenticación, roles y
   asignaciones.
8. [Seguridad antes y después](migration/security-before-after-2026-10-16.md):
   comparación verificable del endurecimiento aplicado.
9. [Brechas para producción y ethical hacking](migration/security-production-ethical-hacking-gap-2026-10-16.md):
   pendientes, alcance de pruebas y criterios de aprobación.

## Organización

- `docs/ai/`: contexto canónico y operativo para continuidad.
- `docs/architecture/`: arquitectura transversal vigente.
- `docs/decisions/`: decisiones que no deben revertirse sin un nuevo ADR.
- `docs/migration/`: estudio y estado de objetos migrados.
- `docs/gx8/`: inventarios generados desde las exportaciones GeneXus.
- `database/`: scripts SQL reproducibles; no es documentación Markdown, pero forma parte
  de la fuente de verdad.

## Compatibilidad con asistentes

La guía canónica es `AGENTS.md`. Los archivos `CLAUDE.md`, `GEMINI.md` y
`.github/copilot-instructions.md` son adaptadores para herramientas que no cargan
`AGENTS.md` automáticamente. Deben apuntar a esta documentación y contener solo reglas
críticas; no mantener copias independientes del estado del proyecto.

## Precedencia

Cuando dos documentos se contradigan:

1. Código, pruebas y esquema verificado de `BDADP_CASINO`.
2. `docs/ai/CURRENT-STATE.md` con fecha más reciente.
3. ADR vigentes.
4. Documentos específicos de migración.
5. Inventarios y estudios históricos.

Los documentos que mencionan `CONEX_MIGRACION`, maestros frutícolas o `GXW.xpz` pueden
ser antecedentes válidos, pero no definen automáticamente el alcance actual de ADP
Casino.

## Regla de mantenimiento

Toda modificación que cambie una ruta, permiso, tabla, estado funcional, menú o
dependencia pendiente debe actualizar `docs/ai/CURRENT-STATE.md` en el mismo cambio.
Registrar la fecha solo cuando el dato haya sido comprobado, no por estimación.
