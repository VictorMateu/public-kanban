# ADR 0001: aplicación Next.js con Supabase

- Estado: aceptada.
- Fecha: 2026-11-01.
- Alcance: base e integración de persistencia de las fases 1 y 2.

## Contexto

Portfolio Kanban necesita una consulta pública y administración exclusiva del propietario. Se priorizan sencillez, seguridad, mantenimiento y costes reducidos. Se ha decidido mantener una única aplicación, sin backend independiente ni ORM adicional.

## Decisión

Mantener una única aplicación Next.js con App Router, TypeScript estricto, Tailwind y Server Components por defecto. La base se inicializó manualmente; no se generó desde el starter de Vercel para Supabase.

Utilizar PostgreSQL y Auth de Supabase con sus clientes oficiales. `lib/supabase/` separa cliente de navegador, cliente de servidor por petición y cliente público sin sesión. `server-only` protege los módulos de acceso del servidor.

Las consultas de proyectos, columnas y tareas se organizan por dominio. Las consultas públicas usan un cliente anónimo sin cookies del administrador y `cache: no-store`. No se añade una capa de repositorios genéricos.

Las sesiones SSR usan cookies. `proxy.ts` renueva y verifica la sesión en `/admin` y sus subrutas con `getClaims()`, transmitiendo las cookies y cabeceras de no caché. Las páginas verifican al usuario mediante `getUser()` y autorizan por separado. Los formularios usan Server Actions; solo las acciones escriben cookies desde el cliente de servidor.

Versionar las migraciones SQL y los tests de base de datos en `supabase/`. Mantener la configuración y los tipos de acceso junto al código; los tipos SQL actuales reflejan manualmente las migraciones y pueden regenerarse mediante la CLI.

## Alternativas consideradas

- Usar el starter completo de Vercel: se eligió una base manual para incorporar únicamente lo necesario al alcance.
- Añadir un backend u ORM: se descartó por la restricción explícita y la complejidad adicional.

## Consecuencias

La estructura sigue las convenciones de Next.js y la integración SSR de Supabase. `lib/` y la separación por dominio son decisiones organizativas del proyecto.

Los nuevos puntos de entrada que requieran sesión deberán verificar permisos y, si necesitan renovación, quedar cubiertos por el proxy. No basta con proteger visualmente la interfaz.

El tablero, el CRUD y el despliegue quedan para las fases posteriores. La elección de Vercel es una previsión; todavía no hay despliegues ni servicios remotos conectados.
