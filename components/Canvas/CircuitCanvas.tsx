import React, { useRef, useState, useEffect } from 'react';
import { useCircuitStore } from '../../store';
import LogicNode from './LogicNode';
import Wire from './Wire';
import { NodeType, Vector2 } from '../../types';
import { GRID_SIZE, NODE_WIDTH, NODE_HEIGHT } from '../../constants';

interface CanvasProps {
    addingType: NodeType | null;
    setAddingType: (t: NodeType | null) => void;
    toolMode: 'PAN' | 'SELECT';
}

const CircuitCanvas: React.FC<CanvasProps> = ({ addingType, setAddingType, toolMode }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { nodes, connections, addNode, updatePosition, selectNode, selectRegion, wiringSourceId, nodes: allNodes, cancelWiring, selectedNodeIds } = useCircuitStore();
    
    // Viewport State
    const [pan, setPan] = useState<Vector2>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    
    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Vector2>({ x: 0, y: 0 });
    const [dragNodeId, setDragNodeId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState<Vector2>({ x: 0, y: 0 });

    // Selection Box State
    const [selectionStart, setSelectionStart] = useState<Vector2 | null>(null);
    const [selectionCurrent, setSelectionCurrent] = useState<Vector2 | null>(null);

    // Helpers
    const getEventPoint = (e: React.MouseEvent | React.WheelEvent): Vector2 => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const rect = svgRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - pan.x) / zoom,
            y: (e.clientY - rect.top - pan.y) / zoom
        };
    };

    // Handlers
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        // Right click cancels current action
        if (wiringSourceId) cancelWiring();
        if (addingType) setAddingType(null);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const worldPos = getEventPoint(e);

        // Middle mouse or Space+Left for Pan regardless of tool
        if (e.button === 1 || (e.button === 0 && !addingType)) {
             
             // Tool Mode Logic for Left Click on Background
             if (toolMode === 'SELECT' && e.button === 0) {
                 // Start Box Selection
                 setIsDragging(true);
                 setSelectionStart(worldPos);
                 setSelectionCurrent(worldPos);
                 // If not holding shift, clear existing selection
                 if (!e.shiftKey) {
                     selectNode(null);
                 }
             } else {
                 // Pan
                 setIsDragging(true);
                 setDragStart({ x: e.clientX, y: e.clientY });
             }
        }
        
        // Add Node Logic
        if (addingType && e.button === 0) {
            const pos = getEventPoint(e);
            // Center node on click
            addNode(addingType, { 
                x: Math.round(pos.x / 10) * 10 - NODE_WIDTH/2, 
                y: Math.round(pos.y / 10) * 10 - NODE_HEIGHT/2
            });
            setAddingType(null);
        }
        
        // Deselect if clicking background (handled implicitly by box select logic mostly, but good for pan mode)
        if (e.target === svgRef.current && toolMode === 'PAN') {
            selectNode(null);
            if (wiringSourceId) cancelWiring();
        }
    };

    const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (e.button === 0) {
            setDragNodeId(id);
            // Multi-select logic
            if (e.shiftKey) {
                selectNode(id, true);
            } else {
                if (!selectedNodeIds.includes(id)) {
                    selectNode(id, false);
                }
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const worldPos = getEventPoint(e);
        setMousePos(worldPos);

        if (isDragging) {
            if (selectionStart) {
                // Box Selection
                setSelectionCurrent(worldPos);
            } else if (!dragNodeId) {
                // Pan Background
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                setDragStart({ x: e.clientX, y: e.clientY });
            }
        }

        if (dragNodeId) {
            // Drag Nodes (move all selected)
            const dx = e.movementX / zoom;
            const dy = e.movementY / zoom;
            
            // This is a naive implementation that moves state on every frame. 
            // Ideally we'd just update local transform and commit on Up.
            // But for now we update all selected nodes.
            // Note: This might be slow with many nodes.
            selectedNodeIds.forEach(id => {
               const node = allNodes.find(n => n.id === id);
               if (node) {
                   updatePosition(id, { x: node.position.x + dx, y: node.position.y + dy });
               }
            });
        }
    };

    const handleMouseUp = () => {
        if (selectionStart && selectionCurrent) {
            selectRegion(selectionStart, selectionCurrent);
        }
        
        setIsDragging(false);
        setDragNodeId(null);
        setSelectionStart(null);
        setSelectionCurrent(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault(); 
        const scaleBy = 1.1;
        const oldZoom = zoom;
        const newZoom = e.deltaY < 0 ? oldZoom * scaleBy : oldZoom / scaleBy;
        
        // Clamp zoom - MAX ZOOM OUT LIMIT set to 0.25
        const clampedZoom = Math.min(Math.max(newZoom, 0.25), 5);
        
        const rect = svgRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const newPan = {
            x: mouseX - (mouseX - pan.x) * (clampedZoom / oldZoom),
            y: mouseY - (mouseY - pan.y) * (clampedZoom / oldZoom)
        };

        setPan(newPan);
        setZoom(clampedZoom);
    };

    // Render Temporary Wire
    const renderTempWire = () => {
        if (!wiringSourceId) return null;
        const sourceNode = allNodes.find(n => n.id === wiringSourceId);
        if (!sourceNode) return null;

        const startX = sourceNode.position.x + NODE_WIDTH;
        const startY = sourceNode.position.y + NODE_HEIGHT/2;
        
        const pathData = `M ${startX} ${startY} L ${mousePos.x} ${mousePos.y}`;

        return (
            <path 
                d={pathData} 
                stroke="#fbbf24" 
                strokeWidth="2" 
                strokeDasharray="5,5" 
                fill="none" 
                pointerEvents="none"
            />
        );
    };

    // Render Selection Box
    const renderSelectionBox = () => {
        if (!selectionStart || !selectionCurrent) return null;
        
        const x = Math.min(selectionStart.x, selectionCurrent.x);
        const y = Math.min(selectionStart.y, selectionCurrent.y);
        const width = Math.abs(selectionCurrent.x - selectionStart.x);
        const height = Math.abs(selectionCurrent.y - selectionStart.y);

        return (
            <rect 
                x={x} y={y} width={width} height={height} 
                fill="rgba(59, 130, 246, 0.1)" 
                stroke="rgba(59, 130, 246, 0.5)" 
                strokeWidth={1 / zoom}
            />
        );
    };

    return (
        <div className="w-full h-full bg-[#0f172a] overflow-hidden cursor-crosshair">
            <svg
                ref={svgRef}
                className={`w-full h-full block touch-none ${toolMode === 'PAN' && isDragging ? 'cursor-grabbing' : ''}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={handleContextMenu}
            >
                <defs>
                    <pattern id="grid" width={GRID_SIZE * zoom} height={GRID_SIZE * zoom} patternUnits="userSpaceOnUse">
                        <path d={`M ${GRID_SIZE * zoom} 0 L 0 0 0 ${GRID_SIZE * zoom}`} fill="none" stroke="#1e293b" strokeWidth="1" />
                    </pattern>
                </defs>

                {/* Grid Background */}
                <rect width="100%" height="100%" fill="#0f172a" />
                <rect 
                    width="100%" 
                    height="100%" 
                    fill="url(#grid)" 
                    style={{ transform: `translate(${pan.x % (GRID_SIZE * zoom)}px, ${pan.y % (GRID_SIZE * zoom)}px)` }}
                />

                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {/* Connections */}
                    {connections.map(conn => {
                        const source = nodes.find(n => n.id === conn.sourceNodeId);
                        const target = nodes.find(n => n.id === conn.targetNodeId);
                        if (!source || !target) return null;
                        return <Wire key={conn.id} connection={conn} sourceNode={source} targetNode={target} />;
                    })}

                    {/* Temp Wire */}
                    {renderTempWire()}

                    {/* Nodes */}
                    {nodes.map(node => (
                        <LogicNode 
                            key={node.id} 
                            node={node} 
                            onMouseDown={handleNodeMouseDown} 
                        />
                    ))}
                    
                    {/* Selection Box */}
                    {renderSelectionBox()}
                </g>
            </svg>
            
            {/* Zoom Indicator */}
            <div className="absolute bottom-4 right-4 bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded select-none pointer-events-none">
                {Math.round(zoom * 100)}%
            </div>
        </div>
    );
};

export default CircuitCanvas;
