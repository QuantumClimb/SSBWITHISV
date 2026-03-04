# 📊 Extracted Materials Reference

Generated from your GLB models. Use these exact names in the monitor.

## Ground.tsx
Materials available:
- `ground_Material.119`
- `ground_Soil Ground`

```javascript
materialsMonitor.updateMaterial('ground_Material.119', { color: '#...' })
materialsMonitor.updateMaterial('ground_Soil Ground', { metalness: 0.5 })
```

## CT.tsx  
Materials available (9 total):
- `ct_BEIGE`
- `ct_WHITE`
- `ct_SAND`
- `ct_BLUE`
- `ct_RED`
- `ct_Material.042`
- `ct_Threshold`
- `ct_wood`
- `ct_Dirty Wood Planks`

```javascript
// Example: Make BEIGE material shiny
materialsMonitor.updateMaterial('ct_BEIGE', { 
  metalness: 0.8,
  roughness: 0.2 
})
```

## HGT.tsx
(Check console output when loading)

```javascript
// Get HGT materials
materialsMonitor.list().filter(([name]) => name.startsWith('hgt_'))
```

## CT_AUX.tsx
(Check console output when loading)

```javascript
// Get CT_AUX materials
materialsMonitor.list().filter(([name]) => name.startsWith('ctaux_'))
```

## IND_OBS.tsx
(Check console output when loading)

```javascript
// Get IND_OBS materials
materialsMonitor.list().filter(([name]) => name.startsWith('indobs_'))
```

## Gate.tsx
(Check console output when loading)

```javascript
// Get Gate materials
materialsMonitor.list().filter(([name]) => name.startsWith('gate_'))
```

## Pathway.tsx
(Check console output when loading)

```javascript
// Get Pathway materials
materialsMonitor.list().filter(([name]) => name.startsWith('pathway_'))
```

## FGT.tsx
(Check console output when loading)

```javascript
// Get FGT materials
materialsMonitor.list().filter(([name]) => name.startsWith('fgt_'))
```

## L_OBS.tsx
(Check console output when loading)

```javascript
// Get L_OBS materials
materialsMonitor.list().filter(([name]) => name.startsWith('lobs_'))
```

## PGT_BASE.tsx
(Check console output when loading)

```javascript
// Get PGT_BASE materials
materialsMonitor.list().filter(([name]) => name.startsWith('pgtbase_'))
```

---

## 🔍 How to Find All Material Names

When you start the dev server, open browser console and run:

```javascript
// Show all materials with their full names
materialsMonitor.listMaterials().forEach(([name, config]) => {
  console.log(name)
})

// Or for a specific model:
materialsMonitor.listMaterials()
  .filter(([name]) => name.startsWith('ct_'))
  .forEach(([name]) => console.log(name))
```

## 📝 Template for Quick Updates

Copy and modify for your model:

```javascript
// Update Ground materials
materialsMonitor.updateMaterial('ground_Soil Ground', { 
  color: '#8B7355',
  metalness: 0.3,
  roughness: 0.8
})

// Update CT materials
materialsMonitor.updateMaterial('ct_BEIGE', { 
  color: '#D4C5B0',
  metalness: 0.5,
  roughness: 0.6
})

materialsMonitor.updateMaterial('ct_BLUE', { 
  color: '#0066FF',
  metalness: 0.2,
  roughness: 0.4,
  emissive: '#0033FF'
})
```

## 🔄 Auto-Registration

When you run the dev server:
1. Models load
2. Materials are extracted
3. Each material is registered with the monitor
4. Console shows: `📊 Material registered: [name]`

This happens automatically - no manual setup needed!

## 💾 Saving Material Configurations

To save your customized materials:

```javascript
// Get all current materials
const savedState = {}
materialsMonitor.listMaterials().forEach(([name, config]) => {
  savedState[name] = config
})

// Copy to JSON file or store in localStorage
console.log(JSON.stringify(savedState, null, 2))
```

Then restore later:

```javascript
// Load and apply
Object.entries(savedState).forEach(([name, config]) => {
  materialsMonitor.updateMaterial(name, config)
})
```

---

**Tip**: Run `materialsMonitor.listMaterials()` after loading to see the exact names of all extracted materials!
