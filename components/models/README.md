# 3D Models - GLTFJSX Generated Components

## Overview
All 3D models have been converted to React Three Fiber JSX components using `gltfjsx`. This provides:
- Direct access to materials and geometries
- Type-safe component props
- Easier material customization and monitoring
- Better performance with preloading

## Generated Models
```
Ground.tsx      - Ground/terrain model
CT.tsx          - CT model
HGT.tsx         - HGT model
CT_AUX.tsx      - CT auxiliary model
IND_OBS.tsx     - Industrial Observations model
Gate.tsx        - Gate model
Pathway.tsx     - Pathway model
FGT.tsx         - FGT model
L_OBS.tsx       - L Observations model
PGT_BASE.tsx    - PGT Base model
```

## Using Models

### Basic Import
```tsx
import { Ground, CT, HGT } from './models'

// In your component
<Ground />
<CT />
<HGT />
```

### Accessing Materials
Each generated component exports the materials and nodes structure. Example:

```tsx
const { nodes, materials } = useGLTF('/Ground.glb')
// materials['Soil Ground']
// materials['Material.119']
```

## Material Monitoring

Use the built-in `MaterialsMonitor` utility to track and control materials:

```tsx
import { useMaterialMonitor } from './models/MaterialsMonitor'

function MyComponent() {
  const monitor = useMaterialMonitor()

  useEffect(() => {
    // Register a material for monitoring
    monitor.register('ground_soil', someMaterial, {
      originalColor: '#8B7355'
    })
  }, [])

  // Update material properties
  const handleMaterialChange = () => {
    monitor.update('ground_soil', {
      color: '#FF0000',
      metalness: 0.5,
      roughness: 0.3
    })
  }

  // Get all registered materials
  const allMaterials = monitor.list()

  // Reset to original state
  monitor.reset('ground_soil')
  monitor.resetAll()

  return (...)
}
```

### Monitor Methods
- `register(name, material, config)` - Register a material
- `update(name, updates)` - Update material properties
- `get(name)` - Get a material
- `getConfig(name)` - Get material configuration
- `list()` - List all registered materials
- `reset(name)` - Reset material to original
- `resetAll()` - Reset all materials

## Material Properties You Can Control
- `color` - Material color (hex string)
- `metalness` - Metalness value (0-1)
- `roughness` - Roughness value (0-1)
- `emissive` - Emissive color (hex string)
- Any other custom properties

## UV Mapping Verification

The models now use JSX components which:
✅ Preserve original material definitions from the GLB
✅ Support proper texture rendering with correct material side settings
✅ Enable shadow casting per mesh
✅ Preload models for better performance

## Debugging Material Issues

Check browser console for material registration logs:
```
📊 Material registered: ground_soil {...}
✏️ Material updated: ground_soil {color: '#FF0000'}
📋 Registered Materials:
  • ground_soil {...}
  • ...
```

## Regenerating Models

If you update the GLB files, regenerate the components:

```bash
npx gltfjsx public/Ground.glb --output components/models/Ground.tsx
# Repeat for each model...
```

## Notes
- Models are automatically preloaded via `useGLTF.preload()`
- Each component accepts standard `group` props (`position`, `scale`, `rotation`, etc.)
- All materials are extracted and can be individually customized
