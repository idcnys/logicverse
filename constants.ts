
import { LogicGateConfig, NodeType } from './types';

// Dimensions
export const GRID_SIZE = 40;
export const NODE_WIDTH = 80;
export const NODE_HEIGHT = 60;
export const PORT_RADIUS = 6;

export const COMPONENT_CONFIGS: Record<NodeType, LogicGateConfig> = {
  // INPUTS
  SWITCH: { inputs: 0, color: '#3b82f6', label: 'SW', description: 'Toggle Switch', category: 'Input' },
  BUTTON: { inputs: 0, color: '#ef4444', label: 'BTN', description: 'Momentary Push Button', category: 'Input' },
  CLOCK: { inputs: 0, color: '#8b5cf6', label: 'CLK', description: 'Square Wave Oscillator', category: 'Input' },
  GAMEPAD: { inputs: 0, color: '#6366f1', label: 'PAD', description: 'Game Controller (WASD/Arrows)', category: 'Input', width: 120, height: 80 },
  HIGH: { inputs: 0, color: '#10b981', label: '1', description: 'Constant High Voltage', category: 'Input', width: 50 },
  LOW: { inputs: 0, color: '#64748b', label: '0', description: 'Constant Low Voltage (GND)', category: 'Input', width: 50 },

  // DISCRETE
  RESISTOR: { inputs: 1, color: '#a3a3a3', label: 'RES', description: 'Resistor (Pass-through)', category: 'Discrete' },
  DIODE: { inputs: 1, color: '#525252', label: 'D', description: 'Diode', category: 'Discrete' },
  TRANSISTOR_NPN: { inputs: 2, color: '#475569', label: 'NPN', description: 'NPN Transistor (C, B)', category: 'Discrete' },
  TRANSISTOR_PNP: { inputs: 2, color: '#475569', label: 'PNP', description: 'PNP Transistor (E, B)', category: 'Discrete' },

  // LOGIC
  AND: { inputs: 2, color: '#ef4444', label: '&', description: 'AND Gate', category: 'Logic' },
  OR: { inputs: 2, color: '#22c55e', label: '≥1', description: 'OR Gate', category: 'Logic' },
  NOT: { inputs: 1, color: '#f97316', label: '1', description: 'NOT Gate (Inverter)', category: 'Logic', width: 60 },
  XOR: { inputs: 2, color: '#a855f7', label: '=1', description: 'XOR Gate', category: 'Logic' },
  NAND: { inputs: 2, color: '#ec4899', label: '!&', description: 'NAND Gate', category: 'Logic' },
  NOR: { inputs: 2, color: '#06b6d4', label: '!≥1', description: 'NOR Gate', category: 'Logic' },
  XNOR: { inputs: 2, color: '#6366f1', label: '!=1', description: 'XNOR Gate', category: 'Logic' },

  // MEMORY
  D_LATCH: { inputs: 2, color: '#d946ef', label: 'D-L', description: 'D Latch (En, D) - Level Triggered', category: 'Memory' },
  D_FLIP_FLOP: { inputs: 2, color: '#c026d3', label: 'D-FF', description: 'D Flip-Flop (Clk, D) - Edge Triggered', category: 'Memory' },
  RAM_16X1: { inputs: 7, color: '#db2777', label: 'RAM', description: '16x1 Bit Memory (A0-3, D, WE, CLK)', category: 'Memory', width: 100, height: 140 },

  // ICs (Integrated Circuits)
  FULL_ADDER: { inputs: 3, color: '#f59e0b', label: 'ADD', description: 'Full Adder (A, B, Cin)', category: 'IC', height: 80 },
  REGISTER_4BIT: { inputs: 7, color: '#0ea5e9', label: 'REG 4', description: '4-Bit Register (D0-3, Load, Clk, Clr)', category: 'IC', width: 100, height: 140 },
  COUNTER_4BIT: { inputs: 3, color: '#0ea5e9', label: 'CNT 4', description: '4-Bit Counter (Clk, Rst, En)', category: 'IC', width: 100, height: 100 },
  ALU_4BIT: { inputs: 11, color: '#f59e0b', label: 'ALU', description: '4-Bit ALU (A0-3, B0-3, Op0-1, Cin)', category: 'IC', width: 120, height: 180 },
  DECODER_2TO4: { inputs: 3, color: '#8b5cf6', label: 'DEC', description: '2-to-4 Decoder (A0, A1, En)', category: 'IC', width: 80, height: 100 },

  // OUTPUTS
  LIGHT: { inputs: 1, color: '#eab308', label: 'L', description: 'Standard Light', category: 'Output', width: 60 },
  LED_RED: { inputs: 1, color: '#ef4444', label: 'R', description: 'Red LED', category: 'Output', width: 50, height: 50 },
  LED_GREEN: { inputs: 1, color: '#22c55e', label: 'G', description: 'Green LED', category: 'Output', width: 50, height: 50 },
  LED_BLUE: { inputs: 1, color: '#3b82f6', label: 'B', description: 'Blue LED', category: 'Output', width: 50, height: 50 },
  SEVEN_SEG: { inputs: 4, color: '#dc2626', label: '8', description: 'Hex Display (1,2,4,8)', category: 'Output', width: 100, height: 120 },
  MATRIX_DISPLAY: { inputs: 11, color: '#22c55e', label: 'SCR', description: '16x16 Pixel Screen (X0-3, Y0-3, D, WE, CLK)', category: 'Output', width: 160, height: 160 },
  BUZZER: { inputs: 1, color: '#f43f5e', label: 'SPK', description: 'Buzzer (Sound on High)', category: 'Output', width: 50, height: 50 },

  // TOOLS
  LABEL: { inputs: 0, color: '#94a3b8', label: 'ABC', description: 'Text Label', category: 'Tools', width: 120, height: 40 },
  JUNCTION: { inputs: 1, color: '#94a3b8', label: '', description: 'Wire Junction', category: 'Tools', width: 24, height: 24 },
  
  // CUSTOM
  CUSTOM_IC: { inputs: 0, color: '#64748b', label: 'IC', description: 'Custom Integrated Circuit', category: 'Custom' },
  CUSTOM_INPUT: { inputs: 0, color: '#8b5cf6', label: 'IN', description: 'Input Terminal for Custom IC', category: 'Custom', width: 50, height: 40 },
  CUSTOM_OUTPUT: { inputs: 1, color: '#ec4899', label: 'OUT', description: 'Output Terminal for Custom IC', category: 'Custom', width: 50, height: 40 },
};
