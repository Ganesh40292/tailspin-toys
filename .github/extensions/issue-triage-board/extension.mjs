import { createServer } from 'node:http';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { joinSession, createCanvas, CanvasError } from '@github/copilot-sdk/extension';

const execAsync = promisify(exec);
const servers = new Map();

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function issueScore(issue) {
    const labels = issue.labels.map((label) => label.name.toLowerCase());
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    let score = 0;

    if (labels.some((label) => /critical|urgent|p0|blocker/.test(label))) score += 100;
    if (labels.some((label) => /high|priority/.test(label))) score += 45;
    if (labels.some((label) => /bug|security|regression/.test(label))) score += 30;
    if (/\b(blocked|broken|crash|data loss|security|vulnerability)\b/.test(text)) score += 25;
    if (issue.assignees.length === 0) score += 8;
    score += Math.min(issue.comments, 10);

    const updatedAt = Date.parse(issue.updatedAt);
    if (!Number.isNaN(updatedAt)) {
        const ageInDays = (Date.now() - updatedAt) / 86_400_000;
        score += Math.min(Math.max(ageInDays, 0), 14);
    }

    return score;
}

function topReason(issue) {
    const labels = issue.labels.map((label) => label.name.toLowerCase());
    const reasons = [];

    if (labels.some((label) => /critical|urgent|p0|blocker/.test(label))) {
        reasons.push('it carries an urgent or blocking label');
    } else if (labels.some((label) => /bug|security|regression/.test(label))) {
        reasons.push('it signals a bug, regression, or security concern');
    }
    if (issue.assignees.length === 0) reasons.push('it is unassigned');
    if (issue.comments > 0) reasons.push(`it has ${issue.comments} discussion${issue.comments === 1 ? '' : 's'}`);

    return reasons.length > 0
        ? `${reasons.join(' and ')}.`
        : 'its recent activity and issue content suggest it deserves an early review.';
}

async function loadIssues() {
    const { stdout } = await execAsync(
        'gh issue list --state open --limit 50 --json number,title,body,labels,createdAt,updatedAt,assignees,comments,url',
        { cwd: process.cwd(), windowsHide: true },
    );
    const issues = JSON.parse(stdout);

    return issues
        .map((issue) => ({
            ...issue,
            labels: issue.labels ?? [],
            assignees: issue.assignees ?? [],
            comments: issue.comments ?? 0,
            score: issueScore({
                ...issue,
                labels: issue.labels ?? [],
                assignees: issue.assignees ?? [],
                comments: issue.comments ?? 0,
            }),
        }))
        .sort((left, right) => right.score - left.score || left.number - right.number);
}

function renderIssue(issue, isPriority) {
    const description = issue.body?.trim() || 'No issue description was provided.';
    const labels = issue.labels
        .map((label) => `<span class="label">${escapeHtml(label.name)}</span>`)
        .join('');
    const justification = isPriority
        ? `<p class="why"><strong>Why it is here:</strong> ${escapeHtml(topReason(issue))}</p>`
        : '';

    return `
      <article class="card">
        <div class="card-heading">
          <span class="issue-number">#${issue.number}</span>
          <a href="${escapeHtml(issue.url)}" target="_blank" rel="noreferrer">${escapeHtml(issue.title)}</a>
        </div>
        <div class="labels">${labels || '<span class="muted">No labels</span>'}</div>
        <p>${escapeHtml(description)}</p>
        ${justification}
        <button data-testid="add-issue-${issue.number}" data-issue-number="${issue.number}" type="button">Add to current context</button>
      </article>`;
}

function renderHtml(instanceId, issues, errorMessage = '') {
    const priorityIssues = issues.slice(0, 3);
    const remainingIssues = issues.slice(3);
    const error = errorMessage
        ? `<div class="error" role="alert">${escapeHtml(errorMessage)}</div>`
        : '';

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Issue triage board</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: var(--background-color-default, #ffffff);
        --panel: var(--background-color-secondary, #f6f8fa);
        --text: var(--text-color-default, #1f2328);
        --muted: var(--text-color-muted, #656d76);
        --border: var(--border-color-default, #d0d7de);
        --accent: var(--true-color-blue, #0969da);
        --accent-muted: var(--true-color-blue-muted, #ddf4ff);
      }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px; background: var(--bg); color: var(--text); font: 14px/1.5 var(--font-sans, system-ui, sans-serif); }
      main { max-width: 960px; margin: 0 auto; }
      h1 { margin: 0 0 4px; font-size: 24px; }
      h2 { margin: 28px 0 12px; font-size: 17px; }
      .subtitle, .muted { color: var(--muted); }
      .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 16px 0; }
      .toolbar button, button { border: 1px solid var(--border); border-radius: 6px; padding: 7px 12px; background: var(--panel); color: var(--text); cursor: pointer; font: inherit; }
      button:hover, button:focus-visible { border-color: var(--accent); outline: 2px solid var(--accent-muted); outline-offset: 1px; }
      .board { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
      .card { display: flex; flex-direction: column; gap: 9px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel); }
      .card-heading { display: flex; gap: 8px; align-items: baseline; }
      .card-heading a { color: var(--accent); font-weight: 600; text-decoration: none; }
      .card-heading a:hover { text-decoration: underline; }
      .issue-number { color: var(--muted); font-family: var(--font-mono, monospace); }
      .card p { margin: 0; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
      .why { padding: 9px; border-left: 3px solid var(--accent); background: var(--accent-muted); }
      .labels { display: flex; flex-wrap: wrap; gap: 5px; }
      .label { border-radius: 999px; padding: 2px 8px; background: var(--accent-muted); color: var(--text); font-size: 12px; }
      .card button { align-self: flex-start; margin-top: auto; }
      .empty, .error { padding: 16px; border: 1px solid var(--border); border-radius: 8px; }
      .error { border-color: var(--true-color-red, #cf222e); color: var(--true-color-red, #cf222e); }
      #status { min-height: 20px; color: var(--muted); }
    </style>
  </head>
  <body>
    <main>
      <h1>Issue triage board</h1>
      <p class="subtitle">Open issues ranked by urgency signals, ownership, and recent discussion.</p>
      ${error}
      <div class="toolbar">
        <span id="status" role="status" aria-live="polite">${issues.length} open issue${issues.length === 1 ? '' : 's'}</span>
        <button id="refresh" data-testid="refresh-issues" type="button">Refresh issues</button>
      </div>
      <h2>Needs attention now</h2>
      <section class="board" aria-label="Top three issues">
        ${priorityIssues.length > 0 ? priorityIssues.map((issue) => renderIssue(issue, true)).join('') : '<div class="empty">No open issues found.</div>'}
      </section>
      <h2>Remaining open issues</h2>
      <section class="board" aria-label="Remaining issues">
        ${remainingIssues.length > 0 ? remainingIssues.map((issue) => renderIssue(issue, false)).join('') : '<div class="empty">Nothing else is waiting in the backlog.</div>'}
      </section>
    </main>
    <script>
      const instanceId = ${JSON.stringify(instanceId)};
      const status = document.querySelector('#status');
      async function addToContext(number) {
        status.textContent = 'Adding issue #' + number + ' to the current context…';
        const response = await fetch('/attach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number }),
        });
        const result = await response.json();
        status.textContent = result.message;
      }
      document.querySelectorAll('[data-issue-number]').forEach((button) => {
        button.addEventListener('click', () => addToContext(Number(button.dataset.issueNumber)).catch(() => {
          status.textContent = 'Could not add that issue to the current context.';
        }));
      });
      document.querySelector('#refresh').addEventListener('click', async () => {
        status.textContent = 'Refreshing issues…';
        const response = await fetch('/refresh');
        document.open();
        document.write(await response.text());
        document.close();
      });
    </script>
  </body>
</html>`;
}

async function startServer(instanceId, session) {
    let issues = [];
    let loadError = '';
    try {
        issues = await loadIssues();
    } catch (error) {
        loadError = `Unable to load GitHub issues: ${error instanceof Error ? error.message : String(error)}`;
    }

    const server = createServer(async (request, response) => {
        try {
            if (request.url === '/refresh') {
                issues = await loadIssues();
                loadError = '';
            } else if (request.url === '/attach' && request.method === 'POST') {
                let body = '';
                for await (const chunk of request) body += chunk;
                const { number } = JSON.parse(body);
                const issue = issues.find((candidate) => candidate.number === number);
                if (!issue) throw new CanvasError('issue_not_found', `Open issue #${number} was not found.`);
                await session.send({
                    prompt: `Please add GitHub issue #${issue.number} to the current work context and begin triaging it. Issue title: "${issue.title}". URL: ${issue.url}`,
                });
                response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ message: `Issue #${issue.number} added to the current context.` }));
                return;
            }

            response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            response.end(renderHtml(instanceId, issues, loadError));
        } catch (error) {
            const statusCode = error instanceof CanvasError ? 404 : 500;
            response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
            response.end(JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
        }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: 'issue-triage-board',
            displayName: 'Issue triage board',
            description: 'A Kanban board that ranks open repository issues and adds selected issues to the current session context.',
            actions: [
                {
                    name: 'refresh_issues',
                    description: 'Refresh the board from the repository open issues.',
                    handler: async () => ({ issues: await loadIssues() }),
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId, session);
                    servers.set(ctx.instanceId, entry);
                }
                return { title: 'Issue triage board', url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
