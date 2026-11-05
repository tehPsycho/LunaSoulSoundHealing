from playwright.sync_api import sync_playwright
from pathlib import Path
import json
base='http://127.0.0.1:8000/'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page()
 errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
 for width in [375,430,768,1024,1440,1920]:
  page.set_viewport_size({'width':width,'height':900})
  for name in ['index.html','services.html','gallery.html','contact.html']:
   response=page.goto(base+name,wait_until='networkidle'); assert response.status==200
   page.evaluate('document.querySelectorAll(".reveal").forEach(e=>e.classList.add("visible"))')
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width,name,'overflow')
   assert page.locator('main h1').count()==1
   assert page.locator('nav[aria-label="Main navigation"] a[aria-current="page"]').count()==1
   page.evaluate('window.scrollTo(0,document.body.scrollHeight)');page.wait_for_timeout(150)
   assert page.evaluate('Array.from(document.images).every(i=>i.complete && i.naturalWidth>0)'),(width,name,'broken image')
   if width==375 and name in ['index.html','contact.html']:page.screenshot(path='/tmp/luna-'+name+'-mobile.png',full_page=True)
   if name=='index.html':assert page.locator('#hero-video').get_attribute('src') is None
  print('PASS four pages and no overflow at',width)
 page.set_viewport_size({'width':375,'height':812}); page.goto(base)
 assert not page.locator('#navigation').is_visible()
 page.locator('.menu-toggle').click(); assert page.locator('#navigation').is_visible()
 page.keyboard.press('Escape'); assert not page.locator('#navigation').is_visible()
 page.locator('.menu-toggle').click();page.locator('#navigation a',has_text='Gallery').click();assert page.url.endswith('gallery.html')
 page.locator('.gallery-item').first.click();assert page.locator('.lightbox').evaluate('(e)=>e.open')
 assert page.locator('.lightbox figcaption').inner_text().startswith('1 / 9')
 page.keyboard.press('ArrowRight'); assert page.locator('.lightbox figcaption').inner_text().startswith('2 / 9')
 page.keyboard.press('ArrowLeft');page.keyboard.press('ArrowLeft');assert page.locator('.lightbox figcaption').inner_text().startswith('9 / 9')
 for _ in range(7):
  page.keyboard.press('Tab');assert page.evaluate('document.activeElement.closest("dialog") !== null')
 page.keyboard.press('Escape');assert not page.locator('.lightbox').evaluate('(e)=>e.open')
 assert page.locator('.gallery-item').first.evaluate('(e)=>e===document.activeElement')
 print('PASS mobile navigation, lightbox arrows, focus containment, Escape and restored focus')
 page.goto(base+'contact.html?service=private',wait_until='networkidle')
 assert 'private sound' in page.locator('#message').input_value().lower()
 assert page.locator('#service option').count()==1
 page.locator('[type=submit]').click();assert page.locator('#name').get_attribute('aria-invalid')=='true'
 page.locator('#name').fill('Test Visitor');page.locator('#email').fill('bad');page.locator('[type=submit]').click();assert page.locator('#email-error').inner_text()
 page.locator('#email').fill('test@example.com'); page.locator('[type=submit]').click();page.wait_for_function('!document.querySelector("[type=submit]").disabled')
 assert 'unavailable' in page.locator('#form-status').inner_text().lower()
 assert page.locator('#message').input_value()
 print('PASS inquiry prefilling, confirmed-service filtering, form validation and honest static-server failure')
 # Test frontend states with a mock backend; no live delivery is claimed.
 page.route('**/api/contact',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps({'success':True}) if route.request.method=='POST' else json.dumps({'available':False})))
 page.locator('[type=submit]').click();page.wait_for_function('document.querySelector("#form-status").className==="success"')
 assert page.locator('#name').input_value()==''
 print('PASS mocked frontend success state and reset')
 for a in page.locator('a[href^="https://"]').all():
  assert a.get_attribute('target')=='_blank' and 'noopener' in a.get_attribute('rel')
 assert page.locator('a[href="https://cash.app/$emilyvlove"]').count()==2
 page.emulate_media(reduced_motion='reduce');page.goto(base)
 assert page.evaluate('getComputedStyle(document.documentElement).scrollBehavior')=='auto'
 assert not page.locator('#hero-video').get_attribute('src')
 assert page.locator('.hero-content').evaluate('(e)=>getComputedStyle(e).animationName')=='none'
 print('PASS reduced motion and preserved Cash App/social URLs')
 assert not errors, errors
 print('PASS no browser JavaScript errors')
 browser.close()
