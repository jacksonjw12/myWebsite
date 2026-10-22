import { startBackground } from './background.js';
import { devMode, fx, mountDevPane } from './dev.js';

if (startBackground(document.getElementById('background'), fx)) {
  document.documentElement.classList.add('has-lens');
}
if (devMode) mountDevPane();

// Specular sheen on the glass card follows the pointer.
const card = document.querySelector('.card');
if (matchMedia('(hover: hover)').matches) {
  addEventListener('pointermove', (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    card.style.setProperty('--my', `${e.clientY - rect.top}px`);
  });
}

// Email button copies the address instead of opening a mail client.
const emailButton = document.getElementById('copy-email');
const tip = emailButton.querySelector('.tip');
let hideTip;
emailButton.addEventListener('click', async () => {
  const email = emailButton.dataset.email;
  tip.textContent = (await copyText(email)) ? 'Copied!' : email;
  tip.classList.add('show');
  clearTimeout(hideTip);
  hideTip = setTimeout(() => tip.classList.remove('show'), 1800);
});

// The Clipboard API needs a secure context; fall back to execCommand over plain http.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = Object.assign(document.createElement('textarea'), { value: text });
    field.style.cssText = 'position:fixed;opacity:0';
    document.body.append(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    return ok;
  }
}
