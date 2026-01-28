# SSBWITHISV - Virtual GTO Trainer

A 3D annotation and training application for visualizing and annotating 3D models with real-time drawing tools.

## Features

- **3D Model Viewing**: Load and interact with multiple 3D model chunks
- **Annotation Tools**: 
  - 2D screen-space drawing (pencil, eraser)
  - 3D surface annotation with automatic positioning
- **Camera Controls**: Orbit controls with zoom limits and ground constraints
- **Real-time Lighting**: Directional light with shadows and sunset environment
- **Authentication**: Secure login system

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **3D Rendering**: Three.js 0.170 + React Three Fiber + Drei
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS v4
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
│   ├── Login.tsx           # Authentication component
│   ├── Viewer3D.tsx        # 3D scene and model rendering
│   ├── AnnotationCanvas.tsx # 2D overlay drawing
│   └── Toolbar.tsx         # Tool selection UI
├── public/                 # 3D model files (.glb)
├── App.tsx                 # Main application logic
└── types.ts                # TypeScript type definitions
```

## License

Private project - All rights reserved
