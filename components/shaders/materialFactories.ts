import * as THREE from 'three';
import { shaderTheme } from './globalShaderTheme';

const hashNoise = (x: number, y: number) => {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const mixColor = (a: THREE.Color, b: THREE.Color, t: number) => {
  return new THREE.Color(
    a.r * (1 - t) + b.r * t,
    a.g * (1 - t) + b.g * t,
    a.b * (1 - t) + b.b * t
  );
};

export const createGroundBlendTexture = (size = 256): THREE.DataTexture => {
  const dirt = new THREE.Color(shaderTheme.ground.dirt);
  const sand = new THREE.Color(shaderTheme.ground.sand);
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const uvx = x / size;
      const uvy = y / size;
      const n0 = hashNoise(uvx * 12, uvy * 12);
      const n1 = hashNoise(uvx * 31 + 11, uvy * 31 + 17);
      const amount = THREE.MathUtils.clamp(n0 * 0.7 + n1 * 0.3, 0, 1);
      const c = mixColor(sand, dirt, amount);
      const index = (y * size + x) * 4;
      data[index] = Math.round(c.r * 255);
      data[index + 1] = Math.round(c.g * 255);
      data[index + 2] = Math.round(c.b * 255);
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

export const createSkyMaterial = (map: THREE.Texture | null) => {
  return new THREE.MeshBasicMaterial({
    map,
    color: new THREE.Color(shaderTheme.sky.tint),
    side: THREE.BackSide,
  });
};

export const createGroundMaterial = (map: THREE.Texture) => {
  return new THREE.MeshStandardMaterial({
    map,
    roughness: 0.95,
    metalness: 0,
  });
};
