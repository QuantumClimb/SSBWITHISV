# Intellectual Property Disclosure: Virtual GTO Trainer

## 1. Title of Invention
**High-Performance Multi-Modal 3D Training System with Shader-Based Attribute Extraction and Spatial-Indexed Annotation Optimization**

## 2. Technical Field
The present invention relates to advanced 3D rendering and pedagogical visualization. It focuses on the technical architecture for low-latency surface interaction and data-optimized 3D sketching on high-complexity meshes in browser-based and mobile environments.

## 3. Background: The Computation Challenge of Real-Time 3D Instruction
Real-time 3D trainers, particularly for Game Theory Optimal (GTO) visualization, require high-fidelity interaction with dense geometric models. Traditional methods (CPU raycasting) scale poorly with mesh complexity. Maintaining "training fluidity" requires a paradigm shift from geometric intersection testing to rasterization-based attribute retrieval and spatially-aware data optimization.

## 4. Technical Architecture and Key Innovations

### 4.1 BVH-Accelerated Geometry Processing
To handle high-polygon "Main Model" assets efficiently, the system implements a **Bounding Volume Hierarchy (BVH)** via `three-mesh-bvh`.
-   **Static Pre-computation**: All model geometries undergo a `computeBoundsTree` pass on initialization.
-   **Accelerated Raycasting**: Standard GPU raycasting is patched with BVH-search, reducing intersection time from $O(n)$ to $O(\log n)$ per viewport interaction, enabling real-time "focus" centering and interaction triggers.

### 4.2 Single-Pixel Shader-Based "GpuPicker" Engine
The system bypasses the CPU for surface data retrieval using a custom multi-pass **Shader Material Engine**:
-   **Focused Viewport Projection**: Utilizing `camera.setViewOffset`, the rendering pipeline is restricted to a $1 \times 1$ pixel sub-region.
-   **Custom Attribute Shaders**:
    -   **Position Shader**: `gl_FragColor = vec4(vWorldPosition, 1.0);` writes raw world coordinates to the R, G, B channels.
    -   **Normal Shader**: `gl_FragColor = vec4(vWorldNormal, 1.0);` writes world normals.
-   **Precision Capture**: Data is written to a `FloatType` render target (`Float32Array`), ensuring the retrieved coordinates are accurate to the floating-point degree, rather than quantized as 8-bit color values.

### 4.3 Adaptive Path Simplification Algorithm
To maintain a small data footprint for 3D annotations, the system implements a **3D-Projection Simplifier**:
-   **Planar Decomposition**: 3D point clouds are projected onto three orthogonal planes (XY, YZ, XZ).
-   **RDP Optimization**: The Ramer-Douglas-Peucker (RDP) algorithm is applied across all three projections concurrently.
-   **Heuristic Re-assembly**: Points are kept in the final 3D path if they are identified as critical in *any* of the three projection planes, ensuring geometric fidelity is maintained while reducing data density by up to 90%.

### 4.4 Spatial-Indexed Eraser and Collision Rejection
Eraser functionality is optimized using a tiered rejection strategy:
-   **Tier 1: Bounding Sphere Rejection**: Each annotation path pre-computes a bounding sphere (centroid and radius). The eraser first performs a sphere-sphere intersection test.
-   **Tier 2: Euclidean Point Check**: Only if the bounding spheres overlap does the system perform a fine-grained distance check on the constituent points of the path.
-   **Multi-Modal Deletion**: The system applies this logic to annotations, measurements, and placed 3D objects concurrently.

### 4.5 Precision 3D Measurement Engine
A custom measurement suite provides high-fidelity spatial feedback:
-   **Real-time Surface Snapping**: Leverages the "GpuPicker" for $O(1)$ surface coordinate retrieval during measurement start/end selection.
-   **Dynamic Billboarding**: Distance labels are rendered using HTML-in-3D overlays (`drei/Html`) with automatic occlusion and depth-sorting logic.

### 4.6 Multi-Modal Object Placement System
An experimental system for placing geometric objects (Cylinders, Planks, Ropes) on mesh surfaces:
-   **Dynamic Interaction Logic**: Implements different interaction modalities (single-click for primitives, multi-click for compound objects like ropes) synchronized with the GPU picking engine.
-   **Procedural Rope Geometry**: Ropes are rendered as multi-segment paths with thickness, optimized for real-time manipulation.

### 4.7 Synchronous Cinematic Initialization
To ensure a premium feel while masking background asset loading, the system uses a **Synchronized Transition Bridge**:
-   **Effective Progress Logic**: Decouples "raw" asset loading from "perceived" loading UI via a minimum-duration progress interpolation.
-   **Layered Fade Transitions**: Synchronous alpha-blending of UI backdrops, buttons, and splash screen elements over a fixed duration (2.5s) to prevent visual "popping" of high-complexity models.

### 4.8 Normal-Aligned 3D Reticle Feedback System
The system provides real-time visual anchoring for non-drawing tools (Focus, Measurement):
- **Dynamic Orientation**: Reticle geometry is rotated using `setFromUnitVectors` to align the `(0, 1, 0)` up-vector with the surface normal retrieved from the GPU picker.
- **Contextual Symbology**: Surfaces are marked with tool-specific 3D icons (Crosshair for Focus, Circular Target for Measure) to prevent parallax errors on touch devices.

### 4.9 Real-Time Spatial Unit Transformation
A state-driven conversion engine for spatial analysis:
- **Metric-to-Imperial Transformation**: Real-time multiplication of raw Euclidean distances by $3.28084$ within the rendering loop.
- **Dynamic Text Reflow**: Measurements are formatted and re-rendered instantly upon unit system state change without requiring re-computation of geometric endpoints.

## 5. Comprehensive Feature Suite
-   **First Virtual GTO Trainer**: Specialized for strategic Game Theory visualization.
-   **Hybrid Camera State Machine**: Seamlessly switches between Orbit, FPV, and TPV using a proprietary interpolation logic (`LERP` for target and position).
-   **Context-Aware Mode Controller**: Automatically reverts the interaction state to "Orbit/View" mode upon successful focus-target acquisition, optimizing user workflow for inspection.
-   **Multi-Layer Canvas**: Synchronized rendering of 2D screen-space and 3D mesh-space annotations.
-   **Z-Fighting Mitigation Engine**: Dynamic `polygonOffsetFactor` and `polygonOffsetUnits` application for all virtual geometry.

## 6. Technical Claims
1.  A method for 3D coordinate retrieval using a single-pixel viewport offset and floating-point shader buffers.
2.  A 3D-path simplification technique using concurrent multi-plane projection and RDP filtering.
3.  The use of BVH spatial indexing to accelerate interaction triggers in a pedagogical 3D trainer.
4.  A tiered spatial rejection system for high-performance deletion of dynamic 3D geometry and measurement entities.
5.  A synchronized transition management system for multi-modal application entry sequences.
6.  A method for normal-aligned 3D visual feedback using GPU-retrieved vertex data for parallax-free interaction on touch-capacitive surfaces.

---
*End of Technical Disclosure*
