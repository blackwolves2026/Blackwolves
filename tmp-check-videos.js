const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = {};
const txt = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
for (const line of txt.split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].replace(/^['\"]/, '').replace(/['\"]$/, '');
  }
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
(async () => {
  const { data, error } = await supabase.from('videos').select('id, title, video_url, order_index, course_id, level').limit(1);
  console.log(JSON.stringify({ error, sample: data?.[0] || null }, null, 2));
})();
