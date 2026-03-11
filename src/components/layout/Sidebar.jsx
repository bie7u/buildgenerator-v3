import React from 'react'
import ElementToolbar from '../panels/ElementToolbar'

export default function Sidebar() {
  return (
    <aside className="w-24 bg-slate-800 flex flex-col items-center py-3 gap-0.5 shadow-xl overflow-y-auto">
      <ElementToolbar />
    </aside>
  )
}
