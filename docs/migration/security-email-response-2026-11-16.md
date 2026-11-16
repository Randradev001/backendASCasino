Asunto: ADP Casino — remediación de dependencias y evidencias de validación

Estimados:

Gracias por los antecedentes enviados. Completamos la remediación de dependencias y
la validación local del backend y frontend de ADP Casino el 16 de noviembre de 2026.

1. **Evaluación de impacto.** Contrastamos los CVE informados con las dependencias
   efectivamente instaladas y la arquitectura. Actualizamos además las cadenas
   transitivas con observaciones posteriores. Las auditorías npm completas, incluyendo
   herramientas de desarrollo, y de producción informan 0 hallazgos en ambos proyectos.

2. **Remediación y versiones.** El candidato validado utiliza Express 4.22.3,
   body-parser 1.20.9, Axios 1.21.1, Vite 7.3.8 y Node 24.22.3. Se actualizaron el
   cliente SQL y las dependencias de XML, archivos, capturas y correo. Para una
   dependencia de compilación sin corrección oficial disponible (deepmerge,
   CVE-2026-93753), incorporamos un parche local revisable y pruebas de regresión;
   la auditoría de catálogo no evalúa ese código local. El informe explica su alcance.

3. **React Server Components.** La implementación revisada es una aplicación cliente
   React con API Node.js/Express. No utiliza React Server Components, Server Functions
   ni renderizado React en el backend. Las vulnerabilidades específicas de esos
   componentes no aplican a esta arquitectura revisada.

4. **Fechas.** La corrección y las verificaciones locales quedaron realizadas el
   16/11/2026. La implementación en el servidor requiere coordinar la ventana de
   despliegue y homologación; su fecha permanece por confirmar.

5. **Evidencias.** Se adjuntan el informe técnico, auditorías antes/después, inventario
   y SBOM de dependencias, hashes y resultados: 41 pruebas backend, 5 pruebas frontend,
   ESLint dirigido, compilación de producción y captura real en contenedor sin red.
   La imagen final ejecuta como usuario sin privilegios y su escaneo independiente con
   Trivy 0.76.2 informa 0 vulnerabilidades. Son evidencias locales del candidato;
   resta contrastarlas con la versión efectivamente desplegada.

6. **SQL Server.** La actualización del cliente Node no modifica el motor SQL Server.
   Prepararemos su cierre con Infraestructura, verificando la versión de la instancia
   y aplicando el CU correspondiente con respaldo, homologación y ventana acordada.
   Como referencia al 16/11/2026, Microsoft identifica CU28, versión 16.0.4325.4, para
   SQL Server 2022. La verificación de BDADP_CASINO no pudo completarse desde el
   ambiente local por rechazo de autenticación. No se modificaron credenciales,
   configuración ni datos del servidor durante esta intervención.

El cierre definitivo en el ambiente evaluado queda sujeto al despliegue, validación
funcional y comprobaciones de infraestructura indicadas en el informe.

Saludos.

---

Adjuntar el informe `security-remediation-2026-11-16.md` y el paquete
`evidence/security-2026-11-16/` (o su ZIP). Este borrador no fue enviado.
