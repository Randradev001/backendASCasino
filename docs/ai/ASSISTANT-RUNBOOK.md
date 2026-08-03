# Manual de continuidad para asistentes

## Objetivo

Este procedimiento evita que un asistente nuevo repita el estudio, use documentación
obsoleta o introduzca reglas de empresa y seguridad en React.

## Inicio de una tarea

1. Confirmar si se trabajará en backend, frontend o ambos.
2. Leer `AGENTS.md`, `docs/README.md` y `docs/ai/CURRENT-STATE.md` completos.
3. Revisar los cambios existentes sin modificarlos:

```powershell
git status --short
git diff --name-only
```

4. En el repositorio hermano, repetir la revisión si el cambio afecta UI o contrato HTTP.
5. Identificar el permiso, las tablas y el objeto GeneXus antes de diseñar la solución.

No limpiar, restaurar ni formatear masivamente un worktree sucio. Los cambios previos
pertenecen al usuario hasta demostrar lo contrario.

## Cómo investigar

### Regla GeneXus

- Buscar el objeto exacto en el XPZ y en `docs/gx8/`.
- Confirmar niveles de transacción y llamadas a procedimientos.
- Comparar con la tabla real usando consultas de solo lectura.
- Registrar propósito, entradas, salidas, dependencias y diferencias deliberadas en
  `docs/migration/`.

### Base de datos

- Consultar `sys.tables`, `sys.columns`, claves y restricciones antes de escribir SQL.
- Usar `BDADP_CASINO`; no modificar directamente `C:\paso\BDADP.mdf` o su LDF.
- No asumir que un atributo del XPZ existe en la copia de base. Ejemplo conocido:
  `TPPRAcceso` no está en `SSP06MATPProducto`.
- Tratar resultados contados como observaciones fechadas, no como constantes.

### Seguridad

- Localizar `SistCod`, `Modcod`, `ProgCod` y, si aplica, `ProgOPCod`.
- Verificar permisos directos y heredados por rol.
- Proteger el endpoint antes de exponer la ruta React.
- Probar explícitamente un caso permitido y uno denegado.

## Cómo implementar

### Backend

1. Crear o ampliar un archivo `*.rules.js` para normalización y reglas puras.
2. Escribir pruebas con `node:test`.
3. Implementar consultas y transacciones en `src/services/`.
4. Mantener controladores delgados y respuestas de error consistentes.
5. Montar la ruta con `authContext` y middleware de permiso.
6. No aceptar datos derivados que el servidor puede obtener de sesión o SQL.

### Frontend

1. Agregar funciones HTTP en `src/api/`; no llamar Axios directamente desde cada página.
2. Añadir la ruta en `src/routes/MainRoutes.jsx`.
3. Reutilizar MUI, `MainCard`, tema, `useAuth` y componentes existentes.
4. Mantener azul `#00549F`, naranjo `#FF740C` y blanco como lenguaje corporativo.
5. Si es un programa dinámico, agregar la equivalencia en
   `src/menu-items/authorizedMenu.jsx` y un registro SQL idempotente.
6. Mostrar cálculos como referenciales cuando el backend todavía debe confirmarlos.

### SQL

- Usar `SET XACT_ABORT ON` y transacción para cambios relacionados.
- Preferir `IF EXISTS/NOT EXISTS` o `MERGE` seguro para reejecución.
- No otorgar permisos a todos por conveniencia. Derivar asignaciones desde roles o
  accesos existentes solo cuando la decisión esté documentada.
- Terminar el script con un `SELECT` de verificación.

## Verificación mínima

Backend:

```powershell
node --test
npm run verify:casino
```

Frontend, usando solo archivos modificados para ESLint:

```powershell
node node_modules\prettier\bin\prettier.cjs --write <archivos>
node node_modules\eslint\bin\eslint.js <archivos>
node node_modules\vite\bin\vite.js build --logLevel warn
```

Cuando sea relevante, ejecutar una consulta de solo lectura contra el servicio real y
comprobar la forma de la respuesta. No crear pedidos de prueba en la base productiva sin
autorización.

## Actualización documental

Actualizar `CURRENT-STATE.md` si cambió cualquiera de estos elementos:

- rutas o payloads;
- permisos o menús;
- tablas o scripts SQL;
- estado de una migración;
- número de pruebas;
- limitaciones o decisiones pendientes.

Crear un ADR cuando la decisión cambie arquitectura o revierta una decisión anterior.
Un documento de migración describe un objeto o flujo; `CURRENT-STATE.md` resume el
producto completo.

## Entrega a otro asistente

La entrega debe responder, en este orden:

1. Qué resultado quedó funcionando.
2. Qué archivos y base se modificaron.
3. Qué permisos y reglas se conservaron.
4. Qué validaciones pasaron.
5. Qué quedó pendiente o requiere decisión de negocio.

Nunca afirmar “listo para producción” solo por una compilación. Diferenciar pruebas
unitarias, verificación de base, prueba funcional y despliegue.
