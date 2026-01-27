/**
 * Admin Inbox Manager
 * Handles message list, detail view, search, filters, and actions
 */

const AdminInbox = (function() {
  'use strict';

  let currentFilter = 'inbox';
  let messages = [];
  let selectedMessages = new Set();
  let currentMessageId = null;
  let sortBy = 'newest';
  let tokenRetryCount = 0;
  const MAX_TOKEN_RETRIES = 6;

  const API_URL = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    ? 'http://localhost:3000/api'
    : '/api';

  // Init on load
  function init() {
    console.log('AdminInbox: init');
    
    // Check auth
    if (typeof AuthManager === 'undefined' || !AuthManager.requireAuth) {
      console.error('AdminInbox: AuthManager not available');
      return;
    }
    AuthManager.requireAuth();
    
    // Ensure user is admin
    const isAdminMode = typeof AuthManager.isAdminModeEnabled === 'function'
      ? AuthManager.isAdminModeEnabled()
      : (AuthManager.isAdmin ? AuthManager.isAdmin() : false);

    if (!isAdminMode) {
      console.warn('AdminInbox: user is not admin, redirecting');
      window.location.href = 'index.html';
      return;
    }

    setupEventListeners();

    // Wait for Firebase auth to be ready before loading messages.
    // This avoids a redirect loop where localStorage says "signed in"
    // but firebaseAuth.currentUser is still null for a moment.
    waitForIdToken({ timeoutMs: 8000 })
      .then((token) => {
        if (!token) {
          console.error('No Firebase ID token available');
          showToast('Please sign in again to access admin inbox', 'error');
          setTimeout(() => window.location.href = 'signin.html', 1200);
          return;
        }
        loadMessages();
        setInterval(loadMessages, 30000); // Refresh every 30s
      })
      .catch((e) => {
        console.error('AdminInbox: token wait failed', e);
        showToast('Sign-in not ready. Please refresh and try again.', 'error');
      });
  }

  function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.inbox-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const filter = item.dataset.filter;
        setFilter(filter);
      });
    });
    
    // Search
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => renderList(), 300);
    });
    
    // Sort
    document.getElementById('sortSelect').addEventListener('change', (e) => {
      sortBy = e.target.value;
      renderList();
    });
    
    // Refresh
    document.getElementById('refreshBtn').addEventListener('click', loadMessages);
    
    // Bulk actions
    document.getElementById('selectAllCheckbox').addEventListener('change', (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('.inbox-list-item-checkbox').forEach(cb => {
        cb.checked = checked;
        const msgId = cb.closest('.inbox-list-item').dataset.messageId;
        if (checked) selectedMessages.add(msgId);
        else selectedMessages.delete(msgId);
      });
      updateBulkBar();
    });
    
    document.getElementById('bulkArchive').addEventListener('click', bulkArchive);
    document.getElementById('bulkMarkRead').addEventListener('click', bulkMarkRead);
    document.getElementById('bulkDelete').addEventListener('click', bulkDelete);
  }

  function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.inbox-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.filter === filter);
    });
    selectedMessages.clear();
    updateBulkBar();
    renderList();
  }

  async function loadMessages() {
    try {
      const token = await getIdToken();
      if (!token) {
        // On some mobile browsers, auth can take a moment to hydrate.
        // Retry briefly before treating it as a real sign-out.
        tokenRetryCount += 1;
        const definitelySignedOut =
          window.firebaseAuth &&
          window.firebaseAuth.currentUser === null &&
          localStorage.getItem('ccrSignedIn') === 'false';

        if (!definitelySignedOut && tokenRetryCount <= MAX_TOKEN_RETRIES) {
          console.warn(`ID token not ready (attempt ${tokenRetryCount}/${MAX_TOKEN_RETRIES}); retrying...`);
          setTimeout(loadMessages, 600);
          return;
        }

        console.error('No Firebase ID token available');
        showToast('Please sign in to access admin inbox', 'error');
        setTimeout(() => window.location.href = 'signin.html', 1200);
        return;
      }
      // Reset retries once we have a token.
      tokenRetryCount = 0;
      
      const response = await fetch(`${API_URL}/admin/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error:', response.status, errorData);
        throw new Error(`API error: ${response.status} - ${errorData.error || errorData.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      messages = data.data || [];
      renderList();
      updateNavBadges();
    } catch (error) {
      console.error('LoadMessages error:', error);
      showToast(error.message || 'Failed to load messages', 'error');
    }
  }

  function renderList() {
    const list = document.getElementById('messageList');
    let filtered = filterMessages();
    
    if (sortBy === 'oldest') {
      filtered = filtered.reverse();
    }
    
    list.innerHTML = '';
    
    if (filtered.length === 0) {
      list.innerHTML = '<div class="inbox-empty">No messages</div>';
      return;
    }
    
    filtered.forEach(msg => {
      const row = createListRow(msg);
      list.appendChild(row);
    });
  }

  function filterMessages() {
    const searchQuery = (document.getElementById('searchInput').value || '').toLowerCase();
    
    let filtered = messages.filter(msg => {
      const status = (msg.status || 'unread').toLowerCase();
      // Status/filter match
      if (currentFilter === 'unread') return status === 'unread';
      if (currentFilter === 'open') return status === 'open';
      if (currentFilter === 'pending') return status === 'pending';
      if (currentFilter === 'resolved') return status === 'resolved';
      if (currentFilter === 'starred') return msg.starred === true;
      if (currentFilter === 'status-unread') return status === 'unread';
      if (currentFilter === 'status-open') return status === 'open';
      if (currentFilter === 'status-pending') return status === 'pending';
      if (currentFilter === 'status-resolved') return status === 'resolved';
      
      // Default: inbox = not archived/deleted
      if (currentFilter === 'inbox') return status !== 'archived' && status !== 'trash';
      
      return true;
    });
    
    // Search
    if (searchQuery) {
      filtered = filtered.filter(msg => {
        const searchable = [
          msg.name,
          msg.email,
          msg.subject,
          msg.message
        ].join(' ').toLowerCase();
        return searchable.includes(searchQuery);
      });
    }
    
    return filtered;
  }

  function createListRow(msg) {
    const row = document.createElement('div');
    row.className = 'inbox-list-item';
    if (msg.status === 'unread') row.classList.add('unread');
    if (msg.id === currentMessageId) row.classList.add('active');
    row.dataset.messageId = msg.id;
    
    const sender = msg.name || msg.email || 'Anonymous';
    const subject = msg.subject || '(no subject)';
    const preview = msg.message.substring(0, 80);
    const time = formatTime(msg.createdAt);
    
    row.innerHTML = `
      <input type="checkbox" class="inbox-list-item-checkbox" data-message-id="${msg.id}" />
      <div class="inbox-list-item-star ${msg.starred ? 'starred' : ''}">★</div>
      <div class="inbox-list-item-content">
        <div class="inbox-list-item-sender">${escapeHtml(sender)}</div>
        <div class="inbox-list-item-subject">${escapeHtml(subject)}</div>
        <div class="inbox-list-item-preview">${escapeHtml(preview)}</div>
        <div class="inbox-list-item-time">${time}</div>
      </div>
    `;
    
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('inbox-list-item-checkbox')) {
        handleCheckboxChange();
        return;
      }
      if (e.target.classList.contains('inbox-list-item-star')) {
        e.stopPropagation();
        toggleStar(msg.id);
        return;
      }
      showDetail(msg);
    });
    
    row.querySelector('.inbox-list-item-checkbox').addEventListener('change', handleCheckboxChange);
    row.querySelector('.inbox-list-item-star').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStar(msg.id);
    });
    
    return row;
  }

  function handleCheckboxChange() {
    document.querySelectorAll('.inbox-list-item-checkbox').forEach(cb => {
      const msgId = cb.closest('.inbox-list-item').dataset.messageId;
      if (cb.checked) selectedMessages.add(msgId);
      else selectedMessages.delete(msgId);
    });
    updateBulkBar();
  }

  function updateBulkBar() {
    const bar = document.getElementById('bulkBar');
    const count = selectedMessages.size;
    document.getElementById('bulkCount').textContent = count;
    bar.classList.toggle('active', count > 0);
  }

  async function showDetail(msg) {
    currentMessageId = msg.id;
    
    // Mark as read
    if (msg.status === 'unread') {
      await updateMessageStatus(msg.id, 'open');
    }
    
    const panel = document.getElementById('detailPanel');
    const status = msg.status || 'open';
    
    panel.innerHTML = `
      <div class="inbox-detail-header">
        <button class="button-small inbox-mobile-back" id="mobileBackBtn">← Back</button>
        <div class="inbox-detail-title">${escapeHtml(msg.subject || 'Contact message')}</div>
        <div class="inbox-detail-meta">
          <span class="inbox-detail-status status-${status}">${status.toUpperCase()}</span>
          <span><strong>${escapeHtml(msg.name || msg.email || 'Anonymous')}</strong></span>
          ${msg.email ? `<span><a href="mailto:${escapeHtml(msg.email)}">${escapeHtml(msg.email)}</a></span>` : ''}
          ${msg.phone ? `<span><a href="tel:${escapeHtml(msg.phone)}">${escapeHtml(msg.phone)}</a></span>` : ''}
          <span style="margin-left: auto; color: #999;">${formatTime(msg.createdAt)}</span>
        </div>
      </div>
      
      <div class="inbox-detail-body">${escapeHtml(msg.message)}</div>
      
      <div class="inbox-detail-actions">
        <select class="inbox-detail-select" id="statusSelect">
          <option value="unread" ${status === 'unread' ? 'selected' : ''}>Unread</option>
          <option value="open" ${status === 'open' ? 'selected' : ''}>Open</option>
          <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="resolved" ${status === 'resolved' ? 'selected' : ''}>Resolved</option>
        </select>
        
        <button class="button-small primary" id="replyMailBtn" ${msg.email ? '' : 'disabled'}>Reply (Mail app)</button>
        <button class="button-small" id="replyGmailBtn" ${msg.email ? '' : 'disabled'}>Reply (Gmail)</button>
        <button class="button-small" id="starBtn">${msg.starred ? '⭐ Unstar' : '☆ Star'}</button>
        <button class="button-small" id="archiveBtn">Archive</button>
        <button class="button-small" id="deleteBtn">Delete</button>
      </div>
    `;
    
    document.getElementById('statusSelect').addEventListener('change', async (e) => {
      await updateMessageStatus(msg.id, e.target.value);
    });
    
    const replyMailBtn = document.getElementById('replyMailBtn');
    const replyGmailBtn = document.getElementById('replyGmailBtn');

    const defaultSubject = `Re: ${(msg.subject || 'Your message to CJF Rentals').toString().trim()}`;
    const name = (msg.name || '').toString().trim();
    const createdAt = formatTime(msg.createdAt);
    const original = (msg.message || '').toString();
    const greeting = name ? `Hi ${name},\n\n` : 'Hi,\n\n';
    const defaultBody =
      `${greeting}` +
      `Thanks for reaching out.\n\n` +
      `— CJF Rentals\n\n` +
      `--- Original message ---\n` +
      `From: ${name || (msg.email || '')}\n` +
      `Email: ${(msg.email || '')}\n` +
      `Date: ${createdAt}\n` +
      `Subject: ${(msg.subject || '').toString().trim()}\n\n` +
      `${original}`;

    replyMailBtn.addEventListener('click', () => {
      if (!msg.email) {
        showToast('No email address on this message', 'error');
        return;
      }
      const to = String(msg.email).trim();
      const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(defaultSubject)}&body=${encodeURIComponent(defaultBody)}`;
      window.location.href = mailto;
    });

    replyGmailBtn.addEventListener('click', () => {
      if (!msg.email) {
        showToast('No email address on this message', 'error');
        return;
      }
      const to = String(msg.email).trim();
      const gmailUrl =
        `https://mail.google.com/mail/?view=cm&fs=1` +
        `&to=${encodeURIComponent(to)}` +
        `&su=${encodeURIComponent(defaultSubject)}` +
        `&body=${encodeURIComponent(defaultBody)}`;

      const w = window.open(gmailUrl, '_blank', 'noopener');
      if (!w) window.location.href = gmailUrl;
    });

    document.getElementById('starBtn').addEventListener('click', async () => {
      await toggleStar(msg.id);
    });
    
    document.getElementById('archiveBtn').addEventListener('click', async () => {
      await updateMessageStatus(msg.id, 'archived');
      loadMessages();
    });
    
    document.getElementById('deleteBtn').addEventListener('click', async () => {
      if (confirm('Delete this message?')) {
        await updateMessageStatus(msg.id, 'trash');
        loadMessages();
      }
    });

    // On mobile, the detail panel is hidden until it has the "active" class.
    // Add the class when opening a message so it actually becomes visible.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      panel.classList.add('active');
      const backBtn = document.getElementById('mobileBackBtn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          panel.classList.remove('active');
        });
      }
    }
    
    renderList();
  }

  async function updateMessageStatus(msgId, newStatus) {
    try {
      const token = await getIdToken();
      const response = await fetch(`${API_URL}/admin/messages/${msgId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const msg = messages.find(m => m.id === msgId);
      if (msg) msg.status = newStatus;
      
      showToast(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Update status error:', error);
      showToast('Failed to update status', 'error');
    }
  }

  async function toggleStar(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    
    try {
      const token = await getIdToken();
      const response = await fetch(`${API_URL}/admin/messages/${msgId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ starred: !msg.starred })
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      msg.starred = !msg.starred;
      renderList();
      if (currentMessageId === msgId) showDetail(msg);
    } catch (error) {
      console.error('Toggle star error:', error);
    }
  }

  async function bulkArchive() {
    if (selectedMessages.size === 0) return;
    try {
      const token = await getIdToken();
      for (const msgId of selectedMessages) {
        await fetch(`${API_URL}/admin/messages/${msgId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'archived' })
        });
      }
      selectedMessages.clear();
      loadMessages();
      showToast(`Archived ${selectedMessages.size} messages`);
    } catch (error) {
      console.error('Bulk archive error:', error);
      showToast('Failed to archive', 'error');
    }
  }

  async function bulkMarkRead() {
    if (selectedMessages.size === 0) return;
    try {
      const token = await getIdToken();
      for (const msgId of selectedMessages) {
        await fetch(`${API_URL}/admin/messages/${msgId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'open' })
        });
      }
      selectedMessages.clear();
      loadMessages();
      showToast('Marked as read');
    } catch (error) {
      console.error('Bulk mark read error:', error);
      showToast('Failed to mark read', 'error');
    }
  }

  async function bulkDelete() {
    if (selectedMessages.size === 0) return;
    if (!confirm(`Delete ${selectedMessages.size} messages?`)) return;
    
    try {
      const token = await getIdToken();
      for (const msgId of selectedMessages) {
        await fetch(`${API_URL}/admin/messages/${msgId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'trash' })
        });
      }
      selectedMessages.clear();
      loadMessages();
      showToast('Deleted messages');
    } catch (error) {
      console.error('Bulk delete error:', error);
      showToast('Failed to delete', 'error');
    }
  }

  function updateNavBadges() {
    document.querySelectorAll('.inbox-nav-badge').forEach(badge => {
      const item = badge.closest('.inbox-nav-item');
      const filter = item.dataset.filter;
      let count = 0;
      
      if (filter === 'inbox') count = messages.filter(m => {
        const status = (m.status || '').toLowerCase();
        return status !== 'archived' && status !== 'trash';
      }).length;
      if (filter === 'unread') count = messages.filter(m => (m.status || '').toLowerCase() === 'unread').length;
      if (filter === 'open') count = messages.filter(m => (m.status || '').toLowerCase() === 'open').length;
      if (filter === 'pending') count = messages.filter(m => (m.status || '').toLowerCase() === 'pending').length;
      
      badge.textContent = count || '';
    });
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForFirebaseAuthReady(timeoutMs = 5000) {
    const start = Date.now();
    while (!window.firebaseAuth) {
      if (Date.now() - start > timeoutMs) return false;
      await sleep(50);
    }
    return true;
  }

  async function waitForFirebaseUser(timeoutMs = 7000) {
    const ready = await waitForFirebaseAuthReady(Math.min(timeoutMs, 5000));
    if (!ready) return null;

    if (window.firebaseAuth.currentUser) return window.firebaseAuth.currentUser;

    return await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), timeoutMs);
      const unsub = window.firebaseAuth.onAuthStateChanged((user) => {
        clearTimeout(timer);
        try { unsub(); } catch {}
        resolve(user || null);
      });
    });
  }

  async function waitForIdToken({ timeoutMs = 8000 } = {}) {
    const user = await waitForFirebaseUser(timeoutMs);
    if (!user) return null;
    try {
      return await user.getIdToken(true);
    } catch (e) {
      console.warn('AdminInbox: getIdToken failed', e);
      return null;
    }
  }

  async function getIdToken() {
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      return await window.firebaseAuth.currentUser.getIdToken(true);
    }
    return await waitForIdToken({ timeoutMs: 8000 });
  }

  function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (type === 'error') toast.style.background = '#d32f2f';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init,
    loadMessages
  };
})();
