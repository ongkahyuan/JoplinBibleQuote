declare const webviewApi: {
  postMessage(contentScriptId: string, arg: unknown): Promise<any>;
};

const processed = new WeakSet<HTMLElement>();

function showError(el: HTMLElement, msg: string) {
  console.error('[BibleQuote]', msg);
  el.innerHTML = '<div style="padding:30px;border:1px solid red;text-align:center">Error: ' + msg + '</div>';
}

function processPlaceholder(el: HTMLElement) {
  if (processed.has(el)) return;
  processed.add(el);

  console.log('[BibleQuote] Processing placeholder');
  const raw = el.dataset.bibleData;
  console.log('[BibleQuote] Placeholder has data:', raw ? raw.slice(0, 100) + '...' : 'MISSING');

  if (!raw) {
    showError(el, 'Missing bible quote data attribute');
    return;
  }

  let data: any;
  try {
    data = JSON.parse(decodeURIComponent(raw));
  } catch (e: any) {
    showError(el, 'Invalid bible quote data: ' + (e.message || String(e)));
    return;
  }

  const { contentScriptId } = data;
  console.log('[BibleQuote] Placeholder contentScriptId:', contentScriptId);
  if (!contentScriptId) {
    showError(el, 'Missing content script ID');
    return;
  }

  console.log('[BibleQuote] Sending postMessage to', contentScriptId);
  webviewApi
    .postMessage(contentScriptId, { type: 'renderBible', ...data })
    .then((response: any) => {
      console.log('[BibleQuote] Got response:', response);
      if (response && response.html) {
        el.outerHTML = response.html;
      } else if (response && response.error) {
        showError(el, response.error);
      } else {
        showError(el, 'Unexpected response from plugin');
      }
    })
    .catch((err: any) => {
      showError(el, 'postMessage failed: ' + (err.message || String(err)));
    });
}

function scanForPlaceholders(root: ParentNode) {
  const placeholders = root.querySelectorAll<HTMLElement>('.bible-quote-placeholder');
  placeholders.forEach(processPlaceholder);
}

console.log('[BibleQuote] Viewer script loaded, setting up observer');
scanForPlaceholders(document);

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement) {
        if (node.classList.contains('bible-quote-placeholder')) {
          processPlaceholder(node);
        } else {
          scanForPlaceholders(node);
        }
      }
    }
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});
console.log('[BibleQuote] MutationObserver active');
