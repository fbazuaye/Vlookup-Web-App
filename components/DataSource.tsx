import React, { useState, useRef } from 'react';
import type { Table } from '../types';
import { DataTable } from './DataTable';
import { UploadIcon, ClipboardIcon, XIcon } from './Icons';

interface DataSourceProps {
  id: string;
  title: string;
  onDataParsed: (file: File) => void;
  onPastedData: (text: string) => void;
  table: Table | null;
  onClear: () => void;
}

type InputMode = 'upload' | 'paste';

export const DataSource: React.FC<DataSourceProps> = ({ id, title, onDataParsed, onPastedData, table, onClear }) => {
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onDataParsed(file);
    }
  };

  const handlePasteAndParse = () => {
    if(pastedText.trim()){
      onPastedData(pastedText);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    // Simple extension check fallback for broader compatibility
    if (file) {
        const name = file.name.toLowerCase();
        if (name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
            onDataParsed(file);
        }
    }
  };

  if (table) {
    return (
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
          <button onClick={onClear} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 font-medium">
             <XIcon className="w-4 h-4" /> Clear
          </button>
        </div>
        <div className="bg-slate-100 p-2 rounded-md text-sm text-slate-600 mb-3 truncate">
          Source: <span className="font-medium">{table.name}</span>
        </div>
        <DataTable data={table.data} maxHeight="200px" />
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-700 mb-3">{title}</h3>
      <div className="flex border-b border-slate-200 mb-4">
        <button
          onClick={() => setInputMode('upload')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${inputMode === 'upload' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <UploadIcon className="w-5 h-5" /> Upload File
        </button>
        <button
          onClick={() => setInputMode('paste')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${inputMode === 'paste' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ClipboardIcon className="w-5 h-5" /> Paste Data
        </button>
      </div>

      {inputMode === 'upload' && (
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
        >
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <div className="flex flex-col items-center text-slate-500">
             <UploadIcon className="w-10 h-10 mb-2" />
            <p className="font-semibold">Click to upload or drag & drop</p>
            <p className="text-sm">CSV or Excel files</p>
          </div>
        </div>
      )}
      
      {inputMode === 'paste' && (
        <div>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste your CSV data here..."
            className="w-full h-32 p-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          ></textarea>
          <button
            onClick={handlePasteAndParse}
            disabled={!pastedText.trim()}
            className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
          >
            Parse Pasted Data
          </button>
        </div>
      )}
    </div>
  );
};