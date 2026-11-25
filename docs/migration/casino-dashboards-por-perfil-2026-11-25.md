# Dashboards y navegación por perfil

## Propósito

Separar la lectura ejecutiva global de la operación diaria del solicitante y del
usuario Casino. Ninguna vista acepta empresa, persona o casino desde React.

## Alcance implementado

- `/dashboard/default`: panel administrativo global, protegido en backend y frontend
  por `ADMINFULL` (o la equivalencia configurada de administrador de Seguridad).
- `/dashboard/mis-pedidos`: pedidos cuyo `PedRutSolicita` corresponde al RUT del
  usuario autenticado; requiere 55/1/1.
- `/dashboard/casino`: pedidos del casino activo cuyo `CASIRut` corresponde al RUT del
  usuario autenticado; requiere 55/1/10.
- El grupo `Navigation` arma accesos directos según permisos efectivos para crear y
  revisar pedidos, o para recepcionarlos y decidirlos.
- Las rutas React internas ignoran `ProgTarget`, por lo que el menú ya no abre estas
  pantallas en otra pestaña.

## Borradores

Un solicitante puede abrir un pedido propio en estado 0 desde el dashboard personal.
El backend vuelve a validar empresa, propietario, estado, productos y precios. Al
guardar reemplaza cabecera y detalle dentro de una transacción; después puede enviarse
con la transición existente 0 → 1.

Los usuarios 55/1/90 conservan la administración por otra persona, pero un usuario
común nunca puede leer, modificar ni enviar el borrador de otro solicitante.
