# 🎨 Annotation Panel - Quick Reference Card

## 📱 UI Layout at a Glance

```
┌─────────────────────────────────────────────────┐
│  LEFT SIDEBAR                    RIGHT TOOLBAR  │
│  (Collapsible Settings)          (Main Controls)│
│  w-72 when expanded              Always visible │
│                                                 │
│  ┌─────────────────────┐      ┌───────────────┐│
│  │ PENCIL MODE         │      │  View (V)     ││
│  │ 4px • Colored       │      ├───────────────┤│
│  └─────────────────────┘      │  ✎P  ▭E      ││
│                                ├───────────────┤│
│  Tool                          │ 3D Pencil     ││
│  [✎ Pencil] [▭ Eraser]        │ 3D Eraser     ││
│                                ├───────────────┤│
│  Color (Pencil Only)           │  ↔ (toggle)  ││
│  ┌───────────────────┐         ├───────────────┤│
│  │ 🔴 🟢 🔵 🟡 🟣 ⚪ │         │  ↶   🗑      ││
│  └───────────────────┘         └───────────────┘│
│                                                 │
│  Pencil Width                                  │
│  ────────────────  4 px                        │
│                                                 │
│  ┌──────────────────────────────┐              │
│  │      ◯ (preview circle)      │              │
│  └──────────────────────────────┘              │
│                                                 │
│  Size Presets                                  │
│  [S]  [M]  [L]                                 │
│                                                 │
│  [↶ Undo]  [🗑 Clear]                         │
│                                                 │
│  Keyboard Shortcuts                            │
│  P - Pencil, E - Eraser                        │
│  1/2/3 - Size                                  │
└─────────────────────────────────────────────────┘
```

---

## ⌨️ Keyboard Shortcuts Cheat Sheet

### Tool Selection
| Key | Action | Mode |
|-----|--------|------|
| **P** | Pencil | 2D |
| **E** | Eraser | 2D |
| **V** | View | Navigation |

### Size Adjustment
| Key | Pencil | Eraser |
|-----|--------|--------|
| **1** | 2px | 30px |
| **2** | 4px | 60px |
| **3** | 8px | 100px |

### Actions
| Key | Action |
|-----|--------|
| **Ctrl+Z** | Undo last stroke |
| **Ctrl+C** | Clear all annotations |

---

## 🎯 Common Workflows

### Quick Draw (Keyboard)
```
1. Press P (pencil)
2. Press 2 (medium)
3. Draw on canvas
4. Press Ctrl+Z if oops
5. Done!
```

### Change Color (Mouse + Keyboard)
```
1. Click blue color in grid
2. Press 3 (large)
3. Draw with blue, large brush
4. Press E (eraser)
5. Fix mistakes
```

### Eraser Only
```
1. Press E (eraser)
2. Press 2 (medium size)
3. Click on canvas to erase
4. Click preset L (large) for bigger eraser
5. Done!
```

### Collapse for More Space
```
1. Settings panel is open
2. Click ↔ chevron icon in right toolbar
3. Left panel slides out (animation 300ms)
4. Full canvas space for drawing
5. Click ↔ again to show settings
```

---

## 🎨 Color Palette (Left Panel)

```
Pencil Colors (3×2 Grid - Only Shows When Pencil Active)

🔴 Red       🟢 Green     🔵 Blue
#ef4444      #22c55e      #3b82f6

🟡 Yellow    🟣 Purple    ⚪ White
#eab308      #a855f7      #ffffff
```

---

## 📊 Size Presets

### Pencil
- **S** (Small) = 2px → Fine details, precise drawing
- **M** (Medium) = 4px → Default, balanced
- **L** (Large) = 8px → Bold strokes, quick annotations

### Eraser
- **S** (Small) = 30px → Precise erasing, small fixes
- **M** (Medium) = 60px → Default, balanced
- **L** (Large) = 100px → Large area cleanup

---

## 🔄 Tool Switching Matrix

```
Current Tool | Press | New Tool | Behavior
─────────────┼──────┼──────────┼──────────────────────
View         | P    | Pencil   | → Open left panel
Pencil       | E    | Eraser   | → Keep panel, hide colors
Eraser       | P    | Pencil   | → Show color grid
Any Tool     | V    | View     | → Collapse panel (optional)
```

---

## 🎪 Status Badge Meanings

```
┌─ PENCIL MODE ───┐    Current tool is pencil
│ 4px • Colored   │    Width is 4px, color is selected
└─────────────────┘

┌─ ERASER MODE ──┐     Current tool is eraser
│ 60px • Eraser  │     Width is 60px (not affected by color)
└────────────────┘

┌─ PENCIL 3D MODE ┐    3D pencil tool active
└──────────────────┘   (width/color shown but in 3D space)

┌─ ERASER 3D MODE ┐    3D eraser tool active
└──────────────────┘   (removes 3D strokes on click)
```

---

## 🖱️ Mouse Interactions

### Left Sidebar (When Expanded)

| Element | Click | Effect |
|---------|-------|--------|
| **Pencil button** | Open | Switches to pencil, shows color grid |
| **Eraser button** | Open | Switches to eraser, hides color grid |
| **Color swatch** | Click | Changes pen color (auto-switches to pencil) |
| **Width slider** | Drag | Adjusts stroke width, preview updates |
| **S/M/L preset** | Click | Instantly applies that size |
| **Undo button** | Click | Removes last stroke |
| **Clear button** | Click | Removes all annotations (confirm dialog) |

### Right Toolbar (Always Visible)

| Element | Click | Effect |
|---------|-------|--------|
| **View button** | Click | Switches to view mode |
| **Pencil icon** | Click | Switches to pencil tool (panel stays) |
| **Eraser icon** | Click | Switches to eraser tool |
| **3D Pencil** | Click | 3D drawing mode |
| **3D Eraser** | Click | 3D erasing mode (click lines to delete) |
| **Chevron ↔** | Click | Toggle panel expand/collapse |
| **Undo icon** | Click | Undo last stroke |
| **Trash icon** | Click | Clear all (with confirmation) |

---

## 💡 Pro Tips

### Speed Up Workflow
- **Use keyboard**: P/E/V/1/2/3 faster than clicking
- **Presets over slider**: S/M/L buttons are snappy
- **Keep panel open**: Don't collapse unless you need max space

### Precision Work
- **Use Size 1**: Press 1 for smallest brush (2px)
- **Watch preview**: Circle shows exact size before drawing
- **Use Undo liberally**: Ctrl+Z for quick fixes

### Efficiency
- **Color grid**: Click color → auto-switches to pencil
- **Preset quick toggle**: 1→2→3 for rapid size changes
- **Collapse when done**: Close panel to save screen space

### Troubleshooting
- **Keyboard not working?**: Focus must be on app (not URL bar)
- **Settings hidden?**: Click chevron to expand panel
- **Colors not showing?**: Only visible in pencil mode
- **Size seems off?**: Check preview circle

---

## 🎬 Typical Session Flow

```
Step 1: Launch App
└─ Panel defaults to OPEN
└─ Tool defaults to VIEW mode

Step 2: Start Annotating
├─ Press P (or click pencil)
├─ Panel shows PENCIL MODE
├─ Choose color from grid (optional)
└─ Ready to draw

Step 3: Drawing
├─ Click on canvas to draw
├─ Can adjust width with 1/2/3 anytime
├─ Can change color anytime
└─ Panel stays open (no interference)

Step 4: Corrections
├─ Press E (eraser mode)
├─ Erase mistakes
├─ Press Ctrl+Z (undo) if needed
└─ Back to Pencil mode (Press P)

Step 5: Done
├─ Press V (view mode) or
├─ Click chevron to collapse panel
└─ Admire your annotation!
```

---

## 📈 Performance Notes

✅ **What's Fast**:
- Keyboard shortcuts (instant)
- Preset buttons (instant)
- Panel animation (smooth 300ms)
- Preview circle (real-time)
- Color switching (immediate)

✅ **What's Optimized**:
- No re-renders on width slider (debounced)
- CSS animations (GPU accelerated)
- Event listeners (properly cleaned up)
- DOM updates (minimal)

---

## ⚠️ Known Limitations

⚠️ **Mobile**: Panel auto-collapses on small screens
⚠️ **Touch**: Large targets (48px+) for better precision
⚠️ **Keyboard**: Some systems may capture shortcuts
⚠️ **Colors**: Not visible if pencil color = background

---

## 🔗 File References

- **Implementation**: `components/Toolbar.tsx` (364 lines)
- **Main Logic**: `App.tsx` (unchanged, manages state)
- **Canvas**: `components/AnnotationCanvas.tsx` (unchanged)

### Documentation Files
1. **ANNOTATION_UX_SUMMARY.md** - High-level overview
2. **ANNOTATION_PANEL_VISUAL_GUIDE.md** - Visual layouts
3. **TOOLBAR_CODE_STRUCTURE.md** - Code deep dive
4. **ANNOTATION_NEXT_STEPS.md** - Future enhancements
5. **This file** - Quick reference

---

## 🆘 Quick Help

**Q: Pen not working?**
A: Make sure tool is "pencil" or "eraser" (not "view")

**Q: Settings hidden?**
A: Click the ↔ chevron in right toolbar to expand

**Q: Keyboard shortcuts not working?**
A: Click on canvas first to ensure focus, then try

**Q: Size not changing?**
A: Use 1/2/3 keys for presets, or drag slider

**Q: Need more space?**
A: Click chevron to collapse panel

---

## 📞 Feature Requests

Future ideas being considered:
- ✨ Save preset profiles (remember your settings)
- ✨ Pressure-sensitive brush (for stylus)
- ✨ Multiple brush styles (chalk, marker, etc.)
- ✨ Measurement tools (distance, angles)
- ✨ Export to PNG/SVG
- ✨ Annotation layers (organize strokes)
- ✨ Undo history panel (jump to any point)

See `ANNOTATION_NEXT_STEPS.md` for roadmap.

---

**Version**: 1.0 (February 2, 2026)
**Status**: ✅ Live
**Last Updated**: 2026-02-02
