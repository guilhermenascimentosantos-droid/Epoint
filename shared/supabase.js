import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://kyrsdgeuefwmzhmqjmhb.supabase.co';
const supabaseKey = 'sb_publishable_XSfOnwIO8Aj0YAf2q92yEQ_KWkTKRW5';

export const supabase = createClient(supabaseUrl, supabaseKey);