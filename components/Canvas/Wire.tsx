
import React from 'react';
import { Connection, CircuitNode } from '../../types';
import { COMPONENT_CONFIGS, NODE_WIDTH, NODE_HEIGHT } from '../../constants';
import { useCircuitStore } from '../../store';

interface WireProps {
  connection: Connection;
  sourceNode: CircuitNode;
  targetNode: CircuitNode;
}

const Wire: React.FC<WireProps> = ({ connection, sourceNode, targetNode }) => {
  const { removeConnection } = useCircuitStore();
  const sourceConfig = COMPONENT_CONFIGS[sourceNode.type];
  const targetConfig = COMPONENT_CONFIGS[targetNode.type];

  // Source Dims
  const sW = sourceConfig.width || NODE_WIDTH;
  const sH = sourceConfig.height || NODE_HEIGHT;
  const tH = targetConfig.height || NODE_HEIGHT;

  // Calculate Start Position (Right side of source)
  // Needs to account for multiple outputs now
  const outputIndex = connection.sourceOutputIndex || 0;
  let outputCount = 1;
  
  // Logic to determine output count matching LogicNode logic
  if (sourceNode.type === 'FULL_ADDER') outputCount = 2;
  else if (['REGISTER_4BIT', 'COUNTER_4BIT', 'DECODER_2TO4'].includes(sourceNode.type)) outputCount = 4;
  else if (sourceNode.type === 'ALU_4BIT') outputCount = 6;
  
  const sourceSpacing = sH / (outputCount + 1);
  const startX = sourceNode.position.x + sW;
  const startY = sourceNode.position.y + (outputIndex + 1) * sourceSpacing;

  // Calculate End Position (Left side of target)
  const inputCount = targetConfig.inputs;
  const spacing = tH / (inputCount + 1);
  const targetX = targetNode.position.x;
  const targetY = targetNode.position.y + (connection.targetInputIndex + 1) * spacing;

  const dist = Math.abs(targetX - startX) * 0.5;
  const controlPoint1X = startX + Math.max(dist, 50);
  const controlPoint1Y = startY;
  const controlPoint2X = targetX - Math.max(dist, 50);
  const controlPoint2Y = targetY;

  const pathData = `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${targetX} ${targetY}`;

  // Check state of specific output bit
  let isActive = sourceNode.state; // Default
  if (['FULL_ADDER', 'REGISTER_4BIT', 'COUNTER_4BIT', 'ALU_4BIT', 'DECODER_2TO4'].includes(sourceNode.type)) {
      isActive = ((sourceNode.internalState || 0) >> outputIndex & 1) === 1;
  }

  const color = isActive ? '#4ade80' : '#475569';
  const glowColor = isActive ? '#22c55e' : 'transparent';

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeConnection(connection.id);
  };

  return (
    <g className="group">
      <path d={pathData} fill="none" stroke="transparent" strokeWidth="15" style={{ pointerEvents: 'stroke', cursor: 'pointer' }} onContextMenu={handleContextMenu}>
        <title>Right-click to remove wire</title>
      </path>
      {isActive && (
          <path d={pathData} fill="none" stroke={glowColor} strokeWidth="6" strokeOpacity="0.4" style={{ pointerEvents: 'none' }} />
      )}
      <path d={pathData} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" style={{ pointerEvents: 'none' }} className="transition-colors" />
    </g>
  );
};

export default Wire;
