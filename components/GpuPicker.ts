
import * as THREE from 'three';

export class GpuPicker {
  private renderTarget: THREE.WebGLRenderTarget;
  private positionMaterial: THREE.ShaderMaterial;
  private normalMaterial: THREE.ShaderMaterial;
  private pixelBuffer: Float32Array;

  constructor() {
    this.renderTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });

    this.pixelBuffer = new Float32Array(4);

    this.positionMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPosition;
        void main() {
          gl_FragColor = vec4(vWorldPosition, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });

    this.normalMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vWorldNormal;
        void main() {
          vWorldNormal = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldNormal;
        void main() {
          gl_FragColor = vec4(vWorldNormal, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });
  }

  public pick(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    mouse: { x: number; y: number }
  ): { point: THREE.Vector3; normal: THREE.Vector3 } | null {
    if (!(camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera)) {
      return null;
    }

    const currentRenderTarget = renderer.getRenderTarget();
    const dpr = renderer.getPixelRatio();
    const size = new THREE.Vector2();
    renderer.getSize(size);

    // Logical pixel coords
    const pixelX = (mouse.x * 0.5 + 0.5) * size.x;
    const pixelY = (mouse.y * -0.5 + 0.5) * size.y;

    // Use setViewOffset to focus the camera's projection on a 1x1 sub-region
    // This allows us to render just one pixel accurately without rendering the whole scene.
    // The offset is defined in logical pixels, mapped to the full logical resolution.
    const fullWidth = size.x;
    const fullHeight = size.y;

    // Save original offset
    const oldOffset = (camera as any).view ? { ...(camera as any).view } : null;

    // Set offset to 1x1 area around the mouse
    camera.setViewOffset(fullWidth, fullHeight, pixelX, pixelY, 1, 1);

    // Ensure background is transparent for hit detection
    const oldClearColor = new THREE.Color();
    renderer.getClearColor(oldClearColor);
    const oldClearAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);

    // Pass 1: Position
    scene.overrideMaterial = this.positionMaterial;
    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(this.renderTarget, 0, 0, 1, 1, this.pixelBuffer);

    const point = new THREE.Vector3(this.pixelBuffer[0], this.pixelBuffer[1], this.pixelBuffer[2]);
    const hit = this.pixelBuffer[3] > 0.5;

    let result: { point: THREE.Vector3; normal: THREE.Vector3 } | null = null;

    if (hit) {
      // Pass 2: Normal
      scene.overrideMaterial = this.normalMaterial;
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(this.renderTarget, 0, 0, 1, 1, this.pixelBuffer);

      const normal = new THREE.Vector3(this.pixelBuffer[0], this.pixelBuffer[1], this.pixelBuffer[2]).normalize();
      result = { point, normal };
    }

    // Reset camera offset
    if (oldOffset && oldOffset.enabled) {
      camera.setViewOffset(oldOffset.fullWidth, oldOffset.fullHeight, oldOffset.offsetX, oldOffset.offsetY, oldOffset.width, oldOffset.height);
    } else {
      camera.clearViewOffset();
    }

    // Need to trigger projection matrix update after clearing offset
    camera.updateProjectionMatrix();

    // Reset renderer
    scene.overrideMaterial = null;
    renderer.setRenderTarget(currentRenderTarget);
    renderer.setClearColor(oldClearColor, oldClearAlpha);

    return result;
  }

  public dispose() {
    this.renderTarget.dispose();
    this.positionMaterial.dispose();
    this.normalMaterial.dispose();
  }
}
