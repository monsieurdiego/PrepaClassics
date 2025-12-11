import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://anvtpyidqcykdcutiyyx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFudnRweWlkcWN5a2RjdXRpeXl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQwMjc3OSwiZXhwIjoyMDgwOTc4Nzc5fQ.9S9cU-2zhZr416z8O-ZjQi6bNU1K46M3kD6P7cYjsec' // En vrai projet, on utilise la clé "anon" ici, mais pour tester vite, celle-ci marche.

export const supabase = createClient(supabaseUrl, supabaseKey)