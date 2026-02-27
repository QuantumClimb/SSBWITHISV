import * as THREE from 'three';

export type ModelPalette = {
  white: string;
  red: string;
  blue: string;
};

export type ShaderTheme = {
  sky: {
    tint: string;
    mistColor: string;
  };
  grass: {
    base: string;
  };
  ground: {
    dirt: string;
    sand: string;
  };
  model: ModelPalette;
  sun: {
    color: string;
  };
};

export const shaderTheme: ShaderTheme = {
  sky: {
    tint: '#e6f4ff',
    mistColor: '#87CEEB',
  },
  grass: {
    base: '#2e7d32',
  },
  ground: {
    dirt: '#8a5a2b',
    sand: '#d7b37a',
  },
  model: {
    white: '#f5f7ff',
    red: '#d7323f',
    blue: '#3465d9',
  },
  sun: {
    color: '#ffffff',
  },
};

const getPaletteEntries = (palette: ModelPalette) => {
  return [
    new THREE.Color(palette.white),
    new THREE.Color(palette.red),
    new THREE.Color(palette.blue),
  ];
};

export const nearestPaletteColor = (source: THREE.Color, palette: ModelPalette): THREE.Color => {
  const entries = getPaletteEntries(palette);
  let winner = entries[0];
  let minDistance = Number.POSITIVE_INFINITY;

  for (const candidate of entries) {
    const dr = source.r - candidate.r;
    const dg = source.g - candidate.g;
    const db = source.b - candidate.b;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < minDistance) {
      minDistance = distance;
      winner = candidate;
    }
  }

  return winner.clone();
};
