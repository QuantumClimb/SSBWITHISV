# TSL Shader Blueprint (Three.js)

## Purpose

Use this blueprint to implement and iterate shader looks with Three.js Shading Language (TSL) while keeping global controls centralized.

## Global Token Source

- `components/shaders/globalShaderTheme.ts`

## Surface Targets

- Sky: tint + horizon control
- Grass: base tone + subtle variation
- Ground: sand/dirt blend
- Models: quantized palette (white/red/blue)

## Recommended TSL Structure

1. Create one material factory per surface.
2. Keep each factory parameterized by theme tokens.
3. Expose only a small set of tunables.
4. Keep fallback material path available during migration.

## Suggested Factory Names

- `createSkyTSLMaterial(theme)`
- `createGrassTSLMaterial(theme)`
- `createGroundTSLMaterial(theme)`
- `createModelPaletteTSLMaterial(theme)`

## Stability Workflow

1. Change tokens first
2. Update one surface factory
3. Integrate in `components/Viewer3D.tsx`
4. Run `npm run build`
5. Only then move to next surface

## Migration Note

Current scene materials are centralized via `components/shaders/materialFactories.ts`.
This file is the swap point when replacing fallback materials with TSL implementations.

## Runtime Safety Toggle

- TSL for sky/ground is opt-in via env var:
	- `VITE_ENABLE_TSL_SKY_GROUND=true`
- Default is disabled to keep WebGL runtime stable.
