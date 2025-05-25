
import React, { useState, useEffect, useCallback, useRef } from 'react';
import FileUploader from './components/FileUploader';
import PdfCanvasDisplay from './components/PdfCanvasDisplay';
import AnnotationToolbar from './components/AnnotationToolbar';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.js';

export interface Annotation {
  id: string;
  page: number;
  type: 'rect' | 'circle' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number; // For circle
  text?: string;
  color: string;
  fontSize?: number; // For text
  isDrawing?: boolean; // For real-time drawing
}

export type AnnotationTool = 'select' | 'rect' | 'circle' | 'text';
export type TargetScale = number | 'auto';

// Store for fetched custom font to avoid re-fetching
let customFontBytes: ArrayBuffer | null = null;

async function getCustomFont(pdfDoc: PDFDocument) {
  if (!customFontBytes) {
    try {
      // M PLUS Rounded 1c Regular - A Google Font that supports Japanese
      const fontUrl = 'https://rawcdn.githack.com/google/fonts/main/ofl/mplusrounded1c/MPLUSRounded1c-Regular.ttf';
      const response = await fetch(fontUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch font: ${response.statusText}`);
      }
      customFontBytes = await response.arrayBuffer();
    } catch (e) {
      console.error("Failed to load custom font, falling back to Helvetica.", e);
      // Fallback to Helvetica if custom font fails (though it won't support Japanese)
      return pdfDoc.embedFont(StandardFonts.Helvetica);
    }
  }
  return pdfDoc.embedFont(customFontBytes);
}


function App(): React.ReactNode {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<AnnotationTool>('select');
  const [currentColor, setCurrentColor] = useState<string>('#FF0000'); // Default red
  const [currentFontSize, setCurrentFontSize] = useState<number>(16); // Default font size

  const [targetScale, setTargetScale] = useState<TargetScale>('auto');
  const [actualRenderScale, setActualRenderScale] = useState<number>(1.0);

  const appContainerRef = useRef<HTMLDivElement>(null);

  // Load PDF
  useEffect(() => {
    if (!pdfFile) {
      setPdfDocProxy(null);
      setNumPages(0);
      setCurrentPage(1);
      setAnnotations([]);
      setTargetScale('auto'); // Reset zoom on new file
      setActualRenderScale(1.0);
      return;
    }

    setIsLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        try {
          const typedArray = new Uint8Array(e.target.result as ArrayBuffer);
          const loadingTask = pdfjsLib.getDocument(typedArray);
          const pdf = await loadingTask.promise;
          setPdfDocProxy(pdf);
          setNumPages(pdf.numPages);
          setCurrentPage(1); 
          setAnnotations([]); 
          setTargetScale('auto'); // Reset zoom on new file load
        } catch (err: any) {
          setError(`Error loading PDF: ${err.message}`);
          setPdfDocProxy(null);
          setNumPages(0);
        } finally {
          setIsLoading(false);
        }
      }
    };
    reader.onerror = () => {
      setError('Failed to read file.');
      setIsLoading(false);
    };
    reader.readAsArrayBuffer(pdfFile);

  }, [pdfFile]);

  const handleFileSelected = useCallback((file: File) => {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Invalid file type. Please select a PDF file.");
      setPdfFile(null);
      return;
    }
    setPdfFile(file);
  }, []);

  const addAnnotation = useCallback((annotation: Annotation) => {
    // Use the ID provided by PdfCanvasDisplay for drawing annotations
    setAnnotations(prev => [...prev, annotation]);
  }, []);
  
  const updateAnnotation = useCallback((updatedAnnotation: Annotation) => {
    setAnnotations(prev => prev.map(ann => ann.id === updatedAnnotation.id ? { ...ann, ...updatedAnnotation, isDrawing: false } : ann));
  }, []);

  const removeAnnotationById = useCallback((annotationId: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
  }, []);


  const handleSave = async () => {
    if (!pdfFile || !pdfDocProxy) {
      setError("No PDF loaded to save.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const existingPdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      // Get custom font (fetches if not already fetched)
      const fontToUse = await getCustomFont(pdfDoc);

      const scale = actualRenderScale; // Use the actual scale used for rendering

      for (const annotation of annotations) {
        if (annotation.page > 0 && annotation.page <= pdfDoc.getPageCount()) {
          const page = pdfDoc.getPage(annotation.page - 1); // pdf-lib is 0-indexed
          const { height: pageHeight } = page.getSize(); // PDF points height
          
          const color = rgb(
            parseInt(annotation.color.slice(1, 3), 16) / 255,
            parseInt(annotation.color.slice(3, 5), 16) / 255,
            parseInt(annotation.color.slice(5, 7), 16) / 255
          );

          if (annotation.type === 'rect' && annotation.width && annotation.height) {
            page.drawRectangle({
              x: annotation.x / scale,
              y: pageHeight - (annotation.y / scale) - (annotation.height / scale), // Transform Y and scale
              width: annotation.width / scale,
              height: annotation.height / scale,
              borderColor: color,
              borderWidth: Math.max(0.5, 2 / scale), // Scale border width too, min 0.5pt
            });
          } else if (annotation.type === 'circle' && annotation.radius && annotation.width && annotation.height) {
             // annotation.x, annotation.y is top-left of bounding box.
             // Center of circle in canvas pixels: (annotation.x + annotation.radius, annotation.y + annotation.radius)
            page.drawEllipse({
              x: (annotation.x + annotation.radius) / scale, // Center x in PDF points
              y: pageHeight - ((annotation.y + annotation.radius) / scale), // Center y in PDF points, transformed
              xScale: annotation.radius / scale, // Radius in PDF points
              yScale: annotation.radius / scale, // Radius in PDF points
              borderColor: color,
              borderWidth: Math.max(0.5, 2 / scale),
            });
          } else if (annotation.type === 'text' && annotation.text) {
            const fontSizeInPdfPoints = (annotation.fontSize || currentFontSize) / scale;
            page.drawText(annotation.text, {
              x: annotation.x / scale,
              // Adjust Y for text baseline. annotation.y is top of text box.
              // For pdf-lib, y is baseline. This approximation might need adjustment with custom font metrics.
              y: pageHeight - (annotation.y / scale) - (fontSizeInPdfPoints * 0.85), 
              font: fontToUse, // Use the custom or fallback font
              size: fontSizeInPdfPoints,
              color: color,
            });
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const originalFileName = pdfFile.name.substring(0, pdfFile.name.lastIndexOf('.'));
      link.download = `${originalFileName}_annotated.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      setError(null); 
    } catch (err: any) {
      console.error("Save error:", err);
      setError(`Failed to save PDF: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fileName = pdfFile?.name || null;

  const handleZoomIn = () => setTargetScale(prev => typeof prev === 'number' ? Math.min(5, prev * 1.25) : Math.min(5, actualRenderScale * 1.25));
  const handleZoomOut = () => setTargetScale(prev => typeof prev === 'number' ? Math.max(0.1, prev / 1.25) : Math.max(0.1, actualRenderScale / 1.25));
  const handleZoomFit = () => setTargetScale('auto');


  return (
    <div ref={appContainerRef} className="min-h-screen max-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-gray-100 flex flex-col items-center selection:bg-indigo-500 selection:text-white overflow-hidden">
      <header className="w-full text-center py-3 sm:py-4 bg-slate-900/70 backdrop-blur-sm shadow-lg z-20">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-pink-500 to-amber-400">
            PDF Annotator Pro
          </span>
        </h1>
      </header>

      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-400"></div>
          <p className="ml-3 text-slate-200 text-lg">Loading...</p>
        </div>
      )}
      
      {error && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 my-2 p-3 bg-red-600/90 backdrop-blur-sm text-white rounded-lg shadow-xl w-auto max-w-md text-center transition-all duration-300">
          <p className="font-medium">Error: {error}</p>
        </div>
      )}

      <AnnotationToolbar
        selectedTool={selectedTool}
        onToolChange={setSelectedTool}
        currentColor={currentColor}
        onColorChange={setCurrentColor}
        currentFontSize={currentFontSize}
        onFontSizeChange={setCurrentFontSize}
        onSave={handleSave}
        onClearAnnotations={() => setAnnotations(prev => prev.filter(a => a.page !== currentPage))}
        disabled={!pdfDocProxy || isLoading}
        fileName={fileName}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomFit={handleZoomFit}
        currentScale={actualRenderScale}
      />

      <main className="w-full flex flex-col items-center flex-grow overflow-hidden pt-2 pb-4 px-2 sm:px-4">
        {!pdfDocProxy && !isLoading && !error && (
           <div className="w-full flex-grow flex flex-col justify-center items-center">
             <FileUploader onFileSelect={handleFileSelected} disabled={isLoading} />
              <div className="mt-8 text-center p-8 sm:p-12 border-2 border-dashed border-slate-600 hover:border-slate-500 transition-colors rounded-xl max-w-lg w-full bg-slate-800/30 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-5 text-xl font-semibold text-slate-200">No PDF Loaded</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Select a PDF file to start annotating.
                </p>
              </div>
           </div>
        )}
        
        {pdfDocProxy && (
          <PdfCanvasDisplay
            pdfDocProxy={pdfDocProxy}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            annotations={annotations.filter(a => a.page === currentPage)}
            onAddAnnotation={addAnnotation}
            onUpdateAnnotation={updateAnnotation}
            onRemoveAnnotation={removeAnnotationById}
            selectedTool={selectedTool}
            currentColor={currentColor}
            currentFontSize={currentFontSize}
            numPages={numPages}
            containerRef={appContainerRef}
            targetScale={targetScale}
            onActualScaleChange={setActualRenderScale}
          />
        )}
      </main>
    </div>
  );
}

export default App;
