# Instrucciones para Codex — Portfolio Kanban

## Contexto y prioridades

Leer `README.md` antes de proponer cambios. El proyecto es un Kanban público de portfolio con administración exclusiva de su propietario. Priorizar sencillez, seguridad, legibilidad y mantenibilidad; evitar sobreingeniería.

## Forma de trabajar

1. Antes de una tarea relevante, inspeccionar el repositorio y resumir un plan breve con archivos afectados, riesgos y validaciones.
2. Implementar únicamente el alcance solicitado. No añadir funcionalidades, servicios ni dependencias no aprobadas.
3. Si hay decisiones de arquitectura o seguridad con varias alternativas razonables, presentar opciones y esperar confirmación.
4. Tras implementar, ejecutar los comandos de lint, tipos, tests o build que existan; informar de resultados y limitaciones sin inventar verificaciones.
5. Actualizar `README.md` cuando cambien arquitectura, comandos, configuración, requisitos o decisiones funcionales.
6. Al terminar, resumir qué cambió, cómo se verificó y cuál sería el siguiente paso recomendado.

## Convenciones

- TypeScript estricto; evitar `any` salvo justificación.
- Componentes pequeños, nombres descriptivos y separación razonable entre UI y acceso a datos.
- Server Components por defecto; `use client` solo cuando sea necesario.
- Evitar abstracciones prematuras, patrones complejos y dependencias innecesarias.
- Mantener estilos consistentes con Tailwind y considerar responsive, accesibilidad y estados de error.
- No modificar masivamente archivos ajenos a la tarea ni sobrescribir cambios existentes sin consultar.

## Seguridad y datos

- No incluir secretos, tokens ni credenciales en código, documentación o commits.
- Nunca exponer claves de servicio o credenciales privilegiadas de Supabase en código cliente.
- Toda escritura debe tener autorización real y validación del lado servidor.
- Definir y probar RLS antes de permitir escrituras o lectura pública de datos reales.
- No asumir que ocultar botones o proteger rutas cliente constituye autorización.
- No ejecutar operaciones destructivas contra bases de datos sin autorización expresa.

## Restricciones de alcance

- No añadir registro público, colaboración multiusuario, pagos, microservicios ni backend separado.
- No desplegar ni conectar servicios externos sin solicitar aprobación.
- No crear documentación Markdown adicional salvo que el usuario lo pida.
- No pasar de una fase del README a la siguiente sin confirmación.
