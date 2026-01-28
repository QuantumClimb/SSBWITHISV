import React, { useEffect, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import { useMaterialMonitor } from './MaterialsMonitor';

/**
 * Example: Ground Model with Material Monitoring
 * 
 * This demonstrates how to:
 * 1. Access and register materials from a model
 * 2. Monitor material changes
 * 3. Update material properties in real-time
 */

export interface GroundWithMonitorProps {
  onMaterialsReady?: (materials: string[]) => void;
  materialOverrides?: Record<string, any>;
  [key: string]: any;
}

export function GroundWithMonitor({
  onMaterialsReady,
  materialOverrides,
  ...props
}: GroundWithMonitorProps) {
  const { nodes, materials } = useGLTF('/Ground.glb') as any;
  const monitor = useMaterialMonitor();

  // Register all materials when model loads
  useEffect(() => {
    if (!materials) return;

    Object.entries(materials).forEach(([name, material]: [string, any]) => {
      const fullName = `ground_${name}`;
      monitor.register(fullName, material, {
        originalColor: material.color?.getHexString?.(),
        originalMetalness: material.metalness,
        originalRoughness: material.roughness,
      });
    });

    // Notify parent that materials are ready
    onMaterialsReady?.(Object.keys(materials).map(name => `ground_${name}`));

    // Apply any initial overrides
    if (materialOverrides) {
      Object.entries(materialOverrides).forEach(([name, overrides]: [string, any]) => {
        monitor.update(`ground_${name}`, overrides);
      });
    }

    console.log('🌍 Ground model materials registered');
  }, [materials, monitor, onMaterialsReady, materialOverrides]);

  return (
    <group {...props} dispose={null}>
      {/* Render all meshes with their materials */}
      {nodes.Plane014 && (
        <mesh geometry={nodes.Plane014.geometry} material={nodes.Plane014.material} />
      )}
      {nodes.Plane014_1 && (
        <mesh geometry={nodes.Plane014_1.geometry} material={materials['Material.119']} />
      )}
      {nodes.Plane014_2 && (
        <mesh geometry={nodes.Plane014_2.geometry} material={materials['Soil Ground']} />
      )}
    </group>
  );
}

/**
 * Hook for easy access to ground materials
 */
export function useGroundMaterials() {
  const monitor = useMaterialMonitor();

  return {
    setColor: (materialName: string, color: string) => {
      monitor.update(`ground_${materialName}`, { color });
    },
    setMetalness: (materialName: string, metalness: number) => {
      monitor.update(`ground_${materialName}`, { metalness });
    },
    setRoughness: (materialName: string, roughness: number) => {
      monitor.update(`ground_${materialName}`, { roughness });
    },
    reset: (materialName: string) => {
      monitor.reset(`ground_${materialName}`);
    },
    resetAll: () => {
      monitor.resetAll();
    },
    getMaterials: () => {
      const entries = monitor.list();
      return entries
        .filter(([name]) => name.startsWith('ground_'))
        .map(([name, config]) => ({
          name: name.replace('ground_', ''),
          ...config,
        }));
    },
  };
}
