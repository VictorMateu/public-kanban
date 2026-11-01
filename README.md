# Portfolio Kanban

Tablero público para mostrar los proyectos de mi portfolio, sus tareas y su evolución. Cualquier persona podrá consultar los proyectos publicados; únicamente el propietario podrá administrar los datos.

El proyecto prioriza sencillez, accesibilidad, seguridad y mantenimiento, con una única aplicación Next.js y persistencia en Supabase.

## Estado

- **Fase 1 completada:** base del proyecto y página de inicio responsive con el tablero en construcción.
- **Fase 2 validada en local:** esquema PostgreSQL, autenticación por contraseña, autorización de un único administrador mediante UUID, políticas RLS y consultas tipadas.
- **Pendiente:** crear manualmente la cuenta definitiva del propietario y autorizarla. El tablero visual, el listado público de proyectos y el CRUD de administración todavía no están implementados.
- No hay proyectos de ejemplo en la aplicación ni servicios remotos conectados.

## Alcance previsto

El MVP permitirá consultar proyectos y tareas en un Kanban con columnas iniciales Pendiente, En progreso y Completado. El propietario podrá crear, editar, mover y eliminar los datos desde un área privada. Solo serán públicos los proyectos publicados y sus columnas y tareas.

Quedan fuera del alcance inicial el registro público, la colaboración multiusuario, pagos, notificaciones y tiempo real. No se incorpora un backend independiente ni un ORM adicional.

## Stack

- Next.js 16.4.3 con App Router y React 19.3.1.
- TypeScript estricto y Tailwind CSS 4.3.3.
- Supabase PostgreSQL, Auth y Row Level Security.
- ESLint, tests nativos de Node.js y pruebas SQL con pgTAP.

Las versiones exactas están fijadas en `package.json` y `package-lock.json`. Los requisitos y las limitaciones de compatibilidad están en la [guía de desarrollo](docs/development.md).

## Desarrollo local

Requiere Node.js 24.x y npm 11.x. Para usar Supabase local también se necesita Docker funcionando.

```sh
npm ci
npm run dev
```

La aplicación se abre en [http://localhost:3000](http://localhost:3000). Sin configurar Supabase, la página inicial funciona y el acceso administrativo muestra un aviso. Consulta la [configuración de Supabase y del administrador](docs/development.md#supabase-local) para habilitar el acceso.

| Comando | Finalidad |
| --- | --- |
| `npm run lint` | Revisar el código sin permitir advertencias |
| `npm run typecheck` | Generar tipos de rutas y comprobar TypeScript |
| `npm test` | Ejecutar las pruebas de aplicación |
| `npm run build` | Compilar para producción |
| `npm start` | Servir una compilación de producción existente |

## Documentación

- [Desarrollo, variables de entorno, migraciones y administrador](docs/development.md).
- [Validaciones y resultados locales](docs/validation.md).
- [ADR 0001: aplicación Next.js e integración con Supabase](docs/adr/0001-nextjs-and-supabase.md).
- [ADR 0002: autorización de un único administrador y RLS](docs/adr/0002-single-administrator-and-rls.md).

## Próximas fases

3. Consulta pública: listado de proyectos y tablero en modo lectura.
4. Administración: CRUD de proyectos, columnas y tareas sobre el acceso privado existente.
5. Calidad y despliegue: ampliar pruebas, revisar accesibilidad y publicar en Vercel.

Cada fase requiere revisión y confirmación antes de avanzar.

## Licencia

El código se distribuye bajo la [licencia MIT](LICENSE). Se permite copiar, modificar y redistribuir, incluso con fines comerciales, conservando el aviso de copyright y la licencia. Se proporciona sin garantías. Las dependencias conservan sus propias licencias.
