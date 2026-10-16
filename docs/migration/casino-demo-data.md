# Datos demostrativos anonimizados de Casino

`database/20260803_casino_demo_data.sql` esta dirigido a SQL Server 2022 (version 16.x)
o superior y permite preparar una base de demostracion a partir de un esquema Casino
vacio. Debe ejecutarse conectado a la base destino y con
`@SourceDatabase` apuntando a una copia local de `BDADP_CASINO` en la misma instancia.

El archivo entregado contiene sentencias literales `INSERT INTO ... VALUES (...)` y no
requiere una base fuente al momento de instalarlo. Incluye los primeros 20 registros
reales de cada tabla principal de Personas y Casino. Como la regla de 20 registros por
tabla puede dejar fuera una referencia de una fila seleccionada, el script desactiva las
restricciones durante la carga y las vuelve a habilitar al finalizar, sin validar filas
historicas incompletas.

El script no copia usuarios, credenciales ni sesiones. Las personas, fotos, correos y
pedidos que se copien son datos reales: antes de compartir la base resultante, confirme
que esta autorizado a entregar esos datos o anonimicelos.

Ejemplo de ejecucion, tras crear la base destino con el esquema:

```powershell
node scripts/run-sql-file.js database/20260803_casino_demo_data.sql BDADP_CASINO_DEMO
```

La base destino debe estar vacia. El script no es reejecutable porque copia datos
reales con sus claves originales. El generador reproducible es
`scripts/generate-casino-sample-inserts.js`; requiere acceso a la base fuente y no
debe ejecutarse fuera de un entorno controlado.
