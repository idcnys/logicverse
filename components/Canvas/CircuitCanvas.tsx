
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
    const { nodes, connections, addNode, removeNodes, updatePosition, selectNode, selectRegion, wiringSourceId, nodes: allNodes, cancelWiring, selectedNodeIds, createCustomComponent, ungroupNode, saveSnapshot } = useCircuitStore();
    
    // Viewport State combined to ensure atomic updates during zoom events
    const [view, setView] = useState<{ pan: Vector2, zoom: number }>({ 
        pan: { x: 0, y: 0 }, 
        zoom: 1 
    });
    const { pan, zoom } = view;
    
    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Vector2>({ x: 0, y: 0 });
    const [dragNodeId, setDragNodeId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState<Vector2>({ x: 0, y: 0 });
    const isNodeDragActiveRef = useRef(false);

    // Selection Box State
    const [selectionStart, setSelectionStart] = useState<Vector2 | null>(null);
    const [selectionCurrent, setSelectionCurrent] = useState<Vector2 | null>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    // Helpers
    const getEventPoint = (e: React.MouseEvent | React.WheelEvent): Vector2 => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const rect = svgRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - pan.x) / zoom,
            y: (e.clientY - rect.top - pan.y) / zoom
        };
    };

    // Attach non-passive wheel listener to prevent browser zoom
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const rect = svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            setView(prev => {
                const { zoom: oldZoom, pan: oldPan } = prev;
                const scaleBy = 1.1;
                const newZoomRaw = e.deltaY < 0 ? oldZoom * scaleBy : oldZoom / scaleBy;
                
                // Clamp zoom - MAX ZOOM OUT LIMIT set to 0.25
                const newZoom = Math.min(Math.max(newZoomRaw, 0.25), 5);

                const newPan = {
                    x: mouseX - (mouseX - oldPan.x) * (newZoom / oldZoom),
                    y: mouseY - (mouseY - oldPan.y) * (newZoom / oldZoom)
                };

                return { pan: newPan, zoom: newZoom };
            });
        };

        svg.addEventListener('wheel', onWheel, { passive: false });
        return () => svg.removeEventListener('wheel', onWheel);
    }, []);

    // Handlers
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        
        // If wiring, cancel it
        if (wiringSourceId) {
            cancelWiring();
            return;
        }

        if (addingType) {
            setAddingType(null);
            return;
        }

        // Check if we are right-clicking a node or a selection
        // If right click happens, we show menu at mouse position
        if (selectedNodeIds.length > 0) {
            setContextMenu({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setContextMenu(null); // Close menu on click
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
            
            addNode(addingType, { 
                x: Math.round(pos.x / 10) * 10 - NODE_WIDTH/2, 
                y: Math.round(pos.y / 10) * 10 - NODE_HEIGHT/2
            }, (window as any)._tempCustomData); // HACK: Global temp data
            
            setAddingType(null);
            (window as any)._tempCustomData = undefined;
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
            isNodeDragActiveRef.current = false; // Reset drag flag

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
                setView(prev => ({ ...prev, pan: { x: prev.pan.x + dx, y: prev.pan.y + dy } }));
                setDragStart({ x: e.clientX, y: e.clientY });
            }
        }

        if (dragNodeId) {
            // Drag Start Detection for Undo
            if (!isNodeDragActiveRef.current) {
                isNodeDragActiveRef.current = true;
                saveSnapshot(); // Save state before modifying positions
            }

            // Drag Nodes (move all selected)
            const dx = e.movementX / zoom;
            const dy = e.movementY / zoom;
            
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
        isNodeDragActiveRef.current = false;
        setSelectionStart(null);
        setSelectionCurrent(null);
    };

    // Simplify / Expand Handlers
    const handleSimplify = (e: React.MouseEvent) => {
        e.stopPropagation();
        setContextMenu(null);
        // Timeout to allow menu to close before prompt blocks thread
        setTimeout(() => {
            const name = prompt("Enter Custom Component Name:", "MyLogic");
            if (name) {
                createCustomComponent(name);
            }
        }, 50);
    };

    const handleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedNodeIds.length === 1) {
            ungroupNode(selectedNodeIds[0]);
        }
        setContextMenu(null);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        removeNodes(selectedNodeIds); 
        setContextMenu(null);
    }

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
        <div className="w-full h-full bg-[#0f172a] overflow-hidden cursor-crosshair relative">
            <svg
                ref={svgRef}
                className={`w-full h-full block touch-none ${toolMode === 'PAN' && isDragging ? 'cursor-grabbing' : ''}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
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
            
            {/* Context Menu */}
            {contextMenu && (
                <div 
                    className="absolute bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden py-1 min-w-[150px] z-50"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onMouseDown={(e) => e.stopPropagation()} // Prevent closing immediately if clicking within menu
                >
                    {selectedNodeIds.length > 1 && (
                        <button 
                            onClick={handleSimplify}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
                        >
                            Simplify (Save to Custom)
                        </button>
                    )}
                    {selectedNodeIds.length === 1 && allNodes.find(n => n.id === selectedNodeIds[0])?.type === 'CUSTOM_IC' && (
                         <button 
                            onClick={handleExpand}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
                        >
                            Expand IC
                        </button>
                    )}
                    <button 
                        onClick={handleDelete}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            )}

            {/* Zoom Indicator */}
            <div className="absolute bottom-4 right-4 bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded select-none pointer-events-none">
                {Math.round(zoom * 100)}%
            </div>
        </div>
    );
};

export default CircuitCanvas;
