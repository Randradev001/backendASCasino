# Exportación completa hacia SQL Server 2016

## Propósito

`scripts/export-sqlserver-2016.js` genera desde `BDADP_CASINO` un paquete completo de
scripts compatible con SQL Server 2016. La extracción es de solo lectura y no modifica
la base fuente.

El paquete separa creación de base y tablas, datos por tabla, restricciones e índices,
claves foráneas y vistas. También incluye un manifiesto SHA-256 y una verificación de
conteos y restricciones para ejecutar al finalizar la importación.

## Uso

```powershell
node scripts/export-sqlserver-2016.js BDADP_CASINO C:\respaldo\sql2016 BDADP_CASINO
```

El directorio final incorpora fecha y hora para no sobrescribir una extracción previa.
La fuente se toma de las variables `SQLSERVER_*` ya usadas por el backend.

## Alcance y seguridad

El paquete contiene todos los datos de las tablas, incluidas fotografías, hashes de
credenciales y sesiones. Debe tratarse como confidencial y mantenerse fuera de Git.
No exporta logins del servidor SQL, contraseñas de conexión ni rutas físicas de los
archivos MDF/LDF.

El script de creación conserva la intercalación de la fuente y establece
`COMPATIBILITY_LEVEL = 130`. No usa sintaxis
`CREATE OR ALTER` ni otras construcciones posteriores a SQL Server 2016. Cada archivo
de datos exige una tabla vacía, importa en lotes transaccionales y comprueba el conteo
esperado antes de terminar. En tablas con identidad, cada lote activa y desactiva
`IDENTITY_INSERT` dentro del mismo lote para funcionar también con ejecutores que
reinician la sesión entre separadores `GO`.

El archivo de índices fija explícitamente las siete opciones `SET` requeridas por SQL
Server 2016 para índices filtrados. Las restricciones CHECK y los índices secundarios
son reejecutables, de modo que una interrupción puede retomarse desde ese archivo sin
recrear las tablas ni recargar los datos.

Los archivos de datos fijan las mismas siete opciones antes de insertar. SQL Server
2016 también las exige para modificar tablas que ya poseen índices filtrados, incluso
si el índice se creó correctamente en una sesión anterior.

Las claves foráneas también se generan de forma reejecutable. Esto permite retomar el
archivo 95 cuando una relación previa alcanzó a crearse antes de detectar datos
incompletos en una tabla referenciada.

## Verificación

Ejecutar los archivos en el orden indicado por el `README.md` del paquete y finalizar
con `99_verify.sql`. La verificación comprueba compatibilidad, cantidad de tablas,
vistas y claves foráneas, conteos por tabla y `DBCC CHECKCONSTRAINTS`.
