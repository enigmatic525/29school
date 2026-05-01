import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  const { category, message } = await request.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const { error } = await resend.emails.send({
    from: 'feedback@29.school',
    to: 'ahong@eastsideprep.org',
    subject: `[Feedback] ${category}`,
    html: `
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-wrap">${message.replace(/</g, '&lt;')}</p>
      <hr/>
      <p style="color:#888;font-size:12px">Submitted anonymously via 29.school</p>
    `,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
