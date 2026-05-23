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

// ── Utility: format seconds → "M:SS" or "H:MM:SS" ─────────────────────
function formatTime(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  }
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
  if (!on) {
    sendBtn.classList.add('loading');
    sendBtn.innerHTML = `
      <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-linecap="round"/>
      </svg>
    `;
  } else {
    sendBtn.classList.remove('loading');
    sendBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none"/>
      </svg>
    `;
  }
}

// ── Auto-resize textarea ───────────────────────────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
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

// ── Copy Code Snippet Handler ─────────────────────────────────────────
function injectCodeCopyButtons(container) {
  const preBlocks = container.querySelectorAll('pre');
  preBlocks.forEach(pre => {
    if (pre.querySelector('.code-copy-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      <span>Copy</span>
    `;

    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code');
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code.textContent);
        btn.classList.add('copied');
        btn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Copied!</span>
        `;
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span>Copy</span>
          `;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy code: ', err);
      }
    });

    pre.appendChild(btn);
  });
}

// ── Copy Bubble Response & Reactions Handler ───────────────────────────
function injectBubbleActions(row, text) {
  const bubble = row.querySelector('.msg-bubble-assistant');
  if (!bubble) return;

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'msg-bubble-actions';

  // Copy whole answer button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'bubble-action-btn';
  copyBtn.innerHTML = `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
    <span>Copy Response</span>
  `;

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.classList.add('active');
      copyBtn.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Copied!</span>
      `;
      setTimeout(() => {
        copyBtn.classList.remove('active');
        copyBtn.innerHTML = `
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span>Copy Response</span>
        `;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy response: ', err);
    }
  });

  // Thumbs up
  const likeBtn = document.createElement('button');
  likeBtn.className = 'bubble-action-btn';
  likeBtn.innerHTML = `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
    </svg>
  `;
  likeBtn.addEventListener('click', () => {
    likeBtn.classList.toggle('active');
    if (likeBtn.classList.contains('active')) {
      dislikeBtn.classList.remove('active');
    }
  });

  // Thumbs down
  const dislikeBtn = document.createElement('button');
  dislikeBtn.className = 'bubble-action-btn';
  dislikeBtn.innerHTML = `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm10-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>
    </svg>
  `;
  dislikeBtn.addEventListener('click', () => {
    dislikeBtn.classList.toggle('active');
    if (dislikeBtn.classList.contains('active')) {
      likeBtn.classList.remove('active');
    }
  });

  actionsDiv.appendChild(copyBtn);
  actionsDiv.appendChild(likeBtn);
  actionsDiv.appendChild(dislikeBtn);
  bubble.appendChild(actionsDiv);
}

// ── Typing indicator ───────────────────────────────────────────────────
function showTypingIndicator() {
  const id = 'typing-' + Date.now();
  const row = document.createElement('div');
  row.className = 'msg-row msg-assistant';
  row.id = id;
  row.innerHTML = `
    <div class="msg-avatar" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a10 10 0 0 1 7.54 16.59c-.4.4-.8.77-1.25 1.1A3.33 3.33 0 0 0 17 22H7a3.33 3.33 0 0 0-1.29-2.31c-.45-.33-.85-.7-1.25-1.1A10 10 0 0 1 12 2z"/>
        <path d="M9 10h.01M15 10h.01M10 15h4"/>
      </svg>
    </div>
    <div class="msg-content">
      <div class="msg-bubble msg-bubble-assistant">
        <div class="typing-bubble">
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
          <div class="typing-status" id="${id}-status">Querying knowledge base...</div>
        </div>
      </div>
    </div>`;
  messagesArea.appendChild(row);
  scrollToBottom();

  // After 1.5s switch message to "Synthesizing explanation..."
  setTimeout(() => {
    const st = document.getElementById(`${id}-status`);
    if (st) st.textContent = 'Synthesizing course context...';
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
    <div class="msg-avatar" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>`;
  messagesArea.appendChild(row);
  scrollToBottom();
}

// ── Simulated Interactive Timestamp Jump ──────────────────────────────
window.askTimestampJump = function(lectureNum, startSeconds) {
  const formatted = formatTime(startSeconds);
  const items = document.querySelectorAll('.course-item');
  let title = "Sigma Course Lecture";
  for (let it of items) {
    if (it.getAttribute('data-lecture') == parseInt(lectureNum)) {
      title = it.getAttribute('data-title');
      break;
    }
  }

  // Visual modal alert
  alert(`📼 Lecture Navigation Alert:\n\nJump request to ${formatted} in Lecture ${lectureNum}: "${title}".\n\nIf the video player was integrated directly here, we would load the video timeline at exactly ${startSeconds} seconds.\n\nFor now, open your course materials and fast-forward to ${formatted}!`);
};

// ── Append assistant message with optional sources ─────────────────────
function appendAssistantMessage(text, sources) {
  // Build sources HTML
  let sourcesHtml = '';
  if (sources && sources.length > 0) {
    const cards = sources.map(s => `
      <div class="source-card">
        <div class="source-header">
          <span class="source-video-name">📼 Lecture ${esc(s.number)}: ${esc(s.title)}</span>
          <span class="source-match ${matchClass(s.similarity)}">${s.similarity}% match</span>
        </div>
        <div class="sim-progress-wrapper">
          <div class="sim-bar-container">
            <div class="sim-bar-fill ${matchClass(s.similarity)}" style="width: ${s.similarity}%"></div>
          </div>
        </div>
        <div class="source-excerpt">"${esc(s.text.substring(0, 145))}${s.text.length > 145 ? '…' : ''}"</div>
        <div class="source-meta-row">
          <div class="source-timestamp">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ⏱ ${formatTime(s.start)} – ${formatTime(s.end)}
          </div>
          <button class="jump-time-btn" onclick="askTimestampJump('${esc(s.number)}', ${s.start})">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Jump to ${formatTime(s.start)}
          </button>
        </div>
      </div>`).join('');

    sourcesHtml = `
      <div class="sources-section">
        <button class="sources-toggle" onclick="toggleSources(this)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          📂 References: ${sources.length} retrieved transcript chunk${sources.length > 1 ? 's' : ''}
        </button>
        <div class="sources-list" style="display:none">${cards}</div>
      </div>`;
  }

  const row = document.createElement('div');
  row.className = 'msg-row msg-assistant';
  row.innerHTML = `
    <div class="msg-avatar" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a10 10 0 0 1 7.54 16.59c-.4.4-.8.77-1.25 1.1A3.33 3.33 0 0 0 17 22H7a3.33 3.33 0 0 0-1.29-2.31c-.45-.33-.85-.7-1.25-1.1A10 10 0 0 1 12 2z"/>
        <path d="M9 10h.01M15 10h.01M10 15h4"/>
      </svg>
    </div>
    <div class="msg-content">
      <div class="msg-bubble msg-bubble-assistant">
        <div class="msg-text">${marked.parse(text)}</div>
        ${sourcesHtml}
      </div>
    </div>`;
  
  messagesArea.appendChild(row);
  
  // Inject copy handlers and assistant bubbles actions
  injectCodeCopyButtons(row);
  injectBubbleActions(row, text);
  
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
        <strong>Server Notice:</strong> ${esc(msg)}
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
      appendErrorMessage(data.error || 'An unknown server error occurred.');
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    appendErrorMessage('Failed to connect to the assistant server. Is Flask running?');
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
          <div class="stat-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
            <span>${data.embedding_count.toLocaleString()} chunks indexed</span>
          </div>
          <div class="stat-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            <span>LLM: Llama 3.2 via Ollama</span>
          </div>
          <div class="stat-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Embeddings: bge-m3</span>
          </div>`;
      }
    } else if (data.embeddings_loaded && !data.ollama_connected) {
      statusDot.className = 'status-dot warning';
      statusLabel.textContent = '⚠ Ollama Offline';
    } else {
      statusDot.className = 'status-dot offline';
      statusLabel.textContent = '✗ Database Empty';
    }
  } catch {
    statusDot.className = 'status-dot offline';
    statusLabel.textContent = '✗ Connection Error';
  }
}

// ── Clear chat ─────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  if (!confirm('Clear the conversation? This cannot be undone.')) return;
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

// ── Clickable Sidebar Lectures ────────────────────────────────────────
function initInteractiveSidebar() {
  document.querySelectorAll('.course-item').forEach(item => {
    item.addEventListener('click', () => {
      const num = item.getAttribute('data-lecture');
      const title = item.getAttribute('data-title');
      if (num && title) {
        questionInput.value = `Tell me about Lecture ${num}: "${title}". What does it cover and where can I find the key topics in the video?`;
        autoResize(questionInput);
        closeSidebar();
        sendQuestion();
      }
    });
  });
}

// ── Init ───────────────────────────────────────────────────────────────
checkHealth();
setInterval(checkHealth, 30_000); // re-check every 30s
initInteractiveSidebar();
questionInput.focus();
