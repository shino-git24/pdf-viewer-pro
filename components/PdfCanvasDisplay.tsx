
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';
import type { Annotation, AnnotationTool, TargetScale } from '@/App';

interface PdfCanvasDisplayProps {
  pdfDocProxy: PDFDocumentProxy;
  currentPage: number;
  onPageChange: (page: number) => void;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Annotation) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
  onRemoveAnnotation: (annotationId: string) => void;
  selectedTool: AnnotationTool;
  currentColor: string;
  currentFontSize: number;
  numPages: number;
  containerRef: React.RefObject<HTMLDivElement>; // For calculating available space
  targetScale: TargetScale;
  onActualScaleChange: (scale: number) => void;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;

const PdfCanvasDisplay: React.FC<PdfCanvasDisplayProps> = ({
  pdfDocProxy,
  currentPage,
  onPageChange,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  selectedTool,
  currentColor,
  currentFontSize,
  numPages,
  containerRef,
  targetScale,
  onActualScaleChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<Annotation | null>(null);
  
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean; text: string }>({ x: 0, y: 0, visible: false, text: '' });
  const textInputRef = useRef<HTMLInputElement>(null);
  
  const currentRenderTaskRef = useRef<RenderTask | null>(null);
  const [viewportRevision, setViewportRevision] = useState(0); // Trigger re-render on container resize

  const drawAnnotations = useCallback((ctx: CanvasRenderingContext2D, scale: number) => {
    annotations.forEach(ann => {
      if (!ann) return; 
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      // Adjust line width based on scale, but ensure it's visible.
      // Use a minimum physical pixel width (e.g., 1.5px) and scale it down for drawing.
      // Or, ensure a minimum PDF point width when saving. For now, simple scaled line width.
      ctx.lineWidth = Math.max(1, 2 / scale); // e.g. 2 PDF points wide line, scaled. Min 1 canvas pixel.


      if (ann.type === 'rect' && ann.width != null && ann.height != null) {
        ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
      } else if (ann.type === 'circle' && ann.radius != null && ann.width != null && ann.height != null) { 
        ctx.beginPath();
        ctx.arc(ann.x + ann.radius, ann.y + ann.radius, ann.radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (ann.type === 'text' && ann.text) {
        const finalFontSize = (ann.fontSize || currentFontSize); // This is in canvas pixels
        ctx.font = `${finalFontSize}px Arial`;
        ctx.fillText(ann.text, ann.x, ann.y + finalFontSize * 0.85); 
      }
    });
  }, [annotations, currentFontSize]);

  // Resize Observer for container
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    const observer = new ResizeObserver(() => {
      setViewportRevision(v => v + 1);
    });
    
    observer.observe(currentContainer);
    
    return () => {
      if (currentContainer) {
        observer.unobserve(currentContainer);
      }
      observer.disconnect();
    };
  }, [containerRef]);

  // Main rendering effect for PDF page and annotations
  useEffect(() => {
    let isActive = true;
    let newRenderTaskInternal: RenderTask | null = null;

    const performRenderAndDrawAnnotations = async () => {
      if (currentRenderTaskRef.current) {
        currentRenderTaskRef.current.cancel();
        currentRenderTaskRef.current = null;
      }

      if (!pdfDocProxy || !canvasRef.current || !containerRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      try {
        const page = await pdfDocProxy.getPage(currentPage);
        if (!isActive) return;

        const displayArea = containerRef.current.getBoundingClientRect();
        // Subtract padding/margin of the canvas's immediate parent for more accuracy
        // Assuming parent is the one with overflow-auto and p-1 sm:p-2 md:p-3
        const parentPadding = (window.innerWidth < 640 ? 1 : (window.innerWidth < 768 ? 2 : 3)) * 4 * 2; // approx p-X * 4px * 2 sides
        const availableWidth = Math.max(1, displayArea.width - parentPadding);
        // Height needs to consider pagination controls too.
        // Approx height of pagination: 40px. Toolbar is outside this `main` container.
        const availableHeight = Math.max(1, displayArea.height - parentPadding - 40); 


        const viewportDefault = page.getViewport({ scale: 1 });
        let scaleForAutoFit = 1;
        if (viewportDefault.width > 0 && viewportDefault.height > 0) {
            scaleForAutoFit = Math.min(availableWidth / viewportDefault.width, availableHeight / viewportDefault.height);
        }
        scaleForAutoFit = Math.max(MIN_SCALE, scaleForAutoFit); // Ensure min scale for auto

        let finalScale = typeof targetScale === 'number' ? targetScale : scaleForAutoFit;
        finalScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, finalScale)); // Clamp to min/max

        if (isActive) { // Update App's actual scale
          onActualScaleChange(finalScale);
        }
        
        const viewport = page.getViewport({ scale: finalScale });

        canvas.width = Math.max(1, viewport.width);
        canvas.height = Math.max(1, viewport.height);
        // canvas.style.width = `${viewport.width}px`; // Control display size if needed, but width/height attributes control backing store
        // canvas.style.height = `${viewport.height}px`;

        
        newRenderTaskInternal = page.render({
          canvasContext: context,
          viewport: viewport,
        });
        currentRenderTaskRef.current = newRenderTaskInternal;

        await newRenderTaskInternal.promise;
        
        if (!isActive || currentRenderTaskRef.current !== newRenderTaskInternal) {
          return; 
        }

        drawAnnotations(context, finalScale);

      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException' && isActive) {
          console.error('Error during PDF render/annotation draw:', error);
        }
      } finally {
        if (isActive && currentRenderTaskRef.current === newRenderTaskInternal) {
          currentRenderTaskRef.current = null;
        }
      }
    };

    performRenderAndDrawAnnotations();

    return () => {
      isActive = false;
      if (currentRenderTaskRef.current) {
        currentRenderTaskRef.current.cancel();
        currentRenderTaskRef.current = null;
      }
    };
  }, [
    pdfDocProxy, 
    currentPage, 
    containerRef, 
    annotations, 
    currentFontSize, // For text annotation default size, if not on annotation itself
    drawAnnotations, 
    viewportRevision,
    targetScale, // Add targetScale as dependency
    onActualScaleChange 
  ]);


  const getMousePos = (event: React.MouseEvent): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handleCanvasClick = (event: React.MouseEvent) => {
    if (selectedTool === 'text' && !textInput.visible) {
        const pos = getMousePos(event);
        setTextInput({ x: pos.x, y: pos.y, visible: true, text: '' });
        setTimeout(() => textInputRef.current?.focus(), 0);
    }
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    if (selectedTool === 'select' || selectedTool === 'text' || !canvasRef.current || event.button !== 0) return; 
    if (textInput.visible) { // Finalize text if mousedown outside input
        handleTextSubmit(); 
        return;
    }

    const pos = getMousePos(event);
    setIsDrawing(true);
    setStartPos(pos);
    
    let determinedType: 'rect' | 'circle' = selectedTool as 'rect' | 'circle'; // Cast, as 'text' and 'select' are handled

    const newAnnotation: Annotation = {
        id: `drawing-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // More unique temp ID
        page: currentPage,
        type: determinedType,
        x: pos.x,
        y: pos.y,
        width: 0, 
        height: 0, 
        radius: 0, 
        text: '', 
        color: currentColor,
        fontSize: currentFontSize, 
        isDrawing: true,
    };

    setCurrentDrawing(newAnnotation);
    onAddAnnotation(newAnnotation); 
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDrawing || !startPos || !currentDrawing || selectedTool === 'text' || selectedTool === 'select') return;
    
    const pos = getMousePos(event);
    let updatedAnnotation = { ...currentDrawing };

    const dX = pos.x - startPos.x;
    const dY = pos.y - startPos.y;

    if (selectedTool === 'rect') {
      updatedAnnotation.x = dX > 0 ? startPos.x : pos.x;
      updatedAnnotation.y = dY > 0 ? startPos.y : pos.y;
      updatedAnnotation.width = Math.abs(dX);
      updatedAnnotation.height = Math.abs(dY);
    } else if (selectedTool === 'circle') {
      updatedAnnotation.x = Math.min(startPos.x, pos.x);
      updatedAnnotation.y = Math.min(startPos.y, pos.y);
      const side = Math.max(Math.abs(dX), Math.abs(dY)); 
      updatedAnnotation.width = side;
      updatedAnnotation.height = side;
      updatedAnnotation.radius = side / 2;
    }
    
    setCurrentDrawing(updatedAnnotation);
    onUpdateAnnotation(updatedAnnotation);
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    if (event.button !== 0) return; 
    if (!isDrawing || !currentDrawing || selectedTool === 'text' || selectedTool === 'select') {
        if (isDrawing) setIsDrawing(false);
        if (startPos) setStartPos(null);
        if (currentDrawing) setCurrentDrawing(null);
        return;
    }
    
    const finalAnnotation = { ...currentDrawing, isDrawing: false };
    if ((finalAnnotation.type === 'rect' && (finalAnnotation.width === 0 || finalAnnotation.height === 0)) ||
        (finalAnnotation.type === 'circle' && finalAnnotation.radius === 0)) {
        onRemoveAnnotation(finalAnnotation.id);
    } else {
        onUpdateAnnotation(finalAnnotation); 
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentDrawing(null);
  };
  
  const handleMouseLeave = (event: React.MouseEvent) => {
    if (isDrawing && currentDrawing && selectedTool !== 'text' && selectedTool !== 'select') {
       handleMouseUp(event); 
    }
  };

  const handleTextSubmit = () => {
    if (textInput.text.trim() !== '') {
      onAddAnnotation({
        id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        page: currentPage,
        type: 'text',
        x: textInput.x,
        y: textInput.y,
        text: textInput.text,
        color: currentColor,
        fontSize: currentFontSize,
        width: 0, height: 0, radius: 0,
      });
    }
    setTextInput({ x: 0, y: 0, visible: false, text: '' });
  };
  
  const handleTextInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleTextSubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setTextInput({ x: 0, y: 0, visible: false, text: '' });
    }
  };

  // Focus text input when it becomes visible
  useEffect(() => {
    if (textInput.visible && textInputRef.current) {
        textInputRef.current.focus();
    }
  }, [textInput.visible]);

  const goToPrevPage = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < numPages) onPageChange(currentPage + 1);
  };

  const canvasCursor = selectedTool === 'select' ? 'grab' : (selectedTool === 'text' ? 'text' : 'crosshair');

  return (
    <div className="w-full h-full flex flex-col items-center justify-start overflow-hidden relative"> {/* Changed justify-center to justify-start */}
      <div 
        className="flex-grow w-full flex items-center justify-center overflow-auto p-1 sm:p-2 md:p-3 relative"
        style={{ cursor: selectedTool === 'select' && isDrawing ? 'grabbing' : canvasCursor }}
        onMouseDown={selectedTool === 'select' ? (e) => { /* Panning logic could start here */ } : undefined}
        onMouseMove={selectedTool === 'select' ? (e) => { /* Panning logic */ } : undefined}
        onMouseUp={selectedTool === 'select' ? (e) => { /* Panning logic end */ } : undefined}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick} // Moved from onMouseDown to allow text tool to place input
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="shadow-2xl rounded-md border border-slate-600"
          style={{ 
            // cursor: canvasCursor, // Cursor is now on parent div for select tool panning
            maxWidth: '100%', 
            maxHeight: '100%',
            display: 'block', // Important for preventing extra space below canvas in flex/grid
          }}
          aria-label="PDF page canvas for viewing and annotating"
          role="img"
        />
        {textInput.visible && (
          <input
            ref={textInputRef}
            type="text"
            className="annotation-text-input"
            style={{ 
                left: textInput.x + (canvasRef.current?.offsetLeft || 0), 
                top: textInput.y + (canvasRef.current?.offsetTop || 0) 
            }}
            value={textInput.text}
            onChange={(e) => setTextInput(prev => ({ ...prev, text: e.target.value }))}
            onKeyDown={handleTextInputKeyDown}
            onBlur={handleTextSubmit} 
            placeholder="Enter text..."
            aria-label="Text input for annotation"
          />
        )}
      </div>
      
      {numPages > 0 && (
        <div className="flex items-center justify-center space-x-2 sm:space-x-3 p-1.5 sm:p-2 bg-slate-800/60 backdrop-blur-sm rounded-md shadow-md mt-1 sm:mt-2">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-medium"
            aria-label="Previous page"
          >
            Prev
          </button>
          <span className="text-slate-300 text-xs sm:text-sm tabular-nums">
            Page {currentPage} of {numPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-medium"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfCanvasDisplay;
