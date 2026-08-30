import fs from "fs";
import path from "path";

const docsDir = path.resolve("docs");
const outputFile = path.join(docsDir, "index.html");

const docFiles = [
  { id: "prd", title: "01. Product Requirements (PRD)", icon: "📋", filename: "01_PRD.md", badge: "Product" },
  { id: "tdd", title: "02. Technical Design (TDD)", icon: "🏗️", filename: "02_TDD.md", badge: "Architecture" },
  { id: "userflows", title: "03. User Flows & Diagrams", icon: "🔀", filename: "03_USER_FLOWS.md", badge: "UX / Workflows" },
  { id: "designbrief", title: "04. Design Brief & UI Spec", icon: "🎨", filename: "04_DESIGN_BRIEF.md", badge: "Design System" },
  { id: "datamodel", title: "05. Data Model Reference", icon: "🗄️", filename: "05_DATA_MODEL.md", badge: "Database" },
  { id: "engplan", title: "06. Engineering & Ops Plan", icon: "🛠️", filename: "06_ENGINEERING_PLAN.md", badge: "Engineering" }
];

const docsData = docFiles.map(doc => {
  const filePath = path.join(docsDir, doc.filename);
  let content = "";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf-8");
  } else {
    content = `# ${doc.title}\n\nDocument not found.`;
  }
  return {
    ...doc,
    content
  };
});

const htmlTemplate = `<!DOCTYPE html>
<html lang="en" class="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agaate Farm Management PWA — Technical & Product Documentation Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- CDN Dependencies: Marked, Highlight.js, Mermaid -->
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css">
  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>

  <style>
    :root {
      --bg-primary: #f8fafc;
      --bg-surface: #ffffff;
      --bg-sidebar: #064e3b;
      --bg-sidebar-hover: #04382a;
      --bg-sidebar-active: #0f766e;
      --sidebar-text: #e2e8f0;
      --sidebar-text-dim: #94a3b8;
      
      --text-main: #0f172a;
      --text-muted: #475569;
      --text-dim: #94a3b8;
      
      --brand-primary: #064e3b;
      --brand-accent: #10b981;
      --brand-accent-glow: rgba(16, 185, 129, 0.2);
      
      --border-color: #e2e8f0;
      --border-subtle: #f1f5f9;
      
      --code-bg: #0f172a;
      --card-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
      --card-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);
    }

    html.dark {
      --bg-primary: #090d16;
      --bg-surface: #0f172a;
      --bg-sidebar: #041f17;
      --bg-sidebar-hover: #083327;
      --bg-sidebar-active: #065f46;
      --sidebar-text: #f1f5f9;
      --sidebar-text-dim: #94a3b8;
      
      --text-main: #f8fafc;
      --text-muted: #cbd5e1;
      --text-dim: #64748b;
      
      --brand-primary: #10b981;
      --brand-accent: #34d399;
      --brand-accent-glow: rgba(52, 211, 153, 0.25);
      
      --border-color: #1e293b;
      --border-subtle: #141e33;
      
      --code-bg: #030712;
      --card-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
      --card-shadow-lg: 0 10px 25px -5px rgb(0 0 0 / 0.5);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-main);
      line-height: 1.65;
      display: flex;
      height: 100vh;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }
    html.dark ::-webkit-scrollbar-thumb {
      background: #334155;
    }

    /* SIDEBAR */
    #sidebar {
      width: 320px;
      min-width: 320px;
      background: var(--bg-sidebar);
      color: var(--sidebar-text);
      display: flex;
      flex-direction: column;
      height: 100vh;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      z-index: 40;
      transition: transform 0.3s ease;
    }

    .sidebar-header {
      padding: 24px 20px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .brand-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
    }

    .brand-badge {
      font-size: 0.7rem;
      padding: 3px 8px;
      background: #10b981;
      color: #042f2e;
      border-radius: 999px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .brand-sub {
      font-size: 0.8rem;
      color: var(--sidebar-text-dim);
      margin-top: 4px;
    }

    .search-box {
      margin: 16px 20px;
      position: relative;
    }

    .search-box input {
      width: 100%;
      padding: 10px 14px 10px 38px;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #fff;
      font-size: 0.875rem;
      outline: none;
      transition: all 0.2s;
    }

    .search-box input:focus {
      border-color: #10b981;
      background: rgba(0, 0, 0, 0.4);
      box-shadow: 0 0 0 2px var(--brand-accent-glow);
    }

    .search-box svg {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: var(--sidebar-text-dim);
      pointer-events: none;
    }

    .doc-nav {
      flex: 1;
      overflow-y: auto;
      padding: 8px 12px 20px;
    }

    .nav-group-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--sidebar-text-dim);
      padding: 12px 12px 6px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      color: var(--sidebar-text);
      text-decoration: none;
      font-size: 0.885rem;
      font-weight: 500;
      margin-bottom: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .nav-item:hover {
      background: var(--bg-sidebar-hover);
      color: #fff;
      transform: translateX(2px);
    }

    .nav-item.active {
      background: var(--bg-sidebar-active);
      color: #ffffff;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .nav-item-icon {
      font-size: 1.15rem;
      line-height: 1;
    }

    .nav-item-content {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-badge {
      font-size: 0.68rem;
      padding: 2px 7px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.12);
      color: #e2e8f0;
    }

    .sidebar-footer {
      padding: 16px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--sidebar-text-dim);
    }

    /* MAIN CONTENT */
    #main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      position: relative;
    }

    .top-bar {
      height: 64px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      z-index: 30;
    }

    .top-bar-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .mobile-menu-btn {
      display: none;
      background: none;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 8px;
      color: var(--text-main);
      cursor: pointer;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-muted);
    }

    .breadcrumb span.current {
      color: var(--text-main);
      font-weight: 700;
    }

    .top-bar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--border-color);
      background: var(--bg-surface);
      color: var(--text-main);
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: var(--bg-primary);
      border-color: var(--text-dim);
    }

    .action-btn.primary {
      background: #064e3b;
      color: #fff;
      border-color: #064e3b;
    }
    .action-btn.primary:hover {
      background: #04382a;
    }
    html.dark .action-btn.primary {
      background: #10b981;
      color: #042f2e;
      border-color: #10b981;
    }

    /* CONTENT LAYOUT */
    .content-container {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .article-wrapper {
      flex: 1;
      overflow-y: auto;
      padding: 40px 48px 80px;
      scroll-behavior: smooth;
    }

    .article-inner {
      max-width: 960px;
      margin: 0 auto;
    }

    /* RIGHT TOC */
    .toc-sidebar {
      width: 260px;
      min-width: 260px;
      border-left: 1px solid var(--border-color);
      background: var(--bg-surface);
      padding: 28px 20px;
      overflow-y: auto;
      display: block;
    }

    .toc-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
      margin-bottom: 12px;
    }

    .toc-list {
      list-style: none;
    }

    .toc-item {
      margin-bottom: 6px;
    }

    .toc-link {
      display: block;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.835rem;
      line-height: 1.4;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .toc-link:hover {
      color: var(--brand-primary);
      background: var(--bg-primary);
    }

    .toc-link.indent-3 {
      padding-left: 18px;
      font-size: 0.785rem;
    }

    /* MARKDOWN RENDER STYLES */
    .markdown-body {
      color: var(--text-main);
      font-size: 1rem;
      line-height: 1.75;
    }

    .markdown-body h1 {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-top: 0;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--border-color);
      color: var(--text-main);
      line-height: 1.25;
    }

    .markdown-body h2 {
      font-size: 1.55rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-top: 40px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-main);
    }

    .markdown-body h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 28px;
      margin-bottom: 12px;
      color: var(--text-main);
    }

    .markdown-body h4 {
      font-size: 1.05rem;
      font-weight: 600;
      margin-top: 20px;
      margin-bottom: 8px;
    }

    .markdown-body p {
      margin-bottom: 16px;
      color: var(--text-muted);
    }

    .markdown-body strong {
      color: var(--text-main);
      font-weight: 700;
    }

    .markdown-body ul, .markdown-body ol {
      margin-bottom: 20px;
      padding-left: 24px;
      color: var(--text-muted);
    }

    .markdown-body li {
      margin-bottom: 6px;
    }

    .markdown-body blockquote {
      margin: 20px 0;
      padding: 16px 20px;
      background: var(--bg-surface);
      border-left: 4px solid var(--brand-accent);
      border-radius: 0 8px 8px 0;
      color: var(--text-main);
      box-shadow: var(--card-shadow);
    }

    .markdown-body blockquote p:last-child {
      margin-bottom: 0;
    }

    .markdown-body hr {
      border: 0;
      height: 1px;
      background: var(--border-color);
      margin: 36px 0;
    }

    /* Tables */
    .markdown-body table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 24px 0 32px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-color);
      box-shadow: var(--card-shadow);
      background: var(--bg-surface);
    }

    .markdown-body th {
      background: var(--bg-primary);
      padding: 12px 16px;
      text-align: left;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
    }

    .markdown-body td {
      padding: 12px 16px;
      font-size: 0.9rem;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-main);
    }

    .markdown-body tr:last-child td {
      border-bottom: none;
    }

    .markdown-body tr:hover td {
      background: var(--bg-primary);
    }

    /* Code blocks & inline code */
    .markdown-body code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      padding: 2px 6px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.06);
      color: #0f766e;
      font-weight: 500;
    }
    html.dark .markdown-body code {
      background: rgba(255, 255, 255, 0.1);
      color: #34d399;
    }

    .markdown-body pre {
      position: relative;
      margin: 20px 0 28px;
      padding: 20px;
      background: var(--code-bg);
      border-radius: 10px;
      overflow-x: auto;
      border: 1px solid var(--border-color);
      box-shadow: var(--card-shadow-lg);
    }

    .markdown-body pre code {
      padding: 0;
      background: transparent;
      color: #f8fafc;
      font-size: 0.875rem;
      line-height: 1.6;
    }

    .copy-code-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 4px 10px;
      font-size: 0.75rem;
      background: rgba(255, 255, 255, 0.15);
      color: #e2e8f0;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s, background 0.2s;
    }

    .markdown-body pre:hover .copy-code-btn {
      opacity: 1;
    }

    .copy-code-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* MERMAID DIAGRAMS */
    .mermaid {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0 32px;
      display: flex;
      justify-content: center;
      overflow-x: auto;
      box-shadow: var(--card-shadow);
    }

    /* Stats bar */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 16px;
      box-shadow: var(--card-shadow);
    }

    .stat-val {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--brand-primary);
    }

    .stat-lbl {
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--text-muted);
      margin-top: 2px;
    }

    @media (max-width: 1024px) {
      .toc-sidebar {
        display: none;
      }
      .article-wrapper {
        padding: 24px 20px 60px;
      }
      .stats-bar {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      #sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        transform: translateX(-100%);
      }
      #sidebar.open {
        transform: translateX(0);
      }
      .mobile-menu-btn {
        display: block;
      }
      .top-bar {
        padding: 0 16px;
      }
    }
  </style>
</head>
<body>

  <!-- SIDEBAR NAVIGATION -->
  <aside id="sidebar">
    <div class="sidebar-header">
      <div class="brand-title">
        <span>🌾 Agaate</span>
        <span class="brand-badge">PWA MVP</span>
      </div>
      <div class="brand-sub">Farm Operations & Agronomy Portal</div>
    </div>

    <div class="search-box">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input type="text" id="docSearch" placeholder="Search across documents..." onkeyup="filterDocs(this.value)">
    </div>

    <nav class="doc-nav">
      <div class="nav-group-title">Documentation Suite</div>
      ${docsData.map((doc, idx) => `
        <a class="nav-item ${idx === 0 ? 'active' : ''}" onclick="switchDoc('${doc.id}')" id="nav-${doc.id}">
          <span class="nav-item-icon">${doc.icon}</span>
          <span class="nav-item-content">${doc.title}</span>
          <span class="nav-badge">${doc.badge}</span>
        </a>
      `).join('')}
    </nav>

    <div class="sidebar-footer">
      <span>Version 1.0.0</span>
      <span>Agaate Ops &copy; 2026</span>
    </div>
  </aside>

  <!-- MAIN DOCUMENT DISPLAY -->
  <main id="main-content">
    <header class="top-bar">
      <div class="top-bar-left">
        <button class="mobile-menu-btn" onclick="toggleSidebar()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div class="breadcrumb">
          <span>Docs</span>
          <span>/</span>
          <span class="current" id="currentDocBreadcrumb">Product Requirements (PRD)</span>
        </div>
      </div>

      <div class="top-bar-actions">
        <button class="action-btn" onclick="toggleTheme()" title="Toggle Dark/Light Mode">
          <span id="themeIcon">🌙</span>
          <span id="themeLabel">Theme</span>
        </button>
        <button class="action-btn" onclick="window.print()" title="Print Current Document">
          <span>🖨️</span>
          <span>Print / PDF</span>
        </button>
      </div>
    </header>

    <div class="content-container">
      <div class="article-wrapper" id="articleWrapper">
        <div class="article-inner">
          
          <!-- Key Metrics Header Banner -->
          <div class="stats-bar">
            <div class="stat-card">
              <div class="stat-val">4</div>
              <div class="stat-lbl">User Roles</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">44</div>
              <div class="stat-lbl">API Endpoints</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">20</div>
              <div class="stat-lbl">Data Models</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">100%</div>
              <div class="stat-lbl">BRD MVP Parity</div>
            </div>
          </div>

          <!-- Document Render Target -->
          <article class="markdown-body" id="docContent">
            <!-- Rendered by JS -->
          </article>
        </div>
      </div>

      <!-- ON-THIS-PAGE TABLE OF CONTENTS -->
      <aside class="toc-sidebar">
        <div class="toc-title">On This Page</div>
        <ul class="toc-list" id="tocList">
          <!-- Dynamic TOC items -->
        </ul>
      </aside>
    </div>
  </main>

  <!-- EMBEDDED MARKDOWN CONTENT (Zero network latency, 100% offline file:/// compatibility) -->
  ${docsData.map(doc => `
    <script type="text/markdown" id="raw-${doc.id}">
${doc.content.replace(/<\/script>/g, '<\\/script>')}
    </script>
  `).join('\n')}

  <script>
    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
      securityLevel: 'loose',
      flowchart: { curve: 'basis', htmlLabels: true }
    });

    // Configure Marked
    marked.setOptions({
      highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      },
      breaks: true,
      gfm: true
    });

    let activeDocId = "${docsData[0].id}";

    function renderDoc(docId) {
      activeDocId = docId;
      const rawEl = document.getElementById('raw-' + docId);
      if (!rawEl) return;

      const rawMarkdown = rawEl.textContent.trim();
      const contentEl = document.getElementById('docContent');
      
      // Parse markdown to HTML
      let html = marked.parse(rawMarkdown);
      
      // Convert mermaid code blocks to pre.mermaid elements for Mermaid rendering
      html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, function(match, code) {
        // Decode HTML entities
        const decoded = code
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"');
        return '<div class="mermaid">' + decoded + '</div>';
      });

      contentEl.innerHTML = html;

      // Add Copy Code Buttons to all pre blocks
      document.querySelectorAll('#docContent pre').forEach(pre => {
        if (pre.classList.contains('mermaid')) return;
        const btn = document.createElement('button');
        btn.className = 'copy-code-btn';
        btn.textContent = 'Copy';
        btn.onclick = () => {
          const code = pre.querySelector('code')?.innerText || pre.innerText;
          navigator.clipboard.writeText(code);
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = 'Copy', 2000);
        };
        pre.appendChild(btn);
      });

      // Render Mermaid Diagrams
      try {
        mermaid.run({
          nodes: document.querySelectorAll('.mermaid')
        });
      } catch (e) {
        console.error('Mermaid render error:', e);
      }

      // Generate Table of Contents
      generateToc();

      // Scroll to top
      document.getElementById('articleWrapper').scrollTop = 0;
    }

    function generateToc() {
      const tocList = document.getElementById('tocList');
      tocList.innerHTML = '';
      
      const headings = document.querySelectorAll('#docContent h2, #docContent h3');
      headings.forEach((heading, idx) => {
        const id = 'heading-' + idx;
        heading.id = id;

        const li = document.createElement('li');
        li.className = 'toc-item';
        
        const a = document.createElement('a');
        a.href = '#' + id;
        a.className = 'toc-link' + (heading.tagName === 'H3' ? ' indent-3' : '');
        a.textContent = heading.innerText.replace(/^[0-9.]+\s*/, '');
        a.onclick = (e) => {
          e.preventDefault();
          heading.scrollIntoView({ behavior: 'smooth' });
        };

        li.appendChild(a);
        tocList.appendChild(li);
      });
    }

    function switchDoc(docId) {
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      const activeNav = document.getElementById('nav-' + docId);
      if (activeNav) activeNav.classList.add('active');

      const docObj = ${JSON.stringify(docsData.map(d => ({ id: d.id, title: d.title })))};
      const found = docObj.find(d => d.id === docId);
      if (found) {
        document.getElementById('currentDocBreadcrumb').textContent = found.title;
      }

      renderDoc(docId);
      
      // Close mobile sidebar if open
      document.getElementById('sidebar').classList.remove('open');
    }

    function filterDocs(query) {
      const q = query.toLowerCase().trim();
      document.querySelectorAll('.nav-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(q)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    }

    function toggleTheme() {
      const isDark = document.documentElement.classList.toggle('dark');
      document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
      document.getElementById('themeLabel').textContent = isDark ? 'Light' : 'Dark';
      
      mermaid.initialize({
        theme: isDark ? 'dark' : 'default'
      });
      renderDoc(activeDocId);
    }

    function toggleSidebar() {
      document.getElementById('sidebar').classList.toggle('open');
    }

    // Initial render
    window.addEventListener('DOMContentLoaded', () => {
      renderDoc(activeDocId);
    });
  </script>
</body>
</html>`;

fs.writeFileSync(outputFile, htmlTemplate, "utf-8");
console.log(`Generated ${outputFile} successfully (${(htmlTemplate.length / 1024).toFixed(1)} KB)`);
