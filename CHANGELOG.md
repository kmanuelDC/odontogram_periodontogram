# Changelog

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
