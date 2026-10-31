# Rumbo 90 · Especificación funcional

Aplicación personal de disciplina, hábitos y cumplimiento de objetivos. Transforma metas ambiciosas en pequeñas acciones diarias, medibles y sostenibles.

> No se trata de hacer más cosas. Se trata de cumplir sistemáticamente las acciones que producen los resultados que elegiste.

La primera versión debe funcionar sin IA: el valor está en el método de ejecución, no en la tecnología.

Los objetivos personales de cada usuario no forman parte de este documento ni del repositorio: se cargan dentro de la app.

## 1. Ciclos y dimensiones

- Un ciclo dura 30, 63, 90 días o un período personalizado. Al terminar se puede iniciar otro sin perder el historial.
- Cada ciclo organiza los objetivos en dimensiones. Las predeterminadas son **Salud y condición física**, **Desarrollo personal** y **Desarrollo profesional**.

## 2. Jerarquía funcional

| Nivel | Qué es | Ejemplo |
| --- | --- | --- |
| 1 · Objetivo de resultado | Qué quiero conseguir | Bajar 5 kg antes del cierre del ciclo |
| 2 · Hábitos, proyectos y acciones | Qué hago para conseguirlo | Reducir harinas refinadas, planificar comidas |
| 3 · Compromisos diarios | Qué hago hoy | Almorzar equilibradamente, actividad planificada |
| 4 · Medición y aprendizaje | Cómo voy y qué ajusto | Adherencia semanal, tendencia, obstáculos |

La trazabilidad es completa en ambos sentidos: desde un objetivo se ven los hábitos que lo impulsan, y desde una tarea diaria se ve a qué objetivo contribuye. Un resultado responde *qué conseguí*; un hábito responde *qué hice para conseguirlo*.

## 3. Pantallas

Diseño mobile-first, con una vista de escritorio más completa.

1. **Hoy.** Se abre en 30 segundos: foco del día y compromisos con hora y dimensión. Cada compromiso se marca Realizado, Parcial, Pospuesto o No realizado, con motivo opcional.
2. **Mis metas.** Metas por dimensión con valor inicial, meta y avance. El avance se calcula con reglas propias de cada tipo de objetivo, sin mezclar kilos, cursos y tareas en una fórmula arbitraria.
3. **Planificador.** Semana por bloques de tiempo asociados a metas. Permite replanificar sin perder la trazabilidad: mover una sesión de martes a miércoles registra el cambio.
4. **Mi evolución.** Tendencias de resultados, adherencia a hábitos y distribución del tiempo. Muestra la diferencia entre cumplir hábitos y mejorar resultados: si los hábitos se cumplen y el resultado no mejora, la revisión ayuda a evaluar el plan en vez de culpar a la persona.
5. **Revisión y aprendizaje.** Diario de 2 minutos, semanal de 15 a 20 minutos y cierre mensual. Preguntas semanales: qué objetivos avanzaron, qué conductas se sostuvieron, qué obstáculos se repitieron, qué dejar de hacer, delegar o modificar, y cuáles son los tres compromisos principales de la semana siguiente.

Secundarias: **Biblioteca de aprendizaje** (libros, cursos, notas y aplicaciones prácticas) y **Configuración y privacidad** (horarios, notificaciones, exportación, respaldos y control de los datos de salud).

La IA puede analizar tendencias y sugerir, pero nunca modifica objetivos, restricciones físicas ni calendarios sin confirmación.

## 4. Notificaciones

Pocas intervenciones, contextuales y con acciones claras. Agenda inicial sugerida:

| Hora | Recordatorio |
| --- | --- |
| 07:30 | Plan de mañana: elegir las 3 acciones que más acercan a las metas |
| 10 min antes | Bloque de concentración: qué se va a producir |
| 14:00 | Registro de alimentación (desactivado por defecto) |
| 21:15 | Cierre del día: qué se cumplió, qué costó, qué priorizar mañana |
| Domingo 19:00 | Revisión semanal |

| Situación | Comportamiento |
| --- | --- |
| Actividad completada | Cancela sus recordatorios pendientes |
| Bloque estratégico en curso | Evita notificaciones no importantes |
| Acción no cumplida | Ofrece reprogramarla o hacer su versión mínima |
| Vacaciones | Modo reducido con hábitos esenciales |
| Enfermedad o recuperación | Suspende actividad física sin penalizar la puntuación |
| Varios días sin entrar | Una invitación amable a retomar, sin acumular alertas |

Regla: no más de tres notificaciones rutinarias por día. Cuando el dispositivo lo permita, acciones rápidas: Realizado, Posponer 15 minutos, Abrir tarea. En la pantalla bloqueada, los avisos de peso o salud son discretos.

## 5. Módulos

| Módulo | Funciones esenciales | Prioridad |
| --- | --- | --- |
| Ciclos | Períodos de 30, 63, 90 días o personalizados | Alta |
| Objetivos | Alta, edición, prioridad, métricas, fechas y estado | Alta |
| Hábitos | Frecuencia, días, unidad, metas y versiones mínimas | Alta |
| Proyectos | Hitos, entregables, responsables, dependencias | Alta |
| Plan diario | Compromisos generados a partir de hábitos y proyectos | Alta |
| Check-in | Cumplir, posponer, omitir justificadamente, comentar | Alta |
| Notificaciones | Recordatorios, preferencias, programación y cancelaciones | Alta |
| Dashboard | Progreso, consistencia, tendencias y tiempo | Alta |
| Revisiones | Diarias, semanales y mensuales, con acciones de mejora | Alta |
| Exportación | CSV/JSON y respaldo completo | Alta |
| Integraciones | Google Calendar, Garmin Connect | Media |
| Aprendizaje | Libros, cursos y aprendizajes aplicados | Media |
| Asistente IA | Análisis, recomendaciones y replanificación aprobada | Media |

## 6. Modelo de datos

Usuario → Ciclo → Dimensión → Objetivo → Hábitos / Proyectos (hitos) → Compromisos → Registros, Mediciones y Revisiones.

- Una meta puede tener varios hábitos y un hábito puede contribuir a varias metas: se registra una vez y cuenta en todas.
- Estados de un compromiso: `pendiente`, `realizado`, `parcial`, `reprogramado`, `omitido`, `cancelado`.
- Cada medición guarda fecha, unidad y fuente (manual, Garmin, la app).
- Las metas se pueden ajustar sin perder sus valores anteriores, para saber cuándo y por qué cambiaron.

El esquema está en `supabase/migrations/`.

## 7. Arquitectura

PWA con React, TypeScript y Vite, Tailwind CSS, Supabase (PostgreSQL, login con Google y seguridad por fila), IndexedDB para el registro offline con cola de sincronización, Web Push con service worker, y publicación en GitHub Pages.

Privacidad: autenticación obligatoria, datos aislados por usuario con RLS, datos clínicos opcionales y separados de la información laboral, y ninguna clave privada (Garmin, IA) en el código del navegador.

## 8. Criterios de aceptación del MVP

- Una meta nueva puede vincularse a varios hábitos o proyectos.
- Un compromiso realizado se refleja una sola vez en todas las metas relacionadas.
- Los cambios de fecha y los incumplimientos conservan su historial.
- El registro offline se sincroniza sin duplicados al volver la conexión.
- Las notificaciones se cancelan o reprograman cuando la tarea cambia.
- Las métricas se distinguen de los hábitos: marcar una comida saludable no simula avance de peso.
- Los datos se pueden exportar y restaurar.
- La app funciona en Chrome para Android, Safari para iOS y escritorio.

## 9. Contrato semanal y principios

Cada domingo la persona elige entre cinco y ocho compromisos prioritarios, además de sus hábitos recurrentes. La app los distribuye en la semana, comprueba su cumplimiento y ayuda a replanificar.

1. La aplicación recompensa la consistencia, no el perfeccionismo.
2. Los hábitos son el mecanismo; los resultados son la evidencia.
