-- Diagnóstico de solo lectura para adjuntar al cierre de seguridad.
-- Ejecutar contra la instancia que realmente aloja BDADP_CASINO, antes y después
-- del parche de infraestructura. No instala CU ni modifica datos o configuración.
SELECT
    CONVERT(varchar(128), SERVERPROPERTY('ProductVersion')) AS ProductVersion,
    CONVERT(varchar(128), SERVERPROPERTY('ProductLevel')) AS ProductLevel,
    CONVERT(varchar(128), SERVERPROPERTY('ProductUpdateLevel')) AS ProductUpdateLevel,
    CONVERT(varchar(128), SERVERPROPERTY('ProductUpdateReference')) AS ProductUpdateReference,
    CONVERT(varchar(128), SERVERPROPERTY('Edition')) AS Edition,
    SERVERPROPERTY('EngineEdition') AS EngineEdition;
