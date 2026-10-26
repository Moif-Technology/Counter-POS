import { Loader2 } from 'lucide-react'
import './Table.css'

/*
 * Reusable Table — the shared table look for every popup, same as the cart
 * table on the POS home screen (styles in Table.css).
 *
 * Props:
 *   columns          — array of { key, label, width?, align?, mono?, render?, cellStyle? }
 *                        width: number (px) or any CSS grid size ('1.2fr', '20%'); default flexible
 *                        render: (value, row, index) => node
 *   rows             — array of data objects
 *   rowKey           — string key to use as unique id (default 'id')
 *   selected         — rowKey value of the currently selected row
 *   onRowClick       — (row, index) => void
 *   onRowDoubleClick — (row, index) => void
 *   loading          — show "Loading…" instead of the rows
 *   error            — error message shown instead of the rows
 *   emptyText        — string shown when rows is empty
 *   maxHeight        — fixed height, e.g. '300px' (default: fills the flex parent)
 *   minHeight        — minimum height of the table in px
 *
 * Example:
 *   <Table
 *     columns={[
 *       { key: 'no',    label: 'No',    width: 60 },
 *       { key: 'name',  label: 'Name' },
 *       { key: 'price', label: 'Price', align: 'right', mono: true },
 *     ]}
 *     rows={data}
 *     rowKey="no"
 *     selected={selectedNo}
 *     onRowClick={row => setSelectedNo(row.no)}
 *   />
 */

const trackOf = (w) => (w == null ? 'minmax(0, 1fr)' : typeof w === 'number' ? `${w}px` : w)

export default function Table({
  columns = [],
  rows = [],
  rowKey = 'id',
  selected,
  onRowClick,
  onRowDoubleClick,
  loading = false,
  error = null,
  emptyText = 'No data found',
  maxHeight,
  minHeight,
}) {
  const grid = { gridTemplateColumns: columns.map(c => trackOf(c.width)).join(' ') }
  const clickable = !!(onRowClick || onRowDoubleClick)

  return (
    <div
      className={`ui-table${maxHeight ? '' : ' is-fill'}`}
      style={{ height: maxHeight || undefined, minHeight: minHeight || undefined }}
    >
      <div className="ui-table-row ui-table-head" style={grid}>
        {columns.map(col => (
          <span key={col.key} style={{ textAlign: col.align || 'left' }}>{col.label}</span>
        ))}
      </div>

      <div className="ui-table-body">
        {loading ? (
          <div className="ui-table-msg"><Loader2 size={16} className="ui-table-spin" /> Loading…</div>
        ) : error ? (
          <div className="ui-table-msg is-error">{error}</div>
        ) : rows.length === 0 ? (
          <div className="ui-table-msg">{emptyText}</div>
        ) : rows.map((row, i) => {
          const isSelected = selected !== undefined && selected !== null && row[rowKey] === selected
          return (
            <div
              key={row[rowKey] ?? i}
              className={`ui-table-row${clickable ? ' is-click' : ''}${isSelected ? ' is-selected' : ''}`}
              style={grid}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row, i) : undefined}
            >
              {columns.map(col => (
                <span
                  key={col.key}
                  className={col.mono ? 'is-num' : undefined}
                  style={{ textAlign: col.align || 'left', ...col.cellStyle }}
                >
                  {col.render ? col.render(row[col.key], row, i) : row[col.key]}
                </span>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
