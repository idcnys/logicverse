
import React, { useState, useEffect } from 'react';
import { CircuitProvider, useCircuitStore } from './store';
import CircuitCanvas from './components/Canvas/CircuitCanvas';
import Toolbar from './components/UI/Toolbar';
import Instructions from './components/UI/Instructions';
import { NodeType } from './types';
import { Trash2 } from 'lucide-react';

const AppContent = () => {
  const [addingType, setAddingType] = useState<NodeType | null>(null);
  const [toolMode, setToolMode] = useState<'PAN' | 'SELECT'>('SELECT');
  const { removeNodes, selectedNodeIds, nodes, wiringSourceId, copy, paste, undo, redo } = useCircuitStore();

  const selectedCount = selectedNodeIds.length;
  
  // Keyboard Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Delete
          if (e.key === 'Delete' || e.key === 'Backspace') {
              if (selectedNodeIds.length > 0) {
                  removeNodes(selectedNodeIds);
              }
          }
          // Copy (Ctrl+C)
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
              e.preventDefault();
              copy();
          }
          // Paste (Ctrl+V)
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
              e.preventDefault();
              paste();
          }
          // Undo (Ctrl+Z)
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
              e.preventDefault();
              undo();
          }
          // Redo (Ctrl+Y or Ctrl+Shift+Z)
          if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
              e.preventDefault();
              redo();
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, removeNodes, copy, paste, undo, redo]);

  const handleAddClick = (type: NodeType, customData?: any) => {
      if (customData) {
          (window as any)._tempCustomData = customData;
      }
      setAddingType(type === addingType ? null : type);
  }

  return (
    <div className="w-full h-full relative font-sans text-slate-200 bg-slate-950">
      
      {/* 2D Canvas Viewport */}
      <CircuitCanvas 
        addingType={addingType} 
        setAddingType={setAddingType}
        toolMode={toolMode}
      />

      {/* Overlays */}
      <Instructions />
      
      {/* Wiring Indicator */}
      {wiringSourceId && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-1 rounded-full text-sm animate-pulse pointer-events-none z-20">
          Wiring Mode: Select Target Input
        </div>
      )}

      {/* Selected Node Info (Delete Button) */}
      {selectedCount > 0 && (
          <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700 p-4 rounded-xl backdrop-blur-md w-64 z-20 shadow-xl">
              <h3 className="font-bold text-white mb-2">Selection</h3>
              <div className="text-xs text-slate-400 mb-4 font-mono">
                  {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
              </div>
              <button 
                onClick={() => removeNodes(selectedNodeIds)}
                className="w-full bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                  <Trash2 size={16} /> Remove
              </button>
          </div>
      )}

      <Toolbar 
        onAddClick={handleAddClick} 
        activeType={addingType}
        toolMode={toolMode}
        setToolMode={setToolMode}
      />
    </div>
  );
};

const App = () => {
  return (
    <CircuitProvider>
      <AppContent />
    </CircuitProvider>
  );
};

export default App;
