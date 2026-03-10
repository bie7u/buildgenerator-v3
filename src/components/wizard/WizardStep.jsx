import React from 'react'

export default function WizardStep({ stepNumber, totalSteps, title, children, onNext, onBack, onFinish }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full ${i < stepNumber ? 'bg-blue-500' : i === stepNumber - 1 ? 'bg-blue-600' : 'bg-slate-600'}`}
          />
        ))}
      </div>
      <div className="text-xs text-slate-400 mb-1">Krok {stepNumber} z {totalSteps}</div>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="flex-1 overflow-y-auto">{children}</div>
      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          disabled={stepNumber === 1}
          className="px-4 py-2 bg-slate-700 text-slate-300 rounded disabled:opacity-40 hover:bg-slate-600 transition-colors"
        >
          Wstecz
        </button>
        {stepNumber < totalSteps ? (
          <button
            onClick={onNext}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Dalej
          </button>
        ) : (
          <button
            onClick={onFinish}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Zakończ
          </button>
        )}
      </div>
    </div>
  )
}
