
import React from 'react';
import type { AnnotationTool } from '@/App'; // Assuming App.tsx is in src

interface AnnotationToolbarProps {
  selectedTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  currentFontSize: number;
  onFontSizeChange: (size: number) => void;
  onSave: () => void;
  onClearAnnotations: () => void; 
  disabled?: boolean;
  fileName: string | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  currentScale: number;
}

// Simple SVG Icons (existing ones)
const MousePointerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M10.224 6.943a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L13.94 12l-3.718-3.718a.75.75 0 010-1.06zM8.999 3a.75.75 0 01.53 1.28L5.28 8.53a.75.75 0 01-1.06-1.06L8.47 3.22a.75.75 0 01.53-.22zM4.75 9.5a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" /></svg>
);
const SquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" /></svg>
);
const CircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const TextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-6.75 3h9M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
);
const SaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
);
const ClearIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0L12 14.25m2.25-2.25L16.5 12m-4.5 6.75a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

// Zoom Icons
const ZoomInIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
    </svg>
);
const ZoomOutIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 10.5h6" />
    </svg>
);
const FitScreenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
    </svg>
);


const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  selectedTool,
  onToolChange,
  currentColor,
  onColorChange,
  currentFontSize,
  onFontSizeChange,
  onSave,
  onClearAnnotations,
  disabled,
  fileName,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  currentScale
}) => {
  const toolButtonClass = (tool: AnnotationTool | 'zoom') =>
    // Fix: Reordered condition to satisfy TypeScript. `selectedTool === tool` is only evaluated if `tool !== 'zoom'`.
    `p-2 rounded-md hover:bg-slate-600 transition-colors ${tool !== 'zoom' && selectedTool === tool ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-slate-100'
    } disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className="w-full bg-slate-800/80 backdrop-blur-md shadow-md p-2 sm:p-3 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10">
      <div className="flex items-center gap-1 sm:gap-2">
        <button onClick={() => onToolChange('select')} className={toolButtonClass('select')} disabled={disabled} title="Select Tool (View/Pan Mode)">
          <MousePointerIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button onClick={() => onToolChange('rect')} className={toolButtonClass('rect')} disabled={disabled} title="Draw Rectangle">
          <SquareIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button onClick={() => onToolChange('circle')} className={toolButtonClass('circle')} disabled={disabled} title="Draw Circle">
          <CircleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button onClick={() => onToolChange('text')} className={toolButtonClass('text')} disabled={disabled} title="Add Text">
          <TextIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <input
          type="color"
          value={currentColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="color-picker-input ml-1 sm:ml-2 w-8 h-8 sm:w-9 sm:h-9 p-0.5 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          disabled={disabled || selectedTool === 'select'}
          title="Select Color"
          aria-label="Select annotation color"
        />
         {selectedTool === 'text' && (
          <div className="flex items-center ml-1 sm:ml-2">
            <label htmlFor="fontSizeSelect" className="sr-only">Font Size</label>
            <select
              id="fontSizeSelect"
              value={currentFontSize}
              onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
              className="bg-slate-700 text-slate-200 border border-slate-600 rounded-md p-1.5 sm:p-2 text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
              disabled={disabled}
              title="Select Font Size"
            >
              {[10, 12, 14, 16, 20, 24, 30, 36, 48].map(size => (
                <option key={size} value={size}>{size}pt</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2">
        <button onClick={onZoomOut} className={toolButtonClass('zoom')} disabled={disabled} title="Zoom Out">
          <ZoomOutIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <span className="text-slate-300 text-xs sm:text-sm w-12 text-center tabular-nums" title="Current Zoom Level">
            {Math.round(currentScale * 100)}%
        </span>
        <button onClick={onZoomIn} className={toolButtonClass('zoom')} disabled={disabled} title="Zoom In">
          <ZoomInIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button onClick={onZoomFit} className={toolButtonClass('zoom')} disabled={disabled} title="Fit to Page">
          <FitScreenIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>


      {fileName && (
        <div className="text-xs sm:text-sm text-slate-400 truncate hidden lg:block order-first lg:order-none mx-auto" title={fileName}>
          File: <span className="font-medium text-slate-300">{fileName.length > 30 ? `${fileName.substring(0,27)}...` : fileName}</span>
        </div>
      )}

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={onClearAnnotations}
          className="p-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm"
          disabled={disabled}
          title="Clear Annotations on Current Page"
        >
          <ClearIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Clear Page</span>
        </button>
        <button
          onClick={onSave}
          className="p-2 rounded-md bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm"
          disabled={disabled}
          title="Save Annotated PDF"
        >
          <SaveIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Save PDF</span>
          <span className="sm:hidden">Save</span>
        </button>
      </div>
    </div>
  );
};

export default AnnotationToolbar;