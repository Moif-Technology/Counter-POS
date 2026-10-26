import { forwardRef } from 'react'

/*
 * Field — the shared input design (label + input), styled by .ui-input /
 * .ui-label in styles/inputs.css. Every other prop goes to the <input>.
 *
 *   <Field label="Customer No" value={no} onChange={e => setNo(e.target.value)} />
 *   <Field label="Customer Code" active={focus === 'code'} ... />   // keypad target
 */
const Field = forwardRef(function Field({ label, active, className = '', style, inputStyle, ...props }, ref) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
      {label && <label className="ui-label">{label}</label>}
      <input
        ref={ref}
        className={`ui-input ${className}`.trim()}
        data-active={active ? 'true' : undefined}
        style={inputStyle}
        {...props}
      />
    </div>
  )
})

export default Field
