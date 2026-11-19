# Poker Tycoon

Juego web de gestión: lleva la carrera de un jugador de póker online desde NL2 en su habitación hasta las high stakes.
No se juegan manos: cada semana eliges qué hacer y el resultado se simula con tus habilidades, el nivel del rival y la varianza.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173/poker-tycoon/
npm test         # tests de la simulación (Vitest)
npm run build    # build de producción en dist/
```

## Estructura

- `src/game/`: lógica pura del juego, sin React.
  - `config.ts`: **todos los números de balance** (rake, dificultad, winrates, energía, VIP…).
  - `simulation.ts`: winrate esperado, varianza por tramos, showdown/non-showdown, rakeback.
  - `week.ts`: aplica la acción de la semana (jugar, estudiar, descansar) y devuelve el nuevo estado.
  - `save.ts`: guardado en 3 ranuras y exportación/importación JSON.
  - `__tests__/`: tests de Vitest.
- `src/ui/`: componentes React y pixel art (Canvas).
- `src/store.ts`: estado global (Zustand) y bucle de tiempo.

## Fórmula de simulación

```
S      = 0,30·Preflop + 0,40·Postflop + 0,30·Lectura
S_ef   = S − 3·(mesas − 2)⁺ − 0,25·(50 − energía)⁺
E      = S_ef − dificultad del límite
bruto  = 30 · tanh(E / 25)                (bb/100)
neto   = bruto − rake del límite − 0,15·tilt
```

Cada tramo de 200 manos sigue una normal con media `neto·n/100` y desviación `90·√(n/100)` bb.

## Publicación

El workflow `.github/workflows/deploy.yml` publica en GitHub Pages en cada push a `main`.
En el repositorio: *Settings → Pages → Source: GitHub Actions*.
`base` en `vite.config.ts` debe coincidir con el nombre del repositorio (`/poker-tycoon/`).
