
import React from 'react';
import type { TableData } from '../types';

interface DataTableProps {
  data: TableData;
  maxHeight?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ data, maxHeight = '400px' }) => {
  const { headers, rows } = data;

  if (!headers.length || !rows.length) {
    return <p className="text-slate-500">No data to display.</p>;
  }
  
  const displayRows = rows;

  return (
    <div className="w-full overflow-hidden border border-slate-200 rounded-lg">
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="min-w-full divide-y divide-slate-200 bg-white">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={`${header}-${index}`}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {displayRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50 transition-colors">
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 5 && <div className="text-center bg-slate-50 py-1 text-xs text-slate-500 border-t border-slate-200">
        Displaying {displayRows.length} of {rows.length} rows
      </div>}
    </div>
  );
};
