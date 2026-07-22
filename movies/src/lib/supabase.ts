import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://ipknrrgtmvycrzmedojw.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjBjYzExZjFkLTNhYTctNDA1ZC1iMjA0LTVjMDBiM2RiM2JiMiJ9.eyJwcm9qZWN0SWQiOiJpcGtucnJndG12eWNyem1lZG9qdyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc2ODk4ODc4LCJleHAiOjIwOTIyNTg4NzgsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0._HBcat5M8hfvrSq4GJkAIFkX3Tpz0NvV-3-tEzFT4DI';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };