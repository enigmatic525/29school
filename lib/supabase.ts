import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface DBClass {
  id: number
  name: string
  created_at: string
}

export interface DBGuide {
  id: number
  class_id: number
  title: string
  type: 'pdf' | 'link'
  url: string
  created_at: string
  classes?: { name: string }
}
