# Alta de solicitante Casino para Andres

El script `database/20261123_alta_solicitante_andres_andradev.sql` prepara la cuenta
existente `17526007-2` para ingresar solicitudes Casino con el correo
`andres.andradev@gmail.com`.

La observacion de solo lectura del 2026-11-23 encontro la cuenta activa en la empresa
1, con credencial moderna, pero sin ficha en `FPPersonas` y sin el permiso 55/1/1.
La cuenta conserva su rol `CASUSERCAS`; el script agrega `CAS_USER` sin eliminar roles
ni asignaciones directas existentes.

Antes de ejecutarlo se deben completar `@DivId`, `@SdiId` y `@CecId` con valores reales.
El script valida esos catalogos, actualiza el correo, crea la ficha minima requerida por
Casino, asigna el rol mediante `URolesPorUser` y termina con una consulta de
verificacion. No copia los permisos de la plantilla del rol al usuario y no modifica la
clave.

La ficha minima usa valores neutros en campos historicos obligatorios que Casino no
consume. Si Personas pasa a tener mantenimiento de RR.HH., esos datos deben completarse
desde la fuente autoritativa y no desde esta alta operacional.

El script es transaccional e idempotente. No fue ejecutado sobre `BDADP_CASINO` porque
faltan los tres codigos organizacionales y la solicitud fue dejar preparado el SQL, no
aplicar cambios de datos.
