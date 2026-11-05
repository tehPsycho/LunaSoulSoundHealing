import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../functions/api/contact.js',import.meta.url),'utf8');
const api = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const env = {RESEND_API_KEY:'test-key',CONTACT_TO_EMAIL:'owner@example.com',CONTACT_FROM_EMAIL:'sender@example.com',TURNSTILE_SECRET_KEY:'test-secret',TURNSTILE_SITE_KEY:'test-site'};
const body = {name:'Test Visitor',email:'visitor@example.com',phone:'',service:'general',message:'A question about availability.',website:'','cf-turnstile-response':'test-token'};
function request(data=body,origin='https://luna.example') {return new Request('https://luna.example/api/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)});}
test('availability exposes no secrets and missing configuration fails honestly', async () => {
 assert.deepEqual(await api.onRequestGet({env:{}}).json(),{available:false,siteKey:null});
 const data=await api.onRequestGet({env}).json(); assert.deepEqual(data,{available:true,siteKey:'test-site'});
 assert.equal((await api.onRequestPost({request:request(),env:{}})).status,503);
});
test('rejects cross-origin, malformed, oversized, invalid and spam requests before outbound calls', async () => {
 assert.equal((await api.onRequestPost({request:request(body,'https://evil.example'),env})).status,403);
 for(const invalid of [{...body,email:'bad'},{...body,message:' '},{...body,website:'spam'},{...body,'cf-turnstile-response':''},{...body,name:[]},null]) assert.equal((await api.onRequestPost({request:request(invalid),env})).status,400);
 assert.equal((await api.onRequestPost({request:request({...body,message:'x'.repeat(25000)}),env})).status,413);
});
test('verifies challenge hostname, sends server-side plain text, and reports provider acceptance', async () => {
 const original=globalThis.fetch; const calls=[];
 globalThis.fetch=async (url,options)=>{calls.push({url,options}); return Response.json(url.includes('siteverify')?{success:true,hostname:'luna.example'}:{id:'accepted-message'});};
 try {
 const result=await api.onRequestPost({request:request(),env}); assert.equal(result.status,200); assert.deepEqual(await result.json(),{success:true}); assert.equal(calls.length,2);
 const sent=JSON.parse(calls[1].options.body);assert.equal(sent.reply_to,body.email);assert.equal(sent.to[0],env.CONTACT_TO_EMAIL);assert.ok(sent.text.includes(body.message)); assert.equal(sent.html,undefined);
 } finally {globalThis.fetch=original;}
});
test('failed verification or provider error never produces false success', async () => {
 const original=globalThis.fetch;
 try {
 for(const verification of [{success:false},{success:true,hostname:'evil.example'}]) {
 globalThis.fetch=async()=>Response.json(verification);
 assert.equal((await api.onRequestPost({request:request(),env})).status,400);
 }
 globalThis.fetch=async url=>url.includes('siteverify')?Response.json({success:true,hostname:'luna.example'}):Response.json({error:'bad key'},{status:401});
 assert.equal((await api.onRequestPost({request:request(),env})).status,502);
 globalThis.fetch=async()=>{throw new Error('network failure');};
 assert.equal((await api.onRequestPost({request:request(),env})).status,502);
 } finally {globalThis.fetch=original;}
});
