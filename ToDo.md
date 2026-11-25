# TODO — `odontogram-periodontogram-core`: Odontograma + Periodontograma para React (JS/TS)

## Objetivo

Librería React (con tipos TS) con dos componentes que comparten dientes, notación y estado:

* `<Odontogram />` — ficha clínica estilo NTS (MINSA Perú), como `odontograma.png`.
* `<Periodontogram />` — ficha periodontal con 6 sitios por diente y gráficas de margen/inserción.

Estilo visual: dientes SVG **anatómicamente cercanos a la realidad** (corona + raíz + vista oclusal), con trazo limpio, sombreado suave y tema configurable. No es una copia de la imagen: es la referencia de layout.

## Decisiones de arquitectura

```text
src/anatomy/      geometría SVG nueva (dientes realistas)
src/perio/        modelo y cálculos periodontales (puro TS, sin React)
src/components/   <Odontogram />, <Periodontogram />, piezas compartidas
```

* Paquete **independiente**: sin dependencia de `@kmanueldc/odontogram-core`; publicación propia. Se buscan comportamientos similares, con SVGs propios.
* La geometría de dientes es **nueva**: la del core no tiene el estilo corona+raíz de la referencia.
* Lógica periodontal en TS puro → testeable y reutilizable luego en Vue / React Native.
* Componentes **controlados** (`value` + `onChange`), sin estado global ni dependencias extra.
* Stack igual a `react-odontogram`: pnpm, tsup, vitest, biome, Storybook. React `>=17` como peer.

---

## [x] FASE 0 — Setup

* [x] Paquete en `odontogram-periodontogram/` (pnpm, tsup ESM+CJS+d.ts, vitest, biome, Storybook).
* [x] Sin enlace a `odontogram-core`: publicación propia.
* [x] Nombre npm: `odontogram-periodontogram-core`.
* Usar `pnpm vitest run` (no `npx vitest`).

## [x] FASE 1 — Anatomía SVG (el corazón visual)

Basado en `odontograma.png`. Cada diente tiene dos vistas:

1. **Vista vestibular/lateral**: corona + raíz(es). Raíces según tipo:
   * Incisivos / caninos: 1 raíz cónica.
   * Premolares: 1–2 raíces (14/24 bífidos).
   * Molares superiores: 3 raíces; molares inferiores: 2 raíces.
   * Temporales (51–85): más pequeños, raíces cortas y divergentes.
2. **Vista oclusal**: contorno de corona con fosas/cúspides; dividida en 5 superficies (V, L/P, M, D, O/I) para hallazgos por cara.

Hecho:

* [x] Plantillas paramétricas en mm por tipo (`src/anatomy/templates.ts`) → geometría generada (`geometry.ts`); espejado/volteo por cuadrante.
* [x] CEJ en y = 0 en todos los dientes (exportada como `lateral.cej`); ejes de raíz (`rootAxes`) para endodoncia/implantes.
* [x] Vista oclusal **circular** (estilo NTS): anillo de 4 sectores (V, L/P, M, D) + círculo central (O/I), sin huecos. Radio mínimo 3 mm.
* [x] Dientes en **blanco** (`--odp-tooth`), sin gradientes.
* [x] Molares superiores: raíz palatina dibujada detrás de las vestibulares; furcas en U; raíces con curvatura distal.
* [x] Trazo proporcional a `pxPerMm` (0.9–1.6px), sobrescribible con `--odp-stroke-width`.
* [x] Detalle anatómico fino (cíngulo, surcos de desarrollo, rebordes marginales, surco vestibular) en `lateral.details`; visible desde 8 px/mm o con `detail`.
* [x] Stories: "Anatomía" (52 dientes, 12 px/mm por defecto) y "Un diente".
* [x] Tests: 52 FDI con geometría, superficies sin huecos, orientación mesial/vestibular, nº de raíces.

Anclajes de casilleros/número: resueltos en FASE 2 por `layoutOdontogram()`.

## [x] FASE 1.5 — Pincel (marcas puntuales)

Marcar puntos circulares sobre cualquier zona del diente y guardarlos en el sistema del usuario.

* [x] `<ToothSvg marks onMarksChange brushColor>`: clic en el diente agrega un punto, clic en un punto lo quita (también Enter/Supr con teclado). Sin `onMarksChange` = solo lectura.
* [x] `ToothMark` es JSON plano: `{ fdi, view, x, y, zone, color?, geometryVersion }`.
  * `x`, `y` en **mm del diente** (independiente del tamaño en pantalla).
  * `zone`: `V/L/M/D/O` (oclusal) o `crown`/`root` (lateral).
* [x] Un solo arreglo para toda la ficha: cada diente dibuja solo sus marcas.
* [x] Story "Pincel → Marcar puntos" con el JSON en vivo; tests de agregar/quitar/solo lectura.

Pendiente:

* [x] Teclado: cada zona (V/L/M/D/O, corona, raíz) es enfocable; Enter/Espacio agrega un punto en su centro (en espiral si se repite), Enter/Supr sobre un punto lo quita.
* [x] `geometryVersion` en cada marca (`GEOMETRY_VERSION` exportado): subirlo cuando cambien las formas; comparar para detectar marcas desplazadas.
* [x] *Roving tabindex* en la ficha (FASE 3).
* [x] Pincel integrado en el layout completo (FASE 2).
* [x] El pincel convive con la selección como `mode="brush" | "select"` (FASE 3).

## [x] FASE 2 — Layout del odontograma

Replicar la ficha de referencia:

```text
[casilleros sup. (2 filas)]
 18 … 11 | 21 … 28        permanentes superiores (raíz arriba)
     55 … 51 | 61 … 65    temporales superiores
 ──────────┼──────────    línea media + plano oclusal
     85 … 81 | 71 … 75    temporales inferiores
 48 … 41 | 31 … 38        permanentes inferiores (raíz abajo)
[casilleros inf. (2 filas)]
```

Hecho:

* [x] `<Odontogram dentition="mixed|permanent|primary">`: un solo `<svg>` en mm, ancho 100%, responsive por `viewBox`.
* [x] Layout puro `layoutOdontogram()` (`src/layout/`): posiciones de vista lateral, oclusal, número y casillero por diente (son los anclajes pendientes de FASE 1).
* [x] Columnas de 13 mm; el temporal va en la columna de su sucesor (55 bajo 15). Temporal solo = 10 columnas.
* [x] CEJ alineada por grupo (arcada × dentición); línea media y plano oclusal.
* [x] Casilleros: un casillero por diente, `boxes={{ 18: "DAO" }}`. En mixta: fila exterior = permanentes, interior = temporales.
* [x] Escala real medida con `ResizeObserver`: trazo y detalle anatómico se ajustan solos al tamaño en pantalla.
* [x] Pincel integrado (`marks` / `onMarksChange` para toda la ficha).
* [x] Stories: Mixta, Permanente, Temporal, Con casilleros, Con pincel. Tests de layout (sin solapes, lados, CEJ, columnas) y de render.

Pendiente:

* [x] Casilleros con siglas rojo/azul desde los hallazgos (FASE 3).
* [ ] La ficha es más alta que la referencia (vista oclusal separada de la corona). Opción: superponer el círculo a la corona como en `odontograma.png`.
* [x] *Roving tabindex* (resuelto en FASE 3).

## [x] FASE 3 — Hallazgos del odontograma

Catálogo NTS propio (sin depender del core). Render por tipo de marca:

* Diente ausente / extracción indicada → X azul/roja sobre corona+raíz.
* Caries / restauración → relleno de superficie oclusal (rojo / azul).
* Corona, prótesis fija (FFP con puente entre dientes), endodoncia (línea en raíz), implante, migración/giroversión (flechas), diastema, etc.
* Regla NTS: **azul = buen estado / realizado, rojo = mal estado / por tratar**.
* API: `value: Record<FDI, ToothRecord>` + `onChange`. Selección de diente y de superficie.
* Accesibilidad: cada diente/superficie focusable, `aria-label` con FDI + hallazgos, navegación con teclado.

Hecho:

* [x] Catálogo (`src/findings/catalog.ts`): 29 hallazgos con nombre, siglas permitidas, tipo de dibujo y color fijo cuando aplica.
* [x] Modelo JSON: `value = { [fdi]: Finding[] }`, `Finding = { code, state?, sigla?, surfaces?, to?, direction? }`.
* [x] Helpers puros: `addFinding` (valida y lanza `RangeError`), `removeFinding`, `describeFindings`, `findingState`, `findingSigla`.
* [x] Dibujo por diente (`FindingLayer`): superficies rellenas/contorneadas, corona, X, conductos, implante, extrusión/intrusión, erupción, fractura, giroversión, migración.
* [x] Dibujo entre dientes (en la ficha): prótesis fija, aparato ortodóntico, diastema.
* [x] Casilleros: siglas automáticas desde los hallazgos (azul/rojo), más texto libre en `boxes`. Se achican para entrar.
* [x] Selección: `selection` + `onSelectionChange({ fdi, zone })`; `mode="select" | "brush"`.
* [x] Accesibilidad: *roving tabindex* (una parada de Tab para toda la ficha; ←/→ entre dientes de la fila, ↑/↓ entre zonas), `aria-pressed` en la zona seleccionada, `aria-label` del diente con sus hallazgos.
* [x] Códigos desconocidos (datos de otra versión) se ignoran al dibujar en vez de romper.
* [x] Story "Hallazgos NTS → Editor" con selector de ejemplo y JSON guardado. Tests de modelo, render, selección y teclado.

Pendiente:

* [ ] **Validar el catálogo con un odontólogo** contra la NTS vigente (siglas, colores, qué hallazgos faltan: supernumerario, transposición, fusión/geminación, prótesis removible/total, edéntulo, etc.).
* [ ] Selector de hallazgos incluido en la librería (hoy es responsabilidad de la app; hay un ejemplo en la story).
* [ ] Hallazgos que ocupan varias caras se agregan una cara a la vez en la story; permitir multiselección de caras.

## [x] FASE 4 — Modelo periodontal (TS puro)

Por diente, **6 sitios** (MV, V, DV, ML, L, DL):

* Profundidad de sondaje (PS, mm).
* Margen gingival (MG, mm; negativo = agrandamiento).
* Nivel de inserción clínica **NIC = PS + MG** (calculado, no se ingresa).
* Sangrado al sondaje, supuración, placa (booleanos por sitio).

Por diente:

* Movilidad (0–3), furca (0–3, solo multirradiculares, por entrada), encía queratinizada (mm), implante, ausente, pronóstico.

Cálculos:

* % sangrado, % placa, PS media, NIC medio, nº sitios con PS ≥ 4/≥ 6.
* Tests unitarios para todas las fórmulas.

Hecho (`src/perio/model.ts`, sin React):

* [x] Tipos JSON: `PerioChart = { [fdi]: PerioTooth }`, `PerioTooth = { sites, mobility, furcation, keratinized, implant, missing, prognosis }`, `PerioSite = { pd, gm, bleeding, suppuration, plaque }`.
* [x] Convención: MG desde la CEJ, **positivo = recesión, negativo = agrandamiento**; `cal()` = PS + MG (indefinido si falta uno).
* [x] Furca por anatomía (`furcationEntrances`): molares sup. V/MP/DP, molares inf. V/L, 14/24 M/D.
* [x] Validación (`RangeError`): solo dientes permanentes, PS 0–20, MG −10–20, movilidad y furca 0–3, entradas de furca propias del diente, pronóstico conocido.
* [x] Actualización inmutable validada: `setPerioSite`, `setPerioTooth`.
* [x] `perioSummary`: % sangrado, % placa, sitios con supuración, PS media, NIC media, sitios PS ≥ 4 y ≥ 6. Sitio examinado = tiene PS; ausentes excluidos, implantes incluidos.
* [x] Tests de fórmulas, furcas, validación, inmutabilidad y resumen.

Pendiente:

* [ ] Confirmar con el odontólogo: denominador de % sangrado/placa (sitios examinados vs. 6 × dientes presentes) y escala de pronóstico (`good | fair | poor | questionable | hopeless`).
* [ ] ¿Clasificación AAP/EFP 2017 (estadio/grado)? No pedida aún.

## [x] FASE 5 — Componente `<Periodontogram />`

Layout clásico tipo ficha periodontal:

```text
[tabla de datos vestibular superior]   movilidad, implante, furca, sangrado, placa, MG, PS
[dientes sup. vista vestibular + gráfica MG (rojo) / fondo de bolsa (azul)]
[dientes sup. vista palatina + gráfica]
[tabla palatina superior]
… ídem inferior (lingual / vestibular)
```

* Gráfica: polilínea sobre el SVG del diente usando la CEJ como 0 mm, escala fija en mm. Área entre MG y fondo de bolsa sombreada.
* Entrada de datos rápida: inputs por sitio con **avance automático** (teclado: escribir número → siguiente sitio), como en fichas clínicas reales.
* Dientes ausentes (desde odontograma) se marcan y saltan.
* Resumen (porcentajes de FASE 4) en un pie de ficha.

Hecho (`<Periodontogram value onChange>`):

* [x] 4 paneles: vestibular sup., palatino sup., lingual inf., vestibular inf. Grilla HTML alineada con la tira SVG (mismas 16 columnas + línea media que el odontograma).
* [x] Filas: Ausente, Implante, Movilidad, Encía queratinizada, Furca (solo entradas del diente y de esa cara), Sangrado, Placa, Supuración, MG, PS (PS siempre junto a los dientes).
* [x] Gráfica en mm reales con CEJ = 0: MG en rojo, fondo de bolsa en azul, área sombreada; cortes en dientes ausentes o sitios sin datos. Líneas cada 1 mm (más marcadas cada 5).
* [x] Sitios ordenados con mesial hacia la línea media (izquierda→derecha según cuadrante).
* [x] Entrada rápida: un dígito guarda y avanza al siguiente sitio de la fila; "1" y "-" esperan (10–19, MG negativo); Enter avanza. Salta dientes ausentes. Valores fuera de rango se marcan `aria-invalid` y no se guardan.
* [x] Resumen al pie con los índices de FASE 4. Solo lectura sin `onChange`.
* [x] Story "Periodontograma" (ejemplo y vacía) y tests de entrada, avance, validación, gráfica y resumen.

Pendiente:

* [ ] La vista palatina/lingual reutiliza la silueta vestibular del diente (atajo).
* [ ] Orden clínico de sondaje: hoy siempre izquierda→derecha por fila; algunos flujos van 18→28 por vestibular y 28→18 por palatino.
* [ ] Pronóstico: está en el modelo pero sin fila en la UI.
* [ ] En pantallas angostas la ficha hace scroll horizontal (`min-width: 60rem`).

## [x] FASE 6 — Integración odontograma ↔ periodontograma

* Un mismo estado de paciente alimenta ambos: ausencias e implantes del odontograma se reflejan en el periodontograma.
* Exportar ambos tipos de registro en JSON serializable (para guardar en backend).

Hecho (`src/integration/patient.ts`):

* [x] Registro único del paciente: `PatientChart = { version: 1, odontogram, periodontogram, marks }`, JSON plano (`JSON.stringify` directo).
* [x] `<Periodontogram odontogram={...}>`: ausentes e implantes del odontograma se muestran y bloquean ("del odontograma"); son **derivados** (`perioWithOdontogram`), no se escriben en el periodontograma, así no quedan desactualizados. El resumen también los respeta.
* [x] `parsePatientChart(jsonOStringObjeto)`: valida al cargar desde el backend (versión, hallazgos, datos perio, marcas) y lanza `RangeError` con la ruta del problema ("odontogram 16[0]: …").
* [x] `emptyPatientChart()`, `PATIENT_CHART_VERSION`.
* [x] Story "Integración": un estado alimenta ambas fichas; exportar/importar JSON con validación. Tests de derivación, ida y vuelta JSON, rechazos y bloqueo en la UI.

Pendiente:

* [ ] Migraciones: hoy una versión distinta de 1 se rechaza; cuando exista la v2, agregar `migrate(v1 → v2)`.
* [ ] Sentido inverso (ausente marcado en el periodontograma → odontograma): no se hace; el odontograma es la fuente de verdad.

## [x] FASE 7 — Tema y estilo

* CSS variables (`--odp-stroke`, `--odp-enamel`, `--odp-red`, `--odp-blue`, …), modo claro/oscuro.
* Impresión: hoja `@media print` en A4 (las fichas se imprimen y firman).

Hecho:

* [x] Todos los colores son variables `--odp-*` (documentadas en `styles.css`): `--odp-tooth`, `--odp-stroke`, `--odp-red`, `--odp-blue`, `--odp-text`, `--odp-line`, `--odp-border`, `--odp-surface`, `--odp-bg`, `--odp-pocket-fill`, etc. Se sobrescriben en cualquier contenedor.
* [x] Tema oscuro con `.odp-theme-dark`; `.odp-theme-auto` sigue al sistema operativo. Dientes y casilleros NTS siguen blancos ("papel") para que el rojo/azul NTS no pierda contraste ni significado.
* [x] Impresión: reglas `@media print` acotadas a las fichas (tema claro forzado, colores exactos, sin cortes dentro de una arcada, periodontograma compacto). Ficha mixta + periodontograma = 2 hojas A4.
* [x] `print.css` opcional (`odontogram-periodontogram-core/print.css`) con `@page { size: A4 }`, separado porque `@page` afecta a toda la página.
* [x] Storybook: selector de tema (claro / oscuro / sistema) y stories "Tema" (comparativa y hoja A4 con firma).
* [x] Tests del CSS: toda variable usada está definida, oscuro y auto iguales, dientes/NTS fuera del tema oscuro, impresión en claro.

Pendiente:

* [ ] Encabezado de la ficha (datos del paciente, fecha, profesional) y bloque de firma: hoy los pone la app (ver story de impresión).

## [~] FASE 8 — Calidad y publicación

* Tests: core perio, render de componentes, accesibilidad (axe).
* Storybook: Anatomía, Odontograma (permanente/temporal/mixto), Hallazgos NTS, Periodontograma, Integración, Tema.
* README con ejemplos JS y TS, CHANGELOG, LICENSE, publicación npm.

---

Hecho:

* [x] Tests de accesibilidad con axe (`tests/a11y.test.tsx`): diente, odontograma (lectura, selección, pincel) y periodontograma (lectura, edición con odontograma), sin violaciones.
* [x] 382 tests; cobertura 95.6 % de líneas (sin contar stories).
* [x] Stories: Anatomía, Odontograma, Pincel, Hallazgos NTS, Periodontograma, Integración, Tema.
* [x] README (instalación, ejemplos TS y JS, formatos JSON, props, teclado, tema, impresión), CHANGELOG 0.1.0, LICENSE MIT.
* [x] `package.json` 0.1.0: `exports` con tipos por formato (ESM `.d.ts` / CJS `.d.cts`), `style.css`, `print.css`; `prepublishOnly` corre lint, tipos, tests y build.
* [x] Nombre `odontogram-periodontogram-core` libre en npm (verificado 2026-11-24).
* [x] Paquete probado de verdad: `npm pack` → instalado en un proyecto limpio → import ESM y CJS, CSS y tipos (`node16` y `bundler`) OK.

Pendiente:

* [ ] **Publicar**: `npm login` y `npm publish` (corre `prepublishOnly`). Requiere confirmación.
* [ ] Repositorio git + `repository` / `homepage` / `bugs` en `package.json` (aún no hay repo).
* [ ] Validación clínica del catálogo NTS antes de recomendar uso en producción.


## Fuera de alcance (por ahora)

* Vue / React Native (el modelo perio en TS puro lo deja preparado).
* Notaciones Universal/Palmer en la UI (el core ya las tiene; se exponen después).
* Comparación entre visitas / historial.
* Exportar a PDF (usar impresión del navegador).

## Pendientes por decidir

* (Resuelto) Plantillas paramétricas generadas en código, no trazadas.
