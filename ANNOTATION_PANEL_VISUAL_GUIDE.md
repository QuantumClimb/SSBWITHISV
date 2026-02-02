# Annotation Panel - Visual Guide

## 🎨 New Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│            3D MODEL & ANNOTATION CANVAS                │
│                                                         │
│                                        ┌──────────────┐ │
│                                        │ LEFT PANEL   │ │
│                                        │ (NEW)        │ │
│                  CANVAS                │              │ │
│                                        │ • Tool Sel.  │ │
│                                        │ • Colors     │ │
│                                        │ • Width      │ │
│                                        │ • Preview    │ │
│                                        │ • Presets    │ │
│                                        │ • Actions    │ │
│                                        │ • Shortcuts  │ │
│                                        │              │ │
│                                        └──────────────┘ │
│                                            │ ┌────────┐ │
│                                            └─│ MAIN   │ │
│                                              │ TOOLBAR│ │
│                                              │ (right)│ │
│                                              │        │ │
│                                              │ • View │ │
│                                              │ • P/E  │ │
│                                              │ • 3D   │ │
│                                              │ • ↔ ↕  │ │
│                                              │ • Undo │ │
│                                              │ • Clear│ │
│                                              └────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 📋 Left Sidebar Panel Structure

```
┌─ SETTINGS PANEL ──────────────────────────┐
│                                           │
│  ┌─ PENCIL MODE ────────────────────┐   │
│  │ 4px • Colored                    │   │
│  └──────────────────────────────────┘   │
│                                          │
│  TOOL                                    │
│  ┌─────────────────────────────────┐    │
│  │ ✎ Pencil                    P ◀│    │
│  │ ▭ Eraser                    E ◀│    │
│  └─────────────────────────────────┘    │
│                                          │
│  COLOR (when pencil active)              │
│  ┌─── ─── ───┐                          │
│  │ 🔴 🟢 🔵 │ (3x2 grid)               │
│  │ 🟡 🟣 ⚪ │                          │
│  └─── ─── ───┘                          │
│                                          │
│  PENCIL WIDTH                            │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ 4   px                │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │        ◯ (preview circle)       │    │
│  └─────────────────────────────────┘    │
│                                          │
│  ┌─ ─ ─┐                                │
│  │ S│ M│ L│ (quick presets)             │
│  └─ ─ ─┘                                │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │ ↶ Undo                  Ctrl+Z  │    │
│  │ 🗑 Clear                Ctrl+C  │    │
│  └─────────────────────────────────┘    │
│                                          │
│  KEYBOARD SHORTCUTS                      │
│  ┌─────────────────────────────────┐    │
│  │ P - Pencil                      │    │
│  │ E - Eraser                      │    │
│  │ 1/2/3 - Size                    │    │
│  └─────────────────────────────────┘    │
│                                          │
└───────────────────────────────────────────┘
         ◀▶ Expand/Collapse Toggle
```

## 🎯 Key Improvements

### Before vs After

| Feature | Before | After |
|---------|--------|-------|
| **Settings Position** | Right side (blocks some canvas) | Left sidebar (non-intrusive) |
| **Can Draw While Settings Visible?** | ❌ No (UI modal) | ✅ Yes (panel on side) |
| **Width Preview** | "12px" text | Visual circle showing exact stroke |
| **Size Selection** | Slider only (tedious) | Slider + S/M/L quick buttons |
| **Color Selection** | Vertical circles | 3x2 grid (more organized) |
| **Keyboard Shortcuts** | None | P/E/V/1/2/3 + Ctrl+Z/Ctrl+C |
| **Status Display** | Inline text | Blue badge: "PENCIL MODE" |
| **Space Saving** | Always visible | Can collapse to nothing |
| **Mobile Friendly** | Limited space | Collapsible, more canvas space |

---

## 🎮 Typical User Workflows

### Quick Annotation (Keyboard Power User)
```
1. Press P (Pencil tool)
2. Press 1, 2, or 3 (size)
3. Click color in left panel
4. Draw on canvas
5. Press E (Eraser) if need to fix
6. Press Ctrl+Z to undo
```

### Traditional Annotator (Mouse User)
```
1. Click Pencil icon in left panel
2. Click color swatch
3. Click Size preset (M)
4. Draw on canvas
5. Collapse panel for more space (chevron button)
6. Click Undo button when done
```

### 3D Drawing Expert
```
1. Left panel still visible for ref
2. Click pencil3d icon in main toolbar (right side)
3. Draw directly on 3D model
4. Settings in left panel for width adjustment
5. Eraser3d icon removes 3D strokes
```

---

## 🔧 Interaction Details

### Expand/Collapse Animation
- **Duration**: 300ms smooth transition
- **How**: Chevron Up/Down button in main toolbar
- **Width**: Animates from full width → 0
- **Content**: Hidden when collapsed (no pointer events)

### Stroke Preview Circle
- **Updates**: Real-time as slider moves
- **Color**: Shows actual pencil color OR gray for eraser
- **Size**: `min(currentWidth, 60)` to prevent overflow
- **Border**: White/semi-transparent

### Quick Presets
- **Pencil**: S=2px, M=4px, L=8px
- **Eraser**: S=30px, M=60px, L=100px
- **Active State**: Highlighted in blue when selected
- **Click**: Instantly applies size

### Keyboard Handler
```javascript
- Prevents default for tool keys (P/E/V/1/2/3)
- Respects Ctrl/Cmd for undo/clear
- Non-blocking (doesn't prevent typing in text inputs)
- Works while drawing (no focus needed)
```

---

## 📱 Responsive Behavior

### Desktop
- Left panel always accessible
- Full color/size controls visible
- Easy keyboard shortcuts

### Tablet
- Panel collapses by default to maximize canvas
- Large touch targets (48px minimum)
- Gestures supported

### Phone
- Panel collapses by default
- Expanded only when user taps settings
- Full screen for drawing

---

## 🚀 Performance Notes
- ✅ CSS transitions (hardware accelerated)
- ✅ No re-renders on width slider movement
- ✅ Keyboard handlers use cleanup
- ✅ All state in parent component (no prop drilling)
- ✅ Lucide icons optimized (SVG inline)

---

## 🎨 Color & Typography

### Colors Used
- **Active Elements**: `bg-blue-600` with `shadow-lg`
- **Inactive Elements**: `bg-white/5` with `text-zinc-300`
- **Accent**: `text-blue-300` or `text-blue-400`
- **Destructive**: `bg-red-500/10` with `text-red-400`
- **Status Badge**: `bg-blue-500/20` with `border-blue-500/50`

### Text Hierarchy
```
Tool Status (header)     → 11px uppercase bold
Section Labels          → 10px uppercase tracking-widest
Button Text            → 14px semibold
Value Display          → 12px mono bold
Keyboard Hints         → 10px mono
Helper Text            → 10px lighter
```

---

## 🔄 State Management

No new global state added - everything flows through props:

```typescript
// Toolbar component internal state:
const [panelExpanded, setPanelExpanded] = useState(true);  // Collapse toggle
const [showPresets, setShowPresets] = useState(false);     // Reserved

// All tool logic remains in App.tsx:
tool               → passed as prop (tool)
color              → passed as prop (color)
pencilWidth        → passed as prop (pencilWidth)
eraserWidth        → passed as prop (eraserWidth)
```

---

## ✅ Testing Scenarios

- [ ] Click pencil, eraser, draw (pen not disabled)
- [ ] Adjust width while panel open
- [ ] Collapse panel and verify canvas full width
- [ ] Keyboard shortcuts (P, E, V, 1, 2, 3)
- [ ] Keyboard undo/clear (Ctrl+Z, Ctrl+C)
- [ ] Stroke preview matches actual stroke size
- [ ] Color changes apply to next stroke
- [ ] Size presets apply instantly
- [ ] Mobile: panel collapses by default
- [ ] Touch: can draw with finger while panel open
