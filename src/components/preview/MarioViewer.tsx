import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import type * as THREE from 'three'
import { PlaceholderMario } from './PlaceholderMario'
import { GltfMario } from './GltfMario'
import { MARIO_MODEL_URL } from './modelConfig'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import type { SkinData } from '../../types/skin'

/** Gentle idle bob. Skipped entirely when the visitor asks for less motion. */
function Idle({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!enabled || !group.current) return
    group.current.position.y = Math.sin(clock.elapsedTime * 1.4) * 0.045
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.014
  })
  return <group ref={group}>{children}</group>
}

export interface MarioViewerProps {
  skin: SkinData
  /** Larger view on the detail page gets a slightly wider frame. */
  height?: number
  interactive?: boolean
}

export default function MarioViewer({ skin, height = 320, interactive = true }: MarioViewerProps) {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <div
      style={{ height }}
      className="w-full touch-pan-y rounded-chip bg-gradient-to-b from-[#DFF3F5] to-[#F6E7C8]"
    >
      <Canvas
        shadows
        camera={{ position: [0, 0.5, 4.2], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 5, 4]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#9ad8e6" />

        <Suspense fallback={null}>
          <Idle enabled={!reducedMotion}>
            {MARIO_MODEL_URL ? (
              <GltfMario url={MARIO_MODEL_URL} skin={skin} />
            ) : (
              <PlaceholderMario skin={skin} />
            )}
          </Idle>
          <ContactShadows position={[0, -1.08, 0]} opacity={0.32} scale={7} blur={2.6} far={3} />
          <Environment preset="park" />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom={interactive}
          enableRotate={interactive}
          minDistance={2.4}
          maxDistance={7}
          minPolarAngle={0.45}
          maxPolarAngle={Math.PI / 1.85}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.9}
          makeDefault
        />
      </Canvas>
    </div>
  )
}
