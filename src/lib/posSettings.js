/** Auto round-off to nearest 0.25 — from parameter autoroundoff (1 = on, 0 = off). */
let autoRoundOff = 0

export function isAutoRoundOffEnabled() {
  return autoRoundOff === 1
}

export function setAutoRoundOff(value) {
  autoRoundOff = Number(value) === 1 ? 1 : 0
}
