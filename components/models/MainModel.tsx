
import React from 'react'
import * as THREE from 'three'
import { useGLTF, useTexture } from '@react-three/drei'
import { GLTF } from 'three-stdlib'
import { ThreeElements } from '@react-three/fiber'

type GLTFResult = GLTF & {
  nodes: any
  materials: any
}

interface MainModelProps extends Partial<ThreeElements['group']> {
  onTargetsUpdate?: (targets: Record<string, [number, number, number]>) => void;
}

export function MainModel({ onTargetsUpdate, ...props }: MainModelProps) {
  const { scene } = useGLTF('/FINAL_GROUND.glb') as unknown as GLTFResult
  
  // Custom textures provided by the user
  const rockTexture = useTexture('/rock.jpg')
  const grassTexture = useTexture('/grass.jpg')
  const concreteTexture = useTexture('/concrete.jpg')
  const sandTexture = useTexture('/Sand.jpg')
  const signboardTexture = useTexture('/signboard.jpg')
  const topNewTexture = useTexture('/TOPNEW.jpg')
  const gtoTexture = useTexture('/The GTO.jpg')

  // Configure textures
  React.useEffect(() => {
    // Only apply heavy repetition to sand as requested for tiling
    if (sandTexture) {
      sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping
      sandTexture.repeat.set(10, 10)
    }
    if (gtoTexture) {
      // Flip vertically: repeat.y = -1 and offset.y = 1
      gtoTexture.repeat.y = -1
      gtoTexture.offset.y = 1
    }
    if (signboardTexture) {
      signboardTexture.repeat.y = -1
      signboardTexture.offset.y = 1
    }
    // Other textures (grass, rock, etc.) use their default or native mapping
  }, [rockTexture, grassTexture, concreteTexture, sandTexture, signboardTexture, topNewTexture, gtoTexture])

  // Traverse the scene graph to apply material overrides and calculate markers
  const { markers, minimapTargets } = React.useMemo(() => {
    const { scene, materials } = useGLTF('/FINAL_GROUND.glb') as unknown as GLTFResult
    const drySandMaterial = materials['Dry Sand']
    const beachMaterial = materials['BEACH']

    // 0. Global Material Configuration
    if (beachMaterial && topNewTexture) {
      beachMaterial.map = topNewTexture
      // Rotate texture 180 degrees as requested
      topNewTexture.center.set(0.5, 0.5)
      topNewTexture.rotation = Math.PI
    }
    
    const groups: Map<string, THREE.Box3> = new Map()
    const singulars: Map<string, THREE.Vector3> = new Map()
    const miniGroups: Map<string, THREE.Box3> = new Map()
    
    scene.traverse((object) => {
      const name = object.name.toUpperCase()
      
      // 1. Keyword-based Material Mapping (Mesh only)
      if (object instanceof THREE.Mesh) {
        object.castShadow = true
        object.receiveShadow = true
        
        const stdMat = object.material as THREE.MeshStandardMaterial
        const matName = stdMat?.name?.toLowerCase() || ''

        if (matName.includes('rock') || name.toLowerCase().includes('rock') || matName.includes('rock1') || matName.includes('rock2')) {
          const m = stdMat.clone()
          m.map = rockTexture
          m.name = 'ROCK_OVERRIDE'
          object.material = m
        } else if (matName.includes('sand') || name.toLowerCase().includes('sand')) {
          if (drySandMaterial) {
            object.material = drySandMaterial
            // Map the custom sand.jpg to the Dry Sand material
            if (sandTexture) {
              drySandMaterial.map = sandTexture
              sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping
              sandTexture.repeat.set(10, 10)
            }
          } else {
            const m = stdMat.clone()
            m.map = sandTexture
            m.name = 'SAND_OVERRIDE'
            object.material = m
          }
        } else if (stdMat?.name === 'CONCRETE') {
          const m = stdMat.clone()
          m.map = concreteTexture
          m.color.set('#a68b77') 
          m.name = 'CONCRETE_BROWN_OVERRIDE'
          object.material = m
        } else if (matName === 'concrete') {
          const m = stdMat.clone()
          m.map = concreteTexture
          m.name = 'CONCRETE_WHITE_OVERRIDE'
          object.material = m
        } else if (matName.includes('grass') || name.toLowerCase().includes('grass')) {
          const m = new THREE.MeshStandardMaterial({ 
            color: '#2d5a27', 
            roughness: 0.8, 
            metalness: 0.1 
          })
          m.name = 'GRASS_GREEN_OVERRIDE'
          object.material = m
        } else if (matName.includes('signage') || matName.includes('logo') || matName.includes('topic')) {
          const updateMat = (mat: any) => {
            if (mat && (mat.name.toLowerCase().includes('signage') || mat.name.toLowerCase().includes('logo') || mat.name.toLowerCase().includes('topic'))) {
              const m = mat.clone();
              m.map = mat.name.toLowerCase().includes('gtopic') ? gtoTexture : signboardTexture;
              if (m.map) m.map.flipY = true;
              m.name = mat.name.toLowerCase().includes('gtopic') ? 'GOTO_OVERRIDE' : 'SIGNBOARD_OVERRIDE';
              m.needsUpdate = true;
              return m;
            }
            return mat;
          };

          if (Array.isArray(object.material)) {
            object.material = object.material.map(updateMat);
          } else {
            object.material = updateMat(object.material);
          }
        } else if (name === 'GROUND' || matName.includes('beach')) {
          if (beachMaterial) {
            object.material = beachMaterial
          } else {
            const m = stdMat.clone()
            m.map = topNewTexture
            if (topNewTexture) {
              topNewTexture.center.set(0.5, 0.5)
              topNewTexture.rotation = Math.PI
            }
            m.name = 'BEACH_FALLBACK_OVERRIDE'
            object.material = m
          }
        } else if (name.includes('TOPNEW') || matName.includes('topnew')) {
          const m = stdMat.clone()
          m.map = topNewTexture
          m.name = 'TOPNEW_OVERRIDE'
          object.material = m
        }
      }

      // 2. Identify Target Groups/Singulars for Markers & Minimap
      const isPGTIndex = name.match(/^PGT(_GRID)?_?\d*/)
      const isCTIndex = name.match(/^CT(_GRID)?_?\d*/)
      const isPGTNew = name === 'PGT_NEW_GRID' || name === 'PGT_GROUND'
      const isHGTZone = name === 'HGT_ZONE'
      
      if (isPGTIndex || isCTIndex || isPGTNew || isHGTZone) {
        const pos = new THREE.Vector3()
        object.getWorldPosition(pos)
        if (object instanceof THREE.Mesh) {
          const box = new THREE.Box3().setFromObject(object)
          box.getCenter(pos)
        }
        singulars.set(`${name}_${object.uuid}`, pos)
      }

      // 3. Parent-level aggregation
      let prefix = ''
      if (name.startsWith('CT_GRID')) prefix = 'CT_GRID'
      else if (name.startsWith('PGT_GRID') || name.startsWith('PGT_GROUND') || name.includes('PGT_NEW')) prefix = 'PGT_GRID'
      else if (name === 'GROUP_GRASS' || name.includes('L_GRID')) prefix = 'L_GRID'

      let miniPrefix = ''
      if (name.startsWith('HGT_ZONE') || name.startsWith('HGT_GROUND') || name.startsWith('HGT_PLACE') || name.match(/^HGT\d+/)) miniPrefix = 'HGT'
      else if (name.startsWith('FGT_PLACE') || name.startsWith('FGT_GROUND') || name.match(/^FGT\d+/) || name === 'FINAL_GROUND') miniPrefix = 'FGT'
      else if (name.match(/^S\d+/)) miniPrefix = 'INDIVIDUAL OBSTACLES'
      else if (name.includes('GROUP_OBSTACLES') || name.includes('GROUP_OBSTACLE')) miniPrefix = 'GROUP OBSTACLE RACE'

      const updateBox = (map: Map<string, THREE.Box3>, key: string) => {
        // Only aggregate meshes for accurate physical centers
        if (!(object instanceof THREE.Mesh)) return;
        
        const box = new THREE.Box3().setFromObject(object)
        if (!map.has(key)) map.set(key, box)
        else map.get(key)!.union(box)
      }

      if (prefix) updateBox(groups, prefix)
      if (miniPrefix) updateBox(miniGroups, miniPrefix)
    })

    const finalMarkers: { pos: [number, number, number]; name: string; color: string }[] = []
    groups.forEach((box, groupName) => {
      const center = new THREE.Vector3()
      box.getCenter(center)
      finalMarkers.push({ pos: [center.x, center.y, center.z], name: groupName, color: '#ffeb3b' })
    })
    singulars.forEach((pos, objName) => {
      finalMarkers.push({ pos: [pos.x, pos.y, pos.z], name: objName, color: '#ffeb3b' })
    })

    const targets: Record<string, [number, number, number]> = {}
    miniGroups.forEach((box, key) => {
      const center = new THREE.Vector3()
      box.getCenter(center)
      targets[key] = [center.x, center.y, center.z]
    })
    groups.forEach((box, key) => {
      const center = new THREE.Vector3()
      box.getCenter(center)
      const label = key === 'L_GRID' ? 'GROUP GRASS' : key.replace('_GRID', '')
      targets[label] = [center.x, center.y, center.z]
    })

    return { markers: finalMarkers, minimapTargets: targets }
  }, [scene, rockTexture, grassTexture, concreteTexture, sandTexture, signboardTexture, topNewTexture])

  React.useEffect(() => {
    if (onTargetsUpdate && Object.keys(minimapTargets).length > 0) {
      onTargetsUpdate(minimapTargets)
    }
  }, [minimapTargets, onTargetsUpdate])

  return (
    <group {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}
