'use client'

import { useState } from 'react'

const CATEGORIES = [
  'Workload / Assignment Clustering',
  'Academic Support',
  'School Culture',
  'Extracurriculars',
  'Communication',
  'Other',
]

type State = 'idle' | 'loading' | 'success' | 'error'

export default function FeedbackForm() {
  const [category, setCategory] = useState(CATEGORIES[0])
  const [message, setMessage] = useState('')
  const [state, setState] = useState<State>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message }),
      })
      setState(res.ok ? 'success' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-xs font-light text-gray-900 mb-1">Submitted</p>
        <p className="text-sm text-gray-500">Your response was sent anonymously.</p>
        <button
          onClick={() => { setState('idle'); setMessage('') }}
          className="mt-5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          Submit another →
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="text-xs text-gray-400">
        This form will be anonymously sent to me (Adam). I will do my best to take action on the comment or question.
      </p>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-light text-gray-500">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-none border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-900 transition-colors"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-light text-gray-500">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's on your mind?"
          required
          rows={5}
          className="rounded-none border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-900 transition-colors resize-none"
        />
      </div>

      {state === 'error' && (
        <p className="text-xs text-red-500">Something went wrong. Try again.</p>
      )}

      <button
        type="submit"
        disabled={state === 'loading' || !message.trim()}
        className="rounded-none bg-gray-900 py-2.5 text-xs font-light text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {state === 'loading' ? 'Sending…' : 'Submit Anonymously'}
      </button>
    </form>
  )
}
