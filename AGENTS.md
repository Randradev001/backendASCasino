# ADP Casino — instrucciones para asistentes

## Misión

Este repositorio es el backend Node.js de la migración del módulo ADP Casino desde
GeneXus. El alcance activo es Casino, ficha de Personas requerida por Casino y la capa
de Seguridad. No es una migración general de los maestros CONEX.

El frontend asociado está en `C:\Proyectos2025\AS\frontAS`. Una modificación funcional
debe revisar ambos repositorios cuando afecte rutas, contratos HTTP, menú o permisos.

## Lectura obligatoria

Antes de cambiar comportamiento, leer en este orden:

1. `docs/README.md`.
2. `docs/ai/CURRENT-STATE.md`.
3. `docs/ai/API-AND-PERMISSIONS.md`.
4. `docs/ai/ASSISTANT-RUNBOOK.md`.
5. El documento específico de `docs/migration/` relacionado con la tarea.

No usar un documento histórico de CONEX como descripción del estado actual si entra en
conflicto con `docs/ai/CURRENT-STATE.md`.

## Fuentes de verdad

- Exportación Casino: `C:\paso\ProyectoADP-casino.xpz`.
- Exportación Personas: `C:\paso\ProyectoADPpersonas.xpz`.
- Base entregada: `C:\paso\BDADP.mdf` y `C:\paso\BDADP_log.LDF`.
- Base de trabajo actual: `BDADP_CASINO`.
- Esquema reproducible: `database/20260730_BDADP_CASINO_schema.sql`.
- Importación: `database/20260730_BDADP_CASINO_import.sql` y
  `database/20260730_BDADP_CASINO_personas.sql`.
- Código y pruebas del repositorio para el comportamiento ya migrado.

Para reglas antiguas, estudiar el objeto GX antes de inferir comportamiento por el
nombre generado. Para el estado implementado, prevalecen el código, las pruebas y los
documentos `docs/ai/` actualizados.

## Invariantes de seguridad

- `authContext` proporciona `req.context.empCod` y `req.context.login`.
- Nunca aceptar `EmpCod` o `GECODEMP` desde pantalla para sustituir la empresa de sesión.
- Usar `requirePermission` o `requireAnyPermission` en toda ruta de negocio.
- `NIVSEG` se conserva por compatibilidad, pero la autorización efectiva usa
  `ASIGSIST`, `ASIG`, `ASIGPROG`, `ASIGPROG1` y roles.
- Los roles usan plantillas `ASIGPROG` con `GECODEMP=0`; no copiar sus permisos al
  usuario ni eliminar asignaciones directas al quitar un rol.
- `ADMINFULL` administra Seguridad. `ADMFULL` no equivale a `ADMINFULL`.
- `VA` está retirado. El resultado de `VA2` se implementa mediante middleware backend.
- No confiar en ocultar botones o rutas React como mecanismo de autorización.

## Reglas de dominio Casino

- Cabecera: `SSP06OPPedidosPlanta`.
- Detalle nivel dos: `SSP06OPPedidosPlantaDet`; nunca tratarlo como maestro independiente.
- La clave multiempresa del dominio conserva el nombre `GECODEMP`.
- El correlativo de pedidos es `MACorrelativos.CRRID='PEDCASINOS'`.
- Los precios se leen desde `SSP06MAProducto` al guardar; nunca aceptar el precio del
  navegador como dato autoritativo.
- El producto debe pertenecer al casino seleccionado.
- `DivId`, `SdiId` y `CecId` se obtienen de `FPPersonas` para el solicitante.
- El solicitante común proviene de `USUARIOS.UsuRut`. Solo 55/1/90 puede escoger otra
  persona de la empresa autenticada.
- Estados compatibles: 0 borrador, 1 enviado, 2 en preparación, 3 entregado y 5 anulado.
- La creación de cabecera y detalle debe ser transaccional.

## Permisos y llamados actuales

- 55/1/1 `Pedidos Casino`: creación operativa.
- 55/1/90 `Adm de Pedidos`: permite solicitar por otra persona.
- 55/5/6 `Historial de Pedidos`: dashboard histórico y detalle.
- El dashboard ejecutivo principal permanece en `/dashboard/default` y acepta 55/1/1
  o un programa de consultas 55/5/1–6.

Los registros de menú se mantienen con scripts idempotentes en `database/`. No agregar
una ruta React al menú sin registrar también su programa y middleware backend.

## Arquitectura

- Rutas: `src/Router/`.
- Controladores: traducen HTTP y errores; no contienen reglas de negocio.
- Servicios: consultas, validación, cálculo, transacciones y autorización contextual.
- Archivos `*.rules.js`: reglas puras y normalización testeable.
- Middleware: sesión, tenant y permisos.
- Pruebas: `test/`, usando `node:test`.
- Documentación de decisiones y migración: `docs/`.

React puede presentar cálculos enviados por el backend, pero no debe duplicar reglas de
precio, correlativo, empresa, ubicación, estado o autorización.

## Protocolo de cambio

1. Revisar `git status --short` en backend y frontend; preservar cambios ajenos.
2. Identificar el objeto GX, las tablas, el programa de seguridad y las dependencias.
3. Documentar el propósito y cualquier diferencia deliberada en `docs/migration/`.
4. Implementar primero reglas puras o una verificación reproducible.
5. Implementar servicio, controlador, ruta protegida y cliente React cuando corresponda.
6. Crear SQL idempotente para cambios de catálogo o esquema. No editar directamente los
   MDF/LDF entregados.
7. Actualizar `docs/ai/CURRENT-STATE.md` si cambia una ruta, permiso, tabla, estado o
   pendiente conocido.
8. Ejecutar las verificaciones aplicables antes de declarar terminado el trabajo.

## Comandos de verificación

Desde este repositorio:

```powershell
node --test
npm run verify:casino
```

Desde `C:\Proyectos2025\AS\frontAS`:

```powershell
node node_modules\eslint\bin\eslint.js <archivos-cambiados>
node node_modules\vite\bin\vite.js build --logLevel warn
```

La compilación Vite puede requerir permiso para leer la carpeta temporal del usuario.
No confundir una restricción del sandbox con un error del proyecto.

## Mutaciones y datos

- Las consultas diagnósticas deben ser de solo lectura.
- Ejecutar scripts que modifiquen `BDADP_CASINO` únicamente cuando el usuario haya
  solicitado aplicar el cambio.
- Todo script debe usar transacción cuando corresponda, ser reejecutable y terminar con
  una consulta de verificación.
- No imprimir secretos de `.env`, cadenas de conexión ni credenciales.
- No desplegar, publicar, enviar correos ni activar integraciones externas sin solicitud
  explícita.

## Definición de terminado

Un objeto no está listo solo porque compila. Debe conservar empresa y permiso de sesión,
tener pruebas o verificación reproducible, estar documentado, compilar junto al frontend
si cambió el contrato y dejar explícitos los pendientes que aún dependan del negocio.
