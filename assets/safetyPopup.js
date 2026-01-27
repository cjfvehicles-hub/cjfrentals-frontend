// CJF Safety Popup - shown on-demand (e.g., before contacting a host).
// Pages can call: `window.CJF.ensureSafetyAcknowledged({ context: 'contact' })`.

(function () {
  'use strict';

  const SAFETY_ACK_KEY = 'CJF_SAFETY_ACKNOWLEDGED';
  let activePromise = null;

  function hasAcknowledged() {
    try {
      return localStorage.getItem(SAFETY_ACK_KEY) === 'true';
    } catch {
      return false;
    }
  }

  function setAcknowledged() {
    try {
      localStorage.setItem(SAFETY_ACK_KEY, 'true');
    } catch {}
  }

  function injectAnimationsOnce() {
    if (document.getElementById('cjfSafetyPopupStyles')) return;
    const style = document.createElement('style');
    style.id = 'cjfSafetyPopupStyles';
    style.textContent = `
      @keyframes cjfFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes cjfFadeOut { from { opacity: 1; } to { opacity: 0; } }
      @keyframes cjfSlideUp { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `;
    document.head.appendChild(style);
  }

  function showSafetyPopup({ title = 'Quick safety reminder', contextLabel = 'Continue', onAgree } = {}) {
    if (document.getElementById('safetyPopup')) return;
    injectAnimationsOnce();

    const popup = document.createElement('div');
    popup.id = 'safetyPopup';
    popup.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.72);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: cjfFadeIn 0.18s ease;
    `;

    popup.innerHTML = `
      <div style="
        background: #0b1220;
        color: #e5e7eb;
        border-radius: 14px;
        max-width: 560px;
        width: 100%;
        padding: 22px;
        box-shadow: 0 20px 55px rgba(0,0,0,0.35);
        border: 1px solid rgba(148, 163, 184, 0.18);
        animation: cjfSlideUp 0.22s ease;
      ">
        <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom: 10px;">
          <div style="width:40px; height:40px; border-radius:12px; background: rgba(59,130,246,0.16); display:flex; align-items:center; justify-content:center; font-weight:800;">i</div>
          <div style="flex:1;">
            <div style="font-size:18px; font-weight:800; margin:0;">${title}</div>
            <div style="margin-top:4px; color:#cbd5e1; font-size:13px;">
              CJF connects renters and hosts. Payments and arrangements are made directly with the host.
            </div>
          </div>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 12px; padding: 14px; margin: 14px 0;">
          <div style="font-weight:700; margin-bottom: 8px;">Before you continue:</div>
          <ul style="margin:0; padding-left: 18px; line-height: 1.6; color:#e2e8f0;">
            <li>Meet in a safe public place.</li>
            <li>Inspect the vehicle before paying.</li>
            <li>Avoid wire transfers or unusual payment requests.</li>
          </ul>
        </div>

        <div style="display:flex; gap:10px; align-items:center; justify-content:flex-end; flex-wrap:wrap;">
          <a href="safety.html" target="_blank" style="color:#93c5fd; text-decoration:none; font-weight:700; font-size:13px;">Read safety tips</a>
          <button id="safetyPopupAgree" style="
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
          ">${contextLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(popup);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const close = () => {
      popup.style.animation = 'cjfFadeOut 0.18s ease';
      setTimeout(() => {
        popup.remove();
        document.body.style.overflow = previousOverflow || '';
      }, 180);
    };

    document.getElementById('safetyPopupAgree')?.addEventListener('click', () => {
      setAcknowledged();
      try { onAgree && onAgree(); } catch {}
      close();
    });

    popup.addEventListener('click', (e) => {
      if (e.target === popup) close();
    });
  }

  function ensureSafetyAcknowledged({ context } = {}) {
    if (hasAcknowledged()) return Promise.resolve(true);
    if (activePromise) return activePromise;

    activePromise = new Promise((resolve) => {
      const label = context === 'contact' ? 'Continue to contact' : 'Continue';
      showSafetyPopup({ contextLabel: label, onAgree: () => resolve(true) });
    }).finally(() => {
      activePromise = null;
    });

    return activePromise;
  }

  window.CJF = window.CJF || {};
  window.CJF.showSafetyPopup = showSafetyPopup;
  window.CJF.ensureSafetyAcknowledged = ensureSafetyAcknowledged;
})();
