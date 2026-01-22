import React from 'react';
import { Search } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  searchValue?: string;
  emptyMessage?: string;
}

function DataTable<T extends { id: string }>({
  columns,
  data,
  searchPlaceholder = 'Search...',
  onSearch,
  searchValue = '',
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  return (
    <div className="dashboard-card p-0 overflow-hidden">
      {onSearch && (
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              className="form-input pl-10"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="academic-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key as string} className={col.className}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="animate-fade-in">
                  {columns.map((col) => (
                    <td key={`${item.id}-${col.key as string}`} className={col.className}>
                      {col.render
                        ? col.render(item)
                        : String(item[col.key as keyof T] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
