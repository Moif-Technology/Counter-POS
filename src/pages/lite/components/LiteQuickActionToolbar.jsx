import {
    Percent,
    Pause,
    RotateCcw,
    Undo2,
    Tag,
    Hash,
    MoreHorizontal,
  } from 'lucide-react'

  const ACTIONS = [
    {
      key: 'discount',
      label: 'Discount',
      icon: Percent,
    },
    {
      key: 'price',
      label: 'Price Change',
      icon: Tag,
    },
    {
      key: 'qty',
      label: 'Qty Change',
      icon: Hash,
    },
    {
      key: 'hold',
      label: 'Hold Bill',
      icon: Pause,
    },
    {
      key: 'recall',
      label: 'Recall Hold Bill',
      icon: RotateCcw,
    },
    {
      key: 'return',
      label: 'Return / Refund',
      icon: Undo2,
    },
    {
      key: 'more',
      label: 'More Options',
      icon: MoreHorizontal,
    },
  ]

export default function LiteQuickActionToolbar({
  onDiscount,
  onHold,
  onRecall,
  onReturn,
  onPriceChange,
  onQtyChange,
  onMore,
}) {
    const handlers = {
        discount: onDiscount,
        price: onPriceChange,
        qty: onQtyChange,
        hold: onHold,
        recall: onRecall,
        return: onReturn,
        more: onMore,
      }

  return (
    <div className="lite-quick-toolbar">
    

      <div className="lite-quick-actions">
        {ACTIONS.map((action) => {
          const Icon = action.icon

          return (
            <button
              key={action.key}
              type="button"
              className="lite-quick-action"
              onClick={handlers[action.key]}
            >
              <span className="lite-quick-action-icon">
                <Icon
                  size={19}
                  strokeWidth={2}
                />
              </span>

              <span className="lite-quick-action-label">
                {action.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

