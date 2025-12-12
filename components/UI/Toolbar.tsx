
import React, { useState, useRef } from 'react';
import { COMPONENT_CONFIGS } from '../../constants';
import { NodeType } from '../../types';
import { useCircuitStore } from '../../store';
import { Trash2, Play, Pause, Save, FolderOpen, MousePointer2, Hand, Copy, Clipboard } from 'lucide-react';

interface ToolbarProps {
  onAddClick: (type: NodeType) => void;
  activeType: NodeType | null;
  toolMode: 'PAN' | 'SELECT';
  setToolMode: (mode: 'PAN' | 'SELECT') => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onAddClick, activeType, toolMode, setToolMode }) => {
  const { clearCircuit, isSimulating, toggleSimulation, loadCircuit, nodes, connections, copy, paste, clipboard } = useCircuitStore();
  const [activeCategory, setActiveCategory] = useState<string>('Logic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Input', 'Logic', 'Discrete', 'Memory', 'Output', 'Tools'];

  const handleSave = () => {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      nodes,
      connections
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `circuit-${Date.now()}.lverse`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        if (Array.isArray(data.nodes) && Array.isArray(data.connections)) {
            loadCircuit(data.nodes, data.connections);
        } else {
            alert('Invalid .lverse file structure.');
        }
      } catch (error) {
        console.error('Error loading file:', error);
        alert('Failed to parse .lverse file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl flex flex-col shadow-2xl z-10 max-w-[95vw]">
      
      {/* Category Tabs */}
      <div className="flex border-b border-slate-700 px-4 pt-2 gap-4 overflow-x-auto items-center">
          {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`pb-2 px-2 text-sm font-medium transition-colors ${activeCategory === cat ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}
              >
                  {cat}
              </button>
          ))}
          <div className="flex-1"></div>
          
          {/* Tools & Actions */}
          <div className="flex gap-2 pb-1 items-center">
             {/* Tools */}
             <div className="flex bg-slate-800 rounded-lg p-0.5 mr-2">
                 <button 
                    onClick={() => setToolMode('SELECT')} 
                    className={`p-1.5 rounded ${toolMode === 'SELECT' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Select Tool"
                 >
                    <MousePointer2 size={16} />
                 </button>
                 <button 
                    onClick={() => setToolMode('PAN')} 
                    className={`p-1.5 rounded ${toolMode === 'PAN' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Pan Tool"
                 >
                    <Hand size={16} />
                 </button>
             </div>

             {/* Clipboard */}
             <button onClick={copy} className="text-slate-400 hover:text-white" title="Copy (Ctrl+C)">
                <Copy size={16} />
             </button>
             <button onClick={paste} className={`text-slate-400 hover:text-white ${!clipboard ? 'opacity-30 cursor-not-allowed' : ''}`} disabled={!clipboard} title="Paste (Ctrl+V)">
                <Clipboard size={16} />
             </button>

             <div className="w-px h-4 bg-slate-700 mx-1"></div>

             <button onClick={toggleSimulation} className="text-slate-400 hover:text-green-400" title="Play/Pause">
                {isSimulating ? <Pause size={16} /> : <Play size={16} />}
             </button>
             <button onClick={clearCircuit} className="text-slate-400 hover:text-red-400" title="Clear">
                <Trash2 size={16} />
             </button>
             
             <div className="w-px h-4 bg-slate-700 mx-1"></div>
             
             <button onClick={handleSave} className="text-slate-400 hover:text-blue-400" title="Save .lverse">
                <Save size={16} />
             </button>
             <button onClick={handleLoadClick} className="text-slate-400 hover:text-yellow-400" title="Load .lverse">
                <FolderOpen size={16} />
             </button>
             
             <input 
                ref={fileInputRef}
                type="file" 
                accept=".lverse" 
                onChange={handleFileChange}
                className="hidden" 
             />
          </div>
      </div>

      {/* Component List */}
      <div className="p-3 flex gap-2 overflow-x-auto">
        {(Object.keys(COMPONENT_CONFIGS) as NodeType[])
          .filter(type => COMPONENT_CONFIGS[type].category === activeCategory)
          .map((type) => {
          const config = COMPONENT_CONFIGS[type];
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => onAddClick(type)}
              className={`
                flex flex-col items-center justify-center min-w-[3.5rem] h-14 rounded-xl border transition-all p-1
                ${isActive 
                    ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}
              `}
              title={config.description}
            >
              <span className="font-bold text-xs" style={{ color: isActive ? 'white' : config.color }}>{config.label}</span>
              <span className="text-[10px] opacity-60 truncate w-full text-center mt-1">{type.replace('_',' ')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Toolbar;
