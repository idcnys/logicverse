
export type NodeType = 
  // Inputs
  | 'SWITCH' | 'BUTTON' | 'CLOCK' | 'GAMEPAD' | 'HIGH' | 'LOW'
  // Outputs
  | 'LIGHT' | 'LED_RED' | 'LED_GREEN' | 'LED_BLUE' | 'SEVEN_SEG' | 'MATRIX_DISPLAY' | 'BUZZER'
  // Logic
  | 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR' | 'XNOR'
  // Memory
  | 'D_LATCH' | 'D_FLIP_FLOP' | 'RAM_16X1'
  // Discrete
  | 'RESISTOR' | 'DIODE' | 'TRANSISTOR_NPN' | 'TRANSISTOR_PNP'
  // Integrated Circuits
  | 'FULL_ADDER' | 'REGISTER_4BIT' | 'COUNTER_4BIT' | 'ALU_4BIT' | 'DECODER_2TO4'
  // Tools
  | 'LABEL' | 'JUNCTION'
  // Custom
  | 'CUSTOM_IC' | 'CUSTOM_INPUT' | 'CUSTOM_OUTPUT';

export interface Vector2 {
  x: number;
  y: number;
  z?: number;
}

export interface SubCircuitPortMap {
  internalNodeId: string;
  index: number; // Input index for inputMap, Output index for outputMap
  label?: string;
}

export interface SubCircuitData {
    nodes: CircuitNode[];
    connections: Connection[];
    inputMap: SubCircuitPortMap[];
    outputMap: SubCircuitPortMap[];
    width?: number;
    height?: number;
}

export interface CustomModule {
    name: string;
    data: SubCircuitData;
}

export interface CircuitNode {
  id: string;
  type: NodeType;
  position: Vector2;
  state: boolean; // The primary output state (usually index 0)
  inputs: boolean[]; // Current state of inputs
  prevInputs?: boolean[]; // Previous state of inputs (for edge detection)
  label?: string; // Custom text for Label nodes
  memory?: boolean[]; // For RAM/ROM components and Matrix Display
  internalState?: number; // Stores multi-bit state (integer) for ICs
  subCircuit?: SubCircuitData; // For CUSTOM_IC
}

export interface Connection {
  id: string;
  sourceNodeId: string;
  sourceOutputIndex?: number; // Defaults to 0 if undefined
  targetNodeId: string;
  targetInputIndex: number;
}

export interface LogicGateConfig {
  inputs: number;
  color: string;
  label: string;
  description: string;
  width?: number; // Optional custom width
  height?: number; // Optional custom height
  category: 'Input' | 'Logic' | 'Output' | 'Memory' | 'Discrete' | 'Tools' | 'IC' | 'Custom';
}
