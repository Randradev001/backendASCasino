# Centro de cargas Casino

## Propósito

La plantilla de Planta San Vicente se procesa mediante una validación previa y una
importación transaccional. Los códigos entregados por negocio se conservan como códigos
externos; las relaciones operativas siguen usando IDs internos generados por el sistema.

## Modelo

- Los cinco maestros Casino incorporan `CodigoExterno` y `Activo` sin cambiar sus claves
  históricas utilizadas por pedidos.
- División, subdivisión y centro de costo también mapean el código externo a una clave
  interna de hasta diez caracteres. Esto permite recibir centros de costo externos de
  quince caracteres sin truncarlos.
- `SSP06MASolicitante` usa `SOLId IDENTITY` y es la fuente operativa de RUT, login,
  ubicación y estado para Pedidos Casino. Se integra con Seguridad, sin depender de
  una fila equivalente en `FPPersonas`.
- `SSP06VWSolicitanteHistorico` prioriza el maestro nuevo y usa `FPPersonas` solo como
  respaldo de lectura para pedidos antiguos.
- `SSP06OPCargaCasino` registra archivo, resumen, usuario y fecha de cada carga aplicada.

## Flujo y seguridad

- `POST /casino/cargas/validar` lee el XLSX, normaliza encabezados y devuelve conteos y
  errores por pestaña/fila. No escribe datos.
- `POST /casino/cargas/importar` repite la validación y aplica todas las pestañas en una
  transacción serializable. Si una fila falla no se confirma ninguna pestaña.
- Ambos endpoints usan 55/10/13. El CRUD de solicitantes usa 55/10/12.
- Empresa y usuario provienen de la sesión; la planilla no puede seleccionar empresa.
- No se reciben contraseñas en la planilla. Para un solicitante sin credencial, la carga
  genera como clave inicial los últimos cuatro dígitos del RUT y almacena únicamente su
  hash `scrypt`. Las credenciales existentes no se reemplazan al reimportar.
- El rol `CAS_USER` se asigna por `URolesPorUser`; no se copian permisos de la plantilla
  del rol al usuario.
- `CAS_USER` incluye 55/1/91 para presentar todos los tipos de producto activos a los
  solicitantes importados.

## Validación de la planilla recibida

La versión revisada contiene 17 tipos, 72 solicitantes, 48 productos, 2 casinos, 16
destinos y 13 motivos. `ProdNombre` se amplió a 60 caracteres para conservar completos
los nombres de la planilla. Antes de importarla se debe registrar como
usuario/solicitante al responsable `manuel.rodriguezcabello@sodexo.com` referenciado
por ambos casinos.

El script idempotente es `database/20261123_casino_centro_cargas.sql`. Fue aplicado a
`BDADP_CASINO` el 2026-11-23; la planilla no se aplica mientras falte el responsable de
los casinos.
