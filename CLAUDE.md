# Contexto para Claude Code

Antes de actuar, lee completamente [AGENTS.md](AGENTS.md) y después
[docs/README.md](docs/README.md). La fuente canónica del estado actual es
[docs/ai/CURRENT-STATE.md](docs/ai/CURRENT-STATE.md).

Reglas críticas: la empresa proviene de `req.context.empCod`; los permisos se validan en
backend; no se modifican los MDF/LDF entregados; se preservan nombres y niveles GeneXus;
y todo cambio funcional requiere prueba o verificación reproducible y actualización
documental.

No dupliques reglas en este archivo. Si cambia el proyecto, actualiza primero
`AGENTS.md` y `docs/ai/CURRENT-STATE.md`.
