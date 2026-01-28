# Material Debugging & Control - Console Commands

## 🎮 Quick Console Commands

Open your browser's developer console (F12 → Console) and use these commands:

### 1. **List All Registered Materials**
```javascript
// See all materials currently being monitored
materialsMonitor.listMaterials()
```

**Output Example:**
```
📋 Registered Materials:
  • ground_soil { name: 'ground_soil', originalColor: '#8B7355', ... }
  • ct_beige { name: 'ct_beige', originalColor: '#D4C5B0', ... }
```

### 2. **Get a Specific Material**
```javascript
// Retrieve a material object
const soilMaterial = materialsMonitor.getMaterial('ground_soil')
console.log(soilMaterial)
```

### 3. **Update Material Properties**
```javascript
// Change color
materialsMonitor.updateMaterial('ground_soil', { 
  color: '#FF0000' 
})

// Change metalness and roughness
materialsMonitor.updateMaterial('ct_beige', { 
  metalness: 0.8,
  roughness: 0.2
})

// Change emissive (glow)
materialsMonitor.updateMaterial('ct_blue', { 
  emissive: '#0000FF' 
})
```

### 4. **Reset Materials**
```javascript
// Reset one material to original state
materialsMonitor.resetMaterial('ground_soil')

// Reset all materials
materialsMonitor.resetAll()
```

### 5. **Get Material Configuration**
```javascript
// See the current config of a material
const config = materialsMonitor.getConfig('ground_soil')
console.log(config)
```

**Output Example:**
```
{
  name: "ground_soil",
  originalColor: "#8B7355",
  originalMetalness: 0.5,
  originalRoughness: 0.7,
  originalEmissive: "#000000",
  color: "#8B7355",
  metalness: 0.5,
  roughness: 0.7
}
```

## 🔍 Debugging UV Mapping Issues

### Check for Missing Textures
```javascript
// List all materials and check their properties
const allMaterials = materialsMonitor.listMaterials()
allMaterials.forEach(([name, config]) => {
  const mat = materialsMonitor.getMaterial(name)
  console.log(name, {
    hasMap: mat.map ? '✓' : '✗',
    hasNormalMap: mat.normalMap ? '✓' : '✗',
    hasRoughnessMap: mat.roughhnessMap ? '✓' : '✗',
    hasMetalnessMap: mat.metalnessMap ? '✓' : '✗',
  })
})
```

### Test UV Visibility
```javascript
// Make all materials bright magenta to see if UVs are mapped
materialsMonitor.listMaterials().forEach(([name]) => {
  materialsMonitor.updateMaterial(name, { 
    color: '#FF00FF',
    metalness: 0,
    roughness: 1
  })
})

// Reset when done
materialsMonitor.resetAll()
```

## 📊 Monitor Object Structure

The `MaterialsMonitor` is a global object with methods:

```typescript
{
  registerMaterial(name: string, material: Material, config?: Config)
  updateMaterial(name: string, updates: Partial<Config>)
  getMaterial(name: string): Material | undefined
  getConfig(name: string): Config | undefined
  listMaterials(): [string, Config][]
  resetMaterial(name: string)
  resetAll()
  getModelMaterials(modelName: string): [string, Material][]
}
```

## 🎨 Color Reference

Use hex color codes for easy testing:

```javascript
// Red family
'#FF0000' - Pure Red
'#FF6600' - Orange Red
'#FF0044' - Rose

// Green family  
'#00FF00' - Pure Green
'#00FF88' - Lime
'#008800' - Dark Green

// Blue family
'#0000FF' - Pure Blue
'#0088FF' - Sky Blue
'#8800FF' - Purple

// Grays
'#FFFFFF' - White
'#CCCCCC' - Light Gray
'#666666' - Dark Gray
'#000000' - Black
```

## 🚀 Advanced: Export Material State

```javascript
// Save current material states to clipboard
const state = {}
materialsMonitor.listMaterials().forEach(([name, config]) => {
  state[name] = config
})
console.log(JSON.stringify(state, null, 2))
copy(JSON.stringify(state))
```

## 📝 Logging Tips

### Enable Detailed Logging
```javascript
// The monitor logs to console automatically:
// 📊 - Registration event
// ✏️  - Update event
// 🔄 - Reset event
// 📋 - List event
// ⚠️  - Warning/error
```

### Filter Console Output
In DevTools, click filter and type:
- `📊` - See only registration logs
- `✏️` - See only updates
- `ground_` - See only ground materials
- `ct_` - See only CT materials

## 🐛 Common Issues

### Material Not Updating?
```javascript
// Check if it's registered
materialsMonitor.listMaterials()

// Try getting it directly
const mat = materialsMonitor.getMaterial('material_name')
console.log(mat) // Should not be undefined
```

### Can't Find Material Name?
```javascript
// List all and look for partial match
const all = materialsMonitor.listMaterials()
all.filter(([name]) => name.includes('soil'))
```

### Updates Not Visible?
```javascript
// Force scene update
materialsMonitor.updateMaterial('name', { 
  color: '#FF0000',
  // needsUpdate is automatically set to true
})
```

## 📞 Getting Help

If materials aren't visible:
1. Run `materialsMonitor.listMaterials()` and verify materials exist
2. Check console for `⚠️` warnings
3. Check if model is loading (check Network tab)
4. Verify model file exists in `/public/` directory
5. Check browser console for errors

---

**Pro Tip**: Keep console open while working to see real-time logs of all material changes!
