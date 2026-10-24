# Portfolio Kanban

Tablero público para mostrar los proyectos de mi portfolio, sus tareas y su evolución. La consulta será pública; únicamente el propietario podrá administrar los datos.

## Objetivos

- Mostrar proyectos y tareas en un tablero Kanban accesible sin iniciar sesión.
- Permitir a un único administrador gestionar proyectos, columnas y tareas mediante autenticación.
- Mantener una aplicación sencilla, accesible, responsive y desplegable con costes mínimos.
- Aprender buenas prácticas de ingeniería sin introducir complejidad innecesaria.

## Alcance inicial (MVP)

- Vista pública de proyectos y sus tableros.
- Columnas iniciales: Pendiente, En progreso y Completado (ordenables en una fase posterior).
- Tarjetas con título, descripción opcional, estado, prioridad opcional y fechas opcionales.
- Área de administración protegida para crear, editar, mover y eliminar proyectos y tareas.
- Persistencia real en Supabase PostgreSQL.
- Políticas RLS: lectura pública exclusivamente de datos publicados; escritura únicamente del administrador autorizado.
- Estados de carga, vacío y error, diseño responsive y accesibilidad básica.

## Fuera del alcance inicial

- Registro público de usuarios, colaboración multiusuario, invitaciones o equipos.
- Suscripciones, pagos, notificaciones y tiempo real.
- Microservicios, colas, cachés distribuidas y backend Java independiente.

## Stack

- Next.js 16.4.3 (App Router) + React y React DOM 19.3.1.
- TypeScript 5.9.3 en modo estricto.
- Tailwind CSS 4.3.3 mediante `@tailwindcss/postcss` 4.3.3 y PostCSS 8.5.31.
- ESLint 9.39.5 con `eslint-config-next` 16.4.3 (Core Web Vitals y TypeScript).
- Tipos: `@types/node` 24.19.2, `@types/react` y `@types/react-dom` 19.3.0.
- Previsto para fases posteriores: Supabase (PostgreSQL, Auth y RLS) y Vercel para el despliegue. Todavía no están configurados ni conectados.

Las dependencias directas están fijadas en `package.json`; `package-lock.json` fija el árbol completo para instalaciones reproducibles con npm. Se mantienen TypeScript 5.9 y ESLint 9 para la compatibilidad de las herramientas de esta base. No añadir librerías adicionales sin una necesidad concreta.

Limitación conocida: npm avisa de que ESLint 9.39.5 ya no tiene soporte. Se conserva porque los plugins de React, imports y accesibilidad incluidos en `eslint-config-next` declaran compatibilidad hasta ESLint 9. Revisar la actualización conjunta cuando estos plugins admitan ESLint 10, sin forzar dependencias incompatibles. El parser de TypeScript instalado declara soporte para versiones anteriores a 6.1; por eso no se usa TypeScript 7.

La configuración sigue las guías oficiales de [Next.js](https://nextjs.org/docs/app/getting-started/installation) y [Tailwind CSS con Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

## Arquitectura

En la fase 1, la aplicación Next.js solo sirve una página estática de presentación mediante Server Components. No hay consultas, escrituras, autenticación ni servicios externos. Se usan fuentes del sistema, sin descargas de fuentes durante la compilación.

La arquitectura prevista para las siguientes fases es una aplicación Next.js desplegada en Vercel. Las páginas públicas consultarán únicamente datos publicables de Supabase; el área privada exigirá sesión y permisos de administrador. Las operaciones de escritura deberán validarse en el servidor y estar protegidas por RLS en PostgreSQL. La protección visual de rutas no sustituye la autorización en base de datos.

Preferir Server Components para lecturas y componentes cliente donde haya interacción. Usar Server Actions o Route Handlers según convenga, con validación de entrada y autorización explícita. Mantener separadas la presentación, las consultas y las reglas de negocio sin crear capas artificiales.

### Modelo conceptual inicial

- `projects`: identificador, slug, nombre, descripción, visibilidad/publicación, orden y marcas temporales.
- `columns`: identificador, proyecto, nombre y posición.
- `tasks`: identificador, proyecto, columna, título, descripción, prioridad opcional, posición y marcas temporales.
- Administración: una identidad autorizada mediante Supabase Auth y una política explícita de permisos; no confiar en emails enviados desde el cliente.

El esquema SQL definitivo, las restricciones, índices y políticas RLS se definirán y revisarán antes de implementar la persistencia.

## Fases de desarrollo

1. **Base:** inicializar Next.js, TypeScript, Tailwind, lint y estructura mínima; página de inicio funcional sin credenciales.
2. **Datos y seguridad:** definir esquema, migraciones, Supabase Auth y RLS; probar acceso anónimo y administrador.
3. **Consulta pública:** listado de proyectos y tablero en modo lectura.
4. **Administración:** inicio de sesión privado y CRUD de proyectos, columnas y tareas.
5. **Calidad y despliegue:** pruebas, accesibilidad, documentación y publicación en Vercel.

No avanzar automáticamente a la siguiente fase sin revisión.

## Desarrollo local

### Requisitos

- Node.js 24.x y npm 11.x, declarados en `package.json`.
- Entorno utilizado para validar esta fase: Node.js 24.22.1 y npm 11.19.1 en Windows.
- Usar npm y conservar `package-lock.json`; no mezclar gestores de paquetes.

### Comandos

Ejecutar desde la raíz del repositorio:

```sh
npm ci
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). `npm ci` instala exactamente el lockfile; `npm install` se utiliza cuando se modifican dependencias de forma intencionada.

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

- `lint`: ejecuta ESLint sin permitir advertencias.
- `typecheck`: genera los tipos de rutas de Next.js y ejecuta `tsc --noEmit` con `strict: true`. Puede ejecutarse antes del primer build.
- `build`: genera la compilación de producción y comprueba tipos. El lint se ejecuta por separado.
- `start`: sirve la compilación de producción; requiere haber ejecutado `build`.

No hay suite ni comando de tests automatizados en esta fase; las comprobaciones disponibles son lint, tipos y build.

### Estructura mínima

```text
app/
  globals.css          Estilos globales e importación de Tailwind
  layout.tsx           Layout raíz, idioma español y metadatos
  page.tsx             Inicio de Portfolio Kanban en construcción
eslint.config.mjs      Reglas de Next.js y TypeScript
postcss.config.mjs     Integración de Tailwind
tsconfig.json          TypeScript estricto
package.json           Dependencias y comandos
package-lock.json      Versiones resueltas por npm
```

La base se ha inicializado directamente en la raíz, sin una carpeta de proyecto anidada. No se crean carpetas de componentes, datos o servicios hasta necesitarlas. Next.js genera `next-env.d.ts` y `.next/`; estos archivos, `node_modules/` y los archivos incrementales de TypeScript están excluidos mediante `.gitignore`.

### Variables de entorno

La fase 1 no necesita variables de entorno, por lo que no se crea `.env.example`. Se añadirá cuando exista configuración real que documentar. `.gitignore` excluye `.env*` y permite versionar un futuro `.env.example`.

Nunca incluir secretos reales en el repositorio. Publicar únicamente nombres de variables en `.env.example`. Las claves privilegiadas de Supabase nunca deben exponerse al navegador.

## Estado

Fase 1 implementada: base de Next.js con App Router, TypeScript estricto, Tailwind y ESLint; página de inicio responsive con título, mensaje de construcción y estructura semántica accesible. No contiene proyectos ni tareas de ejemplo.

Validaciones realizadas en el entorno indicado: `npm run lint`, `npm run typecheck` y `npm run build` completados correctamente. El servidor de producción respondió con HTTP 200 para la página y su CSS; se comprobó el idioma español, la presencia de `main`, un único `h1` y el contenido esperado. No se ha realizado una revisión visual en navegador ni una auditoría completa de accesibilidad. `AGENTS.md` conserva su contenido original, comprobado mediante SHA256.

La fase 2 queda pendiente de revisión y confirmación: decidir el esquema SQL definitivo, restricciones e índices, estrategia de identidad del único administrador, migraciones y políticas RLS. Después habrá que probar los permisos anónimos y de administrador antes de permitir datos reales. No se ha configurado Supabase, autenticación, RLS, CRUD ni despliegue.

## Licencia

El código del proyecto se distribuye bajo la [licencia MIT](LICENSE). Puedes copiarlo, modificarlo y redistribuirlo, incluso con fines comerciales, conservando el aviso de copyright y la licencia. Se proporciona sin garantías. Las dependencias conservan sus propias licencias.
