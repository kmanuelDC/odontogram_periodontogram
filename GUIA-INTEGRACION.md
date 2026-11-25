# Guía de integración: `odontogram-periodontogram-core`

Qué hay que tener en cuenta para usar la librería en un proyecto existente: datos, componentes, reglas y validación.

- **Paquete:** `odontogram-periodontogram-core` (npm, MIT)
- **Versión:** 0.2.2
- **Requisitos:** React 17 o superior, Node 18 o superior
- **Repo:** https://github.com/kmanuelDC/odontogram_periodontogram

---

## 1. Qué incluye

| Pieza | Para qué |
|---|---|
| `<Odontogram>` | Ficha NTS (MINSA Perú): dentición permanente, temporal o mixta, casilleros con siglas, rojo/azul según estado, ventana para registrar hallazgos. |
| `<Periodontogram>` | Ficha periodontal: 6 sitios por diente, PS, MG, sangrado, placa, supuración, movilidad, furcas, gráfica en mm e índices. |
| `<FindingPicker>` | La ventana de hallazgos, suelta, por si armas tu propio flujo. |
| Funciones puras | `addFinding`, `removeFinding`, `conflictOf`, `parsePatientChart`, `perioSummary`… Sin React, así que también sirven en el servidor (Node). |

Los componentes son **controlados**: reciben `value` y avisan con `onChange(nuevoValue)`. La librería no guarda estado ni llama a ningún backend. Tu proyecto decide dónde y cuándo guardar.

**Norma.** El catálogo sigue la NTS N°188-MINSA/DGIESP-2022 y la Norma Técnica del Odontograma del Colegio Odontológico del Perú. Las reglas de compatibilidad entre hallazgos (sección 5) son una propuesta técnica que debe validar un odontólogo.

---

## 2. Instalación y estilos

```bash
pnpm add odontogram-periodontogram-core
```

```tsx
// Una sola vez, en la raíz de la app (main.tsx / layout):
import "odontogram-periodontogram-core/style.css";
import "odontogram-periodontogram-core/print.css"; // opcional: página A4 al imprimir
```

> ⚠️ Importar los componentes **no** carga el CSS. Sin `style.css` los dientes se ven sin formato.

`print.css` va aparte porque define `@page`, que afecta a toda tu app al imprimir.

---

## 3. Modelo de datos (lo que guardas en tu backend)

Todo es **JSON plano**. Se guarda y se carga tal cual, sin clases ni conversiones.

### 3.1 Ficha completa del paciente: `PatientChart`

```json
{
  "version": 1,
  "odontogram": {
    "16": [{ "code": "caries", "sigla": "CD", "surfaces": ["O", "M"] }],
    "18": [{ "code": "missing" }],
    "17": [{ "code": "fixedProsthesis", "to": 14, "state": "bad" }]
  },
  "periodontogram": {
    "16": { "sites": { "MV": { "pd": 5, "gm": 2, "bleeding": true } }, "mobility": 1 }
  },
  "marks": []
}
```

| Campo | Contenido |
|---|---|
| `version` | Siempre `1` por ahora (`PATIENT_CHART_VERSION`). Si cambia el formato, la librería lo indicará con otra versión. |
| `odontogram` | Hallazgos por pieza: `{ [fdi]: Finding[] }`. |
| `periodontogram` | Datos periodontales por pieza: `{ [fdi]: PerioTooth }`. Solo piezas permanentes. |
| `marks` | Puntos del pincel libre (opcional). |

**Recomendación de almacenamiento:** una columna JSON por paciente o atención (por ejemplo `jsonb` en PostgreSQL o `JSON` en MySQL), con el objeto completo. Si necesitas consultar hallazgos con SQL, crea además una tabla derivada. No dividas el JSON original.

### 3.2 Un hallazgo: `Finding`

| Campo | Obligatorio | Valores |
|---|---|---|
| `code` | Sí | Clave del catálogo (sección 4), en inglés: `caries`, `crown`, `missing`… |
| `state` | No | `"good"` (azul) o `"bad"` (rojo). Por defecto `"good"`. Se ignora si el hallazgo tiene color fijo. |
| `sigla` | No | Una de las siglas del hallazgo. Por defecto la primera. |
| `surfaces` | En hallazgos de caras | `["V", "L", "M", "D", "O"]`. `O` es oclusal o incisal; `L` es lingual o palatina. |
| `to` | En hallazgos entre piezas | FDI de la otra pieza, en la misma arcada. |
| `direction` | No | `"mesial"` o `"distal"`. Solo en migración; por defecto mesial. |
| `location` | No | `"crown"` o `"root"`. Solo en fractura; por defecto corona. |

**Numeración:** FDI (dos dígitos). Permanentes 11–48 y temporales 51–85. Las claves del objeto son el FDI como texto (`"16"`), como en todo JSON.

**Hallazgos entre piezas:** se guardan **una sola vez**, en la pieza de origen, con `to` apuntando a la otra. Por ejemplo, una prótesis fija 17–14 se guarda como `"17": [{ "code": "fixedProsthesis", "to": 14 }]`. No la dupliques en la 14.

### 3.3 Periodontograma: `PerioTooth`

```ts
{
  sites?: { MV?, V?, DV?, ML?, L?, DL?: { pd?, gm?, bleeding?, suppuration?, plaque? } },
  mobility?: 0 | 1 | 2 | 3,
  furcation?: { V?, L?, M?, D?, MP?, DP?: 0 | 1 | 2 | 3 },
  keratinized?: number,      // mm de encía queratinizada
  implant?: boolean,
  missing?: boolean,
  prognosis?: "good" | "fair" | "poor" | "questionable" | "hopeless"
}
```

- `pd`: profundidad de sondaje (PS), de 0 a 20 mm.
- `gm`: margen gingival (MG) desde la CEJ, de -10 a 20 mm. Positivo es recesión; negativo, agrandamiento. NIC = PS + MG (`cal()`).
- **No copies ausentes ni implantes al periodontograma.** Pásale `odontogram={...}` al componente y los deriva solo (sección 6).

---

## 4. Catálogo de hallazgos (41)

Si tu proyecto ya tiene sus propios códigos, esta es la tabla para mapearlos.

| `code` | Nombre | Se registra en | Siglas | Color |
|---|---|---|---|---|
| `caries` | Caries | Caras (relleno) | MB, CE, CD, CDP | Rojo fijo |
| `restoration` | Restauración definitiva | Caras (relleno) | AM, R, IV, IM, IE, C | Según estado |
| `temporaryRestoration` | Restauración temporal | Caras (contorno) | — | Rojo fijo |
| `sealant` | Sellante | Caras (contorno) | S | Según estado |
| `crown` | Corona definitiva | Diente | CM, CF, CMC, CV, CLM | Según estado |
| `temporaryCrown` | Corona temporal | Diente | CT | Rojo fijo |
| `pulpTreatment` | Tratamiento pulpar | Diente | TC, PC, PP | Según estado |
| `postCore` | Espigo-muñón | Diente | — | Según estado |
| `implant` | Implante dental | Diente | IMP | Según estado |
| `missing` | Diente ausente | Diente | — | Azul fijo |
| `extraction` | Extracción indicada | Diente | — | Rojo fijo |
| `rootRemnant` | Remanente radicular | Sigla en la raíz | RR | Rojo fijo |
| `extruded` | Diente extruido | Diente | — | Azul fijo |
| `intruded` | Diente intruido | Diente | — | Azul fijo |
| `rotated` | Giroversión | Diente | — | Azul fijo |
| `migrated` | Migración | Diente | — | Azul fijo |
| `erupting` | Diente en erupción | Diente | — | Rojo fijo |
| `fracture` | Fractura | Diente (`location`: corona o raíz) | — | Rojo fijo |
| `fixedProsthesis` | Prótesis fija | Entre piezas (`to`) | — | Según estado |
| `orthodonticFixed` | Aparato ortodóntico fijo | Entre piezas (`to`) | — | Según estado |
| `orthodonticRemovable` | Aparato ortodóntico removible | Entre piezas (`to`) | — | Según estado |
| `removableProsthesis` | Prótesis removible | Entre piezas (`to`) | — | Según estado |
| `totalProsthesis` | Prótesis total | Entre piezas (`to`) | — | Según estado |
| `edentulous` | Edéntulo total | Entre piezas (`to`) | — | Azul fijo |
| `gemination` | Geminación | Diente (círculo en el número) | — | Azul fijo |
| `fusion` | Fusión | Entre piezas (`to`) | — | Azul fijo |
| `transposition` | Transposición | Entre piezas (`to`) | — | Azul fijo |
| `supernumerary` | Supernumerario | Entre piezas vecinas (`to`) | — | Azul fijo |
| `peg` | Diente en clavija | Diente | — | Azul fijo |
| `diastema` | Diastema | Entre piezas vecinas (`to`) | — | Azul fijo |
| `worn` | Superficie desgastada | Sigla en casillero | DES | Azul fijo |
| `discolored` | Diente discrómico | Sigla en casillero | DIS | Azul fijo |
| `ectopic` | Diente ectópico | Sigla en casillero | E | Azul fijo |
| `impacted` | Impactación | Sigla en casillero | I | Azul fijo |
| `semiImpacted` | Semi-impactación | Sigla en casillero | SI | Azul fijo |
| `macrodontia` | Macrodoncia | Sigla en casillero | MAC | Azul fijo |
| `microdontia` | Microdoncia | Sigla en casillero | MIC | Azul fijo |
| `mobility` | Movilidad patológica | Sigla en casillero | M1, M2, M3 | Azul fijo |
| `enamelDefect` | Defecto de desarrollo del esmalte | Caras (relleno) | HP, HM, O, D, FLU | Rojo fijo |
| `abnormalPosition` | Posición anormal dentaria | Sigla en casillero | M, D, V, P, L | Azul fijo |
| `deepFissures` | Fosas y fisuras profundas | Sigla en casillero | FFP | Azul fijo |

- **Significado de cada sigla:** `SIGLA_NAMES` (por ejemplo, `SIGLA_NAMES.CMC` es "Corona metal cerámica").
- **Nombre de un hallazgo:** `FINDINGS[code].name`.
- **Texto legible de una lista de hallazgos:** `describeFindings(lista)` devuelve, por ejemplo, "Caries CD (O, M); Corona definitiva CMC". Sirve para reportes o historias clínicas en texto.

---

## 5. Reglas clínicas (validación)

`addFinding(value, fdi, finding)` devuelve un **nuevo** `value` (no modifica el anterior), o lanza `RangeError` con un mensaje en español listo para mostrar.

**Formato:**
- El FDI es válido.
- El código existe.
- La sigla corresponde al hallazgo.
- Los hallazgos de caras traen al menos una cara.
- `to` apunta a otra pieza de la misma arcada.

**Reglas clínicas:**
1. **Sin repeticiones.** Cada hallazgo va una vez por pieza; en los de caras, una vez por cara. No se puede registrar dos veces extracción indicada, ni M1 y M2 a la vez.
2. **Diente ausente** excluye cualquier otro hallazgo de esa pieza, en ambos sentidos.
3. **Pares incompatibles** en la misma pieza, definidos en `TOOTH_CONFLICTS`. Por ejemplo:
   - Corona definitiva y corona temporal
   - Implante y caries
   - Remanente radicular y corona
   - Extruido e intruido
   - Macrodoncia y microdoncia
4. **Incompatibles en la misma cara**, definidos en `SURFACE_CONFLICTS`: restauración definitiva, restauración temporal y sellante.
5. **Hallazgos entre piezas:**
   - No se repiten los mismos extremos, en ningún sentido ni estado.
   - Prótesis fija, aparatos, prótesis removible o total y edéntulo **no se cruzan ni comparten pieza**.
   - Prótesis fija, aparato fijo, diastema, geminación, transposición y supernumerario **no pueden terminar en una pieza ausente**.

Ejemplos de mensajes:
- "La pieza 16 está ausente: no puede tener Corona definitiva"
- "Prótesis fija: se cruza con la registrada entre 17 y 14"
- "Caries: la cara O de la pieza 26 ya está registrada"

**La ventana de hallazgos ya aplica estas reglas:** oculta las opciones incompatibles y, en "Hasta la pieza", las piezas que no se pueden elegir.

### Valida también en tu servidor

El navegador no es de confianza. Usa las mismas funciones en tu API. Desde la 0.2.2, impórtalas de `odontogram-periodontogram-core/rules`: es la parte pura (catálogo, reglas, periodontograma y ficha del paciente), sin React ni CSS, en CommonJS y ESM. En el servidor no hace falta instalar React: es una dependencia opcional.

```ts
import { addFinding, conflictOf, validateFinding } from "odontogram-periodontogram-core/rules";

// Al recibir un hallazgo nuevo:
validateFinding(fdi, finding);                  // formato (lanza RangeError)
const problema = conflictOf(fichaActual, fdi, finding);
if (problema) return res.status(422).json({ error: problema });

// O directamente:
const nueva = addFinding(fichaActual, fdi, finding); // formato + reglas
```

> Las reglas **solo actúan al agregar**. `parsePatientChart` valida el formato de cada hallazgo, pero no rechaza los datos antiguos que incumplan una regla clínica, para no bloquear historias clínicas ya guardadas.

---

## 6. Uso de los componentes

### 6.1 Odontograma editable

```tsx
import { useState } from "react";
import { Odontogram, type OdontogramValue } from "odontogram-periodontogram-core";

export function OdontogramaPaciente({ inicial, onGuardar }: {
  inicial: OdontogramValue;
  onGuardar: (v: OdontogramValue) => void;
}) {
  const [value, setValue] = useState(inicial);
  return (
    <Odontogram
      value={value}
      onChange={(v) => { setValue(v); onGuardar(v); }}
    />
  );
}
```

| Prop | Tipo | Notas |
|---|---|---|
| `value` | `OdontogramValue` | Hallazgos por FDI. |
| `onChange` | `(value) => void` | Si está, se abre la ventana de hallazgos al hacer clic. Si no, la ficha queda en solo lectura. |
| `codes` | `FindingCode[]` | Hallazgos que ofrece la ventana (desde 0.2.1). Por defecto, todo el catálogo. Lo ya registrado se dibuja igual. |
| `dentition` | `"mixed" \| "permanent" \| "primary"` | Por defecto `"mixed"`, la ficha NTS completa. |
| `boxes` | `Record<fdi, string>` | Texto libre extra en el casillero, después de las siglas. |
| `selection` / `onSelectionChange` | `{ fdi, zone }` | Para usar tu propio menú en lugar de la ventana. `zone` puede ser `V L M D O`, `crown` o `root`. |
| `mode`, `marks`, `onMarksChange`, `brushColor` | | Pincel libre: puntos sobre el diente. |
| `detail` | `boolean` | Detalle anatómico fino; automático según el tamaño en pantalla. |

**Comportamiento de la ventana:**
- **Desde una cara** del círculo (V, L, M, D, O) se ofrecen los hallazgos de caras y los de diente completo.
- **Desde la corona o la raíz** solo se ofrecen los de diente completo.
- **Búsqueda:** la lista se filtra escribiendo el nombre o la sigla, sin importar tildes.
- **Pieza ya registrada:** la ventana lista sus hallazgos con un botón "Quitar".

### 6.2 Periodontograma

```tsx
<Periodontogram
  value={ficha.periodontogram}
  odontogram={ficha.odontogram}   // ausentes e implantes, bloqueados y derivados
  onChange={(p) => setFicha({ ...ficha, periodontogram: p })}
/>
```

- **Entrada rápida:** al escribir un dígito, el cursor salta al siguiente sitio. Un "1" espera un segundo dígito (10–19) y "-" permite un MG negativo.
- **Índices:** `perioSummary(value)` devuelve `{ teeth, sites, bleedingPct, plaquePct, suppurationSites, meanPd, meanCal, sitesPd4, sitesPd6 }`. Los porcentajes y las medias valen `null` si no hay sitios examinados.
- **Solo lectura:** basta con no pasar `onChange`.

### 6.3 Ventana suelta (flujo propio)

Si usas `<FindingPicker>` fuera de `<Odontogram>`, pásale `chart={fichaCompleta}`. Sin esa prop, solo considera los hallazgos de la propia pieza al aplicar las reglas.

---

## 7. Flujo recomendado de carga y guardado

```tsx
import {
  emptyPatientChart,
  parsePatientChart,
  type PatientChart,
} from "odontogram-periodontogram-core";

// Cargar
let ficha: PatientChart;
try {
  ficha = respuesta ? parsePatientChart(respuesta) : emptyPatientChart();
} catch (e) {
  // RangeError con la ruta del problema:
  // "Ficha del paciente no válida: odontogram 16[0]: …"
  mostrarError((e as Error).message);
}

// Guardar
await api.guardarFicha(pacienteId, JSON.stringify(ficha));
```

- `parsePatientChart` acepta texto u objeto y rellena las secciones que falten.
- **Odontograma inicial y de evolución:** la NTS los separa (el inicial no se modifica). Guárdalos como **dos `PatientChart` distintos**, por ejemplo uno con `tipo: "inicial"` y otro con `tipo: "evolucion"` en tu tabla. La librería no distingue entre ambos.
- **Especificaciones y observaciones:** la NTS pide un campo de texto libre debajo de la ficha. La librería no lo incluye; guárdalo junto al `PatientChart` en tu modelo.

---

## 8. Checklist de adecuación de tu proyecto

- [ ] Instalar el paquete e importar `style.css` (y `print.css` si imprimes).
- [ ] Definir dónde se guarda el `PatientChart` (columna JSON) y si separas inicial y evolución.
- [ ] **Si migras datos de otro odontograma:**
  - mapear sus códigos a los `code` de la sección 4;
  - convertir dientes a FDI;
  - convertir caras a `V L M D O`;
  - convertir estados a `good` o `bad`;
  - convertir coronas a CM, CF, CMC, CV o CLM;
  - dejar los hallazgos entre piezas en una sola pieza, con `to`.
- [ ] Validar los datos migrados con `parsePatientChart`, y opcionalmente revisar conflictos con `conflictOf`.
- [ ] Validar en la API cada hallazgo nuevo con `addFinding` o `conflictOf`.
- [ ] Mostrar los `RangeError` tal cual: ya vienen en español.
- [ ] Agregar en tu formulario el campo de especificaciones u observaciones.
- [ ] Si tu app tiene modo oscuro, envolver la ficha con `odp-theme-dark` u `odp-theme-auto`.
- [ ] Pedir a un odontólogo que revise las reglas clínicas antes de usarlas en producción.

---

## 9. Apariencia, accesibilidad e impresión

**Colores.** Todos los colores son variables CSS (`--odp-red`, `--odp-blue`, `--odp-text`…) y se pueden sobrescribir en cualquier contenedor:

```css
.mi-clinica { --odp-red: #b91c1c; --odp-blue: #1d4ed8; }
```

**Modo oscuro.** Usa la clase `odp-theme-dark` o `odp-theme-auto`. Los dientes y los casilleros siguen blancos para no perder el contraste del rojo y el azul.

**Trazo.** `--odp-stroke-width` fija el grosor del trazo.

**Teclado.** La ficha es una sola parada de Tab:
- ←/→ cambian de diente.
- ↑/↓ cambian de zona.
- Enter o Espacio selecciona.

**Lectores de pantalla.** Cada diente se anuncia con sus hallazgos, por ejemplo "Diente 16: Caries CD (O, M)".

**Impresión.** Pasa sola al tema claro. El odontograma mixto y el periodontograma ocupan 2 hojas A4.

---

## 10. Limitaciones conocidas (0.2.1)

- **Textos solo en español.** No hay traducción a otros idiomas.
- **Edéntulo total y prótesis total** no bloquean hallazgos de piezas presentes dentro de su rango.
- **Datos ya guardados:** las reglas clínicas no se aplican al cargarlos.
- **Prótesis fija** se dibuja con dos pilares y un tramo recto. No distingue pónticos ni cantiléver.
- **Periodontograma:** solo piezas permanentes.
- **Exportación a PDF:** no la incluye. Usa la impresión del navegador o una librería aparte sobre el SVG.

---

## Referencia rápida de exportaciones

| Grupo | Exportaciones |
|---|---|
| Componentes | `Odontogram`, `Periodontogram`, `FindingPicker`, `FindingIcon`, `ToothSvg` |
| Hallazgos | `FINDINGS`, `SIGLA_NAMES`, `TOOTH_CONFLICTS`, `SURFACE_CONFLICTS`, `addFinding`, `removeFinding`, `conflictOf`, `validateFinding`, `describeFindings`, `findingDef`, `findingSigla`, `findingState` |
| Periodontal | `SITES`, `setPerioSite`, `setPerioTooth`, `validatePerioTooth`, `cal`, `furcationEntrances`, `perioSummary` |
| Paciente | `PatientChart`, `PATIENT_CHART_VERSION`, `emptyPatientChart`, `parsePatientChart`, `perioWithOdontogram` |
| Dientes | `ALL_FDI`, `isValidFdi`, `toothInfo`, `SURFACES`, `getToothGeometry`, `layoutOdontogram` |
