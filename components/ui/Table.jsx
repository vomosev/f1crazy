'use client';

import EmptyState from './EmptyState';

function resolveKey(row, rowKey, index) {
  if (typeof rowKey === 'function') {
    try {
      return rowKey(row, index);
    } catch (err) {
      return `row-${index}`;
    }
  }
  if (typeof rowKey === 'string' && row && row[rowKey] != null) {
    return String(row[rowKey]);
  }
  return `row-${index}`;
}

function renderCell(column, row, index) {
  if (typeof column.render === 'function') {
    try {
      return column.render(row, index);
    } catch (err) {
      return '—';
    }
  }
  const value = row ? row[column.key] : undefined;
  if (value === null || value === undefined || value === '') return '—';
  return value;
}

export default function Table({
  columns = [],
  rows = [],
  rowKey = 'id',
  caption = 'Data table',
  loading = false,
  emptyMessage = 'Nothing to show here yet.',
  emptyTitle = 'No results',
  emptyAction = null,
  className = '',
  skeletonRows = 5,
}) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const colCount = safeColumns.length || 1;

  if (safeColumns.length === 0) {
    return (
      <div className={`table-wrap ${className}`.trim()}>
        <EmptyState
          title="Table unavailable"
          description="No columns were supplied for this table, so there is nothing to display."
        />
      </div>
    );
  }

  return (
    <div className={`table-wrap ${className}`.trim()}>
      <table className="table">
        <caption className="table__caption">{caption}</caption>
        <thead>
          <tr>
            {safeColumns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`table__th table__cell--${column.align || 'left'}`}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: Math.max(1, skeletonRows) }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="table__row table__row--skeleton">
                  {safeColumns.map((column) => (
                    <td
                      key={`${column.key}-skeleton`}
                      className={`table__td table__cell--${column.align || 'left'}`}
                    >
                      <span className="skeleton skeleton--text" aria-hidden="true" />
                      <span className="sr-only">Loading</span>
                    </td>
                  ))}
                </tr>
              ))
            : null}

          {!loading && safeRows.length === 0 ? (
            <tr className="table__row table__row--empty">
              <td className="table__td table__td--empty" colSpan={colCount}>
                <EmptyState title={emptyTitle} description={emptyMessage} action={emptyAction} />
              </td>
            </tr>
          ) : null}

          {!loading &&
            safeRows.map((row, index) => (
              <tr key={resolveKey(row, rowKey, index)} className="table__row">
                {safeColumns.map((column) => (
                  <td
                    key={column.key}
                    className={`table__td table__cell--${column.align || 'left'}`}
                  >
                    {renderCell(column, row, index)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}