import React from 'react'
import { useGLTF } from '@react-three/drei'

export function Model(props: JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF('/MAIN_GTO_GROUND2.glb')

  return (
    <group {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/MAIN_GTO_GROUND2.glb')
