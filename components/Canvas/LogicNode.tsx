
import React, { useState, useEffect } from 'react';
import { CircuitNode } from '../../types';
import { COMPONENT_CONFIGS, NODE_WIDTH, NODE_HEIGHT, PORT_RADIUS } from '../../constants';
import { useCircuitStore } from '../../store';

interface LogicNodeProps {
  node: CircuitNode;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
}

const LogicNode: React.FC<LogicNodeProps> = ({ node, onMouseDown }) => {
  const { toggleSwitch, setNodeState, startWiring, completeWiring, selectedNodeIds, wiringSourceId, updatePosition, nodes, setNodes } = useCircuitStore();
  const config = COMPONENT_CONFIGS[node.type];
  const isSelected = selectedNodeIds.includes(node.id);
  
  const width = node.subCircuit?.width || config.width || NODE_WIDTH;
  const height = node.subCircuit?.height || config.height || NODE_HEIGHT;
  
  const [labelText, setLabelText] = useState(node.label || config.label);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  
  // Update local state if node label changes externally
  useEffect(() => {
      setLabelText(node.label || config.label);
  }, [node.label, config.label]);

  const handlePortClick = (e: React.MouseEvent, isOutput: boolean, index: number = 0) => {
    e.stopPropagation();
    if (isOutput) {
        startWiring(node.id, index);
    } else {
        completeWiring(node.id, index);
    }
  };

  // General interaction handler (Double Click mostly)
  const handleBodyInteraction = (e: React.MouseEvent) => {
     // Prevent triggering if editing label
     if (isEditingLabel) return;

     if (node.type === 'SWITCH' || node.type === 'CUSTOM_INPUT') {
        toggleSwitch(node.id);
     } else if (node.type === 'LABEL' || node.type === 'CUSTOM_OUTPUT') {
         setIsEditingLabel(true);
     }
  };

  // Specific handler for momentary buttons (Mouse Down)
  const handleButtonPress = (e: React.MouseEvent) => {
      if (node.type === 'BUTTON') {
          e.stopPropagation(); // Buttons consume drag to allow pressing
          setNodeState(node.id, true);
      } else if (node.type === 'GAMEPAD') {
          // Gamepad handles its own parts
      }
  };

  const handleButtonRelease = (e: React.MouseEvent) => {
      if (node.type === 'BUTTON') {
          setNodeState(node.id, false);
      }
  }

  const handleLabelEditStart = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditingLabel(true);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      if (node.type === 'HIGH' || node.type === 'LOW') {
          e.preventDefault();
          e.stopPropagation();
          setNodeState(node.id, !node.state);
      }
  };

  const handleLabelSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setIsEditingLabel(false);
      // Update node label in store
      setNodes(prev => prev.map(n => n.id === node.id ? { ...n, label: labelText } : n));
  };

  // --- PORT GENERATION LOGIC ---
  const getInputPorts = () => {
      if (node.type === 'CUSTOM_IC' && node.subCircuit) {
          const count = node.subCircuit.inputMap.length;
          const spacing = height / (count + 1);
          return node.subCircuit.inputMap.map((map, i) => ({
              x: 0,
              y: (i + 1) * spacing,
              index: i,
              label: map.label || `In ${i}`
          }));
      }

      if (node.type === 'CUSTOM_INPUT') return []; // No inputs for Input Terminal

      const count = config.inputs;
      const spacing = height / (count + 1);
      return Array.from({ length: count }).map((_, i) => {
          let label = null;
          if (node.type === 'FULL_ADDER') label = ['A', 'B', 'Cin'][i];
          if (node.type === 'REGISTER_4BIT') label = i < 4 ? `D${i}` : ['Ld', 'Clk', 'Clr'][i - 4];
          if (node.type === 'COUNTER_4BIT') label = ['Clk', 'Rst', 'En'][i];
          if (node.type === 'ALU_4BIT') {
              if (i < 4) label = `A${i}`;
              else if (i < 8) label = `B${i-4}`;
              else if (i < 10) label = `Op${i-8}`;
              else label = 'Cin';
          }
          if (node.type === 'DECODER_2TO4') label = i < 2 ? `A${i}` : 'En';
          if (node.type === 'RAM_16X1' || node.type === 'MATRIX_DISPLAY') {
             if (node.type === 'RAM_16X1') {
                 if (i <= 3) label = `A${i}`; else if (i === 4) label = 'D'; else if (i === 5) label = 'WE'; else if (i === 6) label = '>';
             } else {
                 if (i <= 3) label = `X${i}`; else if (i <= 7) label = `Y${i-4}`; else if (i === 8) label = 'D'; else if (i === 9) label = 'WE'; else if (i === 10) label = '>';
             }
          }
          if (node.type === 'D_FLIP_FLOP') label = i === 0 ? '>' : 'D';
          if (node.type === 'TRANSISTOR_NPN') label = i === 0 ? 'C' : 'B';
          if (node.type === 'TRANSISTOR_PNP') label = i === 0 ? 'E' : 'B';
          if (node.type === 'D_LATCH') label = i === 0 ? 'En' : 'D';
          if (node.type === 'CUSTOM_OUTPUT') label = '';

          return { x: 0, y: (i + 1) * spacing, index: i, label };
      });
  };

  const getOutputPorts = () => {
      if (node.type === 'CUSTOM_IC' && node.subCircuit) {
          const count = node.subCircuit.outputMap.length;
          const spacing = height / (count + 1);
          return node.subCircuit.outputMap.map((map, i) => ({
              i,
              l: map.label || `Out ${i}`
          }));
      }

      if (node.type === 'CUSTOM_OUTPUT') return []; // No outputs for Output Terminal
      
      if (node.type === 'CUSTOM_INPUT') return [{ i: 0, l: '' }]; // 1 Output for Input Terminal

      if (config.category === 'Output' || config.category === 'Tools') {
          if (node.type === 'GAMEPAD') {
              return [
                  {i:0, l:'U'}, {i:1, l:'D'}, {i:2, l:'L'}, {i:3, l:'R'}, {i:4, l:'A'}, {i:5, l:'B'}
              ];
          }
          // Junction has 1 output
          if (node.type === 'JUNCTION') {
              return [{ i: 0, l: '' }];
          }
          return [];
      }
      
      if (node.type === 'FULL_ADDER') return [{i:0, l:'Sum'}, {i:1, l:'Cout'}];
      if (node.type === 'REGISTER_4BIT' || node.type === 'COUNTER_4BIT') {
          return Array.from({length:4}).map((_,i) => ({i, l:`Q${i}`}));
      }
      if (node.type === 'DECODER_2TO4') {
          return Array.from({length:4}).map((_,i) => ({i, l:`Y${i}`}));
      }
      if (node.type === 'ALU_4BIT') {
          const main = Array.from({length:4}).map((_,i) => ({i, l:`Q${i}`}));
          return [...main, {i:4, l:'Z'}, {i:5, l:'C'}];
      }
      return [{ i: 0, l: '' }];
  };

  const inputPorts = getInputPorts();
  const outputPorts = getOutputPorts();

  const isHighOrLow = node.type === 'HIGH' || node.type === 'LOW';
  const bodyColor = node.state ? '#10b981' : (isHighOrLow ? '#64748b' : config.color);
  const strokeColor = isSelected ? 'white' : 'transparent';
  
  const renderContent = () => {
      if (node.type === 'JUNCTION') {
          return (
              <g>
                   <circle cx={width/2} cy={height/2} r={8} fill={node.state ? '#4ade80' : '#94a3b8'} stroke={strokeColor} strokeWidth={2} />
              </g>
          );
      }

      if (node.type === 'CUSTOM_IC') {
           return (
              <g>
                  <rect width={width} height={height} rx={4} fill="#334155" stroke={strokeColor} strokeWidth={2} />
                  <path d={`M 0 15 L ${width} 15`} stroke="#475569" strokeWidth={1} />
                  <rect x={0} y={0} width={width} height={15} fill="#1e293b" rx={4} />
                  <text x={width/2} y={11} textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">{node.label}</text>
                  <text x={width/2} y={height/2} textAnchor="middle" fill="#64748b" fontSize="8" dominantBaseline="middle">CHIP</text>
              </g>
           )
      }
      
      if (node.type === 'CUSTOM_INPUT' || node.type === 'CUSTOM_OUTPUT') {
          // Purple/Pink Terminal Box
          const isInput = node.type === 'CUSTOM_INPUT';
          const bg = isInput ? '#4c1d95' : '#831843'; // Darker shade of config color
          const border = config.color;
          
          return (
              <g>
                  <rect width={width} height={height} rx={4} fill={bg} stroke={strokeColor || border} strokeWidth={2} />
                  
                  {/* Label Area - Double Click to Edit */}
                  <foreignObject width={width} height={height} onDoubleClick={handleLabelEditStart} style={{pointerEvents: 'all'}}>
                     <div className="w-full h-full flex items-center justify-center p-1">
                         {isEditingLabel ? (
                             <form onSubmit={handleLabelSubmit} className="w-full">
                                 <input autoFocus value={labelText} onChange={(e) => setLabelText(e.target.value)} onBlur={handleLabelSubmit} className="w-full bg-black/50 text-white text-center text-[10px] outline-none rounded" />
                             </form>
                         ) : (
                             <div className="text-white font-bold text-center text-[10px] leading-tight break-all cursor-text pointer-events-none">{labelText}</div>
                         )}
                     </div>
                 </foreignObject>
                 
                 {/* Status Indicator */}
                 {isInput && (
                    <circle cx={width/2} cy={height} r={3} fill={node.state ? '#4ade80' : '#333'} />
                 )}
                 {!isInput && (
                    <circle cx={width/2} cy={0} r={3} fill={node.inputs?.[0] ? '#4ade80' : '#333'} />
                 )}
              </g>
          );
      }

      if (node.type === 'MATRIX_DISPLAY') {
          const memory = node.memory || new Array(256).fill(false);
          return (
              <g>
                  <rect width={width} height={height} rx={4} fill="#000" stroke={strokeColor} strokeWidth={2} />
                  <g transform="translate(16, 16)">
                    {Array.from({ length: 256 }).map((_, i) => (
                        <rect key={i} x={(i % 16) * 8} y={Math.floor(i / 16) * 8} width={7} height={7} 
                              fill={memory[i] ? '#22c55e' : '#112211'} />
                    ))}
                  </g>
                  <text x={width/2} y={12} textAnchor="middle" fill="#666" fontSize="9" fontWeight="bold">MATRIX 16x16</text>
              </g>
          );
      }

      if (node.type === 'GAMEPAD') {
          const val = node.internalState || 0;
          const isPressed = (idx: number) => (val >> idx) & 1;
          
          return (
              <g>
                   <rect width={width} height={height} rx={16} fill="#1e293b" stroke={strokeColor} strokeWidth={2} />
                   {/* D-Pad */}
                   <path d="M 30 25 h 20 v 20 h -20 z" fill={isPressed(0)?'#6366f1':'#334155'} className="cursor-pointer hover:opacity-80" 
                         onMouseDown={(e) => { e.stopPropagation(); (window as any).setGamepadState?.(node.id, val | 1); }} 
                         onMouseUp={(e) => { e.stopPropagation(); (window as any).setGamepadState?.(node.id, val & ~1); }} /> {/* Up */}
                   <path d="M 30 55 h 20 v 20 h -20 z" fill={isPressed(1)?'#6366f1':'#334155'} className="cursor-pointer hover:opacity-80"
                         onMouseDown={(e) => { e.stopPropagation(); (window as any).setGamepadState?.(node.id, val | 2); }} 
                         onMouseUp={(e) => { e.stopPropagation(); (window as any).setGamepadState?.(node.id, val & ~2); }} /> {/* Down */}
                   <path d="M 10 45 h 20 v 20 h -20 z" fill={isPressed(2)?'#6366f1':'#334155'} className="cursor-pointer hover:opacity-80"
                         onMouseDown={(e) => { e.stopPropagation(); (window as any).setGamepadState?.(node.id, val | 4); }} 
                         onMouseUp={(e) => { e.stopPropagation(); (window as any).setGamepadState?.(node.id, val & ~4); }} /> {/* Left */}
                   <path d="M 50 45 h 20 v 20 h -20 z" fill={isPressed(3)?'#6366f1':'#334155'} className="cursor-pointer hover:opacity-80"
                         onMouseDown={(e) => { e.stopPropagation(); (window as any).setGamepadState?.(node.id, val | 8); }} 
                         onMouseUp={(e) => { e.stopPropagation(); (window as any).setGamepadState?.(node.id, val & ~8); }} /> {/* Right */}
                   
                   {/* Buttons */}
                   <circle cx={90} cy={55} r={10} fill={isPressed(4)?'#ef4444':'#7f1d1d'} className="cursor-pointer"
                           onMouseDown={(e) => { e.stopPropagation(); (window as any).setGamepadState?.(node.id, val | 16); }} 
                           onMouseUp={(e) => { e.stopPropagation(); (window as any).setGamepadState?.(node.id, val & ~16); }} />
                   <circle cx={110} cy={35} r={10} fill={isPressed(5)?'#fbbf24':'#78350f'} className="cursor-pointer"
                           onMouseDown={(e) => { e.stopPropagation(); (window as any).setGamepadState?.(node.id, val | 32); }} 
                           onMouseUp={(e) => { e.stopPropagation(); (window as any).setGamepadState?.(node.id, val & ~32); }} />
              </g>
          )
      }

      if (node.type === 'BUZZER') {
          return (
              <g>
                  <rect width={width} height={height} rx={width/2} fill="#333" stroke={config.color} strokeWidth={2} />
                  <circle cx={width/2} cy={height/2} r={15} fill={node.state ? '#f43f5e' : '#333'} />
                  {node.state && (
                      <>
                        <circle cx={width/2} cy={height/2} r={20} fill="none" stroke="#f43f5e" strokeWidth={2} opacity={0.5} />
                        <circle cx={width/2} cy={height/2} r={25} fill="none" stroke="#f43f5e" strokeWidth={1} opacity={0.3} />
                      </>
                  )}
                  <text x={width/2} y={height/2} dy={1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="8" pointerEvents="none">BUZZ</text>
              </g>
          )
      }

      if (node.type === 'RAM_16X1') {
          const memory = node.memory || new Array(16).fill(false);
          const currentAddr = (node.inputs?.[0]?1:0) + (node.inputs?.[1]?2:0) + (node.inputs?.[2]?4:0) + (node.inputs?.[3]?8:0);
          return (
              <g>
                  <rect width={width} height={height} rx={4} fill="#1e293b" stroke={strokeColor} strokeWidth={2} />
                  <g transform="translate(30, 20)">
                    {Array.from({ length: 16 }).map((_, i) => (
                        <rect key={i} x={(i % 4) * 14} y={Math.floor(i / 4) * 14} width={10} height={10} 
                              fill={memory[i] ? '#ec4899' : '#334155'} stroke={i === currentAddr ? '#fff' : 'none'} strokeWidth={i === currentAddr ? 2 : 0} />
                    ))}
                  </g>
                  <text x={width/2} y={12} textAnchor="middle" fill="#ec4899" fontSize="9" fontWeight="bold">RAM</text>
              </g>
          );
      }

      // IC Visualization (Generic for Reg/Counter/ALU)
      if (config.category === 'IC') {
          const val = node.internalState || 0;
          let displayText = '';
          if (node.type.includes('REGISTER') || node.type.includes('COUNTER')) {
             displayText = `Val: ${val}`;
          } else if (node.type === 'ALU_4BIT') {
             displayText = `Res: ${val & 15}`;
          }

          return (
              <g>
                  <rect width={width} height={height} rx={4} fill="#1e293b" stroke={strokeColor} strokeWidth={2} />
                  <path d={`M 0 15 L ${width} 15`} stroke={config.color} strokeWidth={1} />
                  <rect x={0} y={0} width={width} height={15} fill={config.color} fillOpacity={0.2} rx={4} />
                  <text x={width/2} y={11} textAnchor="middle" fill={config.color} fontSize="10" fontWeight="bold">{config.label}</text>
                  {displayText && (
                      <text x={width/2} y={height/2} textAnchor="middle" fill="white" fontSize="12">{displayText}</text>
                  )}
              </g>
          )
      }

      if (node.type === 'LABEL') {
          return (
             <foreignObject width={width} height={height}>
                 <div className="w-full h-full flex items-center justify-center">
                     {isEditingLabel ? (
                         <form onSubmit={handleLabelSubmit} className="w-full px-1">
                             <input autoFocus value={labelText} onChange={(e) => setLabelText(e.target.value)} onBlur={handleLabelSubmit} className="w-full bg-slate-800 text-white text-center text-sm border border-blue-500 outline-none rounded" />
                         </form>
                     ) : (
                         <div className="text-slate-200 font-bold text-center leading-tight overflow-hidden text-ellipsis px-1">{labelText}</div>
                     )}
                 </div>
             </foreignObject>
          );
      }

      if (node.type === 'SEVEN_SEG') {
          const inputs = node.inputs || [];
          const val = (inputs[0]?1:0) + (inputs[1]?2:0) + (inputs[2]?4:0) + (inputs[3]?8:0);
          const segments = [0x7E, 0x30, 0x6D, 0x79, 0x33, 0x5B, 0x5F, 0x70, 0x7F, 0x7B, 0x77, 0x1F, 0x4E, 0x3D, 0x4F, 0x47];
          const pattern = segments[val] || 0;
          const sW = 30, sH = 4, cx = width/2, cy = height/2;
          const drawSeg = (idx: number, x: number, y: number, w: number, h: number) => {
             const on = (pattern >> (6-idx)) & 1;
             return <rect x={x} y={y} width={w} height={h} fill={on ? '#ef4444' : '#331111'} rx={2} />;
          };
          return (
              <g>
                 <rect width={width} height={height} fill="#000000" rx={4} stroke="#333" />
                 {drawSeg(0, cx-sW/2, cy-sW-sH/2, sW, sH)}
                 {drawSeg(1, cx+sW/2-sH/2, cy-sW+sH/2, sH, sW)}
                 {drawSeg(2, cx+sW/2-sH/2, cy+sH/2, sH, sW)}
                 {drawSeg(3, cx-sW/2, cy+sW-sH/2, sW, sH)}
                 {drawSeg(4, cx-sW/2-sH/2, cy+sH/2, sH, sW)}
                 {drawSeg(5, cx-sW/2-sH/2, cy-sW+sH/2, sH, sW)}
                 {drawSeg(6, cx-sW/2, cy-sH/2, sW, sH)}
                 <text x={width - 10} y={height - 10} fill="#666" fontSize="10" textAnchor="end">0x{val.toString(16).toUpperCase()}</text>
              </g>
          )
      }

      return (
        <g>
             <rect width={width} height={height} rx={8} fill="#1e293b" stroke={strokeColor} strokeWidth={2} />
             {node.type !== 'LABEL' && (
                <path d={`M 0 8 Q 0 0 8 0 L ${width-8} 0 Q ${width} 0 ${width} 8 L ${width} ${height} L 0 ${height} Z`} fill={node.state ? config.color : '#334155'} fillOpacity={0.2} pointerEvents="none" />
             )}
             {node.type !== 'LABEL' && (
                <rect x={0} y={0} width={6} height={height} fill={bodyColor} rx={4} />
             )}
             <text x={width / 2 + 3} y={height / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14" fontWeight="bold" pointerEvents="none" className="select-none">
                {isHighOrLow ? (node.state ? '1' : '0') : config.label}
             </text>
        </g>
      );
  };

  return (
    <g 
      transform={`translate(${node.position.x}, ${node.position.y})`}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onContextMenu={handleContextMenu}
      style={{ cursor: node.type === 'LABEL' ? 'text' : 'grab' }}
    >
        <g 
            onDoubleClick={handleBodyInteraction} 
            onMouseDown={handleButtonPress} 
            onMouseUp={handleButtonRelease} 
            onMouseLeave={handleButtonRelease}
        >
            {renderContent()}
        </g>

        {inputPorts.map((port) => (
            <g key={port.index}>
                 <circle cx={port.x} cy={port.y} r={PORT_RADIUS} fill="#94a3b8" stroke="#0f172a" strokeWidth={2} className="hover:fill-white cursor-crosshair" onMouseDown={(e) => handlePortClick(e, false, port.index)} />
                 {port.label && <text x={port.x + 8} y={port.y} dy={2} fontSize={8} fill="#94a3b8">{port.label}</text>}
            </g>
        ))}

        {outputPorts.map((port, i) => {
            const spacing = height / (outputPorts.length + 1);
            const y = (i + 1) * spacing;
            const isWiringThis = wiringSourceId === node.id; 
            return (
                <g key={port.i}>
                    <circle cx={width} cy={y} r={PORT_RADIUS} fill={isWiringThis ? '#fbbf24' : '#94a3b8'} stroke="#0f172a" strokeWidth={2} className="hover:fill-white cursor-crosshair" onMouseDown={(e) => handlePortClick(e, true, port.i)} />
                    {port.l && <text x={width - 8} y={y} dy={2} textAnchor="end" fontSize={8} fill="#94a3b8">{port.l}</text>}
                </g>
            )
        })}
    </g>
  );
};

export default LogicNode;
