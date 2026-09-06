import React from 'react';
import './Table.css';
import { ChevronUp, ChevronDown } from 'lucide-react';

export const Table = ({
  columns,
  data,
  sortKey,
  sortDirection,
  onSort,
  className = '',
}) => {
  return (
    <div className={`samba-table-container ${className}`}>
      <table className="samba-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.sortable ? 'sortable' : ''}
                onClick={() => {
                  if (col.sortable && onSort) {
                    onSort(col.key);
                  }
                }}
              >
                <div className="th-content">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className="sort-icon">
                      {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="samba-table-empty">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => {
              const rowKey = row._id || row.id || `row-${rowIndex}`;
              return (
              <tr key={rowKey}>
                {columns.map((col) => (
                  <td key={`${rowKey}-${col.key}`}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
