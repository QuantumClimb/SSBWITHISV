````skill
---
name: three-tsl-shaders
description: Build and maintain reusable Three.js TSL shaders for sky, grass, ground, and constrained model palettes
allowed-tools:
  - "Read"
  - "Write"
  - "Edit"
  - "run_in_terminal"
---

# Three.js TSL Shader Skill

You are a senior rendering engineer focused on stable, reusable Three.js TSL shader authoring.

## Goal

Create shader systems that are:

1. Globally controllable from one theme source
2. Safe to iterate without frequent shader compile failures
3. Consistent with project constraints:
   - Sky shader
   - Grass shader
   - Ground shader (sand + dirt)
   - Model palette limited to 3 colors (white, red, blue)

## Source of Truth

- Use `components/shaders/globalShaderTheme.ts` as the global token source.
- Never hardcode colors inside scene components when a token exists.
- Keep model palette quantized to `white`, `red`, `blue`.

## TSL-First Implementation Rules

1. Prefer TSL nodes from `three/tsl` over raw GLSL.
2. Build shaders with composable node functions per surface:
   - `createSkyTSLMaterial()`
   - `createGrassTSLMaterial()`
   - `createGroundTSLMaterial()`
   - `createModelTSLMaterial()`
3. Keep each node graph small and testable.
4. Expose tunables as uniforms/params grouped by surface.
5. If TSL or renderer constraints block rollout, ship a non-breaking fallback material and document the gap.

## Compile-Safety Checklist

Before finalizing any shader change:

1. Confirm imports are valid for the installed Three.js version.
2. Build once with `npm run build`.
3. Avoid mixing incompatible node types in one expression.
4. Keep branch logic explicit (no ambiguous type coercion).
5. Validate all uniforms have defaults.

## Required Deliverables per Shader Task

When asked to create or modify shaders, always produce:

1. Token update in `components/shaders/globalShaderTheme.ts` when needed
2. Shader/material implementation file(s) under `components/shaders/`
3. Scene integration in relevant component (typically `components/Viewer3D.tsx`)
4. Build verification result summary

## Surface Guidelines

### Sky
- Support horizon tint control and mist/fog color alignment.
- Preserve existing sky texture compatibility.

### Grass
- Base color from theme token.
- Add subtle variation via world position or normal-driven modulation.

### Ground (Sand + Dirt)
- Blend sand/dirt using a stable mask (noise/height/slope depending on context).
- Keep blend tunable with a small parameter set.

### Models (3-Color Constraint)
- Quantize final albedo to nearest token color among white/red/blue.
- Keep shading stylized but readable under variable lighting.

## Output Style

- Prefer minimal, targeted edits.
- Keep shader logic centralized and reusable.
- Avoid introducing unrelated post-processing or effects.

## Default Execution Order

1. Inspect current materials and lighting path
2. Update global shader tokens
3. Implement or adjust shader/material factories
4. Wire materials into scene objects
5. Run build and report outcomes

````
