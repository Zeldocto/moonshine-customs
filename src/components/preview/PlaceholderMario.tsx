import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { applySkinToModel } from './applySkin'
import type { SkinData } from '../../types/skin'

/**
 * Stand-in geometry until a real Mario + FLUDD model is dropped in (see
 * modelConfig.ts). Every mesh is tagged with `userData.skinSlot`, which is
 * exactly what applySkinToModel() looks for — so the placeholder and the real
 * model are driven by identical code.
 */
export function PlaceholderMario({ skin }: { skin: SkinData }) {
  const group = useRef<THREE.Group>(null)

  useLayoutEffect(() => {
    if (group.current) applySkinToModel(skin, group.current)
  }, [skin])

  const skinTone = '#f2c48d'

  return (
    <group ref={group} position={[0, -1.05, 0]}>
      {/* ---------------------------------------------------------- Mario */}
      {/* shoes */}
      {[-0.24, 0.24].map((x) => (
        <mesh key={`shoe${x}`} position={[x, 0.12, 0.06]} userData={{ skinSlot: 'mario_shoes' }} castShadow>
          <boxGeometry args={[0.34, 0.24, 0.5]} />
          <meshStandardMaterial roughness={0.55} />
        </mesh>
      ))}

      {/* legs / overalls */}
      <mesh position={[0, 0.62, 0]} userData={{ skinSlot: 'mario_overalls' }} castShadow>
        <capsuleGeometry args={[0.33, 0.5, 6, 18]} />
        <meshStandardMaterial roughness={0.6} />
      </mesh>

      {/* torso */}
      <mesh position={[0, 1.2, 0]} userData={{ skinSlot: 'mario_shirt' }} castShadow>
        <capsuleGeometry args={[0.36, 0.34, 6, 18]} />
        <meshStandardMaterial roughness={0.6} />
      </mesh>

      {/* bib straps read as overalls */}
      {[-0.16, 0.16].map((x) => (
        <mesh key={`bib${x}`} position={[x, 1.24, 0.3]} userData={{ skinSlot: 'mario_overalls' }}>
          <boxGeometry args={[0.12, 0.5, 0.12]} />
          <meshStandardMaterial roughness={0.6} />
        </mesh>
      ))}

      {/* shine emblem on the chest */}
      <mesh position={[0, 1.16, 0.36]} rotation={[0, 0, Math.PI / 5]} userData={{ skinSlot: 'mario_sunshine_shirt' }}>
        <torusGeometry args={[0.11, 0.045, 8, 5]} />
        <meshStandardMaterial roughness={0.35} metalness={0.15} />
      </mesh>

      {/* arms */}
      {[-0.46, 0.46].map((x) => (
        <mesh
          key={`arm${x}`}
          position={[x, 1.2, 0]}
          rotation={[0, 0, x < 0 ? 0.32 : -0.32]}
          userData={{ skinSlot: 'mario_shirt' }}
          castShadow
        >
          <capsuleGeometry args={[0.12, 0.36, 5, 12]} />
          <meshStandardMaterial roughness={0.6} />
        </mesh>
      ))}

      {/* gloves */}
      {[-0.58, 0.58].map((x) => (
        <mesh key={`glove${x}`} position={[x, 0.92, 0.02]} userData={{ skinSlot: 'mario_gloves' }} castShadow>
          <sphereGeometry args={[0.16, 18, 14]} />
          <meshStandardMaterial roughness={0.5} />
        </mesh>
      ))}

      {/* head */}
      <mesh position={[0, 1.78, 0]} castShadow>
        <sphereGeometry args={[0.34, 26, 20]} />
        <meshStandardMaterial color={skinTone} roughness={0.7} />
      </mesh>

      {/* nose */}
      <mesh position={[0, 1.74, 0.32]}>
        <sphereGeometry args={[0.1, 14, 12]} />
        <meshStandardMaterial color={skinTone} roughness={0.7} />
      </mesh>

      {/* sunglasses */}
      <mesh position={[0, 1.86, 0.29]} userData={{ skinSlot: 'mario_sunglasses' }}>
        <boxGeometry args={[0.5, 0.13, 0.14]} />
        <meshStandardMaterial roughness={0.25} metalness={0.3} />
      </mesh>

      {/* cap dome + brim */}
      <mesh position={[0, 1.94, -0.02]} userData={{ skinSlot: 'mario_cap' }} castShadow>
        <sphereGeometry args={[0.36, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.92, 0.26]} rotation={[0.18, 0, 0]} userData={{ skinSlot: 'mario_cap' }}>
        <cylinderGeometry args={[0.28, 0.28, 0.06, 20, 1, false, 0, Math.PI]} />
        <meshStandardMaterial roughness={0.55} />
      </mesh>

      {/* ---------------------------------------------------------- FLUDD */}
      <group position={[0, 1.24, -0.46]}>
        <mesh userData={{ skinSlot: 'fludd_paint' }} castShadow>
          <capsuleGeometry args={[0.3, 0.28, 6, 18]} />
          <meshStandardMaterial roughness={0.35} metalness={0.05} />
        </mesh>

        {/* eye lens */}
        <mesh position={[0, 0.16, -0.24]} userData={{ skinSlot: 'fludd_metal' }}>
          <sphereGeometry args={[0.16, 18, 14]} />
          <meshStandardMaterial roughness={0.2} metalness={0.6} />
        </mesh>

        {/* water tank */}
        <mesh position={[0, -0.08, -0.3]} rotation={[Math.PI / 2, 0, 0]} userData={{ skinSlot: 'fludd_model_tank' }}>
          <cylinderGeometry args={[0.2, 0.2, 0.4, 20]} />
          <meshStandardMaterial roughness={0.25} metalness={0.1} transparent opacity={0.92} />
        </mesh>

        {/* nozzles */}
        <mesh position={[-0.26, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ skinSlot: 'fludd_spray_nozzle' }}>
          <cylinderGeometry args={[0.09, 0.09, 0.26, 14]} />
          <meshStandardMaterial roughness={0.4} />
        </mesh>
        <mesh position={[0.26, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ skinSlot: 'fludd_hover_nozzle' }}>
          <cylinderGeometry args={[0.09, 0.09, 0.26, 14]} />
          <meshStandardMaterial roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.36, -0.16]} rotation={[Math.PI / 2, 0, 0]} userData={{ skinSlot: 'fludd_rocket_nozzle' }}>
          <cylinderGeometry args={[0.08, 0.08, 0.22, 14]} />
          <meshStandardMaterial roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.36, 0.16]} rotation={[Math.PI / 2, 0, 0]} userData={{ skinSlot: 'fludd_turbo_nozzle' }}>
          <cylinderGeometry args={[0.08, 0.08, 0.22, 14]} />
          <meshStandardMaterial roughness={0.4} />
        </mesh>

        {/* straps over the shoulders */}
        {[-0.24, 0.24].map((x) => (
          <mesh key={`strap${x}`} position={[x, 0.16, 0.34]} rotation={[0.5, 0, 0]} userData={{ skinSlot: 'fludd_straps' }}>
            <boxGeometry args={[0.13, 0.62, 0.07]} />
            <meshStandardMaterial roughness={0.7} />
          </mesh>
        ))}

        {/* spray */}
        <mesh position={[-0.26, -0.62, 0]} userData={{ skinSlot: 'fludd_water' }}>
          <coneGeometry args={[0.12, 0.4, 14, 1, true]} />
          <meshStandardMaterial roughness={0.1} transparent opacity={0.55} />
        </mesh>
        <mesh position={[-0.26, -0.86, 0]} userData={{ skinSlot: 'fludd_water_highlight' }}>
          <sphereGeometry args={[0.07, 12, 10]} />
          <meshStandardMaterial roughness={0.1} transparent opacity={0.7} />
        </mesh>
      </group>
    </group>
  )
}
