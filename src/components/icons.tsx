/* Lightweight inline SVGs — no icon dependency, so nothing extra to fetch.
   All use currentColor and a 1.6 stroke for a consistent, engineered look. */
import type { ReactNode, SVGProps } from 'react'

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

/** The brand mark: a shield (ward) cut from a page corner. */
export function WardMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" />
      <path d="M9.5 12.2 11.3 14l3.3-3.6" />
    </svg>
  )
}

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

const ToolGlyphs: Record<string, ReactNode> = {
  'merge-split': (
    <>
      <rect x="3.5" y="4" width="9" height="12" rx="1.5" />
      <path d="M11.5 8h6a1.5 1.5 0 0 1 1.5 1.5V20a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 9 20v-2" />
    </>
  ),
  'compress-pdf': (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
      <path d="M9 9.5h6M12 7v5M9 11.5l3 1 3-1" />
      <path d="M8.5 16h7" />
    </>
  ),
  'images-to-pdf': (
    <>
      <rect x="3.5" y="5" width="9" height="9" rx="1.5" />
      <path d="m5.5 12 2-2 2 2 1.5-1.5" />
      <circle cx="6.8" cy="8" r="0.9" />
      <path d="M14.5 6.5H18A1.5 1.5 0 0 1 19.5 8v10A1.5 1.5 0 0 1 18 19.5h-7A1.5 1.5 0 0 1 9.5 18v-1.5" />
    </>
  ),
  'pdf-to-images': (
    <>
      <rect x="4" y="3.5" width="9" height="11" rx="1.5" />
      <path d="M6.5 8.5h4M6.5 11h4" />
      <rect x="11.5" y="10" width="9" height="9" rx="1.5" />
      <path d="m13.5 17 2-2 2 2 1.5-1.5" />
      <circle cx="14.8" cy="13" r="0.9" />
    </>
  ),
  'image-convert': (
    <>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <path d="m7 15 2.5-2.5 2 2L15 11l2 2" />
      <circle cx="8.5" cy="9" r="1" />
    </>
  ),
}

export function ToolIcon({ id, ...props }: { id: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      {ToolGlyphs[id] ?? <rect x="5" y="4" width="14" height="16" rx="1.5" />}
    </svg>
  )
}
