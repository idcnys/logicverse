import React, { useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useCircuitStore } from '../../store';
import LogicGate from './LogicGate';
import Wire from './Wire';
import { GRID_SIZE } from '../../constants';
import { NodeType } from '../../types';

// Component to handle raycasting for adding nodes on the grid
const GridInteractions = ({ isAdding, addType, resetAdd }: { isAdding: boolean, addType: NodeType | null, resetAdd: () => void }) => {
    const { addNode } = useCircuitStore();
    const planeRef = useRef<THREE.Mesh>(null);

    const handleClick = (e: any) => {
        if (!isAdding || !addType) return;
        e.stopPropagation();
        
        // Snap to grid
        const x = Math.round(e.point.x);
        const z = Math.round(e.point.z);
        
        addNode(addType, { x, y: 0, z });
        resetAdd();
    };

    return (
        <mesh 
            ref={planeRef} 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, -0.01, 0]} 
            visible={false}
            onClick={handleClick}
        >
            <planeGeometry args={[100, 100]} />
        </mesh>
    );
};

interface SceneProps {
    addingType: NodeType | null;
    setAddingType: (t: NodeType | null) => void;
}

const CircuitScene: React.FC<SceneProps> = ({ addingType, setAddingType }) => {
  const { nodes, connections, wiringSourceId } = useCircuitStore();

  return (
    <Canvas
      camera={{ position: [5, 10, 10], fov: 45 }}
      shadows
      dpr={[1, 2]}
    >
      <color attach="background" args={['#020617']} />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      <Environment preset="city" />

      {/* Controls */}
      <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.2} />

      {/* Objects */}
      <group>
        {nodes.map(node => (
          <LogicGate key={node.id} node={node} />
        ))}

        {connections.map(conn => {
          const source = nodes.find(n => n.id === conn.sourceNodeId);
          const target = nodes.find(n => n.id === conn.targetNodeId);
          if (!source || !target) return null;
          return (
            <Wire
              key={conn.id}
              connection={conn}
              sourceNode={source}
              targetNode={target}
            />
          );
        })}
        
        {/* Temporary wiring line could go here if we tracked mouse pos in 3D */}
      </group>

      {/* Environment */}
      <Grid
        position={[0, -0.01, 0]}
        args={[GRID_SIZE, GRID_SIZE]}
        cellColor="#1e293b"
        sectionColor="#334155"
        fadeDistance={20}
        cellSize={1}
        sectionSize={5}
      />
      <ContactShadows opacity={0.5} scale={20} blur={2} far={4} resolution={256} color="#000000" />
      
      <GridInteractions 
        isAdding={!!addingType} 
        addType={addingType} 
        resetAdd={() => setAddingType(null)} 
      />
    </Canvas>
  );
};

export default CircuitScene;