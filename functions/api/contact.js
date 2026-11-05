const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'}});
const ready = env => ['RESEND_API_KEY','CONTACT_TO_EMAIL','CONTACT_FROM_EMAIL','TURNSTILE_SECRET_KEY','TURNSTILE_SITE_KEY'].every(key => typeof env[key] === 'string' && env[key].trim());
export function onRequestGet({env}) {return json({available:Boolean(ready(env)), siteKey:ready(env) ? env.TURNSTILE_SITE_KEY : null});}
export async function onRequestPost({request, env}) {
  const ownOrigin = new URL(request.url).origin;
  if (request.headers.get('Origin') !== ownOrigin) return json({error:'Please submit the form from this website.'}, 403);
  if (!ready(env)) return json({error:'Message delivery is not configured yet. Please connect through Instagram or Facebook.'}, 503);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'Use the website contact form.'}, 415);
  let payload;
  try {
    const reader = request.body?.getReader(); if (!reader) return json({error:'A message is required.'}, 400);
    let size = 0; const chunks = [];
    while (true) {const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > 24000) {await reader.cancel(); return json({error:'Your message is too long.'}, 413);} chunks.push(value);}
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.length;}
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {return json({error:'The message could not be read.'}, 400);}
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return json({error:'Invalid message.'}, 400);
  if (payload.website) return json({error:'The message could not be accepted.'}, 400);
  const fields = {};
  for (const [name,max] of [['name',120],['email',254],['phone',40],['service',120],['message',5000]]) {
    if (payload[name] !== undefined && typeof payload[name] !== 'string') return json({error:'Invalid form fields.'}, 400);
    fields[name] = (payload[name] || '').trim();
    if (fields[name].length > max) return json({error:'A form field is too long.'}, 400);
  }
  if (!fields.name || !fields.message || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(fields.email) || /[\r\n]/.test(fields.email)) return json({error:'Please include your name, a valid email address, and a message.'}, 400);
  const token = payload['cf-turnstile-response'];
  if (typeof token !== 'string' || !token || token.length > 2048) return json({error:'Please complete the spam protection check.'}, 400);
  try {
    const challenge = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {method:'POST', body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token}), signal:AbortSignal.timeout(8000)});
    if (!challenge.ok) return json({error:'Spam protection is temporarily unavailable.'}, 502);
    const result = await challenge.json();
    if (!result.success || result.hostname !== new URL(request.url).hostname) return json({error:'Spam protection could not verify your message. Please try again.'}, 400);
    const delivery = await fetch('https://api.resend.com/emails', {method:'POST', headers:{'Authorization':`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'}, body:JSON.stringify({from:env.CONTACT_FROM_EMAIL,to:[env.CONTACT_TO_EMAIL],reply_to:fields.email,subject:'Luna Soul website inquiry',text:`Name: ${fields.name}\nEmail: ${fields.email}\nPhone: ${fields.phone || 'Not provided'}\nInterest: ${fields.service || 'General inquiry'}\n\n${fields.message}`}),signal:AbortSignal.timeout(10000)});
    if (!delivery.ok) return json({error:'Your message could not be sent. Please try again later or connect on social media.'}, 502);
    const receipt = await delivery.json();
    if (!receipt.id) return json({error:'Delivery could not be confirmed. Please try again later.'}, 502);
    return json({success:true});
  } catch {return json({error:'Delivery is temporarily unavailable. Please try again later or connect on social media.'}, 502);}
}
export function onRequestOptions() {return json({error:'Cross-origin submissions are not supported.'}, 405);}
