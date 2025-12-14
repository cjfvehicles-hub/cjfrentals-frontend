// CJF Safety Popup - Shows once per user visit
// Include this script on public-facing pages (index.html, vehicles.html, etc.)

(function() {
  'use strict';
  
  const SAFETY_POPUP_KEY = 'CJF_SAFETY_POPUP_SHOWN';
  
  function showSafetyPopup() {
    // Check if user has already seen the popup
    const hasSeenPopup = localStorage.getItem(SAFETY_POPUP_KEY);
    if (hasSeenPopup) return;
    
    // Create popup
    const popup = document.createElement('div');
    popup.id = 'safetyPopup';
    popup.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.3s ease;
    `;
    
    popup.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        max-width: 600px;
        width: 100%;
        padding: 32px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        max-height: 90vh;
        overflow-y: auto;
        animation: slideUp 0.4s ease;
      ">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 48px; margin-bottom: 12px;"></div>
          <h2 style="font-size: 24px; margin: 0 0 8px 0; color: #dc3545;">SAFETY WARNING  PLEASE READ</h2>
          <p style="color: #666; margin: 0;">Protect yourself from scams</p>
        </div>
        
        <div style="background: #ffe6e6; border-left: 4px solid #dc3545; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0; font-weight: 600; font-size: 15px; color: #dc3545;">
            To protect yourself from scams:
          </p>
        </div>
        
        <ul style="margin: 0 0 20px 0; padding-left: 24px; line-height: 2;">
          <li><strong>Only pay after seeing the vehicle IN PERSON</strong></li>
          <li>Inspect the vehicle before giving any money</li>
          <li>Meet Hosts in public places</li>
          <li>Do not trust online-only transactions</li>
        </ul>
        
        <div style="background: #f8f9fa; border: 2px solid #6c757d; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #333;">
            <strong>CJF is not responsible for:</strong><br/>
            Scams  Fraud  Damages  False listings  Vehicle problems  Financial loss
          </p>
          <p style="margin: 12px 0 0 0; font-size: 13px; color: #666;">
            CJF is an advertising platform only. All transactions are between you and the Host.
          </p>
        </div>
        
        <div style="text-align: center;">
          <button id="safetyPopupAgree" style="
            background: #0066cc;
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: all 0.2s ease;
          ">I AGREE & CONTINUE</button>
          <p style="margin: 12px 0 0 0; font-size: 13px; color: #666;">
            <a href="safety.html" target="_blank" style="color: var(--accent);">Read full Safety Guidelines </a>
          </p>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Close popup and save preference
    document.getElementById('safetyPopupAgree').addEventListener('click', () => {
      localStorage.setItem(SAFETY_POPUP_KEY, 'true');
      popup.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        popup.remove();
        document.body.style.overflow = '';
      }, 300);
    });
    
    // Hover effect for button
    const btn = document.getElementById('safetyPopupAgree');
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#0052a3';
      btn.style.transform = 'scale(1.02)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#0066cc';
      btn.style.transform = 'scale(1)';
    });
  }
  
  // Add animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  // Show popup after short delay for better UX
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(showSafetyPopup, 800);
    });
  } else {
    setTimeout(showSafetyPopup, 800);
  }
})();
