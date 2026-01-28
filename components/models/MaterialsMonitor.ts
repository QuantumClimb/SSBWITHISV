import * as THREE from 'three';

export interface MaterialConfig {
  name: string;
  originalColor?: string;
  originalMetalness?: number;
  originalRoughness?: number;
  originalEmissive?: string;
  [key: string]: any;
}

export class MaterialsMonitor {
  private materialsMap: Map<string, THREE.Material> = new Map();
  private configs: Map<string, MaterialConfig> = new Map();

  /**
   * Register a material for monitoring
   */
  registerMaterial(name: string, material: THREE.Material, config?: MaterialConfig) {
    this.materialsMap.set(name, material);
    
    const defaultConfig: MaterialConfig = {
      name,
      originalColor: (material as any).color?.getHexString?.(),
      originalMetalness: (material as any).metalness,
      originalRoughness: (material as any).roughness,
      originalEmissive: (material as any).emissive?.getHexString?.(),
    };

    this.configs.set(name, { ...defaultConfig, ...config });
    
    console.log(`📊 Material registered: ${name}`, this.configs.get(name));
  }

  /**
   * Update a material's properties
   */
  updateMaterial(name: string, updates: Partial<MaterialConfig>) {
    const material = this.materialsMap.get(name);
    const config = this.configs.get(name);

    if (!material || !config) {
      console.warn(`⚠️ Material not found: ${name}`);
      return;
    }

    if (updates.color && 'color' in material) {
      (material as any).color.set(updates.color);
    }
    if (updates.metalness !== undefined && 'metalness' in material) {
      (material as any).metalness = updates.metalness;
    }
    if (updates.roughness !== undefined && 'roughness' in material) {
      (material as any).roughness = updates.roughness;
    }
    if (updates.emissive && 'emissive' in material) {
      (material as any).emissive.set(updates.emissive);
    }

    (material as any).needsUpdate = true;
    Object.assign(config, updates);

    console.log(`✏️ Material updated: ${name}`, updates);
  }

  /**
   * Get material info
   */
  getMaterial(name: string) {
    return this.materialsMap.get(name);
  }

  /**
   * Get material config
   */
  getConfig(name: string) {
    return this.configs.get(name);
  }

  /**
   * List all registered materials
   */
  listMaterials() {
    console.log('📋 Registered Materials:');
    this.configs.forEach((config, name) => {
      console.log(`  • ${name}`, config);
    });
    return Array.from(this.configs.entries());
  }

  /**
   * Reset material to original state
   */
  resetMaterial(name: string) {
    const config = this.configs.get(name);
    if (!config) {
      console.warn(`⚠️ Config not found: ${name}`);
      return;
    }

    const updates: Partial<MaterialConfig> = {};
    if (config.originalColor) updates.color = config.originalColor;
    if (config.originalMetalness !== undefined) updates.metalness = config.originalMetalness;
    if (config.originalRoughness !== undefined) updates.roughness = config.originalRoughness;
    if (config.originalEmissive) updates.emissive = config.originalEmissive;

    this.updateMaterial(name, updates);
    console.log(`🔄 Material reset: ${name}`);
  }

  /**
   * Reset all materials to original state
   */
  resetAll() {
    this.materialsMap.forEach((_, name) => {
      this.resetMaterial(name);
    });
  }

  /**
   * Get all materials for a model
   */
  getModelMaterials(modelName: string) {
    const materials: [string, THREE.Material][] = [];
    this.materialsMap.forEach((material, name) => {
      if (name.startsWith(modelName)) {
        materials.push([name, material]);
      }
    });
    return materials;
  }
}

// Global instance
export const materialsMonitor = new MaterialsMonitor();

// Type-safe material hook helper
export function useMaterialMonitor() {
  return {
    register: (name: string, material: THREE.Material, config?: MaterialConfig) =>
      materialsMonitor.registerMaterial(name, material, config),
    update: (name: string, updates: Partial<MaterialConfig>) =>
      materialsMonitor.updateMaterial(name, updates),
    get: (name: string) => materialsMonitor.getMaterial(name),
    getConfig: (name: string) => materialsMonitor.getConfig(name),
    list: () => materialsMonitor.listMaterials(),
    reset: (name: string) => materialsMonitor.resetMaterial(name),
    resetAll: () => materialsMonitor.resetAll(),
  };
}
