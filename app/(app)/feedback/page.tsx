import FeedbackForm from '@/components/FeedbackForm'

export default function FeedbackPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-light">Feedback</h1>
      <p className="mb-8 text-xs text-gray-400">
        Have thoughts to share on 10th-grade life, classes, teachers, workload, or school events?
      </p>
      <FeedbackForm />
    </>
  )
}
