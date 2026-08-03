# Instrucciones de Copilot para ADP Casino

Lee `AGENTS.md` y `docs/README.md` antes de proponer cambios. Usa
`docs/ai/CURRENT-STATE.md` para el estado vigente y
`docs/ai/API-AND-PERMISSIONS.md` para contratos y autorizaciones.

- Backend Node.js y SQL Server en `BDADP_CASINO`; frontend hermano en `../frontAS`.
- `req.context.empCod` y `req.context.login` son autoritativos.
- Nunca aceptar precios, empresa ni ubicación organizacional como datos confiables del
  navegador.
- Proteger rutas con 55/1/1, 55/1/90, 55/5/6 u otro código documentado.
- Mantener reglas en servicios y `*.rules.js`, con pruebas `node:test`.
- Preservar tablas GeneXus y el nivel detalle de pedidos.
- Actualizar `docs/ai/CURRENT-STATE.md` cuando cambien rutas, permisos, tablas o
  pendientes.
