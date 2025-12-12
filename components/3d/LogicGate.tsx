import React, { useRef, useState } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { CircuitNode } from '../../types';
import { COMPONENT_CONFIGS } from '../../constants';
import { useCircuitStore } from '../../store';

interface LogicGateProps {
  node: CircuitNode;
}

const LogicGate: React.FC<LogicGateProps> = ({ node }) => {
  const { toggleSwitch, startWiring, completeWiring, selectNode, selectedNodeId, wiringSourceId, updatePosition } = useCircuitStore();
  const config = COMPONENT_CONFIGS[node.type];
  const isSelected = selectedNodeId === node.id;
  const isSource = wiringSourceId === node.id;

  const [hoveredInput, setHoveredInput] = useState<number | null>(null);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (node.type === 'SWITCH') {
      toggleSwitch(node.id);
    }
    selectNode(node.id);
  };

  const handleOutputClick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    startWiring(node.id);
  };

  const handleInputClick = (e: ThreeEvent<PointerEvent>, index: number) => {
    e.stopPropagation();
    completeWiring(node.id, index);
  };

  // Drag logic (simplified)
  // In a real app, use useDrag from @use-gesture/react or similar
  // For this demo, we'll use a simple click-to-move or key controls,
  // but let's implement basic ground-plane dragging if selected
  const planeIntersect = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  // Skipping full drag implementation to keep code concise, rely on property panel for fine tuning or add simple drag later.

  const baseColor = node.state ? '#10b981' : config.color;
  const glowIntensity = node.state ? 2 : 0;

  return (
    <group position={[node.position.x, node.position.y + 0.25, node.position.z]}>
      {/* Main Body */}
      <mesh
        onClick={handlePointerDown}
        scale={isSelected ? 1.1 : 1}
      >
        <boxGeometry args={[1, 0.5, 1]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.3}
          metalness={0.8}
          emissive={node.state ? baseColor : '#000000'}
          emissiveIntensity={node.type === 'LIGHT' && node.state ? 5 : 0.2}
        />
        {isSelected && (
           <lineSegments>
             <edgesGeometry args={[new THREE.BoxGeometry(1, 0.5, 1)]} />
             <lineBasicMaterial color="white" />
           </lineSegments>
        )}
      </mesh>

      {/* Label */}
      <Text
        position={[0, 0.3, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {config.label}
      </Text>

      {/* Inputs (Left Side -X) */}
      {Array.from({ length: config.inputs }).map((_, i) => {
        const spacing = 0.4;
        const zOffset = (i - (config.inputs - 1) / 2) * spacing;
        const isHovered = hoveredInput === i;

        return (
          <group key={`in-${i}`} position={[-0.6, 0, zOffset]}>
             {/* Hit Area */}
            <mesh
              onClick={(e) => handleInputClick(e, i)}
              onPointerOver={() => setHoveredInput(i)}
              onPointerOut={() => setHoveredInput(null)}
            >
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial
                color={isHovered ? 'white' : '#94a3b8'}
                emissive={wiringSourceId ? '#fbbf24' : '#000000'} // Highlight when dragging wire
                emissiveIntensity={wiringSourceId ? 1 : 0}
              />
            </mesh>
          </group>
        );
      })}

      {/* Output (Right Side +X) - Not for Lights */}
      {node.type !== 'LIGHT' && (
        <group position={[0.6, 0, 0]}>
          <mesh
            onClick={handleOutputClick}
            scale={isSource ? 1.5 : 1}
          >
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial
                color={isSource ? '#fbbf24' : '#94a3b8'}
                emissive={isSource ? '#fbbf24' : '#000000'}
                emissiveIntensity={1}
            />
          </mesh>
        </group>
      )}

      {/* Hover Info */}
      {isSelected && (
        <Html position={[0, 1, 0]} center pointerEvents="none">
            <div className="bg-black/80 text-white text-xs p-1 rounded whitespace-nowrap backdrop-blur-md">
                {config.description} <br/>
                State: {node.state ? 'ON' : 'OFF'}
            </div>
        </Html>
      )}
    </group>
  );
};

export default LogicGate;
