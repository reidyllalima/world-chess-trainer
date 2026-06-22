// End-to-end smoke test driven by a real browser (system Google Chrome).
//
// Boots the Vite dev server, opens the app, and verifies what the app is about:
// making moves (player + engine reply), opening detection, and the two-phase
// hints (a live suggestion before your move, an evaluation after). Self-contained:
// starts and stops the server itself.
//
//   npm test
//
// Requires Google Chrome installed (uses Playwright's `channel: "chrome"`, so no
// browser download is needed).

import { chromium } from "playwright";
import { spawn } from "node:child_process";

const log  = (...a) => console.log("   ", ...a);
const pass = (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`);

let serverProc = null;

// Absolute safety net: never let the test hang (it once wedged on a no-timeout
// fetch). Force-exit, killing the dev server child, after this deadline.
const hardTimer = setTimeout(() => {
  console.error("\n\x1b[31mSmoke test hard-timeout — forcing exit\x1b[0m");
  try { serverProc?.kill("SIGKILL"); } catch { /* ignore */ }
  process.exit(1);
}, 120000);

// ── Boot the dev server (lets Vite pick a free port; parses the real URL) ────
async function startServer() {
  const proc = spawn("npx", ["vite", "--port", "5174"], { stdio: ["ignore", "pipe", "pipe"] });
  serverProc = proc;

  let base = null;
  const onData = (d) => {
    const m = String(d).match(/http:\/\/localhost:(\d+)/);
    if (m && !base) base = `http://localhost:${m[1]}`;
  };
  proc.stdout.on("data", onData);
  proc.stderr.on("data", (d) => process.env.DEBUG && process.stderr.write(d));

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (base) {
      try {
        const res = await fetch(base, { signal: AbortSignal.timeout(2000) });
        if (res.ok) return base;
      } catch { /* not ready / timed out — retry */ }
    }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error("Vite dev server did not start in time");
}

// ── Board interaction (drag a piece between two squares) ────────────────────
async function squareCenter(page, sq) {
  const box = (await page.locator("#board cg-board").boundingBox())
           ?? (await page.locator("#board").boundingBox());
  const col  = sq.charCodeAt(0) - 97;          // a..h -> 0..7
  const rank = parseInt(sq[1], 10);            // 1..8
  return {
    x: box.x + (col + 0.5) * box.width / 8,
    y: box.y + ((8 - rank) + 0.5) * box.height / 8, // white orientation
  };
}

async function dragMove(page, from, to) {
  const a = await squareCenter(page, from);
  const b = await squareCenter(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
}

// ── The test ────────────────────────────────────────────────────────────────
async function run() {
  const base = await startServer();
  pass(`dev server up (${base})`);

  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    await runChecks(browser, base);
  } finally {
    await browser?.close();
    serverProc?.kill("SIGTERM");
  }
}

async function runChecks(browser, base) {
  const page = await browser.newPage();

  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (m) => {
    const t = m.type();
    if (t === "error" || t === "warning") log(`console.${t}:`, m.text());
  });

  await page.goto(base, { waitUntil: "load" });

  // Use the fastest level so engine replies are quick during the test.
  await page.selectOption("#difficulty", "basic");

  // Board renders with pieces.
  await page.waitForFunction(
    () => document.querySelectorAll("#board piece").length >= 16,
    null, { timeout: 15000 });
  pass("board rendered with pieces");

  // 1) Player move e2-e4 registers in the history.
  await dragMove(page, "e2", "e4");
  await page.waitForFunction(
    () => document.getElementById("move-w-1")?.textContent === "e4",
    null, { timeout: 8000 });
  pass("player move e4 recorded");

  // 2) Opening detected (e2e4 -> King's Pawn Game) with a strategy tip.
  await page.waitForFunction(() => {
    const n = document.getElementById("opening-name")?.textContent?.trim();
    const t = document.getElementById("opening-tip")?.textContent?.trim();
    return n && n !== "—" && t && t.length > 0;
  }, null, { timeout: 8000 });
  const opening = await page.locator("#opening-name").textContent();
  const eco     = await page.locator("#opening-eco").textContent();
  pass(`opening detected: ${opening} (${eco}) + strategy tip shown`);

  // 3) Engine replies as black.
  const t0 = Date.now();
  await page.waitForFunction(() => {
    const b = document.getElementById("move-b-1")?.textContent;
    return b && b !== "..." && b.length > 0;
  }, null, { timeout: 25000 });
  const reply = await page.locator("#move-b-1").textContent();
  pass(`engine replied: 1...${reply} (in ${Date.now() - t0}ms)`);

  // Wait until it is the human's turn again before playing the next move.
  await page.waitForFunction(
    () => document.querySelector(".clock.white")?.classList.contains("active"),
    null, { timeout: 8000 });

  // Record every hint-panel label so both hint phases can be checked race-free.
  await page.evaluate(() => {
    window.__hintLabels = [];
    const el = document.getElementById("hint-label");
    const recObs = () => { const t = el.textContent.trim(); if (t) window.__hintLabels.push(t); };
    new MutationObserver(recObs).observe(el, { childList: true, characterData: true, subtree: true });
  });

  // 4) Enable hints -> a live suggestion appears for our turn (arrow + "Sugestão:").
  await page.click("#hintsToggle");
  await page.waitForFunction(() => {
    const p = document.getElementById("hint-panel");
    const label = document.getElementById("hint-label")?.textContent ?? "";
    return p && !p.classList.contains("hidden") && label.startsWith("Sugestão");
  }, null, { timeout: 20000 });
  const arrows = await page.locator("#board svg line").count();
  pass(`suggestion shown: "${await page.locator("#hint-label").textContent()}" (board arrows: ${arrows})`);

  // 5) Play a move -> it registers, gets evaluated, engine replies.
  await dragMove(page, "d2", "d4");
  await page.waitForFunction(
    () => document.getElementById("move-w-2")?.textContent === "d4",
    null, { timeout: 8000 });
  pass("second player move d4 recorded (hints on)");

  await page.waitForFunction(() => {
    const b = document.getElementById("move-b-2")?.textContent;
    return b && b !== "..." && b.length > 0;
  }, null, { timeout: 25000 });

  // Both phases must have shown: a suggestion before, an evaluation after.
  const labels  = await page.evaluate(() => window.__hintLabels);
  const sawSugg = labels.some(l => l.startsWith("Sugestão"));
  const sawEval = labels.some(l => /Excelente|Boa jogada|Imprecisão|Erro|Grave/.test(l));
  if (!sawSugg) throw new Error(`no suggestion label captured: ${JSON.stringify(labels)}`);
  if (!sawEval) throw new Error(`no evaluation label captured: ${JSON.stringify(labels)}`);
  if (arrows < 1) throw new Error("suggestion did not draw an arrow on the board");
  pass(`hint phases verified — labels: ${JSON.stringify(labels)}`);

  if (pageErrors.length) {
    throw new Error(`uncaught page errors:\n${pageErrors.join("\n")}`);
  }
  pass("no uncaught page errors");

  console.log("\n\x1b[32mAll smoke tests passed.\x1b[0m");
}

run()
  .then(() => { clearTimeout(hardTimer); process.exit(0); })
  .catch((e) => {
    clearTimeout(hardTimer);
    console.error("\n\x1b[31mSmoke test failed:\x1b[0m", e.message);
    try { serverProc?.kill("SIGKILL"); } catch { /* ignore */ }
    process.exit(1);
  });
