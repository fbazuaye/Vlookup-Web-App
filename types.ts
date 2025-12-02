
export type TableRow = any[];

export interface TableData {
  headers: string[];
  rows: TableRow[];
}

export interface Table {
  name: string;
  data: TableData;
}
