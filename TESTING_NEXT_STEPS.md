# Next Steps: Testing & Troubleshooting UV Mapping

## ✅ Completed Setup

You now have:
- ✅ All 10 models converted to React JSX components
- ✅ Material monitoring system in place
- ✅ Viewer3D updated to use JSX components
- ✅ Build passes TypeScript validation
- ✅ Full documentation and debugging guides

## 🚀 Quick Start

### 1. **Start the Development Server**
```bash
npm run dev
```
Visit `http://localhost:5173` and look for material registration logs in the browser console.

### 2. **Verify Models Load**
- Check that 3D scene renders
- Open DevTools Console (F12)
- You should see messages like:
  ```
  📊 Material registered: ground_soil
  📊 Material registered: ground_beige
  ```

### 3. **Test Material Control**
In browser console, try:
```javascript
materialsMonitor.updateMaterial('ground_soil', { color: '#FF0000' })
```
The ground should turn red if working correctly.

## 🔍 Diagnosing UV Mapping Issues

If textures look wrong, follow this checklist:

### A. **Verify Models Load**
```javascript
// In console:
materialsMonitor.listMaterials()

// Should show all materials from your models
```

### B. **Check UV Visibility**
```javascript
// Make everything bright magenta - if it renders, UVs exist
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

**Expected Result**: If models appear magenta, UVs are mapped. If invisible/black, UV issue.

### C. **Check Individual Materials**
```javascript
// Get properties of a specific material
const mat = materialsMonitor.getMaterial('ground_soil')
console.log({
  hasMap: !!mat.map,
  hasNormalMap: !!mat.normalMap,
  color: mat.color.getHexString(),
  metalness: mat.metalness,
  roughness: mat.roughness
})
```

### D. **3D Model Checklist**
While the code is now ready, check your models in Blender/your 3D tool:

- [ ] **UVs Exist**: Select model → Edit Mode → All → U (show UVs in Shader Editor)
- [ ] **UVs Don't Overlap**: Use UV > UV Squares (highlight overlaps)
- [ ] **Normals Face Right Way**: Mesh > Normals > Recalculate Outside
- [ ] **Textures Embedded**: File > External Data > Pack All
- [ ] **No Degenerate Geometry**: Check for 0-scale faces

### E. **Common Issues & Fixes**

| Issue | Check | Solution |
|-------|-------|----------|
| Textures missing | `mat.map` is null | Check GLB has textures embedded |
| UVs inverted | Material looks wrong | Mesh > Normals > Recalculate |
| Stretched/distorted | Export settings | Re-UV map in Blender |
| Models invisible | Console errors | Check public/ folder for GLB |
| Wrong colors | Monitor works but colors wrong | Check original texture files |

## 📋 Testing Workflow

### Step 1: Verify Each Model
```javascript
// Get materials for one model
const groundMats = materialsMonitor.list()
  .filter(([name]) => name.startsWith('ground_'))
console.table(groundMats)
```

### Step 2: Test Material Updates
```javascript
// Test updating one property at a time
materialsMonitor.updateMaterial('ground_soil', { metalness: 0.9 })
// Check if material appearance changes

materialsMonitor.updateMaterial('ground_soil', { roughness: 0.1 })
// Check if becomes shiny
```

### Step 3: Run Full Suite
```javascript
// Color test on all materials
materialsMonitor.listMaterials().forEach(([name]) => {
  const colors = ['#FF0000', '#00FF00', '#0000FF']
  const color = colors[Math.floor(Math.random() * 3)]
  materialsMonitor.updateMaterial(name, { color })
})
```

## 🔧 If UV Issues Persist

### Option 1: Re-export from Blender
```
1. Open model in Blender
2. Select all objects (A)
3. File > Export > glTF 2.0 (.glb/.gltf)
4. Check "Include All Bone Influences"
5. Check "Format: glTF Binary (.glb)"
6. Uncheck "Include Animations" (unless needed)
7. Export to public/ folder
8. Run: npx gltfjsx public/YourModel.glb components/models/YourModel.tsx
```

### Option 2: Fix UVs in Blender
```
1. Tab → Edit Mode
2. U → Unwrap (Smart UV Project or Angle-based)
3. Adjust layout in UV Editor to avoid overlaps
4. Bake textures if using complex materials
5. Re-export as GLB
```

### Option 3: Check for Missing Textures
```javascript
// Debug material maps
const materials = materialsMonitor.list()
materials.forEach(([name, config]) => {
  const mat = materialsMonitor.getMaterial(name)
  if (mat.map === null) {
    console.warn(`⚠️ No texture on ${name}`)
  }
})
```

## 📈 Monitoring Real-time Changes

Create a debug UI component (optional):

```tsx
import { useMaterialMonitor } from './models/MaterialsMonitor'

function DebugMaterials() {
  const monitor = useMaterialMonitor()
  const [materials, setMaterials] = useState<[string, any][]>([])

  useEffect(() => {
    setMaterials(monitor.list())
  }, [])

  return (
    <div className="bg-black/80 text-white p-4 max-h-96 overflow-auto">
      <h3>Materials Monitor</h3>
      {materials.map(([name, config]) => (
        <div key={name} className="text-xs mb-2 border-b">
          <strong>{name}</strong>
          <pre>{JSON.stringify(config, null, 2)}</pre>
        </div>
      ))}
    </div>
  )
}
```

## 🎯 Success Criteria

Your setup is working if:
- ✅ Models render in 3D view
- ✅ Console shows "Material registered" messages
- ✅ Material updates are visible (colors change)
- ✅ All 10 models appear with correct materials
- ✅ Textures show without distortion

## 📞 Support

If something doesn't work:

1. **Check browser console** - Copy any errors
2. **Run diagnostics** in console:
   ```javascript
   console.log({
     modelsCount: materialsMonitor.list().length,
     groundMaterials: materialsMonitor.list().filter(m => m[0].includes('ground')),
   })
   ```
3. **Verify file structure**: `components/models/` should have 10 .tsx files
4. **Check Network tab** for failed GLB loads

---

**You're all set! Start dev server and check the console for material logs.** 🚀
