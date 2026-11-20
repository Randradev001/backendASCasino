# Inicio de sesión con correo

El formulario y el contrato HTTP usan `email` y `password`. La identidad se resuelve
por `USUARIOS.UsuCorreo`, conservando `UsuLogin` para credenciales, sesiones y permisos.
La clave sigue validándose contra `SEGUSUCRED`, con migración de la clave GeneXus.
La selección de empresa permanece. Los correos compartidos por más de una identidad
con clave válida se rechazan para evitar elegir una cuenta arbitrariamente.
