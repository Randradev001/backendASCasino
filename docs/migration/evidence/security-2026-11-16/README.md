# Evidencias de seguridad — 16/11/2026

Alcance: dos checkouts locales y una imagen Docker construida localmente.
No representan evidencia de un despliegue ni de actualización del motor SQL Server.

## Lectura

1. [Informe técnico](../../security-remediation-2026-11-16.md).
2. [Borrador de respuesta](../../security-email-response-2026-11-16.md).
3. [Resumen estructurado](verification-summary.json): versiones instaladas, comandos,
   resultados, arquitectura React, hashes de fuentes e identificación de imagen.
4. [SHA256SUMS.txt](SHA256SUMS.txt): integridad de los archivos de evidencia.

## Inventario

| Archivos | Contenido |
| --- | --- |
| backend-before-all/production.json | Auditoría inicial: 23 entradas, 14 altas |
| frontend-before-all.json | Auditoría inicial completa: 10 entradas, 2 altas |
| frontend-before-production.json | Auditoría inicial producción: 1 alta |
| backend-after-all/production.json | Auditorías finales: 0 |
| frontend-after-all/production.json | Auditorías finales: 0 |
| backend-tests.txt | 41 pruebas correctas |
| backend-security-gate.txt | Auditoría 0 y seis pruebas HTTP correctas |
| frontend-security-gate.txt | Auditoría 0 y cinco pruebas del fork correctas |
| frontend-npm-ci.txt | Instalación limpia npm correcta |
| frontend-eslint.txt / frontend-build.txt | Validaciones dirigidas y compilación correcta |
| frontend-artifacts.json | 79 archivos del build, tamaños y SHA-256; sin source maps |
| backend-sbom.cdx.json / frontend-sbom.cdx.json | Inventarios CycloneDX |
| deepmerge-regression.json | Reproducción con código original y resultado del parche |
| docker-build.txt | Construcción de la imagen final |
| docker-smoke.txt | Ping, headers, UID, exclusiones, ausencia de gestores y PNG real |
| backend-image-trivy-intermediate.json | 19 hallazgos en el npm de una imagen intermedia |
| backend-image-trivy.json | Reescaneo final: 0, incluidas dependencias de SO y Node |
| docker-scan-intermediate.txt / docker-scan.txt | Logs de Trivy 0.76.2 |
| database-verification.txt | Rechazo de login SQL, con usuario redactado |

Las auditorías reportan entradas de paquetes; un hallazgo transitivo puede contabilizar
varios paquetes. Trivy utiliza su propio inventario y catálogo. No sumar los conteos
de ambos escáneres como si fueran CVE únicos.

El fork local no es evaluado por npm audit. Su prueba comprueba el módulo resuelto
desde Rollup y el ataque original, además de compatibilidad y recursividad. Su código,
licencia y README están en `frontASCasino/vendor/deepmerge`; el ZIP de entrega incluye
una copia revisable. No se usaron exclusiones de CVE o filtros de severidad.

Los SBOM no contienen archivos .env ni valores de credenciales. El ZIP se generó con
una lista explícita de archivos; no contiene la imagen Docker, código compilado del
frontend, datos de personas ni copias de configuración privada.
