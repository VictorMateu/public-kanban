# ADR 0002: un único administrador y permisos mediante RLS

- Estado: aceptada.
- Fecha: 2026-11-01.
- Alcance: datos, autenticación y seguridad de la fase 2.

## Contexto

La lectura debe ser pública solo para los proyectos publicados y sus columnas y tareas. La escritura corresponde a un único propietario. No se permite registro público, colaboración multiusuario ni confiar en permisos enviados por el frontend.

## Decisión

Guardar el UUID de Supabase Auth autorizado en `private.administrator`. Una clave primaria booleana con restricción a `TRUE` limita la tabla a una fila. El UUID referencia `auth.users.id`; no se crean usuarios ni se asigna un administrador desde las migraciones o la aplicación.

Solo el propietario de la base de datos modifica esa tabla mediante SQL. El esquema privado no se expone por la Data API y no tiene permisos para `anon` o `authenticated`.

La función `public.is_admin()` no recibe argumentos: compara `auth.uid()` con el UUID autorizado. Usa `SECURITY DEFINER`, nombres de objetos cualificados y `search_path` vacío; solo se concede ejecución a `authenticated`. El servidor y las políticas consultan esa misma autorización, sin duplicar un UUID en variables de entorno ni confiar en email o metadata.

Habilitar RLS y revocar los permisos predeterminados antes de conceder los necesarios. Los proyectos son privados por defecto.

| Identidad | Lectura | Escritura |
| --- | --- | --- |
| Anónimo | Publicaciones y sus columnas/tareas | Denegada |
| Autenticado sin autorización | Igual que anónimo | Denegada |
| UUID autorizado | Todos los proyectos, columnas y tareas | Permitida por RLS |

El acceso del administrador usa correo y contraseña de una cuenta creada manualmente. El registro público y los inicios anónimos permanecen desactivados. Una identidad autenticada sin autorización se rechaza y se cierra su sesión desde el flujo de acceso de la aplicación.

La aplicación usa únicamente una clave publicable. Las consultas públicas no heredan la sesión administrativa; ocultar botones o proteger rutas no sustituye RLS.

## Integridad de los datos

`projects`, `columns` y `tasks` usan UUID, posiciones enteras no negativas y timestamps con zona horaria. Un trigger conserva `created_at` y actualiza `updated_at`. Los empates de posición se resuelven con el orden `position, id`.

El slug de proyecto es único y admite minúsculas y guiones; nombres y títulos no son vacíos y tienen longitud acotada. Las descripciones son opcionales. Las tareas admiten prioridad `low`, `medium` o `high` y fecha límite opcional; su columna representa el estado.

Las relaciones eliminan en cascada los descendientes del proyecto o columna. La clave foránea compuesta `(column_id, project_id)` impide que una tarea pertenezca a una columna de otro proyecto. Las restricciones e índices exactos están en las [migraciones](../../supabase/migrations/20261024000100_create_kanban.sql); los permisos, en la [migración de RLS](../../supabase/migrations/20261024000200_authorize_kanban.sql).

## Alternativas consideradas

- UUID fijo en una función SQL: se eligió la tabla privada de una fila para cambiar la autorización mediante una operación administrativa explícita.
- Permisos por email o metadata editable: se descartaron porque no constituyen autorización fiable.
- Enlace mágico: se eligió correo y contraseña para el acceso del propietario, sin añadir un flujo de correo.

## Consecuencias

Cambiar o eliminar el UUID revoca los permisos en la base de datos inmediatamente, sin esperar a que caduque el JWT. Borrar el usuario de Auth elimina su autorización mediante la clave foránea.

El propietario debe crear y autorizar manualmente su cuenta. Los cambios de autorización y las migraciones remotas requieren confirmación. Las pruebas locales de RLS y de autenticación no sustituyen la comprobación del proyecto remoto que se configure posteriormente.
