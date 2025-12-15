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
    if (!AuthManager.isAdmin || !AuthManager.isAdmin()) {
      console.warn('AdminInbox: user is not admin, redirecting');
      window.location.href = 'index.html';
      return;
    }
    
    setupEventListeners();
    loadMessages();
    setInterval(loadMessages, 30000); // Refresh every 30s
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
      const response = await fetch(`${API_URL}/admin/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      messages = data.data || [];
      renderList();
      updateNavBadges();
    } catch (error) {
      console.error('LoadMessages error:', error);
      showToast('Failed to load messages', 'error');
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
      // Status/filter match
      if (currentFilter === 'unread') return msg.status === 'unread';
      if (currentFilter === 'open') return msg.status === 'open';
      if (currentFilter === 'pending') return msg.status === 'pending';
      if (currentFilter === 'resolved') return msg.status === 'resolved';
      if (currentFilter === 'starred') return msg.starred === true;
      if (currentFilter === 'status-unread') return msg.status === 'unread';
      if (currentFilter === 'status-open') return msg.status === 'open';
      if (currentFilter === 'status-pending') return msg.status === 'pending';
      if (currentFilter === 'status-resolved') return msg.status === 'resolved';
      
      // Default: inbox = not archived/deleted
      if (currentFilter === 'inbox') return !msg.archived && msg.status !== 'trash';
      
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
        
        <button class="button-small" id="starBtn">${msg.starred ? '⭐ Unstar' : '☆ Star'}</button>
        <button class="button-small" id="archiveBtn">Archive</button>
        <button class="button-small" id="deleteBtn">Delete</button>
      </div>
    `;
    
    document.getElementById('statusSelect').addEventListener('change', async (e) => {
      await updateMessageStatus(msg.id, e.target.value);
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
      
      if (filter === 'inbox') count = messages.filter(m => !m.archived && m.status !== 'trash').length;
      if (filter === 'unread') count = messages.filter(m => m.status === 'unread').length;
      if (filter === 'open') count = messages.filter(m => m.status === 'open').length;
      if (filter === 'pending') count = messages.filter(m => m.status === 'pending').length;
      
      badge.textContent = count || '';
    });
  }

  async function getIdToken() {
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      return await window.firebaseAuth.currentUser.getIdToken();
    }
    return null;
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
