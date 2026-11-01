# Desarrollo y configuración

## Requisitos y herramientas

- Node.js 24.x y npm 11.x. Usar npm y conservar el lockfile; no mezclar gestores.
- Docker funcionando para Supabase local. La CLI se ejecuta con `npx supabase@2.122.0`; no requiere instalación global.
- Entorno validado el 1 de noviembre de 2026: Windows, Node.js 24.22.1, npm 11.19.1, Docker Desktop 4.97.0, Docker Engine 29.9.2, WSL 2.7.14 y PostgreSQL 17.

| Herramienta | Versión fijada |
| --- | --- |
| Next.js / eslint-config-next | 16.4.3 |
| React / React DOM | 19.3.1 |
| TypeScript | 5.9.3 |
| Tailwind CSS / @tailwindcss/postcss | 4.3.3 |
| PostCSS | 8.5.31 |
| ESLint | 9.39.5 |
| @supabase/supabase-js | 2.118.0 |
| @supabase/ssr | 0.12.7 |
| server-only | 0.0.1 |

Los paquetes de tipos y las dependencias transitivas también están fijados en `package.json` y `package-lock.json`. Instalar con `npm ci`; utilizar `npm install` al modificar dependencias de forma intencionada.

Limitación conocida: npm marca ESLint 9.39.5 como fuera de soporte. Se conserva porque los plugins instalados de React, imports y accesibilidad declaran compatibilidad hasta ESLint 9. Revisar su actualización conjunta antes de pasar a ESLint 10. El parser instalado de TypeScript admite versiones anteriores a 6.1; se mantiene TypeScript 5.9.

## Comandos de aplicación

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`dev` sirve la aplicación en `http://localhost:3000`. `typecheck` ejecuta `next typegen` y después `tsc --noEmit`; funciona antes del primer build. El lint se ejecuta por separado del build. `start` requiere una compilación previa. Los tests usan el runner de Node.js 24, sin un framework adicional.

El build funciona sin Supabase configurado y no consulta la base de datos durante la compilación. Después de modificar variables `NEXT_PUBLIC_*`, reiniciar `dev` y recompilar antes de usar `start`: esas variables se incorporan al bundle del navegador al compilar.

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar únicamente:

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Origen HTTP o HTTPS del proyecto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable `sb_publishable_...` del mismo proyecto |

No incluir claves `sb_secret_...`, `service_role`, JWT heredados, contraseñas ni tokens. Esta aplicación requiere las nuevas claves publicables. No existe una variable para autorizar al administrador: los permisos se resuelven en la base de datos.

`.env.local`, los demás archivos de entorno y el estado local de Supabase están excluidos de Git; `.env.example` solo contiene nombres de variables sin valores. No publicar el volcado completo de `supabase status`, que incluye credenciales privilegiadas de las herramientas locales.

## Supabase local

La configuración ya está versionada en `supabase/config.toml`; no ejecutar `supabase init --force`. Desde la raíz, con Docker funcionando:

```sh
npx supabase@2.122.0 start
npx supabase@2.122.0 migration up --local
npx supabase@2.122.0 test db --local
npx supabase@2.122.0 db lint --local
```

`start` aplica las migraciones al inicializar la instancia. `migration up --local` aplica las pendientes sin borrar datos. No hace falta `db reset`. Las pruebas SQL requieren una instancia local de pruebas vacía, sin datos reales; sus fixtures se revierten en una transacción. No ejecutar esas pruebas con `--linked` ni contra una base con datos reales.

La configuración mantiene `auth.enable_signup = false` y los accesos anónimos desactivados. En la CLI 2.122.0, `auth.email.enable_signup = true` mantiene el proveedor Email disponible para cuentas existentes; el bloqueo global sigue impidiendo el registro público. Desactivar también la opción del proveedor produce `email_provider_disabled` al intentar acceder.

La analítica local está desactivada. En Windows, Vector intentaba conectar con la API TCP de Docker en el puerto 2375 y se reiniciaba. La analítica no interviene en PostgreSQL, Auth ni RLS; no se habilita esa API TCP para resolverlo.

Consultar `npx supabase@2.122.0 status` para obtener la URL local, la clave publicable y la dirección de Studio. Completar `.env.local` con esos dos valores públicos. Las direcciones configuradas son:

- API: `http://127.0.0.1:54321`.
- PostgreSQL: puerto `54322`.
- Studio: `http://127.0.0.1:54323`.

Para detener los servicios conservando los datos: `npx supabase@2.122.0 stop`.

## Crear y autorizar al administrador

Después de aplicar las dos migraciones, crear manualmente el usuario propietario desde Authentication → Users en Studio o el Dashboard del proyecto correcto. Asignar correo y contraseña segura y confirmar el correo mediante las opciones de administración. La aplicación no registra, invita ni crea usuarios automáticamente.

Copiar el UUID de ese usuario y ejecutar como propietario de la base de datos, sustituyendo el marcador:

```sql
INSERT INTO private.administrator (singleton, user_id)
VALUES (TRUE, 'UUID_DEL_USUARIO'::UUID)
ON CONFLICT (singleton) DO UPDATE SET user_id = excluded.user_id;
```

La clave foránea exige que el usuario exista. El `ON CONFLICT` permite sustituir al administrador. Para revocar su autorización:

```sql
DELETE FROM private.administrator WHERE singleton = TRUE;
```

Estos cambios afectan inmediatamente a RLS aunque el usuario conserve un JWT vigente. En un proyecto real requieren aprobación explícita. Mantener el esquema `private` fuera de los esquemas expuestos por la Data API.

Reiniciar la aplicación después de completar `.env.local`. Abrir `/admin/login` para acceder por correo y contraseña y `/admin` para comprobar el permiso y cerrar sesión. El usuario definitivo sigue pendiente de creación manual; los usuarios de las comprobaciones locales ya fueron eliminados.

## Proyecto remoto

No se ha conectado ni configurado un proyecto remoto. Antes de hacerlo, confirmar expresamente el destino y las migraciones que se aplicarán. Revisar posibles tablas o datos existentes.

En Authentication, desactivar **Allow new users to sign up** y los inicios anónimos, mantener el proveedor Email y la confirmación de correo. Configurar Site URL con el origen de la aplicación. El login por contraseña no necesita callback OAuth ni enlaces mágicos. `config.toml` configura el entorno local y no modifica automáticamente el Dashboard remoto.

Una vez aprobados la conexión y los cambios remotos:

```sh
npx supabase@2.122.0 login
npx supabase@2.122.0 link --project-ref TU_PROJECT_REF
npx supabase@2.122.0 db push --dry-run
npx supabase@2.122.0 db push
```

Revisar el dry run antes del último comando, que aplica las migraciones. No publicar contraseñas de base de datos ni tokens de la CLI. Crear y autorizar al propietario como se indica arriba. Verificar de nuevo permisos, acceso, renovación y logout contra ese entorno y revisar los límites de intentos de Supabase Auth antes de publicar la aplicación.

## Tipos y convenciones

`lib/supabase/database.types.ts` refleja manualmente el contrato de las migraciones. Para regenerarlo desde una base local validada, revisar el diff antes de sustituir el archivo:

```sh
npx supabase@2.122.0 gen types typescript --local --schema public > lib/supabase/database.types.ts
```

SQL usa palabras clave y tipos en mayúsculas; esquemas, tablas, columnas y funciones usan minúsculas y `snake_case`. TypeScript mantiene `strict: true` y Server Components por defecto. `use client` se limita a los formularios interactivos y al cliente de navegador.

`app/` contiene las rutas; `lib/supabase/` los clientes y tipos; `lib/auth/` la autenticación y autorización; `lib/projects/`, `lib/columns/` y `lib/tasks/` las consultas por dominio. `supabase/` guarda configuración, migraciones y tests SQL; `tests/` las pruebas de aplicación. Los archivos generados de Next.js y TypeScript están excluidos de Git.

## Redacción de documentación y comentarios

Las decisiones técnicas las toma el propietario durante el desarrollo. Los ADR, la documentación y los comentarios deben reflejarlas con expresiones como «se ha decidido», «se ha elegido» o «se utiliza», explicando el contexto, el motivo y las consecuencias. Evitar atribuirlas a acuerdos entre partes. Las referencias a autorización o confirmación se reservan para acciones que realmente requieren permiso.

Referencias: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Tailwind con Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) y [CLI local](https://supabase.com/docs/guides/local-development/cli/getting-started).
