# Validación de la fase 2

Validación realizada el 1 de noviembre de 2026, exclusivamente contra Supabase local con PostgreSQL 17 y Docker sobre WSL2. No se han ejecutado migraciones ni pruebas contra un proyecto remoto.

## Comprobaciones reproducibles

Con las dependencias instaladas:

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Resultado: 11 pruebas de aplicación correctas, sin errores de lint o de tipos y compilación correcta. Se compiló tanto sin variables de Supabase como con la configuración pública local.

En una instancia Supabase local de pruebas vacía, después de arrancar Docker y Supabase:

```sh
npx supabase@2.122.0 migration up --local
npx supabase@2.122.0 test db --local
npx supabase@2.122.0 db lint --local
```

Resultado: ambas migraciones aplicadas, ninguna pendiente, 53 pruebas pgTAP correctas y ningún error en el lint SQL. Los tests verifican visibilidad de publicaciones, permisos de lectura y escritura, registro privado del administrador, revocación, restricciones, timestamps e integridad entre proyectos. Sus fixtures se revierten con `ROLLBACK`.

## Integración comprobada

Se ejecutaron 58 comprobaciones mediante un script temporal local, excluido de Git. No forman parte de `npm test` ni de una suite de navegador versionada. Se usaron Auth, la Data API y las Server Actions reales por HTTP:

- Registro público bloqueado y acceso por contraseña de cuentas existentes.
- Visibilidad exacta de proyectos, columnas y tareas para anónimo, otro usuario y administrador; los borradores permanecen ocultos para las identidades sin permiso.
- Escrituras rechazadas para anónimo y otro usuario; escritura autorizada para el administrador.
- Rechazo de tareas asignadas a columnas de otro proyecto.
- Contraseña incorrecta, rechazo del usuario sin permiso y redirección de peticiones anónimas.
- Login del administrador, persistencia entre peticiones y respuestas con `Cache-Control: no-store`.
- Renovación mediante el proxy al expirar la sesión almacenada en cookies; devolución de cookies actualizadas.
- Revocación inmediata del UUID incluso con un JWT vigente y cierre de sesión.

Los dos usuarios temporales se crearon exclusivamente en local con autorización expresa y credenciales mantenidas en memoria. Se eliminaron al terminar, junto con proyectos, columnas, tareas y autorización temporal. Se verificó que esas tablas y `auth.users` quedaron vacías.

## Casos a revisar al configurar una cuenta o entorno

| Caso | Resultado esperado |
| --- | --- |
| Acceso a `/admin` sin sesión | Redirección a `/admin/login` |
| Contraseña incorrecta | Error sin acceso administrativo |
| Cuenta válida sin UUID autorizado | Acceso administrativo rechazado |
| UUID autorizado | Acceso a `/admin` y posibilidad de cerrar sesión |
| Recarga y renovación de sesión | Sesión conservada y cookies actualizadas |
| Revocación del UUID | Pérdida inmediata de permisos |
| Logout | Redirección al login y pérdida de acceso |
| Data API anónima o usuario sin permiso | Solo publicaciones, sin escrituras |

Sin configurar Supabase, el inicio y el acceso respondieron con HTTP 200, el acceso mostró el aviso sin formulario y `/admin` redirigió al login. Las respuestas de acceso incluyeron `Cache-Control: private, no-store`.

## Límites y pendientes

- No se ha realizado una auditoría visual de navegador ni una auditoría completa de accesibilidad.
- La cuenta definitiva del propietario debe crearse y autorizarse manualmente.
- Los resultados locales no validan automáticamente los ajustes y permisos de un futuro proyecto remoto.
- La fase 3 requiere revisión y confirmación antes de empezar.
