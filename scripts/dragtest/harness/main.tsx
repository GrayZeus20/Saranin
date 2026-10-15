// Harness for scripts/dragtest/run.mjs — mounts the REAL ScrollRow component
// (src/components/ScrollRow.tsx) twice, so the browser test drives the shipping
// code path rather than a copy of it:
//   [data-row="cards"]  20 wide cards → overflows a 390px phone (happy path)
//   [data-row="fits"]    2 small cards → no overflow (edge: arrows disabled)
// A module-level click counter is exposed as window.__clicks so the test can
// prove that a drag suppresses the trailing click while a plain tap still fires.
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import ScrollRow from '../../../src/components/ScrollRow'
import '../../../src/index.css'

let clicks = 0
;(window as unknown as { __clicks: () => number }).__clicks = () => clicks

interface CardProps {
  index: number
  width: number
  height: number
  onClick: () => void
}

function Card({ index, width, height, onClick }: CardProps) {
  return (
    <div
      data-card={index}
      onClick={onClick}
      style={{
        flex: '0 0 auto',
        width,
        height,
        background: index % 2 ? '#1a1a1a' : '#262626',
        color: '#e6b91e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        fontSize: 24,
        fontWeight: 700,
        userSelect: 'none',
      }}
    >
      {index + 1}
    </div>
  )
}

function Harness() {
  const [, force] = useState(0)
  const bump = () => {
    clicks += 1
    force(clicks)
  }
  return (
    <div style={{ padding: 8, maxWidth: 390 }}>
      <div data-row="cards">
        <ScrollRow label="Cards">
          {Array.from({ length: 20 }).map((_, i) => (
            <Card key={i} index={i} width={120} height={180} onClick={bump} />
          ))}
        </ScrollRow>
      </div>
      <div data-row="fits" style={{ marginTop: 24 }}>
        <ScrollRow label="Fits">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} index={100 + i} width={60} height={60} onClick={bump} />
          ))}
        </ScrollRow>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Harness />)
