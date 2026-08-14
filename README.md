<div align="center">

  # LogicVerse 2D
</div>

<img width="800" alt="image" src="https://github.com/user-attachments/assets/3f5ab6ac-1b17-46be-80fe-fc068133c4c1" />


LogicVerse 2D is a browser-based digital circuit playground for building, simulating, and sharing logic circuits with gates, memory blocks, ICs, and custom modules.

[Try it now](https://lvsim.vercel.app/)

## Features

- Interactive 2D canvas with pan, zoom, and box selection
- Real-time logic simulation (play/pause)
- Rich component library (inputs, logic, discrete, memory, ICs, outputs, tools)
- Multi-output components (e.g., ALU, register, counter, gamepad)
- Undo/redo and clipboard support
- Circuit save/load using `.lverse` files
- Custom IC workflow (simplify selected nodes into reusable modules)
- Custom IC library import/export via JSON


## How to Use

### 1) Add components

1. Use the category tabs in the bottom toolbar (`Input`, `Logic`, `Discrete`, `Memory`, `Output`, `IC`, `Tools`, `Custom / IO`).
2. Click a component button.
3. Click on the canvas to place it.

### 2) Move around the canvas

- **Mouse wheel**: zoom in/out (centered on cursor)
- **Pan tool**: toggle from toolbar
- **Select tool**: drag on background to box-select nodes
- **Drag node(s)**: move selected nodes

### 3) Wire components

1. Click an output port on a source node.
2. Click an input port on a target node.
3. Right-click while wiring to cancel.

To remove a wire, right-click directly on the wire.

### 4) Edit and interact with components

- **Switch / Custom Input**: double-click to toggle
- **Button**: press and hold (momentary)
- **HIGH / LOW**: right-click to toggle 1/0
- **Label / Custom Output / Custom Input**: double-click label area to edit text
- **Gamepad node**: click on-pad controls (U/D/L/R/A/B)

### 5) Run simulation

- Simulation runs by default.
- Use the **Play/Pause** button in the toolbar to toggle simulation.

## Keyboard Shortcuts

- `Delete` / `Backspace`: remove selected nodes
- `Ctrl/Cmd + C`: copy selection
- `Ctrl/Cmd + V`: paste
- `Ctrl/Cmd + Z`: undo
- `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z`: redo

## Circuit Management

### Save / Load circuit

- **Save** button exports current circuit as a `.lverse` file
- **Load** button imports a `.lverse` file

Expected `.lverse` shape:

```json
{
  "version": "1.0",
  "timestamp": "ISO_DATE",
  "nodes": [],
  "connections": []
}
```

### Custom IC workflow

1. Build a reusable sub-circuit.
2. Select one or more nodes.
3. Right-click selection → **Simplify (Save to Custom)**.
4. Name the module.
5. Find it under **Custom / IO** and place it like any component.

Additional Custom actions:

- **Export**: save all custom modules to JSON
- **Import**: load custom module library JSON
- Select a placed custom IC and right-click → **Expand IC** to ungroup it

## Component Categories

- **Input**: Switches, button, clock, gamepad, constants
- **Logic**: AND/OR/NOT/XOR/NAND/NOR/XNOR
- **Discrete**: Resistor, diode, transistors
- **Memory**: D latch, D flip-flop, RAM 16x1
- **IC**: Full adder, register, counter, ALU, decoder
- **Output**: Lights, LEDs, seven segment, matrix display, buzzer
- **Tools**: Label, junction
- **Custom / IO**: Custom ICs and custom input/output terminals

## Notes

- Undo history is limited (up to 30 snapshots).
- Simulation is tick-based and continuously updates while enabled.
- This project currently renders the active editor in 2D (`LogicVerse 2D`).
