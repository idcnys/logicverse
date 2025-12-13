
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CircuitNode, Connection, NodeType, Vector2, SubCircuitPortMap, SubCircuitData, CustomModule } from './types';
import { tickSimulation } from './services/circuitEngine';
import { COMPONENT_CONFIGS, NODE_WIDTH, NODE_HEIGHT } from './constants';

interface HistoryState {
    nodes: CircuitNode[];
    connections: Connection[];
}

interface CircuitState {
  nodes: CircuitNode[];
  connections: Connection[];
  selectedNodeIds: string[];
  wiringSource: { id: string, outputIndex: number } | null;
  wiringSourceId: string | null; // Compatibility helper
  isSimulating: boolean;
  clipboard: { nodes: CircuitNode[], connections: Connection[] } | null;
  customModules: CustomModule[];
  addNode: (type: NodeType, position: Vector2, customData?: SubCircuitData) => void;
  removeNodes: (ids: string[]) => void;
  removeConnection: (id: string) => void;
  toggleSwitch: (id: string) => void;
  setNodeState: (id: string, state: boolean) => void;
  setNodes: React.Dispatch<React.SetStateAction<CircuitNode[]>>; // Expose setter for hacks
  selectNode: (id: string | null, multi?: boolean) => void;
  selectRegion: (start: Vector2, end: Vector2) => void;
  startWiring: (nodeId: string, outputIndex?: number) => void;
  completeWiring: (targetNodeId: string, inputIndex: number) => void;
  cancelWiring: () => void;
  updatePosition: (id: string, position: Vector2) => void;
  clearCircuit: () => void;
  loadCircuit: (nodes: CircuitNode[], connections: Connection[]) => void;
  toggleSimulation: () => void;
  copy: () => void;
  paste: () => void;
  createCustomComponent: (name: string) => void;
  ungroupNode: (id: string) => void;
  loadCustomModules: (modules: CustomModule[]) => void;
  undo: () => void;
  redo: () => void;
  saveSnapshot: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const CircuitContext = createContext<CircuitState | undefined>(undefined);

export const CircuitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nodes, setNodes] = useState<CircuitNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [wiringSource, setWiringSource] = useState<{ id: string, outputIndex: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [clipboard, setClipboard] = useState<{ nodes: CircuitNode[], connections: Connection[] } | null>(null);
  const [customModules, setCustomModules] = useState<CustomModule[]>([]);
  const tickRef = useRef(0);

  // History State
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);

  // Global helper for Gamepad
  useEffect(() => {
      (window as any).setGamepadState = (id: string, val: number) => {
          setNodes(prev => prev.map(n => n.id === id ? { ...n, internalState: val } : n));
      };
  }, []);

  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setNodes(prevNodes => {
          let currentNodes = prevNodes;
          for(let i=0; i<8; i++) {
              tickRef.current += 1;
              currentNodes = tickSimulation(currentNodes, connections, tickRef.current);
          }
          return currentNodes;
      });
    }, 16); 
    return () => clearInterval(interval);
  }, [connections, isSimulating]);

  // History Management
  const saveSnapshot = useCallback(() => {
      // Create deep copy of current state
      const currentNodes = JSON.parse(JSON.stringify(nodes));
      const currentConnections = JSON.parse(JSON.stringify(connections));
      
      setPast(prev => {
          const newPast = [...prev, { nodes: currentNodes, connections: currentConnections }];
          if (newPast.length > 30) newPast.shift(); // Limit history to 30 steps
          return newPast;
      });
      setFuture([]); // Clear future on new action
  }, [nodes, connections]);

  const undo = useCallback(() => {
      if (past.length === 0) return;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, -1);
      
      const current = { nodes: JSON.parse(JSON.stringify(nodes)), connections: JSON.parse(JSON.stringify(connections)) };

      setPast(newPast);
      setFuture(prev => [current, ...prev]);
      
      setNodes(previous.nodes);
      setConnections(previous.connections);
      setSelectedNodeIds([]); // Clear selection to avoid issues
  }, [past, nodes, connections]);

  const redo = useCallback(() => {
      if (future.length === 0) return;

      const next = future[0];
      const newFuture = future.slice(1);

      const current = { nodes: JSON.parse(JSON.stringify(nodes)), connections: JSON.parse(JSON.stringify(connections)) };

      setPast(prev => [...prev, current]);
      setFuture(newFuture);

      setNodes(next.nodes);
      setConnections(next.connections);
      setSelectedNodeIds([]);
  }, [future, nodes, connections]);


  const addNode = useCallback((type: NodeType, position: Vector2, customData?: SubCircuitData) => {
    saveSnapshot(); // Save state
    
    // Determine input count: from custom data map or config default
    let inputCount = COMPONENT_CONFIGS[type].inputs;
    if (type === 'CUSTOM_IC' && customData) {
        inputCount = customData.inputMap.length;
    }

    const newNode: CircuitNode = {
      id: uuidv4(),
      type,
      position,
      state: type === 'HIGH',
      inputs: new Array(inputCount).fill(false),
      memory: type === 'RAM_16X1' || type === 'MATRIX_DISPLAY' ? new Array(type === 'MATRIX_DISPLAY' ? 256 : 16).fill(false) : undefined,
      internalState: 0,
      subCircuit: customData,
      label: customData ? undefined : (type === 'CUSTOM_INPUT' || type === 'CUSTOM_OUTPUT' ? COMPONENT_CONFIGS[type].label : COMPONENT_CONFIGS[type].label)
    };
    
    // Auto-name input/output nodes
    if (type === 'CUSTOM_INPUT' || type === 'CUSTOM_OUTPUT') {
        const count = nodes.filter(n => n.type === type).length;
        newNode.label = `${type === 'CUSTOM_INPUT' ? 'IN' : 'OUT'} ${count}`;
    }

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeIds([newNode.id]);
  }, [nodes, saveSnapshot]);

  const removeNodes = useCallback((ids: string[]) => {
    saveSnapshot(); // Save state
    setNodes(prev => prev.filter(n => !ids.includes(n.id)));
    setConnections(prev => prev.filter(c => !ids.includes(c.sourceNodeId) && !ids.includes(c.targetNodeId)));
    setSelectedNodeIds(prev => prev.filter(id => !ids.includes(id)));
  }, [saveSnapshot]);

  const removeConnection = useCallback((id: string) => {
    saveSnapshot(); // Save state
    setConnections(prev => prev.filter(c => c.id !== id));
  }, [saveSnapshot]);

  const toggleSwitch = useCallback((id: string) => {
    saveSnapshot(); // Save state
    setNodes(prev => prev.map(n => {
      if (n.id === id && (n.type === 'SWITCH' || n.type === 'CUSTOM_INPUT')) {
        return { ...n, state: !n.state };
      }
      return n;
    }));
  }, [saveSnapshot]);

  const setNodeState = useCallback((id: string, state: boolean) => {
    // This is often internal simulation state, maybe don't snapshot?
    // If it's button press, it's transient.
    setNodes(prev => prev.map(n => {
        if (n.id === id) return { ...n, state };
        return n;
    }));
  }, []);

  const selectNode = useCallback((id: string | null, multi: boolean = false) => {
      if (id === null) {
          setSelectedNodeIds([]);
          return;
      }
      setSelectedNodeIds(prev => {
          if (multi) {
              return prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
          }
          return [id];
      });
  }, []);

  const selectRegion = useCallback((start: Vector2, end: Vector2) => {
      const left = Math.min(start.x, end.x);
      const right = Math.max(start.x, end.x);
      const top = Math.min(start.y, end.y);
      const bottom = Math.max(start.y, end.y);

      const idsInRegion = nodes.filter(node => {
          const config = COMPONENT_CONFIGS[node.type];
          const w = config.width || NODE_WIDTH;
          const h = config.height || NODE_HEIGHT;
          
          return (
              node.position.x < right &&
              node.position.x + w > left &&
              node.position.y < bottom &&
              node.position.y + h > top
          );
      }).map(n => n.id);

      setSelectedNodeIds(idsInRegion);
  }, [nodes]);

  const startWiring = useCallback((nodeId: string, outputIndex: number = 0) => {
    setWiringSource({ id: nodeId, outputIndex });
    setSelectedNodeIds([nodeId]);
  }, []);

  const completeWiring = useCallback((targetNodeId: string, inputIndex: number) => {
    if (!wiringSource) return;
    if (wiringSource.id === targetNodeId) return; 

    const exists = connections.some(c =>
      c.sourceNodeId === wiringSource.id &&
      c.sourceOutputIndex === wiringSource.outputIndex &&
      c.targetNodeId === targetNodeId &&
      c.targetInputIndex === inputIndex
    );

    if (!exists) {
        saveSnapshot(); // Save state
        const filteredConnections = connections.filter(c =>
            !(c.targetNodeId === targetNodeId && c.targetInputIndex === inputIndex)
        );

        const newConnection: Connection = {
            id: uuidv4(),
            sourceNodeId: wiringSource.id,
            sourceOutputIndex: wiringSource.outputIndex,
            targetNodeId,
            targetInputIndex: inputIndex
        };
        setConnections([...filteredConnections, newConnection]);
    }

    setWiringSource(null);
  }, [wiringSource, connections, saveSnapshot]);

  const cancelWiring = useCallback(() => {
    setWiringSource(null);
  }, []);

  const updatePosition = useCallback((id: string, position: Vector2) => {
    // NOTE: We do not saveSnapshot here because it's called continuously. 
    // Snapshots for moves should be handled by the UI (Drag Start).
    setNodes(prev => prev.map(n => n.id === id ? { ...n, position } : n));
  }, []);

  const clearCircuit = useCallback(() => {
    saveSnapshot(); // Save state
    setNodes([]);
    setConnections([]);
    setWiringSource(null);
    setSelectedNodeIds([]);
  }, [saveSnapshot]);

  const loadCircuit = useCallback((newNodes: CircuitNode[], newConnections: Connection[]) => {
      saveSnapshot(); // Save state
      setNodes(newNodes);
      setConnections(newConnections);
  }, [saveSnapshot]);

  const toggleSimulation = useCallback(() => {
      setIsSimulating(prev => !prev);
  }, []);

  const copy = useCallback(() => {
      if (selectedNodeIds.length === 0) return;
      const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
      const selectedConnections = connections.filter(c => 
          selectedNodeIds.includes(c.sourceNodeId) && selectedNodeIds.includes(c.targetNodeId)
      );
      setClipboard({ nodes: selectedNodes, connections: selectedConnections });
  }, [nodes, connections, selectedNodeIds]);

  const paste = useCallback(() => {
      if (!clipboard) return;
      saveSnapshot(); // Save state

      const idMap = new Map<string, string>();
      const PASTE_OFFSET = 30;

      const newNodes = clipboard.nodes.map(node => {
          const newId = uuidv4();
          idMap.set(node.id, newId);
          return {
              ...node,
              id: newId,
              memory: node.memory ? [...node.memory] : undefined,
              position: { 
                  x: node.position.x + PASTE_OFFSET, 
                  y: node.position.y + PASTE_OFFSET 
              }
          };
      });

      const newConnections = clipboard.connections.map(conn => ({
          ...conn,
          id: uuidv4(),
          sourceNodeId: idMap.get(conn.sourceNodeId)!,
          targetNodeId: idMap.get(conn.targetNodeId)!
      }));

      setNodes(prev => [...prev, ...newNodes]);
      setConnections(prev => [...prev, ...newConnections]);
      setSelectedNodeIds(newNodes.map(n => n.id));

  }, [clipboard, saveSnapshot]);

  const createCustomComponent = useCallback((name: string) => {
      if (selectedNodeIds.length < 1) return;
      saveSnapshot(); // Save state

      const internalNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
      const internalIds = new Set(selectedNodeIds);
      const internalConnections = connections.filter(c => internalIds.has(c.sourceNodeId) && internalIds.has(c.targetNodeId));

      let inputMap: SubCircuitPortMap[] = [];
      let outputMap: SubCircuitPortMap[] = [];
      
      // Check for Explicit Input/Output Nodes
      const explicitInputs = internalNodes.filter(n => n.type === 'CUSTOM_INPUT').sort((a,b) => a.position.y - b.position.y);
      const explicitOutputs = internalNodes.filter(n => n.type === 'CUSTOM_OUTPUT').sort((a,b) => a.position.y - b.position.y);

      if (explicitInputs.length > 0 || explicitOutputs.length > 0) {
          // --- Explicit Mode ---
          explicitInputs.forEach(node => {
              inputMap.push({
                  internalNodeId: node.id,
                  index: 0, 
                  label: node.label
              });
          });
          explicitOutputs.forEach(node => {
              outputMap.push({
                  internalNodeId: node.id,
                  index: 0,
                  label: node.label
              });
          });
      } else {
          // --- Implicit (Boundary) Mode ---
          const incomingConnections = connections.filter(c => internalIds.has(c.targetNodeId) && !internalIds.has(c.sourceNodeId));
          const distinctInputs = new Set<string>();
          incomingConnections.forEach((conn) => {
              const key = `${conn.targetNodeId}-${conn.targetInputIndex}`;
              if (!distinctInputs.has(key)) {
                  distinctInputs.add(key);
                  inputMap.push({
                      internalNodeId: conn.targetNodeId,
                      index: conn.targetInputIndex,
                      label: `In ${inputMap.length}`
                  });
              }
          });

          const outgoingConnections = connections.filter(c => internalIds.has(c.sourceNodeId) && !internalIds.has(c.targetNodeId));
          const distinctOutputs = new Set<string>();
          outgoingConnections.forEach(conn => {
              const key = `${conn.sourceNodeId}-${conn.sourceOutputIndex || 0}`;
              if (!distinctOutputs.has(key)) {
                  distinctOutputs.add(key);
                  outputMap.push({
                      internalNodeId: conn.sourceNodeId,
                      index: conn.sourceOutputIndex || 0,
                      label: `Out ${outputMap.length}`
                  });
              }
          });
      }

      const subCircuitData: SubCircuitData = {
          nodes: internalNodes,
          connections: internalConnections,
          inputMap,
          outputMap,
          width: 120,
          height: Math.max(80, Math.max(inputMap.length, outputMap.length) * 20 + 20)
      };

      setCustomModules(prev => [...prev, { name, data: subCircuitData }]);
      
      // Since we are inside the same function scope, we can't call removeNodes (which also calls saveSnapshot) without double snapshotting 
      // or using fresh state refs. But since we already saved snapshot at top, we can just proceed to update state.
      // However, `removeNodes` uses `setNodes` based on `prev`.
      // Let's just do logic manually here to avoid double snapshot.
      
      setNodes(prev => prev.filter(n => !selectedNodeIds.includes(n.id)));
      setConnections(prev => prev.filter(c => !selectedNodeIds.includes(c.sourceNodeId) && !selectedNodeIds.includes(c.targetNodeId)));
      setSelectedNodeIds([]);

  }, [nodes, connections, selectedNodeIds, saveSnapshot]);

  const loadCustomModules = useCallback((newModules: CustomModule[]) => {
      setCustomModules(prev => [...prev, ...newModules]);
  }, []);

  const ungroupNode = useCallback((id: string) => {
      const icNode = nodes.find(n => n.id === id);
      if (!icNode || icNode.type !== 'CUSTOM_IC' || !icNode.subCircuit) return;
      saveSnapshot(); // Save state

      const sub = icNode.subCircuit;
      const icPos = icNode.position;

      const minX = Math.min(...sub.nodes.map(n => n.position.x));
      const minY = Math.min(...sub.nodes.map(n => n.position.y));
      const offsetX = icPos.x - minX;
      const offsetY = icPos.y - minY;

      const idMap = new Map<string, string>();
      
      const restoredNodes = sub.nodes.map(n => {
          const newId = uuidv4();
          idMap.set(n.id, newId);
          return {
              ...n,
              id: newId,
              position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
              state: false,
              internalState: 0,
              inputs: new Array(n.inputs?.length || 0).fill(false)
          };
      });

      const restoredConnections = sub.connections.map(c => ({
          ...c,
          id: uuidv4(),
          sourceNodeId: idMap.get(c.sourceNodeId)!,
          targetNodeId: idMap.get(c.targetNodeId)!
      }));

      const attachedConnections = connections.filter(c => c.sourceNodeId === id || c.targetNodeId === id);
      const rewiredConnections: Connection[] = [];

      attachedConnections.forEach(conn => {
          if (conn.targetNodeId === id) {
              const map = sub.inputMap[conn.targetInputIndex];
              if (map) {
                  const newTargetId = idMap.get(map.internalNodeId);
                  if (newTargetId) {
                      rewiredConnections.push({
                          ...conn,
                          id: uuidv4(),
                          targetNodeId: newTargetId,
                          targetInputIndex: map.index
                      });
                  }
              }
          } else if (conn.sourceNodeId === id) {
              const map = sub.outputMap[conn.sourceOutputIndex || 0];
              if (map) {
                  const newSourceId = idMap.get(map.internalNodeId);
                  if (newSourceId) {
                      rewiredConnections.push({
                          ...conn,
                          id: uuidv4(),
                          sourceNodeId: newSourceId,
                          sourceOutputIndex: map.index
                      });
                  }
              }
          }
      });

      const otherNodes = nodes.filter(n => n.id !== id);
      const otherConnections = connections.filter(c => c.sourceNodeId !== id && c.targetNodeId !== id);

      setNodes([...otherNodes, ...restoredNodes]);
      setConnections([...otherConnections, ...restoredConnections, ...rewiredConnections]);
      setSelectedNodeIds(restoredNodes.map(n => n.id));

  }, [nodes, connections, saveSnapshot]);

  const value = {
    nodes,
    connections,
    selectedNodeIds,
    wiringSourceId: wiringSource?.id || null, // Backwards compat
    wiringSource,
    isSimulating,
    clipboard,
    customModules,
    addNode,
    removeNodes,
    removeConnection,
    toggleSwitch,
    setNodeState,
    setNodes,
    selectNode,
    selectRegion,
    startWiring,
    completeWiring,
    cancelWiring,
    updatePosition,
    clearCircuit,
    loadCircuit,
    toggleSimulation,
    copy,
    paste,
    createCustomComponent,
    ungroupNode,
    loadCustomModules,
    undo,
    redo,
    saveSnapshot,
    canUndo: past.length > 0,
    canRedo: future.length > 0
  };

  return <CircuitContext.Provider value={value}>{children}</CircuitContext.Provider>;
};

export const useCircuitStore = () => {
  const context = useContext(CircuitContext);
  if (!context) throw new Error("useCircuitStore must be used within CircuitProvider");
  return context;
};
