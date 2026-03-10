import React from 'react'
import ElementToolbar from '../panels/ElementToolbar'

export default function Sidebar() {
  return (
    <aside className="w-16 bg-slate-800 flex flex-col items-center py-4 gap-1 shadow-xl">
      <ElementToolbar />
    </aside>
  )
}
