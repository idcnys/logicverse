
import { CircuitNode, Connection, NodeType, SubCircuitData } from '../types';

export const evaluateNode = (
    type: NodeType, 
    inputs: boolean[], 
    currentState: boolean, 
    tick: number, 
    prevInputs: boolean[] = [],
    memory: boolean[] = [],
    internalState: number = 0,
    subCircuit?: SubCircuitData
): { state: boolean, memory?: boolean[], internalState?: number, subCircuit?: SubCircuitData } => {
  
  let nextState = currentState;
  let nextMemory = memory;
  let nextInternalState = internalState;
  let nextSubCircuit = subCircuit;

  switch (type) {
    // INPUTS
    case 'SWITCH':
    case 'BUTTON':
    case 'GAMEPAD':
    case 'HIGH':
    case 'LOW':
    case 'LABEL':
    case 'CUSTOM_INPUT': // Behave like a switch when in standalone mode
      nextState = currentState;
      break;
    case 'CLOCK':
      nextState = Math.floor(tick / 5) % 2 === 0;
      break;

    // DISCRETE
    case 'RESISTOR':
    case 'JUNCTION':
    case 'CUSTOM_OUTPUT': // Pass through input
      nextState = inputs[0] || false; 
      break;
    case 'DIODE':
      nextState = inputs[0] || false;
      break;
    case 'TRANSISTOR_NPN':
      nextState = inputs[1] ? (inputs[0] || false) : false;
      break;
    case 'TRANSISTOR_PNP':
      nextState = !inputs[1] ? (inputs[0] || false) : false;
      break;

    // CUSTOM IC
    case 'CUSTOM_IC': {
        if (subCircuit) {
            // 1. Map Inputs to Internal Nodes
            const internalNodesMap = new Map(subCircuit.nodes.map(n => [n.id, { ...n }]));
            
            subCircuit.inputMap.forEach((map, idx) => {
                const node = internalNodesMap.get(map.internalNodeId);
                if (node) {
                    if (node.type === 'CUSTOM_INPUT') {
                        // For Custom Input nodes, we set their state directly, acting as a source
                        node.state = inputs[idx] || false;
                    } else {
                        // Legacy boundary support: inject into inputs
                        if (!node.inputs) node.inputs = [];
                        node.inputs[map.index] = inputs[idx] || false;
                    }
                }
            });

            // 2. Simulate Internal Circuit (One Step)
            let simNodes = Array.from(internalNodesMap.values());
            simNodes = tickSimulation(simNodes, subCircuit.connections, tick);

            // 3. Update SubCircuit State
            nextSubCircuit = {
                ...subCircuit,
                nodes: simNodes
            };

            // 4. Map Outputs from Internal Nodes to IC Output
            if (subCircuit.outputMap.length > 0) {
                const map0 = subCircuit.outputMap[0];
                const outNode = simNodes.find(n => n.id === map0.internalNodeId);
                if (outNode) {
                    if (outNode.type === 'CUSTOM_OUTPUT') {
                        // For Custom Output nodes, the IC output is the value at its input
                        nextState = outNode.inputs?.[0] || false;
                    } else {
                        nextState = getNodeOutput(outNode, map0.index);
                    }
                }
            }
            
            // Pack multi-bit outputs
            let packedState = 0;
            subCircuit.outputMap.forEach((map, idx) => {
                const outNode = simNodes.find(n => n.id === map.internalNodeId);
                if (outNode) {
                     let val = false;
                     if (outNode.type === 'CUSTOM_OUTPUT') {
                         val = outNode.inputs?.[0] || false;
                     } else {
                         val = getNodeOutput(outNode, map.index);
                     }
                     if (val) packedState |= (1 << idx);
                }
            });
            nextInternalState = packedState;
        }
        break;
    }

    // OUTPUTS 
    case 'LIGHT':
    case 'LED_RED':
    case 'LED_GREEN':
    case 'LED_BLUE':
    case 'BUZZER':
      nextState = inputs[0] || false;
      break;
    case 'SEVEN_SEG':
      nextState = false;
      break;
    
    case 'MATRIX_DISPLAY': {
        const x = (inputs[0]?1:0) + (inputs[1]?2:0) + (inputs[2]?4:0) + (inputs[3]?8:0);
        const y = (inputs[4]?1:0) + (inputs[5]?2:0) + (inputs[6]?4:0) + (inputs[7]?8:0);
        const d = inputs[8];
        const we = inputs[9];
        const clk = inputs[10];
        const prevClk = prevInputs[10] || false;

        if (!nextMemory || nextMemory.length !== 256) {
            nextMemory = new Array(256).fill(false);
        }

        if (we && !prevClk && clk) {
            const idx = y * 16 + x;
            if (idx >= 0 && idx < 256) {
                const newMem = [...nextMemory];
                newMem[idx] = d;
                nextMemory = newMem;
            }
        }
        break;
    }

    // LOGIC
    case 'AND':
      nextState = inputs.length >= 2 ? inputs.every((i) => i) : false;
      break;
    case 'OR':
      nextState = inputs.some((i) => i);
      break;
    case 'NOT':
      nextState = !inputs[0];
      break;
    case 'XOR':
      nextState = inputs.filter(Boolean).length % 2 === 1;
      break;
    case 'NAND':
      nextState = !(inputs.length >= 2 ? inputs.every((i) => i) : false);
      break;
    case 'NOR':
      nextState = !inputs.some((i) => i);
      break;
    case 'XNOR':
      nextState = inputs.filter(Boolean).length % 2 === 0;
      break;

    // MEMORY
    case 'D_LATCH': {
      const enable = inputs[0]; 
      const data = inputs[1];   
      if (enable) {
          nextState = data || false;
      } else {
          nextState = currentState; 
      }
      break;
    }
    case 'D_FLIP_FLOP': {
        const clk = inputs[0];
        const data = inputs[1];
        const prevClk = prevInputs[0] || false;
        if (!prevClk && clk) {
            nextState = data || false;
        } else {
            nextState = currentState;
        }
        break;
    }
    case 'RAM_16X1': {
        const A0 = inputs[0] ? 1 : 0;
        const A1 = inputs[1] ? 2 : 0;
        const A2 = inputs[2] ? 4 : 0;
        const A3 = inputs[3] ? 8 : 0;
        const address = A0 + A1 + A2 + A3;
        const dataIn = inputs[4];
        const writeEnable = inputs[5];
        const clk = inputs[6];
        const prevClk = prevInputs[6] || false;

        if (!nextMemory || nextMemory.length !== 16) {
            nextMemory = new Array(16).fill(false);
        }

        if (writeEnable && !prevClk && clk) {
            const newMem = [...nextMemory];
            newMem[address] = dataIn;
            nextMemory = newMem;
        }
        nextState = nextMemory[address] || false;
        break;
    }

    // HIGH DENSITY ICs
    case 'FULL_ADDER': {
        const a = inputs[0] ? 1 : 0;
        const b = inputs[1] ? 1 : 0;
        const cin = inputs[2] ? 1 : 0;
        const sum = (a + b + cin) % 2;
        const cout = (a + b + cin) > 1;
        nextInternalState = (cout ? 2 : 0) | (sum ? 1 : 0);
        nextState = Boolean(sum);
        break;
    }
    case 'REGISTER_4BIT': {
        const d = (inputs[0]?1:0) + (inputs[1]?2:0) + (inputs[2]?4:0) + (inputs[3]?8:0);
        const load = inputs[4];
        const clk = inputs[5];
        const clr = inputs[6];
        const prevClk = prevInputs[5] || false;

        if (clr) {
            nextInternalState = 0;
        } else if (load && !prevClk && clk) {
            nextInternalState = d;
        }
        nextState = (nextInternalState & 1) > 0;
        break;
    }
    case 'COUNTER_4BIT': {
        const clk = inputs[0];
        const rst = inputs[1];
        const en = inputs[2];
        const prevClk = prevInputs[0] || false;

        if (rst) {
            nextInternalState = 0;
        } else if (en && !prevClk && clk) {
            nextInternalState = (internalState + 1) % 16;
        }
        nextState = (nextInternalState & 1) > 0;
        break;
    }
    case 'ALU_4BIT': {
        const a = (inputs[0]?1:0) + (inputs[1]?2:0) + (inputs[2]?4:0) + (inputs[3]?8:0);
        const b = (inputs[4]?1:0) + (inputs[5]?2:0) + (inputs[6]?4:0) + (inputs[7]?8:0);
        const op = (inputs[8]?1:0) + (inputs[9]?2:0);
        const cin = inputs[10] ? 1 : 0;

        let res = 0;
        let carry = false;
        let zero = false;

        if (op === 0) { 
             res = a + b + cin;
             carry = res > 15;
             res = res % 16;
        } else if (op === 1) { 
             res = a - b - cin;
             carry = res < 0; 
             if (res < 0) res = 16 + res;
        } else if (op === 2) { 
             res = a & b;
        } else { 
             res = a | b;
        }
        
        zero = res === 0;
        nextInternalState = (carry ? 32 : 0) | (zero ? 16 : 0) | res;
        nextState = (res & 1) > 0;
        break;
    }
    case 'DECODER_2TO4': {
        const addr = (inputs[0]?1:0) + (inputs[1]?2:0);
        const en = inputs[2];
        if (!en) nextInternalState = 0;
        else nextInternalState = 1 << addr;
        nextState = (nextInternalState & 1) > 0;
        break;
    }

    default:
      nextState = false;
  }

  return { state: nextState, memory: nextMemory, internalState: nextInternalState, subCircuit: nextSubCircuit };
};

export const getNodeOutput = (node: CircuitNode, outputIndex: number): boolean => {
    // Standard Nodes (1 output)
    if (!['FULL_ADDER', 'REGISTER_4BIT', 'COUNTER_4BIT', 'ALU_4BIT', 'DECODER_2TO4', 'GAMEPAD', 'CUSTOM_IC'].includes(node.type)) {
        return node.state;
    }

    const val = node.internalState || 0;
    
    if (node.type === 'FULL_ADDER') return ((val >> outputIndex) & 1) === 1;
    if (node.type === 'REGISTER_4BIT' || node.type === 'COUNTER_4BIT' || node.type === 'DECODER_2TO4') return ((val >> outputIndex) & 1) === 1;
    if (node.type === 'ALU_4BIT') return ((val >> outputIndex) & 1) === 1;
    
    if (node.type === 'GAMEPAD') {
        return ((val >> outputIndex) & 1) === 1;
    }

    if (node.type === 'CUSTOM_IC') {
        return ((val >> outputIndex) & 1) === 1;
    }
    
    return false;
}

export const tickSimulation = (nodes: CircuitNode[], connections: Connection[], globalTick: number): CircuitNode[] => {
  const nodeMap = new Map(nodes.map(n => [n.id, { ...n }]));

  connections.forEach(conn => {
    const source = nodeMap.get(conn.sourceNodeId);
    const target = nodeMap.get(conn.targetNodeId);
    if (source && target) {
      if (!target.inputs) target.inputs = [];
      
      const outputIndex = conn.sourceOutputIndex || 0;
      target.inputs[conn.targetInputIndex] = getNodeOutput(source, outputIndex);
    }
  });

  const nextNodes: CircuitNode[] = [];
  nodeMap.forEach(node => {
    const safeInputs = node.inputs || [];
    const safePrevInputs = node.prevInputs || new Array(safeInputs.length).fill(false);
    
    const result = evaluateNode(node.type, safeInputs, node.state, globalTick, safePrevInputs, node.memory, node.internalState, node.subCircuit);
    
    nextNodes.push({
      ...node,
      state: result.state,
      memory: result.memory,
      internalState: result.internalState,
      prevInputs: [...safeInputs],
      subCircuit: result.subCircuit
    });
  });

  return nextNodes;
};
