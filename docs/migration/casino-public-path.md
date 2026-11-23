# Ruta pública de ADP Casino

Fecha de decisión: 2026-11-20.

## Propósito

Publicar el frontend de ADP Casino bajo una ruta identificable con el módulo, sin
conservar la ruta heredada `/free` de la plantilla original.

## Configuración

- Dominio previsto: `https://www.adpsmart.cl`.
- Ruta base del frontend: `/casino`.
- Entrada pública: `https://www.adpsmart.cl/casino/`.
- API backend: `/backendDocker`, fuera de la ruta base del frontend.
- URL de API en la compilación de producción: `https://www.adpsmart.cl`.

El router React, los recursos generados por Vite y el manifiesto PWA comparten la ruta
base `/casino`. Las rutas funcionales documentadas, como `/casino/pedidos/nuevo`, son
rutas internas del router y se resuelven bajo esa base al navegar desde el dominio.

## Despliegue pendiente

El workflow heredado `.github/workflows/prod.yml` continúa apuntando a
`mantisdashboard.com`. No debe ejecutarse contra el nuevo dominio hasta definir el host,
usuario, secretos y directorio remoto de `adpsmart.cl`.
