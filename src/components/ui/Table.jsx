import { useState } from 'react'

/*
 * Reusable Table component.
 *
 * Props:
 *   columns   — array of { key, label, width?, align? }
 *   rows      — array of data objects
 *   rowKey    — string key to use as unique id (default 'id')
 *   selected  — rowKey value of the currently selected row
 *   onRowClick— (row) => void
 *   maxHeight — string, e.g. '300px' (default: fills flex parent)
 *   emptyText — string shown when rows is empty
 *
 * Example:
 *   <Table
 *     columns={[
 *       { key: 'no',   label: 'No',          width: 60  },
 *       { key: 'name', label: 'Name'                    },
 *       { key: 'price',label: 'Price', align: 'right'   },
 *     ]}
 *     rows={data}
 *     rowKey="no"
 *     selected={selectedNo}
 *     onRowClick={row => setSelectedNo(row.no)}
 *   />
 */

function TableRow({ columns, row, rowKey, isSelected, isLast, onRowClick }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onClick={() => onRowClick?.(row)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: columns.map(c => c.width ? `${c.width}px` : '1fr').join(' '),
        padding: '8px 12px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        borderLeft: `3px solid ${isSelected ? 'var(--brand)' : 'transparent'}`,
        background: isSelected ? 'rgba(107,0,0,0.06)' : hover ? 'var(--surface-2)' : '#fff',
        cursor: onRowClick ? 'pointer' : 'default',
        transition: 'background 0.1s',
        borderRadius: isLast ? '0 0 8px 8px' : 0,
      }}
    >
      {columns.map(col => (
        <span
          key={col.key}
          style={{
            fontSize: 12,
            fontWeight: isSelected ? 700 : 500,
            color: 'var(--text-1)',
            textAlign: col.align || 'left',
            fontFamily: col.mono ? "'JetBrains Mono', monospace" : 'inherit',
            fontVariantNumeric: col.mono ? 'tabular-nums' : undefined,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            ...col.cellStyle,
          }}
        >
          {col.render ? col.render(row[col.key], row) : row[col.key]}
        </span>
      ))}
    </div>
  )
}

export default function Table({
  columns = [],
  rows = [],
  rowKey = 'id',
  selected,
  onRowClick,
  maxHeight,
  emptyText = 'No data found',
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      border: '1px solid rgba(0,0,0,0.18)',
      borderRadius: 10, overflow: 'hidden',
      flex: maxHeight ? undefined : 1,
      height: maxHeight || undefined,
    }}>

      {/* ── Heading ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: columns.map(c => c.width ? `${c.width}px` : '1fr').join(' '),
        background: 'var(--brand-bg)',
        borderBottom: '1px solid rgba(0,0,0,0.18)',
        padding: '8px 12px',
        flexShrink: 0,
        borderRadius: '8px 8px 0 0',
      }}>
        {columns.map(col => (
          <span
            key={col.key}
            style={{
              fontSize: 10, fontWeight: 700,
              color: 'var(--brand)',
              textTransform: 'uppercase', letterSpacing: 0.5,
              textAlign: col.align || 'left',
            }}
          >
            {col.label}
          </span>
        ))}
      </div>

      {/* ── Rows ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {rows.length === 0 ? (
          <div style={{
            padding: '32px 16px', textAlign: 'center',
            fontSize: 12, color: 'var(--text-4)', fontWeight: 500,
          }}>
            {emptyText}
          </div>
        ) : rows.map((row, i) => (
          <TableRow
            key={row[rowKey] ?? i}
            columns={columns}
            row={row}
            rowKey={rowKey}
            isSelected={selected !== undefined && row[rowKey] === selected}
            isLast={i === rows.length - 1}
            onRowClick={onRowClick}
          />
        ))}
      </div>

    </div>
  )
}
