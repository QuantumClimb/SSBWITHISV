# Phase 2 & 3 Implementation Guide

## Phase 2 — iPad Renderer Settings

**File:** `components/Viewer3D.tsx`  
**Estimated changes:** 3 edits, ~10 lines  
**Pre-requisite:** Phase 1 tested and stable

---

### 2A — Canvas `gl` Props

**Location:** `<Canvas>` element, [Viewer3D.tsx ~L901](../components/Viewer3D.tsx)  
**Current state:**
```tsx
<Canvas 
  camera={{ position: isPlayerMode ? [0, 5, 8] : cameraPosition, fov: cameraFov, near: 0.1, far: 1000 }} 
  dpr={[1, 1.5]}
  style={{ touchAction: 'none' }}
  ...
```

**Change to:**
```tsx
<Canvas 
  camera={{ position: isPlayerMode ? [0, 5, 8] : cameraPosition, fov: cameraFov, near: 0.1, far: 1000 }} 
  dpr={[1, 1.5]}
  style={{ touchAction: 'none' }}
  gl={{ antialias: false, powerPreference: 'high-performance' }}
  ...
```

**Why:**
- `antialias: false` — the `<EffectComposer>` with `<SMAA>` already handles anti-aliasing as a post-process pass. Enabling the WebGL built-in MSAA on top is redundant and wastes GPU memory bandwidth on iPad (~2× fill-rate cost at 1.5× DPR).
- `powerPreference: 'high-performance'` — tells the GPU driver (Safari/Metal) to stay in the high-power GPU state during sustained annotation sessions. Without this, iPad may clock down mid-session.

---

### 2B — Conditional SMAA on Mobile

**Location:** `<EffectComposer>` block, [Viewer3D.tsx ~L970](../components/Viewer3D.tsx)  
**Current state:**
```tsx
<EffectComposer multisampling={4} enableNormalPass>
  {/* eslint-disable-next-line react/no-unknown-property */}
  <Smaa />
</EffectComposer>
```

**Change to:**
```tsx
{/* SMAA skipped on touch devices — expensive full-screen pass, noticeable on iPad */}
{!isMobile && (
  <EffectComposer multisampling={4} enableNormalPass>
    {/* eslint-disable-next-line react/no-unknown-property */}
    <Smaa />
  </EffectComposer>
)}
```

Where `isMobile` is a constant computed once at module level (or component level):
```ts
const isMobile = navigator.maxTouchPoints > 1;
```

Place it near the top of the `Viewer3D` component function body (alongside the existing `useEffect` for BVH).

**Why:**  
SMAA is a full-screen fragment shader pass that runs every frame. On iPad M-series chips it's manageable, but on older iPad Air/mini it can pull frame time from ~10ms to ~22ms. Desktop users still get SMAA via the `!isMobile` gate. The `antialias: false` change in 2A means desktop quality is unchanged (SMAA handles it), and mobile gets a clean unaliased render at its native DPR without the post-pass cost.

---

### 2C — Hover Throttle Increase

**Location:** `HOVER_THROTTLE_MS` constant, [Viewer3D.tsx ~L353](../components/Viewer3D.tsx)  
**Current state:**
```ts
const HOVER_THROTTLE_MS = 16; // ~60fps
```

**Change to:**
```ts
const HOVER_THROTTLE_MS = 30; // ~33fps — appropriate for iPad thermals
```

**Why:**  
The hover indicator (the sphere cursor) updates `hoverInfo` state, which triggers a React re-render of the hover sphere. At 16ms (60fps) every pointer move event during non-drawing moves fires a `setState`. On iPad, pointer events can arrive at 120Hz (ProMotion). Throttling to 30ms cuts that callback rate by 4× with no visible quality loss for the hover cursor, reducing CPU→GPU sync overhead and helping with sustained thermal performance.

---

## Phase 3 — Capacitor iOS Wrapper

**Pre-requisite:** Phase 2 complete and tested on desktop Safari; GLB model confirmed loading via `/public/MAIN_GTO_GROUND4.glb`.

---

### 3A — Check Public Asset

Before bundling for iOS, confirm the GLB ships with the app:

```
public/
  MAIN_GTO_GROUND4.glb   ← must exist here
  SKY.png                ← must exist here
```

Vite copies `public/` verbatim into `dist/`. Capacitor then copies `dist/` into the iOS app bundle. If either asset is loaded from an external URL instead, it won't work offline on device.

Run a test build first:
```powershell
npm run build
# Check dist/ contains the GLB and SKY.png
dir .\dist\
```

---

### 3B — Install Capacitor

```powershell
npm install @capacitor/core @capacitor/cli @capacitor/ios
```

No other Capacitor plugins are needed for this app (no camera, no filesystem).

---

### 3C — Initialise Capacitor Project

```powershell
npx cap init
```

When prompted:
| Prompt | Value |
|---|---|
| App name | `3D Annotator` (or your preferred display name) |
| App ID | `com.yourorg.annotator` (reverse-domain; must match Apple Developer portal) |
| Web asset directory | `dist` |

This generates `capacitor.config.ts` at the workspace root.

**Expected `capacitor.config.ts`:**
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourorg.annotator',
  appName: '3D Annotator',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

> **Note:** Leave `server.url` unset — this ensures the app loads from the local bundle, not a live URL. If you ever want hot-reload during development on device, temporarily set `server.url: 'http://YOUR_IP:5173'`.

---

### 3D — Add iOS Platform

```powershell
npx cap add ios
```

This creates an `ios/` folder containing the full Xcode project. This folder should be committed to git (it contains your app configuration, icons, etc.).

---

### 3E — Apple Pencil Input Handling

No code change is strictly required — your existing pointer event handlers already work with Apple Pencil because iPadOS maps Pencil events to standard `pointermove`/`pointerdown` with `pointerType: 'pen'`.

However, one important disambiguation is needed: **OrbitControls must not activate when the Pencil tip touches the screen** (otherwise drawing fights camera panning).

**Current OrbitControls config** ([Viewer3D.tsx ~L976](../components/Viewer3D.tsx)):
```tsx
<OrbitControls
  ref={controlsRef}
  enabled={activeTool === 'view'}
  ...
```

This already handles it correctly — OrbitControls is disabled when `activeTool` is `pencil3d` or `eraser3d`. No change needed.

**However:** if you later want finger-pan to work simultaneously with Pencil drawing (two-input: pencil draws, finger orbits), you'd need to filter `pointerType` on the OrbitControls events. That is an optional enhancement, not required for Phase 3.

---

### 3F — Build and Sync

Run after every code change before testing on device:

```powershell
npm run build
npx cap sync
```

`cap sync` copies `dist/` into the iOS bundle and updates any Capacitor plugins.

---

### 3G — Open in Xcode

```powershell
npx cap open ios
```

In Xcode:

| Setting | Where | Value |
|---|---|---|
| Team | Signing & Capabilities → Team | Your Apple Developer account |
| Bundle Identifier | General → Identity | Must match the `appId` in `capacitor.config.ts` |
| Deployment Target | General → Minimum Deployments | iOS 16.0 (WebGL2 stable from iOS 15+, 16 safer) |
| Device | Scheme selector (top bar) | Your connected iPad or Simulator → iPad |

**Build → Run** (`⌘R`) to deploy to device.

---

### 3H — WKWebView WebGL Notes

Capacitor on iOS uses `WKWebView`. Important limitations to be aware of:

| Feature | Status |
|---|---|
| WebGL 2 | ✓ Supported (iOS 15+) |
| WebGPU | ✗ Not available in WKWebView (only Safari proper) |
| `three-mesh-bvh` | ✓ Works (pure JS, no WebGPU dependency) |
| WASM | ✓ Supported |
| Local file loading (GLB, PNG) | ✓ Via Capacitor bundle — no CORS issues |
| Filesystem access | Limited to app sandbox unless using `@capacitor/filesystem` plugin |

Your app uses only WebGL 2 features — no issues expected.

---

### 3I — Icon and Splash Screen (Optional but Recommended)

Install the Capacitor assets plugin for automatic icon/splash generation:

```powershell
npm install @capacitor/assets --save-dev
```

Place a 1024×1024 `icon.png` and a 2732×2732 `splash.png` in `resources/`:

```
resources/
  icon.png
  splash.png
```

Then generate all sizes:

```powershell
npx capacitor-assets generate --ios
```

---

## Summary Checklist

### Phase 2
- [ ] Add `gl={{ antialias: false, powerPreference: 'high-performance' }}` to `<Canvas>`
- [ ] Add `const isMobile = navigator.maxTouchPoints > 1;` to Viewer3D component
- [ ] Wrap `<EffectComposer>` in `{!isMobile && (...)}`
- [ ] Change `HOVER_THROTTLE_MS` from `16` to `30`
- [ ] Test on desktop — visual quality unchanged
- [ ] Test on iPad (or Safari mobile emulation) — SMAA absent, smoother frame time

### Phase 3
- [ ] Confirm `public/MAIN_GTO_GROUND4.glb` and `public/SKY.png` exist
- [ ] `npm run build` → confirm `dist/` contains assets
- [ ] `npm install @capacitor/core @capacitor/cli @capacitor/ios`
- [ ] `npx cap init` → configure appId and appName
- [ ] Review generated `capacitor.config.ts`
- [ ] `npx cap add ios`
- [ ] `npm run build && npx cap sync`
- [ ] `npx cap open ios` → set Team + Bundle ID in Xcode
- [ ] Deploy to iPad Simulator → test GLB loads, annotation works
- [ ] Deploy to physical iPad → test Apple Pencil annotation
- [ ] (Optional) Add icons/splash via `@capacitor/assets`
