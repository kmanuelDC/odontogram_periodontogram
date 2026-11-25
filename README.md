# odontogram-periodontogram-core

Odontograma (ficha NTS del MINSA, Perú) y periodontograma para React, con dientes SVG anatómicos. Se pueden usar por separado o juntos sobre el mismo registro del paciente.

- **Odontograma**: dentición permanente, temporal o mixta, hallazgos NTS en rojo/azul, siglas en los casilleros, selección por cara y pincel de marcas.
- **Periodontograma**: 6 sitios por diente, gráfica de margen gingival y fondo de bolsa en mm reales, entrada rápida con teclado e índices (sangrado, placa, PS y NIC medios).
- **Datos en JSON plano** con validación para guardar y cargar desde tu backend.
- **Accesible** (teclado, lectores de pantalla), **temable** (variables CSS, modo oscuro) e **imprimible** (A4).

> ⚠️ El catálogo de hallazgos sigue la NTS N°188-MINSA/DGIESP-2022 y la Norma Técnica del Odontograma del Colegio Odontológico del Perú. Las reglas de compatibilidad entre hallazgos son una propuesta: antes de usarlo en la clínica, un odontólogo debe validar siglas, colores y reglas.

## Instalación

```bash
pnpm add odontogram-periodontogram-core
# o: npm install odontogram-periodontogram-core
```

Requiere React 17 o superior. Importa los estilos una vez, en la raíz de tu app:

```ts
import "odontogram-periodontogram-core/style.css";
import "odontogram-periodontogram-core/print.css"; // opcional: página A4 al imprimir
```

## Odontograma

```tsx
import { useState } from "react";
import { Odontogram, type OdontogramValue } from "odontogram-periodontogram-core";

export function Ficha() {
  const [value, setValue] = useState<OdontogramValue>({});
  return <Odontogram dentition="mixed" value={value} onChange={setValue} />;
}
```

Con `onChange`, un clic (o Enter) sobre una cara del círculo, la corona o la raíz abre una ventana flotante para elegir el hallazgo, su sigla (con su significado) y su estado. La lista se puede filtrar escribiendo el nombre o la sigla, y solo muestra los hallazgos compatibles con la ficha: no ofrece corona en una pieza ausente ni repite lo ya registrado. En "Hasta la pieza" solo aparecen las piezas posibles. La ventana también lista los hallazgos del diente para quitarlos. Desde la corona o la raíz solo se ofrecen hallazgos del diente entero; las caries y restauraciones se marcan desde una cara del círculo. Escape o × la cierran.

Si prefieres tu propio menú, no pases `onChange`: usa `selection` / `onSelectionChange` y arma el nuevo `value` con `addFinding` / `removeFinding`. `<FindingPicker>` también se exporta suelto; pásale `chart={value}` para que aplique las reglas de toda la ficha. `SIGLA_NAMES` da el significado de cada sigla.

### Formato de los hallazgos

```json
{
  "16": [{ "code": "caries", "sigla": "CD", "surfaces": ["O", "M"] }],
  "18": [{ "code": "missing" }],
  "46": [{ "code": "fixedProsthesis", "to": 44, "state": "bad" }]
}
```

| Campo | Para qué |
|---|---|
| `code` | Clave del catálogo `FINDINGS` (`caries`, `crown`, `missing`, `implant`, …). |
| `state` | `"good"` (azul) o `"bad"` (rojo). Algunos hallazgos tienen color fijo. |
| `sigla` | Una de las siglas del catálogo; por defecto la primera. Aparece en el casillero. |
| `surfaces` | Caras `V`, `L`, `M`, `D`, `O` (caries, restauraciones, sellantes). |
| `to` | Diente final de los hallazgos entre piezas: prótesis fija, removible o total, aparatos ortodónticos, edéntulo total, diastema, fusión, transposición y supernumerario. |
| `direction` | `"mesial"` o `"distal"` (migración). |
| `location` | `"crown"` o `"root"` (fractura; por defecto corona). |

`addFinding` valida y lanza `RangeError`, con el mensaje en español, si el hallazgo no corresponde: diente inválido, sigla ajena, caries sin caras, puente entre arcadas, o una regla clínica.

**Reglas clínicas.** Cada hallazgo va una vez por pieza (o por cara). "Diente ausente" excluye cualquier otro hallazgo de la pieza. Los pares incompatibles, como implante y caries o extruido e intruido, están en `TOOTH_CONFLICTS` y `SURFACE_CONFLICTS`. Las prótesis y los aparatos no se cruzan ni comparten pieza, y una prótesis fija no puede terminar en una pieza ausente. Usa `conflictOf(value, fdi, finding)` para aplicar las mismas reglas en tu servidor. Los datos guardados que ya incumplan una regla se cargan igual: las reglas solo actúan al agregar.

### Props de `<Odontogram>`

| Prop | Tipo | Descripción |
|---|---|---|
| `dentition` | `"mixed" \| "permanent" \| "primary"` | Por defecto `"mixed"` (ficha NTS completa). |
| `value` | `OdontogramValue` | Hallazgos por FDI. |
| `onChange` | `(value) => void` | Activa la ventana flotante de hallazgos. |
| `codes` | `FindingCode[]` | Hallazgos que ofrece la ventana. Por defecto, todos. |
| `boxes` | `Record<fdi, string>` | Texto libre extra en el casillero. |
| `selection` / `onSelectionChange` | `{ fdi, zone }` | Zona elegida: `V L M D O`, `crown` o `root`. |
| `mode` | `"select" \| "brush"` | Seleccionar o pintar puntos. Con el pincel, los círculos siguen seleccionando si pasas `onSelectionChange`. |
| `marks` / `onMarksChange` / `brushColor` | `ToothMark[]` | Puntos del pincel, en mm del diente. Solo se pinta la vista lateral; los círculos oclusales solo se seleccionan. |
| `detail` | `boolean` | Detalle anatómico fino; por defecto automático según el tamaño en pantalla. |

**Teclado**: la ficha es una sola parada de Tab. ←/→ pasan de diente y ↑/↓ recorren las zonas; Enter o Espacio selecciona.

## Periodontograma

```tsx
import { useState } from "react";
import { Periodontogram, type PerioChart } from "odontogram-periodontogram-core";

export function Sondaje() {
  const [perio, setPerio] = useState<PerioChart>({});
  return <Periodontogram value={perio} onChange={setPerio} />;
}
```

- **Entrada rápida**: escribe un dígito y el cursor pasa al siguiente sitio. Un "1" espera un segundo dígito (10–19) y "-" espera el número (MG negativo). Enter acepta y avanza. Los dientes ausentes se saltan.
- **Convención**: el margen gingival (MG) se mide desde la CEJ; positivo es recesión y negativo, agrandamiento. NIC = PS + MG.
- Sin `onChange`, la ficha queda en solo lectura.

```ts
import { perioSummary, setPerioSite } from "odontogram-periodontogram-core";

let chart = setPerioSite({}, 16, "MV", { pd: 5, gm: 2, bleeding: true });
perioSummary(chart); // { bleedingPct, plaquePct, meanPd, meanCal, sitesPd4, sitesPd6, … }
```

## Odontograma + periodontograma

```tsx
import {
  Odontogram,
  Periodontogram,
  parsePatientChart,
  type PatientChart,
} from "odontogram-periodontogram-core";

const [chart, setChart] = useState<PatientChart>(() => parsePatientChart(jsonDelBackend));

<Odontogram value={chart.odontogram} marks={chart.marks} />
<Periodontogram
  value={chart.periodontogram}
  odontogram={chart.odontogram} // ausentes e implantes vienen del odontograma
  onChange={(periodontogram) => setChart({ ...chart, periodontogram })}
/>

guardar(JSON.stringify(chart));
```

- `PatientChart = { version: 1, odontogram, periodontogram, marks }`.
- Los ausentes e implantes del odontograma se muestran bloqueados en el periodontograma. No se copian, así que nunca quedan desactualizados.
- `parsePatientChart` acepta texto u objeto, lo valida completo y lanza `RangeError` con la ruta del error, por ejemplo `Ficha del paciente no válida: periodontogram 16: 16 V: la PS debe estar entre 0 y 20 mm`.

## JavaScript sin TypeScript

```jsx
import { Odontogram, addFinding } from "odontogram-periodontogram-core";
import "odontogram-periodontogram-core/style.css";

let value = addFinding({}, 11, { code: "crown", sigla: "CM", state: "good" });

export default function App() {
  return <Odontogram dentition="permanent" value={value} />;
}
```

## Tema

Todos los colores son variables CSS. Puedes sobrescribirlas en cualquier contenedor:

```css
.mi-clinica {
  --odp-red: #b91c1c;
  --odp-blue: #1d4ed8;
  --odp-text: #0f172a;
}
```

- **Modo oscuro**: agrega la clase `odp-theme-dark` a un contenedor, o `odp-theme-auto` para seguir al sistema operativo. Los dientes y los casilleros siguen blancos para que el rojo/azul NTS no pierda contraste.
- **Grosor del trazo**: `--odp-stroke-width` lo fija. Por defecto se adapta al tamaño en pantalla.

## Impresión

Al imprimir, las fichas pasan solas al tema claro con colores exactos. El odontograma mixto y el periodontograma entran en 2 hojas A4. `print.css` agrega `@page { size: A4 }`. Va aparte porque esa regla afecta a toda la página de tu app.

## Desarrollo

```bash
pnpm install
pnpm storybook       # http://localhost:6007
pnpm vitest run      # tests (no usar npx vitest)
pnpm lint && pnpm typecheck && pnpm build
```

## Licencia

MIT © Manuel Díaz Calua
