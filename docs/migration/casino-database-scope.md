# Base independiente del modulo Casino

## Decision

El modulo `SSP06 Casino` se migra a `BDADP_CASINO`, separado de
`CONEX_MIGRACION`. No se reutilizan ni se copian los maestros fruticolas de
CONEX. Seguridad permanece activa y utiliza el sistema GeneXus `55`.

La empresa autenticada continua disponible como `req.context.empCod`. Las
tablas originales de ADP conservan `GECODEMP`; ninguna pantalla puede enviarlo
para reemplazar la empresa de la sesion.

## Homologacion de empresa

`G_Emp` conserva la empresa ADP y `dbo.DEFEMP` es una vista de compatibilidad:

```sql
SELECT GECODEMP AS EmpCod, GERAZSOC AS EmpNom, ...
FROM dbo.G_Emp;
```

Seguridad consulta `DEFEMP.EmpCod`; Casino filtra sus tablas mediante
`GECODEMP`. Ambos valores representan el mismo tenant, sin remapear el codigo
historico `1`.

## Datos incluidos

- Las ocho tablas `SSP06` de Casino, respetando el segundo nivel
  `SSP06OPPedidosPlantaDet`.
- `G_Emp` exclusivamente para la empresa utilizada por Casino.
- La ficha historica completa de `FPPersonas`, requerida por Casino.
- Los catalogos organizacionales propios de Personas y `CHTurnos`.
- `MACorrelativos`, `MailFormatos` y `MailEnvios` como soporte del flujo.
- Seguridad moderna y compatibilidad GeneXus: usuarios, roles, sesiones,
  sistemas, modulos, programas y asignaciones de los sistemas `55` y `10`.

## Datos excluidos

No se crean `TEMP01`, `ESPECIES`, `ESPECIES1`, `CALIBRES`, `PRODUCTORES`,
`CLIENTES`, `AGENTES`, `CONSIG`, `EXPORT1`, `covEnvases` ni otros maestros de
CONEX. La ruta backend `/maestros` y las rutas React `/maestros-gx/*` quedan
retiradas de la aplicacion.

## Reglas verificables

- Estados de pedido permitidos: `0`, `1`, `2`, `3`, `5`.
- Control de pago permitido: `0`, `1`, `2`.
- Evaluacion permitida: `0`, `1`, `2`, `3`.
- Cabecera y detalle conservan integridad por empresa y numero de pedido.
- `DEFEMP` debe ser una vista y devolver las mismas empresas de `G_Emp`.
- El permiso `55/1/91` se incorpora al catalogo porque el XPZ 2021 lo usa,
  aunque la copia de datos 2020 todavia no lo contenia.

## Ejecucion

Con la fuente adjunta como `BDADP_CASINO_SOURCE`:

```powershell
node scripts/run-sql-file.js database/20260730_BDADP_CASINO_schema.sql master
node scripts/run-sql-file.js database/20260730_BDADP_CASINO_import.sql BDADP_CASINO
npm run verify:casino
```

Los archivos MDF/LDF entregados se inspeccionan mediante una copia de trabajo;
no se adjuntan ni actualizan directamente.
