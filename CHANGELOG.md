# Changelog

## 0.2.2 — 2026-11-25

### Añadido

- Subpath `odontogram-periodontogram-core/rules`: catálogo, reglas clínicas (`conflictOf`, `addFinding`, `validateFinding`…), periodontograma y ficha del paciente, sin React ni CSS, en CommonJS y ESM. Sirve para validar en el servidor (Node).

### Cambiado

- `react` y `react-dom` son dependencias opcionales (`peerDependenciesMeta`): un servidor que sólo usa `/rules` no las instala. Los componentes las siguen necesitando.

## 0.2.1 — 2026-11-25

### Añadido

- Prop `codes` en `<Odontogram>` y `<FindingPicker>`: los hallazgos que puede ofrecer la ventana, por ejemplo para no ofrecer los que tu proyecto ya no registra. Por defecto, todo el catálogo. No afecta al dibujo: lo ya registrado se sigue viendo.

## 0.2.0 — 2026-11-25

### Añadido

- Hallazgos NTS 188 que faltaban (41 en total): `postCore` (espigo-muñón, cuadrado en la corona unido a una línea en la raíz, según estado), `enamelDefect` (defecto de desarrollo del esmalte, en rojo sobre la cara: HP hipoplasia, HM hipomineralización, O opacidades, D decoloración, FLU fluorosis), `abnormalPosition` (posición anormal dentaria: M, D, V, P, L; azul), `deepFissures` (fosas y fisuras profundas: FFP; azul) y `fusion`.
- Sigla `C` (carilla) en `restoration`.
- `FindingDef.siglaNames`: significado propio de una sigla en un hallazgo, cuando difiere del de `SIGLA_NAMES` (la "D" del esmalte es decoloración, no distalizado).
- `Finding.location` (`"crown"` o `"root"`, solo en `fracture`; por defecto corona): la fractura en la raíz se dibuja sobre la raíz. La ventana de hallazgos pide la ubicación y `describeFindings` la incluye ("Fractura en la raíz").

### Cambiado (incompatible)

- `gemination` es ahora **Geminación** de una sola pieza: un círculo alrededor del número, sin `to`. El dibujo de dos círculos entre piezas pasa al nuevo `fusion` (Fusión). Los datos guardados como `{ code: "gemination", to }` se siguen cargando, pero se dibujan como geminación de la pieza de origen: conviértelos a `fusion`.

## 0.1.0 — 2026-11-25

Primera versión.

### Añadido

- `<ToothSvg>`: 52 dientes (FDI) con vista lateral (corona, raíces, CEJ) y oclusal circular de 5 superficies, generados a partir de plantillas anatómicas en mm. Detalle fino desde 8 px/mm.
- `<Odontogram>`: ficha NTS con dentición permanente, temporal o mixta. Incluye casilleros con siglas, selección por zona, pincel de marcas y navegación por teclado (*roving tabindex*).
- Hallazgos NTS: catálogo `FINDINGS` (36 hallazgos), `addFinding`, `removeFinding`, `describeFindings`, `conflictOf` y dibujo por diente y entre dientes. Siglas de corona según NTS 188-MINSA-2022 (CM, CF, CMC, CV, CLM); las anomalías se dibujan en azul.
- Modelo periodontal en TS puro: `setPerioSite`, `setPerioTooth`, `cal`, `furcationEntrances`, `perioSummary`.
- `<Periodontogram>`: 4 caras, 6 sitios por diente, gráfica de MG y fondo de bolsa, entrada rápida con avance automático e índices.
- Integración: `PatientChart`, `parsePatientChart` (carga validada) y `perioWithOdontogram` (ausentes e implantes derivados del odontograma).
- Tema con variables `--odp-*`, modo oscuro (`odp-theme-dark` / `odp-theme-auto`) e impresión A4 (`print.css`).
- Tests de accesibilidad con axe.
- Hallazgos de la Norma Técnica del Odontograma que faltaban: aparato ortodóntico removible, prótesis removible, prótesis total, edéntulo total, geminación/fusión, transposición, supernumerario, diente en clavija y semi-impactación (SI).
- Búsqueda en el desplegable de hallazgos: filtra por nombre o sigla, sin importar tildes; escribir sobre el botón cerrado abre la lista con esa búsqueda.
- El selector de sigla muestra el significado de cada una (`SIGLA_NAMES`, exportado).
- Una pieza admite una sola corona (definitiva o temporal): `addFinding` rechaza la segunda.
- `addFinding` rechaza el mismo hallazgo entre las mismas dos piezas (en cualquier sentido y estado), p. ej. dos prótesis fijas 17–14.
- Reglas clínicas en `addFinding` (y `conflictOf` para validar en el servidor): cada hallazgo una vez por pieza (o por cara); "Diente ausente" excluye cualquier otro hallazgo de la pieza; pares incompatibles en `TOOTH_CONFLICTS` y `SURFACE_CONFLICTS`; prótesis fijas, aparatos, prótesis removibles/totales y edéntulo no se cruzan ni comparten pieza; prótesis fija, aparato fijo, diastema y similares no pueden terminar en una pieza ausente.
- `FindingPicker` acepta `chart` (la ficha completa; `<Odontogram>` la pasa sola) y oculta lo que las reglas clínicas rechazan: hallazgos incompatibles o repetidos, caras ya registradas y, en "Hasta la pieza", las piezas ausentes y las que cruzarían otra prótesis. Si no queda ninguno, avisa "No hay hallazgos compatibles con esta pieza".
- Mensajes de error en español con el nombre del hallazgo ("Prótesis fija: elige hasta qué pieza llega").
- "Hasta la pieza" es un desplegable con las piezas posibles: misma arcada y dentición; en diastema y supernumerario, solo las vecinas.
- Remanente radicular: "RR" se escribe en rojo sobre la raíz (vista lateral), como indica la norma.
