import type { TableData } from '../types';
import { read, utils } from 'xlsx';

/**
 * A simple CSV parser.
 * Handles quoted fields, including commas and newlines inside quotes.
 */
export const parseCsv = (csvText: string): Promise<TableData> => {
  return new Promise((resolve, reject) => {
    try {
      const rows: string[][] = [];
      let currentField = '';
      let inQuotedField = false;
      let currentRow: string[] = [];

      for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];

        if (inQuotedField) {
          if (char === '"') {
            if (i + 1 < csvText.length && csvText[i + 1] === '"') {
              // Escaped quote
              currentField += '"';
              i++; // Skip next quote
            } else {
              inQuotedField = false;
            }
          } else {
            currentField += char;
          }
        } else {
          switch (char) {
            case '"':
              inQuotedField = true;
              break;
            case ',':
              currentRow.push(currentField);
              currentField = '';
              break;
            case '\n':
            case '\r':
              if (i > 0 && csvText[i - 1] !== '\r' && csvText[i - 1] !== '\n') {
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
              }
              break;
            default:
              currentField += char;
          }
        }
      }

      // Add the last field and row
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
      }
      
      const nonEmptyRows = rows.filter(row => row.length > 1 || (row.length === 1 && row[0].trim() !== ''));

      if (nonEmptyRows.length === 0) {
        resolve({ headers: [], rows: [] });
        return;
      }

      const headers = nonEmptyRows[0];
      const dataRows = nonEmptyRows.slice(1);
      
      // Ensure all rows have the same number of columns as headers
      const sanitizedRows = dataRows.map(row => {
          if (row.length > headers.length) {
              return row.slice(0, headers.length);
          }
          while (row.length < headers.length) {
              row.push('');
          }
          return row;
      });

      resolve({ headers, rows: sanitizedRows });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Parses an Excel file (xlsx, xls) into TableData.
 */
export const parseExcel = async (file: File): Promise<TableData> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = read(arrayBuffer, { type: 'array' });
    
    if (workbook.SheetNames.length === 0) {
      return { headers: [], rows: [] };
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert sheet to array of arrays
    const rows: any[][] = utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    if (!rows || rows.length === 0) {
      return { headers: [], rows: [] };
    }

    // Filter out completely empty rows
    const nonEmptyRows = rows.filter(row => 
      row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
    );

    if (nonEmptyRows.length === 0) {
      return { headers: [], rows: [] };
    }

    // Assume first row is header
    const headers = nonEmptyRows[0].map((h: any) => String(h || ''));
    const dataRows = nonEmptyRows.slice(1);

    // Sanitize rows: convert all to strings and ensure correct length
    const sanitizedRows = dataRows.map(row => {
      const newRow = new Array(headers.length).fill('');
      row.forEach((cell: any, index: number) => {
        if (index < headers.length) {
          newRow[index] = cell !== undefined && cell !== null ? String(cell) : '';
        }
      });
      return newRow;
    });

    return { headers, rows: sanitizedRows };
  } catch (error) {
    throw new Error('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
  }
};

/**
 * Detects file type and parses accordingly.
 */
export const parseFile = async (file: File): Promise<TableData> => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return parseCsv(text);
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseExcel(file);
  } else {
    // Attempt CSV if unknown extension but looks like text, 
    // but for now strict validation is safer to avoid confusion
    throw new Error('Unsupported file format. Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.');
  }
};


/**
 * Converts table data into a CSV string.
 */
export const generateCsv = (data: TableData): string => {
  const escapeField = (field: any): string => {
    const stringField = String(field ?? '');
    // If field contains comma, newline, or quote, wrap it in double quotes
    if (/[",\n\r]/.test(stringField)) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const headerRow = data.headers.map(escapeField).join(',');
  const dataRows = data.rows.map(row => row.map(escapeField).join(','));

  return [headerRow, ...dataRows].join('\n');
};
