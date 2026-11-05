// Run only after the owner supplies the real deployed origin.
import {readFile,writeFile} from 'node:fs/promises';
const supplied=process.argv[2];
if (!supplied) throw new Error('Usage: node scripts/configure-domain.mjs https://your-real-domain');
const url=new URL(supplied);
if (url.protocol!=='https:' || url.username || url.password || url.pathname!=='/' || url.search || url.hash || !/^[a-z0-9.-]+$/i.test(url.hostname)) throw new Error('Provide a bare HTTPS origin with no path, credentials, or query.');
const origin=url.origin;
const pages=['index.html','services.html','gallery.html','contact.html'];
for (const name of pages) {
 const file=new URL('../'+name,import.meta.url);
 let html=await readFile(file,'utf8');
 html=html.replace(/<link rel="canonical"[^>]*>/g,'').replace(/<meta property="og:url"[^>]*>/g,'');
 html=html.replace(/<meta property="og:image" content="[^"]*">/,`<meta property="og:image" content="${origin}/assets/images/banner_wide.png">`);
 html=html.replace('</head>',`<link rel="canonical" href="${origin}/${name}"><meta property="og:url" content="${origin}/${name}"></head>`);
 await writeFile(file,html);
}
const config=new URL('../js/config.js',import.meta.url);
await writeFile(config,(await readFile(config,'utf8')).replace(/siteUrl:\s*'[^']*'/,`siteUrl: '${origin}'`));
await writeFile(new URL('../sitemap.xml',import.meta.url),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+pages.map(name=>`  <url><loc>${origin}/${name}</loc></url>`).join('\n')+'\n</urlset>\n');
await writeFile(new URL('../robots.txt',import.meta.url),`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log('Updated canonical URLs, social metadata, site config, robots.txt, and sitemap for '+origin);
