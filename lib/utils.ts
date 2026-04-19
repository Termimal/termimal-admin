export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function fmtPrice(p: number): string {
  return p >= 1000
    ? p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : p.toString()
}

export function fmtK(n: number): string {
  return `${(n / 1000).toFixed(0)}K`
}
