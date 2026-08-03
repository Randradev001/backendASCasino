# Personas como dependencia de Casino

## Decision

`ProyectoADPpersonas.xpz` se incorpora a `BDADP_CASINO` como modulo de
consulta. Casino referencia personas mediante `PedRutSolicita` y los usuarios
necesitan abrir la ficha historica, no solamente seleccionar personal activo.

La empresa siempre se obtiene desde `req.context.empCod`. El RUT solicitado es
solo la segunda parte de la clave; ninguna consulta acepta `GECODEMP` desde la
pantalla.

## Fuente revisada

- XPZ: `C:\paso\ProyectoADPpersonas.xpz`.
- Carpeta GeneXus: `FichaPersonas`.
- Transaccion principal: `FPPersonas`, descripcion `Ficha de Personas`.
- Pantallas principales: `maeFPPersonas`, `FichaDePersona` y `VerFicha`.
- Seguridad GeneXus: sistema `10`, modulo `1`, programas `1` y `2`.

El XPZ contiene 125 objetos: 12 transacciones, 32 procedimientos, 32 Web
Panels, 13 tablas y objetos auxiliares. La migracion no marca todo ese conjunto
como listo; solo migra el comportamiento descrito aqui.

## Datos incluidos

- Las 9.186 personas historicas de `FPPersonas` para `GECODEMP=1`, incluyendo
  los 56 campos fisicos y la foto JPEG cuando existe.
- `FPGrupos`, `FPArea`, `FPDivision`, `FPDivisionSub`, `FPOrganiza`,
  `FPCenCos`, `FPFuncion` y `FPSindicato` como catalogos propios de Personas.
- `CHTurnos`, referencia externa utilizada por el subtipo `PerTURCod`.
- El catalogo y las asignaciones de Seguridad del sistema `10`.
- Consulta paginada, filtro por RUT/nombre/estado, ficha de solo lectura y foto.

La ficha conserva los calculos GeneXus de edad, antiguedad y porcentaje de
ausentismo. Los estados laborales observados son `1` Activo y `2` Finiquitado.

## Datos excluidos

- `FPhuellas`: biometria, sin filas para la empresa `1` y no utilizada por la
  ficha.
- `FPMovPerson` y `LogPersonas`: movimiento y auditoria de mantenimiento.
- `ListAnexo`: su unica fila enlaza al sistema externo `40`.
- Cargas CSV/Excel, integracion SAP, asistencia y actualizaciones masivas.
- Escritura de la ficha, cambio de foto y mantenimiento de catalogos.

Estos objetos requieren una fase de RR.HH. separada y permisos especificos.

## Compatibilidad e integridad

Las relaciones GeneXus de la ficha se resuelven dentro de la misma empresa. La
fuente contiene referencias historicas sin catalogo vigente; por eso se
conservan indices de navegacion y uniones opcionales en lugar de imponer claves
foraneas nuevas que impedirian migrar personas finiquitadas.

El acceso de lectura se concede a usuarios con sistema `10` o con sistema `55`
Casino. Esto permite abrir la persona referenciada por un pedido sin duplicar
la regla en React.

## Verificacion reproducible

```powershell
node scripts/run-sql-file.js database/20260730_BDADP_CASINO_personas.sql BDADP_CASINO
npm run verify:casino
npm test
```

