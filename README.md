# SSBWITHISV - Virtual GTO Trainer

A 3D annotation and training application for visualizing and annotating 3D models with real-time drawing tools.

## Features

- **3D Model Viewing**: Load and interact with an optimised single-file GLB model
- **Annotation Tools**:
  - 2D screen-space drawing (pencil, eraser)
  - **High-Performance 3D Surface Annotation**: Zero-lag drawing on complex meshes using **GPU-accelerated picking**.
  - **Surface-Aligned Brush Pointer**: Dynamic visual feedback that follows model curvature in real-time.
  - Automatic surface-offset positioning with **Z-fighting prevention**.
- **Camera Controls**: 
  - Orbit controls with double-click to re-centre on any surface point.
  - **Unified Movement Gamepad**: On-screen touch controls for Forward/Backward, Left/Right, and Vertical (Up/Down) movement.
  - Works in both **Orbit Mode** (panning target) and **Player Mode** (direct character control).
- **Real-time Lighting**: Adjustable directional and ambient lighting with sunset environment
- **Post-processing**: SMAA anti-aliasing (automatically disabled on mobile for performance)
- **Authentication**: Secure login system

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **P** | Pencil tool |
| **E** | Eraser tool |
| **V** | View mode |
| **W / A / S / D** | Player movement / Camera rotation |
| **Arrow Keys** | Alternative movement |
| **1 / 2 / 3** | Size presets |
| **Double-click** | Centre & rotate camera on point |

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **3D Rendering**: Three.js + React Three Fiber + Drei
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Deployment**: Vercel with Git LFS support

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Deployment

The application is deployed on Vercel at: https://ssbwithisv.vercel.app

Large model files (`.glb`) are managed via Git LFS for efficient storage and deployment.

## Project Structure

```
├── components/
│   ├── models/
│   │   ├── MainModel.tsx      # Single optimised GLB model loader
│   │   └── index.ts           # Model exports
│   ├── Login.tsx              # Authentication component
│   ├── Viewer3D.tsx           # 3D scene, camera targeting, annotations
│   ├── MovementGamepad.tsx    # On-screen touch controls for iPad
│   ├── AnnotationCanvas.tsx   # 2D overlay drawing
│   └── Toolbar.tsx            # Tool selection UI with shortcuts
├── public/
│   └── MAIN_GTO_GROUND4.glb   # Optimised 3D model
├── App.tsx                    # Main application logic
└── types.ts                   # TypeScript type definitions
```

## License

Private project - All rights reserved
