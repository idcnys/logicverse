import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Connection, CircuitNode } from '../../types';
import { COMPONENT_CONFIGS } from '../../constants';

interface WireProps {
  connection: Connection;
  sourceNode: CircuitNode;
  targetNode: CircuitNode;
}

const Wire: React.FC<WireProps> = ({ connection, sourceNode, targetNode }) => {
  // Calculate start position (Output side of source)
  // Output is usually on the Right (+X relative to node center)
  const startPos = new THREE.Vector3(
    sourceNode.position.x + 0.6,
    sourceNode.position.y,
    sourceNode.position.z || 0
  );

  // Calculate end position (Input side of target)
  // Inputs are on the Left (-X relative to node center)
  // We need to offset based on input index if there are multiple inputs
  const targetConfig = COMPONENT_CONFIGS[targetNode.type];
  const inputCount = targetConfig.inputs;
  const inputSpacing = 0.4;
  const yOffset = ((connection.targetInputIndex) - (inputCount - 1) / 2) * inputSpacing;

  const endPos = new THREE.Vector3(
    targetNode.position.x - 0.6,
    targetNode.position.y,
    (targetNode.position.z || 0) + yOffset // Distribute inputs along Z for horizontal layout or just check orientation
  );

  // Adjust Z for 3D logic: Let's assume nodes are flat on XZ plane.
  // Actually, standard logic diagram: Inputs Left, Outputs Right.
  // Let's modify:
  // Source Output: Right side (+X)
  // Target Input: Left side (-X)
  // To handle multiple inputs, we offset them along Z axis.

  // Create curve
  const curve = useMemo(() => {
    const mid1 = startPos.clone().add(new THREE.Vector3(1, 0, 0));
    const mid2 = endPos.clone().add(new THREE.Vector3(-1, 0, 0));
    return new THREE.CatmullRomCurve3([startPos, mid1, mid2, endPos]);
  }, [startPos, endPos]);

  // Color based on signal state (Active/High = Bright, Inactive/Low = Dark)
  const isActive = sourceNode.state;
  const color = isActive ? '#00ffcc' : '#334155';
  const emissive = isActive ? '#00ffcc' : '#000000';

  return (
    <mesh>
      <tubeGeometry args={[curve, 20, 0.05, 8, false]} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={isActive ? 2 : 0} toneMapped={false} />
    </mesh>
  );
};

export default Wire;