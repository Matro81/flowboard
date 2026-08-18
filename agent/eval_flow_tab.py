import httpx
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

# Evaluate script in the active Google Flow tab
js_code = """
(() => {
  return {
    url: window.location.href,
    title: document.title,
    characterInputs: Array.from(document.querySelectorAll('input, textarea')).map(el => ({
      id: el.id,
      name: el.name,
      placeholder: el.placeholder,
      value: el.value
    })),
    buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean),
    headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.innerText.trim()).filter(Boolean),
    images: Array.from(document.querySelectorAll('img')).map(img => ({ src: img.src, alt: img.alt })),
  };
})()
"""

r = httpx.post("http://127.0.0.1:8101/api/flow/projects/tab/eval", json={"code": js_code}, timeout=20.0)
print("Status:", r.status_code)
print("Response:", json.dumps(r.json(), indent=2, ensure_ascii=False))
