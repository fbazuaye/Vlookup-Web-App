import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Table, TableData } from './types';
import { DataSource } from './components/DataSource';
import { DataTable } from './components/DataTable';
import { DownloadIcon, LinkIcon } from './components/Icons';
import { parseCsv, generateCsv, parseFile } from './services/csvService';

export default function App() {
  const [tableA, setTableA] = useState<Table | null>(null);
  const [tableB, setTableB] = useState<Table | null>(null);
  const [mergedData, setMergedData] = useState<TableData | null>(null);
  
  const [lookupColumn, setLookupColumn] = useState<string>('');
  const [matchColumn, setMatchColumn] = useState<string>('');
  const [returnColumn, setReturnColumn] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-select columns if they have the same name
  useEffect(() => {
    if (tableA && tableB) {
      const headersA = tableA.data.headers;
      const headersB = tableB.data.headers;
      
      // Find a common header (case-insensitive preference, or exact)
      const commonHeader = headersA.find(h => 
        headersB.some(hb => hb.toLowerCase() === h.toLowerCase())
      );

      if (commonHeader) {
        // Find the exact string in B that matches
        const headerInB = headersB.find(h => h.toLowerCase() === commonHeader.toLowerCase());
        
        if (headerInB) {
          setLookupColumn(prev => prev || commonHeader);
          setMatchColumn(prev => prev || headerInB);
        }
      }
    }
  }, [tableA, tableB]);

  const handleDataParsed = useCallback(async (file: File, tableSetter: React.Dispatch<React.SetStateAction<Table | null>>) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await parseFile(file);
      
      if (data.headers.length === 0 || data.rows.length === 0) {
        throw new Error("File is empty or invalid. Please check the file and try again.");
      }
      tableSetter({ name: file.name, data });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred during parsing.');
      tableSetter(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePastedData = useCallback(async (text: string, tableSetter: React.Dispatch<React.SetStateAction<Table | null>>) => {
    setIsLoading(true);
    setError(null);
    try {
        const data = await parseCsv(text);
        if (data.headers.length === 0 || data.rows.length === 0) {
          throw new Error("Pasted data is empty or invalid. Please ensure it's valid CSV format.");
        }
        tableSetter({ name: 'Pasted Data', data });
    } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred during parsing.');
        tableSetter(null);
    } finally {
        setIsLoading(false);
    }
  }, []);


  const handlePerformVlookup = useCallback(() => {
    if (!tableA || !tableB || !lookupColumn || !matchColumn || !returnColumn) {
      setError('Please ensure both tables are loaded and all columns are selected.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setMergedData(null);
    
    // Use a timeout to allow the UI to update to the loading state
    setTimeout(() => {
      try {
        const matchColumnIndex = tableB.data.headers.indexOf(matchColumn);
        const returnColumnIndex = tableB.data.headers.indexOf(returnColumn);

        const lookupMap = new Map<string, any[]>();
        for (const row of tableB.data.rows) {
          const key = String(row[matchColumnIndex]);
          lookupMap.set(key, row);
        }

        const newHeaders = [...tableA.data.headers, returnColumn];
        const lookupColumnIndex = tableA.data.headers.indexOf(lookupColumn);

        const newRows = tableA.data.rows.map(rowA => {
          const lookupValue = String(rowA[lookupColumnIndex]);
          const matchedRowB = lookupMap.get(lookupValue);
          const returnValue = matchedRowB ? matchedRowB[returnColumnIndex] : 'N/A';
          return [...rowA, returnValue];
        });
        
        setMergedData({ headers: newHeaders, rows: newRows });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An error occurred during the VLOOKUP operation.');
      } finally {
        setIsLoading(false);
      }
    }, 50);
  }, [tableA, tableB, lookupColumn, matchColumn, returnColumn]);

  const handleDownload = () => {
    if (!mergedData) return;
    try {
      const csvContent = generateCsv(mergedData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'merged_data.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(e) {
       setError(e instanceof Error ? e.message : 'Failed to generate CSV for download.');
    }
  };

  const isVlookupReady = useMemo(() => !!(tableA && tableB && lookupColumn && matchColumn && returnColumn), [tableA, tableB, lookupColumn, matchColumn, returnColumn]);

  const resetTable = (tableSetter: React.Dispatch<React.SetStateAction<Table | null>>, isTableA: boolean) => {
      tableSetter(null);
      setMergedData(null);
      if (isTableA) {
        setLookupColumn('');
      } else {
        setMatchColumn('');
        setReturnColumn('');
      }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-20">
        <div className="container mx-auto max-w-7xl flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">VLookup Web App</h1>
          <p className="text-sm text-slate-500 hidden sm:block">VLOOKUP, right in your browser.</p>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl p-4 md:p-6 flex-grow">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-sm" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DataSource
            id="table-a"
            title="Table A (Lookup Table)"
            onDataParsed={(file) => handleDataParsed(file, setTableA)}
            onPastedData={(text) => handlePastedData(text, setTableA)}
            table={tableA}
            onClear={() => resetTable(setTableA, true)}
          />
          <DataSource
            id="table-b"
            title="Table B (Data Source)"
            onDataParsed={(file) => handleDataParsed(file, setTableB)}
            onPastedData={(text) => handlePastedData(text, setTableB)}
            table={tableB}
            onClear={() => resetTable(setTableB, false)}
          />
        </div>
        
        <div className="mt-8 bg-white p-6 rounded-lg border border-slate-200 shadow-sm transition-all duration-300 ease-in-out">
            <h2 className="text-xl font-semibold mb-4 text-slate-700">VLOOKUP Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Lookup Column */}
                <div className="flex flex-col">
                  <label htmlFor="lookup-column" className="font-medium mb-2 text-slate-600">
                    1. Lookup Column (from Table A)
                  </label>
                  <select 
                    id="lookup-column" 
                    value={lookupColumn} 
                    onChange={(e) => setLookupColumn(e.target.value)} 
                    className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="" disabled>{tableA ? "Select column" : "Waiting for Table A..."}</option>
                    {tableA?.data.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                
                {/* Match & Return Columns */}
                <div className="flex flex-col">
                   <label htmlFor="match-column" className="font-medium mb-2 text-slate-600">
                    2. Match Column (from Table B)
                   </label>
                  <select 
                    id="match-column" 
                    value={matchColumn} 
                    onChange={(e) => setMatchColumn(e.target.value)} 
                    className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="" disabled>{tableB ? "Select column" : "Waiting for Table B..."}</option>
                    {tableB?.data.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div className="flex flex-col">
                   <label htmlFor="return-column" className="font-medium mb-2 text-slate-600">
                    3. Return Column (from Table B)
                   </label>
                  <select 
                    id="return-column" 
                    value={returnColumn} 
                    onChange={(e) => setReturnColumn(e.target.value)} 
                    className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="" disabled>{tableB ? "Select column" : "Waiting for Table B..."}</option>
                    {tableB?.data.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
            </div>
            <div className="mt-6 flex justify-center">
              <button
                onClick={handlePerformVlookup}
                disabled={!isVlookupReady || isLoading}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-5 h-5" />
                    Perform VLOOKUP
                  </>
                )}
              </button>
            </div>
          </div>

        {mergedData && (
          <div className="mt-8 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-700">Merged Result</h2>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200"
              >
                <DownloadIcon className="w-5 h-5" />
                Download CSV
              </button>
            </div>
            <DataTable data={mergedData} />
          </div>
        )}
      </main>

      <footer className="bg-slate-100 border-t border-slate-200 py-6 mt-auto">
        <div className="container mx-auto text-center text-slate-500 text-sm font-medium">
          Designed By Frank Bazuaye | Powered By LiveGig Ltd
        </div>
      </footer>
    </div>
  );
}