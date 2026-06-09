---
name: use-agents-first
description: >
  Guía para Claude Code sobre cuándo usar agentes y subagentes de forma
  inteligente, equilibrando calidad con costo en tokens. Activar cuando
  la tarea involucra múltiples archivos independientes, flujos
  investigación+implementación+verificación, refactoring a gran escala,
  o cuando hay un MCP disponible para el dominio. NO activar para tareas
  simples de 1-3 pasos, ediciones puntuales, o preguntas directas.
---

# Agentes Inteligentes — Cuándo Vale la Pena

> **Principio central**: Los agentes son una inversión de tokens.
> Úsalos cuando el retorno (calidad, velocidad, aislamiento) justifica el costo.
> Para tareas simples, actúa directo — no todo necesita un agente.

---

## Árbol de Decisión Rápido

```
¿La tarea completa tarda menos de ~10 pasos y es lineal?
└─ SÍ → Hazlo directamente. No uses agentes.

¿Hay un MCP disponible para este dominio exacto?
└─ SÍ → Úsalo. Ahorra tokens y es más confiable que hacerlo manual.

¿La tarea tiene 3+ partes INDEPENDIENTES que no dependen entre sí?
└─ SÍ → Subagentes paralelos. El ahorro de contexto compensa el overhead.

¿Es investigación + implementación + verificación?
└─ SÍ → Pipeline de 2-3 agentes. Cada uno con contexto mínimo y enfocado.

¿El contexto actual ya está muy cargado (+50% de ventana)?
└─ SÍ → Subagente para las partes restantes. Evita degradación por contexto largo.

En todos los demás casos → Procede directamente.
```

---

## Cuándo SÍ usar agentes (vale el costo)

### ✅ Partes verdaderamente independientes
Cuando 2+ subtareas no necesitan el output de la otra para empezar:
```
Ejemplo válido:
- Leer y analizar archivo A  (independiente de B)
- Leer y analizar archivo B  (independiente de A)
→ Paralelo: cada subagente con contexto mínimo = menos tokens totales que
  un contexto acumulado que carga A, procesa, carga B, procesa...
```

### ✅ MCP disponible para el dominio
Los MCPs son herramientas especializadas — no reimplementes lo que ya hacen:
```
GitHub MCP    → operaciones git/PR/issues  (no: bash git manual)
Browser MCP   → navegación/scraping        (no: fetch + parseo manual)
DB MCP        → queries a base de datos    (no: bash + sqlite3)
```
Verificar: buscar herramientas con prefijo `mcp__` en tools disponibles.

### ✅ Contexto ya cargado y quedan tareas largas
Si el contexto principal ya está pesado y viene una tarea larga e independiente:
```
→ Subagente con contexto fresco = más eficiente que continuar acumulando
```

### ✅ Riesgo de fallo en tarea larga
Operaciones destructivas o de larga duración donde un fallo a mitad es costoso:
```
→ Subagente aislado: si falla, no contamina el flujo principal
```

---

## Cuándo NO usar agentes (no vale el costo)

### ❌ Tareas simples y lineales
```
- Editar 1-2 archivos con cambios claros → directo
- Correr un comando bash y reportar resultado → directo  
- Responder una pregunta sobre el código → directo
- Crear un archivo nuevo desde cero → directo
- Instalar una dependencia → directo
```

### ❌ Tareas secuenciales donde B depende del output de A
```
- Leer archivo → decidir qué hacer → actuar
  (el segundo paso necesita el resultado del primero → no paralizable)
```

### ❌ Cuando pasar el contexto al subagente es tan costoso como hacer la tarea
```
Si la instrucción del subagente necesita incluir 2000 tokens de contexto
para una tarea que produce 200 tokens de resultado → no vale la pena
```

### ❌ Tareas de 1 solo dominio sin variantes
```
- "Escribe una función que haga X" → directo
- "Busca este error en el log" → directo
```

---

## Reglas de Eficiencia para Subagentes

Cuando sí lanzas un subagente, hazlo bien para no desperdiciar tokens:

**1. Contexto mínimo suficiente** — solo lo que el subagente necesita saber,
no todo el historial de la conversación.

**2. Tarea bien delimitada** — output esperado claro y concreto.
Un subagente con instrucción vaga itera más y gasta más.

**3. No lances más de 3-4 subagentes en paralelo** a menos que las tareas
sean muy cortas. El overhead de coordinación crece.

**4. Prefiere un subagente que hace más** a varios que hacen poco.
La granularidad excesiva es contraproducente.

---

## Tabla de Referencia Rápida

| Situación | Decisión | Por qué |
|-----------|----------|---------|
| Editar 1 función | Directo | Overhead > beneficio |
| Analizar 5 archivos independientes | Subagentes paralelos | Contexto acotado por agente |
| Hay GitHub MCP y necesito crear PR | MCP | Especializado y eficiente |
| Investigar librería + implementar | Pipeline 2 agentes | Contextos separados y enfocados |
| Correr tests + seguir desarrollando | Subagente para tests | Paralelismo real |
| Refactor de 1 módulo pequeño | Directo | Simple y lineal |
| Refactor de 3 módulos sin dependencias | Subagentes | Independientes, paralelizables |
| Contexto al 70%, queda tarea larga | Subagente | Contexto fresco = más eficiente |

---

## Recordatorio

Agentes = inversión. Úsalos cuando hay retorno claro:
parallelismo real, MCP especializado, o contexto fresco.
Para todo lo demás, actúa directo y ahorra tokens.
