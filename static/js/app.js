/* ═══════════════════════════════════════════════════════════════════
   Sigma Web Dev — AI Teaching Assistant  |  app.js
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

// ── DOM refs ─────────────────────────────────────────────────────────
const messagesArea  = document.getElementById('messagesArea');
const questionInput = document.getElementById('questionInput');
const sendBtn       = document.getElementById('sendBtn');
const statusDot     = document.getElementById('statusDot');
const statusLabel   = document.getElementById('statusLabel');
const statsRow      = document.getElementById('statsRow');
const clearBtn      = document.getElementById('clearBtn');
const sidebarToggle = document.getElementById('sidebarToggle');
const appSidebar    = document.getElementById('appSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// ── Configure marked.js ───────────────────────────────────────────────
marked.setOptions({ breaks: true, gfm: true });

// ── Utility: format seconds → "M:SS" ─────────────────────────────────
function formatTime(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

// ── Utility: safe HTML escape ──────────────────────────────────────────
function esc(text) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(text)));
  return d.innerHTML;
}

// ── Utility: similarity % → colour class ──────────────────────────────
function matchClass(pct) {
  if (pct >= 75) return 'high';
  if (pct >= 50) return 'medium';
  return 'low';
}

// ── Scroll to bottom ───────────────────────────────────────────────────
function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesArea.scrollTop = messagesArea.scrollHeight;
  });
}

// ── Set input enabled/disabled ─────────────────────────────────────────
function setInputEnabled(on) {
  questionInput.disabled = !on;
  sendBtn.disabled = !on;
  if (!on) sendBtn.classList.add('loading');
  else     sendBtn.classList.remove('loading');
}

// ── Auto-resize textarea ───────────────────────────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 150) + 'px';
}

// ── Handle Enter key ───────────────────────────────────────────────────
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendQuestion();
  }
}

// ── Use suggestion chip ────────────────────────────────────────────────
function useSuggestion(el) {
  questionInput.value = el.textContent.trim();
  autoResize(questionInput);
  questionInput.focus();
  sendQuestion();
}

// ── Typing indicator ───────────────────────────────────────────────────
function showTypingIndicator() {
  const id = 'typing-' + Date.now();
  const row = document.createElement('div');
  row.className = 'msg-row msg-assistant';
  row.id = id;
  row.innerHTML = `
    <div class="msg-avatar" aria-hidden="true">🤖</div>
    <div class="msg-content">
      <div class="msg-bubble msg-bubble-assistant">
        <div class="typing-bubble">
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
          <div class="typing-status" id="${id}-status">Searching knowledge base…</div>
        </div>
      </div>
    </div>`;
  messagesArea.appendChild(row);
  scrollToBottom();

  // After 1.5 s switch message to "Generating response…"
  setTimeout(() => {
    const st = document.getElementById(`${id}-status`);
    if (st) st.textContent = 'Generating response…';
  }, 1500);

  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ── Append user message ────────────────────────────────────────────────
function appendUserMessage(text) {
  const row = document.createElement('div');
  row.className = 'msg-row msg-user';
  row.innerHTML = `
    <div class="msg-content">
      <div class="msg-bubble">${esc(text)}</div>
    </div>
    <div class="msg-avatar" aria-hidden="true">👤</div>`;
  messagesArea.appendChild(row);
  scrollToBottom();
}

// ── Append assistant message with optional sources ─────────────────────
function appendAssistantMessage(text, sources) {
  // Build sources HTML
  let sourcesHtml = '';
  if (sources && sources.length > 0) {
    const cards = sources.map(s => `
      <div class="source-card">
        <div class="source-header">
          <span class="source-video-name">📼 Video ${esc(s.number)}: ${esc(s.title)}</span>
          <span class="source-match ${matchClass(s.similarity)}">${s.similarity}% match</span>
        </div>
        <div class="source-timestamp">⏱ ${formatTime(s.start)} – ${formatTime(s.end)}</div>
        <div class="source-excerpt">"${esc(s.text.substring(0, 140))}${s.text.length > 140 ? '…' : ''}"</div>
      </div>`).join('');

    sourcesHtml = `
      <div class="sources-section">
        <button class="sources-toggle" onclick="toggleSources(this)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          📂 View ${sources.length} retrieved source${sources.length > 1 ? 's' : ''}
        </button>
        <div class="sources-list" style="display:none">${cards}</div>
      </div>`;
  }

  const row = document.createElement('div');
  row.className = 'msg-row msg-assistant';
  row.innerHTML = `
    <div class="msg-avatar" aria-hidden="true">🤖</div>
    <div class="msg-content">
      <div class="msg-bubble msg-bubble-assistant">
        <div class="msg-text">${marked.parse(text)}</div>
        ${sourcesHtml}
      </div>
    </div>`;
  messagesArea.appendChild(row);
  scrollToBottom();
}

// ── Append error message ───────────────────────────────────────────────
function appendErrorMessage(msg) {
  const row = document.createElement('div');
  row.className = 'msg-row msg-assistant';
  row.innerHTML = `
    <div class="msg-avatar" aria-hidden="true">⚠️</div>
    <div class="msg-content">
      <div class="msg-bubble msg-bubble-error">
        <strong>Error:</strong> ${esc(msg)}
      </div>
    </div>`;
  messagesArea.appendChild(row);
  scrollToBottom();
}

// ── Toggle sources accordion ───────────────────────────────────────────
function toggleSources(btn) {
  const list = btn.nextElementSibling;
  const open = list.style.display === 'none';
  list.style.display = open ? 'flex' : 'none';
  btn.classList.toggle('open', open);
}

// ── Main send function ─────────────────────────────────────────────────
async function sendQuestion() {
  const question = questionInput.value.trim();
  if (!question || sendBtn.disabled) return;

  // Clear input
  questionInput.value = '';
  autoResize(questionInput);

  appendUserMessage(question);
  setInputEnabled(false);
  const typingId = showTypingIndicator();

  try {
    const res = await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();
    removeTypingIndicator(typingId);

    if (res.ok) {
      appendAssistantMessage(data.response, data.sources);
    } else {
      appendErrorMessage(data.error || 'An unknown error occurred.');
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    appendErrorMessage('Network error — is the Flask server running?');
  } finally {
    setInputEnabled(true);
    questionInput.focus();
  }
}

// ── Health check ───────────────────────────────────────────────────────
async function checkHealth() {
  statusDot.className = 'status-dot checking';
  statusLabel.textContent = 'Checking…';

  try {
    const res = await fetch('/health');
    const data = await res.json();

    if (data.ollama_connected && data.embeddings_loaded) {
      statusDot.className = 'status-dot online';
      statusLabel.textContent = '✓ Ready';

      if (statsRow) {
        statsRow.innerHTML = `
          <div class="stat-item">📊 <span>${data.embedding_count.toLocaleString()} transcript chunks indexed</span></div>
          <div class="stat-item">🤖 <span>LLM: Llama 3.2 via Ollama</span></div>
          <div class="stat-item">🔍 <span>Embeddings: bge-m3</span></div>`;
      }
    } else if (data.embeddings_loaded && !data.ollama_connected) {
      statusDot.className = 'status-dot warning';
      statusLabel.textContent = '⚠ Ollama offline';
    } else {
      statusDot.className = 'status-dot offline';
      statusLabel.textContent = '✗ Not ready';
    }
  } catch {
    statusDot.className = 'status-dot offline';
    statusLabel.textContent = '✗ Server error';
  }
}

// ── Clear chat ─────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  if (!confirm('Clear the conversation? This cannot be undone.')) return;
  // Remove everything except the welcome message
  const msgs = messagesArea.querySelectorAll('.msg-row:not(#welcomeMsg)');
  msgs.forEach(m => m.remove());
  questionInput.focus();
});

// ── Sidebar toggle (mobile) ────────────────────────────────────────────
sidebarToggle.addEventListener('click', () => {
  const open = appSidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('open', open);
});

function closeSidebar() {
  appSidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
}

// ── Init ───────────────────────────────────────────────────────────────
checkHealth();
setInterval(checkHealth, 30_000); // re-check every 30 s
questionInput.focus();
