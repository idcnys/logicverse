
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CircuitNode, Connection, NodeType, Vector2 } from './types';
import { tickSimulation } from './services/circuitEngine';
import { COMPONENT_CONFIGS, NODE_WIDTH, NODE_HEIGHT } from './constants';

interface CircuitState {
  nodes: CircuitNode[];
  connections: Connection[];
  selectedNodeIds: string[];
  wiringSource: { id: string, outputIndex: number } | null;
  wiringSourceId: string | null; // Compatibility helper
  isSimulating: boolean;
  clipboard: { nodes: CircuitNode[], connections: Connection[] } | null;
  addNode: (type: NodeType, position: Vector2) => void;
  removeNodes: (ids: string[]) => void;
  removeConnection: (id: string) => void;
  toggleSwitch: (id: string) => void;
  setNodeState: (id: string, state: boolean) => void;
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
}

const CircuitContext = createContext<CircuitState | undefined>(undefined);

export const CircuitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nodes, setNodes] = useState<CircuitNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [wiringSource, setWiringSource] = useState<{ id: string, outputIndex: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [clipboard, setClipboard] = useState<{ nodes: CircuitNode[], connections: Connection[] } | null>(null);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      tickRef.current += 1;
      setNodes(prevNodes => tickSimulation(prevNodes, connections, tickRef.current));
    }, 16); 
    return () => clearInterval(interval);
  }, [connections, isSimulating]);

  const addNode = useCallback((type: NodeType, position: Vector2) => {
    const newNode: CircuitNode = {
      id: uuidv4(),
      type,
      position,
      state: type === 'HIGH',
      inputs: new Array(COMPONENT_CONFIGS[type].inputs).fill(false),
      memory: type === 'RAM_16X1' ? new Array(16).fill(false) : undefined,
      internalState: 0
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeIds([newNode.id]);
  }, []);

  const removeNodes = useCallback((ids: string[]) => {
    setNodes(prev => prev.filter(n => !ids.includes(n.id)));
    setConnections(prev => prev.filter(c => !ids.includes(c.sourceNodeId) && !ids.includes(c.targetNodeId)));
    setSelectedNodeIds(prev => prev.filter(id => !ids.includes(id)));
  }, []);

  const removeConnection = useCallback((id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  const toggleSwitch = useCallback((id: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id === id && n.type === 'SWITCH') {
        return { ...n, state: !n.state };
      }
      return n;
    }));
  }, []);

  const setNodeState = useCallback((id: string, state: boolean) => {
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
        // Remove existing connection to this specific target input
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
  }, [wiringSource, connections]);

  const cancelWiring = useCallback(() => {
    setWiringSource(null);
  }, []);

  const updatePosition = useCallback((id: string, position: Vector2) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, position } : n));
  }, []);

  const clearCircuit = useCallback(() => {
    setNodes([]);
    setConnections([]);
    setWiringSource(null);
    setSelectedNodeIds([]);
  }, []);

  const loadCircuit = useCallback((newNodes: CircuitNode[], newConnections: Connection[]) => {
      setNodes(newNodes);
      setConnections(newConnections);
  }, []);

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

  }, [clipboard]);

  const value = {
    nodes,
    connections,
    selectedNodeIds,
    wiringSourceId: wiringSource?.id || null, // Backwards compat
    wiringSource,
    isSimulating,
    clipboard,
    addNode,
    removeNodes,
    removeConnection,
    toggleSwitch,
    setNodeState,
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
    paste
  };

  return <CircuitContext.Provider value={value}>{children}</CircuitContext.Provider>;
};

export const useCircuitStore = () => {
  const context = useContext(CircuitContext);
  if (!context) throw new Error("useCircuitStore must be used within CircuitProvider");
  return context;
};
