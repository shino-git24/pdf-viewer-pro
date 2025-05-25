
import React, { useRef } from 'react';

const UploadIconInternal: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2.5 group-hover:text-indigo-300 transition-colors duration-150" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v12.75" />
  </svg>
);

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileSelect(event.target.files[0]);
    }
    if(fileInputRef.current) {
        fileInputRef.current.value = ""; 
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="my-4 sm:my-6 flex flex-col items-center">
      <input
        type="file"
        accept="application/pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
        id="pdf-upload-input"
        aria-labelledby="upload-button-label"
      />
      <button
        id="upload-button-label"
        onClick={handleClick}
        disabled={disabled}
        type="button"
        className="group relative flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
        aria-label="Select PDF file to view and annotate"
      >
        <UploadIconInternal />
        Select PDF
      </button>
    </div>
  );
};

export default FileUploader;
