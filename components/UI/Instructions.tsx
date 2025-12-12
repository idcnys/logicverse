
import React from 'react';

const Instructions = () => {
  return (
    <div className="absolute top-4 left-4 pointer-events-none select-none z-10">
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 tracking-tighter">
        LOGICVERSE<span className="text-xs ml-1 align-top text-slate-500">2D</span>
      </h1>
      <div className="mt-2 text-slate-400 text-sm max-w-xs space-y-1 bg-slate-900/50 p-2 rounded border border-slate-800 backdrop-blur">
        <p><span className="text-white font-bold">Add:</span> Select component, click on canvas.</p>
        <p><span className="text-white font-bold">Pan:</span> Click & Drag background.</p>
        <p><span className="text-white font-bold">Zoom:</span> Mouse Wheel.</p>
        <p><span className="text-white font-bold">Wire:</span> Click Output (Right) &rarr; Input (Left).</p>
        <p><span className="text-white font-bold">Toggle:</span> Double-click Switches.</p>
        <p><span className="text-white font-bold">Delete Wire:</span> Right-Click Wire.</p>
        <p><span className="text-white font-bold">Label:</span> Double-click Label node to edit.</p>
      </div>
    </div>
  );
};

export default Instructions;
