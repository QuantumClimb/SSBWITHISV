
import * as THREE from 'three'
import React from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    [key: string]: THREE.Mesh
  }
  materials: {
    [key: string]: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial
  }
}

export function Model(props: any) {
  const { nodes, materials } = useGLTF('/FINAL_GROUND.glb') as unknown as GLTFResult
  
  // Custom textures provided by the user
  const rockTexture = useTexture('/rock.jpg')
  const grassTexture = useTexture('/grass.jpg')
  const concreteTexture = useTexture('/concrete.jpg')

  // Configure textures (flipY, wrapping etc if needed)
  ;[rockTexture, grassTexture, concreteTexture].forEach(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.flipY = false
  })

  // Specific tiling adjustments
  rockTexture.repeat.set(4, 4)
  grassTexture.repeat.set(8, 8)
  concreteTexture.repeat.set(6, 6)

  return (
    <group {...props} dispose={null}>
      <group position={[0.599, 1.472, -6.877]} rotation={[0, -0.04, 0]}>
        {Object.entries(nodes).map(([name, node]) => {
          // Robust check: ensure it's a mesh and has geometry
          const mesh = node as THREE.Mesh
          if (!mesh || !mesh.isMesh || !mesh.geometry) return null
          
          // Get the original material
          const materialRef = mesh.material
          if (!materialRef) {
            return (
              <mesh 
                key={name}
                geometry={mesh.geometry} 
                castShadow 
                receiveShadow
              />
            )
          }

          // Handle array of materials or single material
          let material = Array.isArray(materialRef) ? materialRef[0] : materialRef
          const stdMat = material as THREE.MeshStandardMaterial

          // Manual Mapping based on user instructions:
          // "Material 008 is the rock THe object is called RockN, Concreate and grass are for the zones"
          if (stdMat && stdMat.name === 'Material.008' || name.includes('RockN')) {
            const rockMat = stdMat.clone()
            rockMat.map = rockTexture
            rockMat.name = 'ROCK_OVERRIDE'
            material = rockMat
          } else if (stdMat && stdMat.name === 'CONCRETE') {
            const concMat = stdMat.clone()
            concMat.map = concreteTexture
            concMat.name = 'CONCRETE_OVERRIDE'
            material = concMat
          } else if (stdMat && (stdMat.name === 'GRASS' || stdMat.name === 'Grass')) {
            const grassMat = stdMat.clone()
            grassMat.map = grassTexture
            grassMat.name = 'GRASS_OVERRIDE'
            material = grassMat
          }

          return (
            <mesh 
              key={name}
              geometry={mesh.geometry} 
              material={material} 
              castShadow 
              receiveShadow
            />
          )
        })}
      </group>
    </group>
  )
}

useGLTF.preload('/FINAL_GROUND.glb')
