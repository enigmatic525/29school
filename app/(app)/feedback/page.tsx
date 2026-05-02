import FeedbackForm from '@/components/FeedbackForm'

export default function FeedbackPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-light">Feedback</h1>
      <p className="mb-8 text-xs text-gray-400">
        Anonymous channel to your grade rep — no login info or identity is sent.
      </p>
      <FeedbackForm />
    </>
  )
}
