// Trunk callback contract, shared by standalone and directly mounted viewers.
// Progress describes downloaded bytes only; initialization has no known total.
const brandRoot = new URL("./brand/", import.meta.url);

export default function initializer(options = {}) {
  const mountRoot = options.mountRoot ?? document.body;
  let root;
  let cube;
  let state;
  let detail;
  let progress;
  let amount;
  let phase = "idle";
  let reveal = 0;
  let exitFrame;
  let exitTimer;
  let restorePosition;
  let resizeObserver;

  function cancelExit() {
    cancelAnimationFrame(exitFrame);
    clearTimeout(exitTimer);
  }

  function unmount() {
    cancelExit();
    resizeObserver?.disconnect();
    root?.remove();
    restorePosition?.();
    restorePosition = undefined;
  }

  const humanBytes = (n) => {
    const units = ["B", "KB", "MB", "GB"];
    let index = 0;
    let value = n;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index++;
    }
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

  function updateLogo(value, finished = false) {
    reveal = Math.max(reveal, value);
    const bounds = root?.getBoundingClientRect();
    const width = bounds?.width || window.innerWidth;
    const height = bounds?.height || window.innerHeight;
    const shorterSide = Math.max(1, Math.min(width, height));
    const logoSize = Math.min(300, width * 0.7, height * 0.38);
    root?.style.setProperty("--logo-half", `${logoSize / 2}px`);
    cube?.setAttribute(
      "config",
      JSON.stringify({
        pulseAuto: "off",
        pulseFollow: 0.08,
        pulseOrganic: 1,
        pulseScene: options.pulseScene ?? "interior",
        pulseRotate: true,
        pulseMouseGrow: 0.12,
        pulseGatherEnd: 0.15 * 0.9,
        // Download progress occupies 0..0.9; preserve the field until 98%.
        pulseFadeStart: 0.98 * 0.9,
        pulseFadeEnd: 0.9,
        rotateAzimuth: 22,
        rotateElevation: 16,
        rotateBounce: 0.15,
        pulseAmplitude: 0.34,
        pulseSpeed: 0.38,
        pulseWave: 0.95,
        pulseNoise: 0.85,
        pulseStagger: 0.2,
        pulseReveal: reveal,
        pulseBreath: finished ? 0 : 0.1,
        afterReveal: finished ? "none" : "rotate",
        // The dot field fills the scene; only the gathered cube is framed small.
        margin: (1 - logoSize / shorterSide) / 2,
        pulseDots: Math.max(48, Math.min(320, Math.round(shorterSide / 4.5))),
        mouseGrow: 0,
        mousePush: 0,
      }),
    );
  }

  function preparing() {
    if (phase !== "downloading") return;
    phase = "preparing";
    // Cached/streaming responses may finish without any byte-progress events.
    updateLogo(0.9);
    root.dataset.phase = phase;
    state.textContent = "Preparing your scene";
    detail.textContent = "Starting the 3D viewer…";
    amount.textContent = "Download complete";
    progress.removeAttribute("aria-valuenow");
    progress.setAttribute("aria-label", "Starting the 3D viewer");
  }

  function mount() {
    if (!document.getElementById("trunk-init-style")) {
      const style = document.createElement("style");
      style.id = "trunk-init-style";
      style.textContent = `
#trunk-init {
  position:absolute; inset:0; z-index:999999; display:grid; place-items:center;
  box-sizing:border-box; overflow:hidden; padding:24px;
  color:#17141f; font:400 14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;
  background:#f7f7fa;
}
#trunk-init::before {
  content:""; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(ellipse at 50% 42%,transparent 28%,rgba(119,88,166,.07) 65%,rgba(84,57,126,.18) 100%);
}
#trunk-init * { box-sizing:border-box; }
#trunk-init .loading-content { width:min(400px,calc(100% - 32px)); text-align:center; position:absolute; top:calc(50% + var(--logo-half,150px) + 8px); left:50%; transform:translateX(-50%); padding:20px 16px; isolation:isolate; }
#trunk-init .loading-content::before {
  content:""; position:absolute; inset:-85px -130px; z-index:-1; pointer-events:none;
  background:radial-gradient(ellipse closest-side,#fff 0%,rgba(255,255,255,.98) 30%,rgba(255,255,255,.7) 55%,transparent 100%);
}
#trunk-init .loading-logo { position:absolute; inset:0; pointer-events:none; mask-image:radial-gradient(ellipse 330px 160px at 50% calc(50% + var(--logo-half,150px) + 145px),transparent 40%,#000 100%); }
#trunk-init spatio-cube { display:block; position:relative; width:100%; height:100%; }
#trunk-init spatio-cube img { display:block; position:absolute; width:calc(var(--logo-half,150px) * 2); height:calc(var(--logo-half,150px) * 2); left:50%; top:50%; transform:translate(-50%,-50%); object-fit:contain; }
#trunk-init .loading-wordmark { display:block; width:min(244px,70%); height:auto; margin:0 auto 38px; }
#trunk-init .loading-wordmark img { display:block; width:100%; height:auto; }
#trunk-init .loading-state { font-size:18px; font-weight:600; letter-spacing:-.02em; margin:0; }
#trunk-init .loading-detail { color:#6f697c; margin:6px 0 22px; min-height:21px; overflow-wrap:anywhere; }
#trunk-init .loading-progress { width:min(244px,85%); height:3px; border-radius:9px; background:#ded9e8; overflow:hidden; margin:auto; }
#trunk-init .loading-bar { width:var(--download,0%); height:100%; background:linear-gradient(90deg,#5c16c5,#a832f5); border-radius:inherit; }
#trunk-init .loading-amount { color:#7a7387; font-size:12px; font-variant-numeric:tabular-nums; margin-top:10px; min-height:18px; }
#trunk-init[data-phase="preparing"] .loading-bar,
#trunk-init[data-indeterminate] .loading-bar { width:40%; animation:spatio-indeterminate 1.6s ease-in-out infinite; }
#trunk-init[data-phase="preparing"] .loading-logo { will-change:transform,opacity; animation:spatio-prepare 2.4s ease-in-out infinite; }
#trunk-init[data-phase="ready"] .loading-logo { animation:none; }
#trunk-init[data-phase="ready"] .loading-bar { width:100%; }
#trunk-init[data-phase="failed"] .loading-progress { display:none; }
#trunk-init[data-phase="failed"] .loading-logo { animation:none; }
#trunk-init .loading-retry { border:0; border-radius:999px; padding:12px 22px; margin-top:18px; font:600 14px system-ui,sans-serif; color:white; background:#6e19cf; cursor:pointer; }
#trunk-init .loading-retry:focus-visible { outline:3px solid #a77be5; outline-offset:4px; }
#trunk-init.leaving { pointer-events:none; animation:spatio-exit .32s ease-in both; }
@keyframes spatio-tide {
  from { transform:translate(-4%,-3%) scale(1.02) rotate(-3deg); }
  to { transform:translate(5%,4%) scale(1.12) rotate(5deg); }
}
@keyframes spatio-indeterminate { 0% { transform:translateX(-110%); } 100% { transform:translateX(360%); } }
/* Compositor motion survives synchronous WASM startup pausing the JS shader loop. */
@keyframes spatio-prepare {
  0%,100% { opacity:.72; transform:perspective(1200px) rotateY(-2deg) rotateX(1deg) scale(.99); }
  50% { opacity:1; transform:perspective(1200px) rotateY(2deg) rotateX(-1deg) scale(1.01); }
}
@keyframes spatio-exit { to { opacity:0; } }
@media (max-height:520px) {
  #trunk-init { padding:12px; }
  #trunk-init .loading-content { top:auto; bottom:12px; padding:8px 12px; }
  #trunk-init .loading-wordmark { width:170px; margin-bottom:8px; }
  #trunk-init .loading-detail { display:none; }
  #trunk-init[data-phase="failed"] .loading-logo { display:none; }
  #trunk-init[data-phase="failed"] .loading-detail { display:block; margin-bottom:8px; }
}
@media (prefers-reduced-motion:reduce) {
  #trunk-init::before, #trunk-init *, #trunk-init.leaving { animation:none !important; transition:none !important; }
  #trunk-init[data-indeterminate] .loading-bar,
  #trunk-init[data-phase="preparing"] .loading-bar { width:100%; opacity:.45; }
}`;
      document.head.append(style);
    }
    root = document.createElement("div");
    root.id = "trunk-init";
    root.dataset.phase = phase;
    root.setAttribute("data-indeterminate", "");
    root.innerHTML = `
      <div class="loading-logo" aria-hidden="true">
        <spatio-cube mode="pulse"><img src="${new URL("logo-cube.webp", brandRoot)}" alt="" width="300" height="300"></spatio-cube>
      </div>
      <div class="loading-content">
        <spatio-wordmark class="loading-wordmark" effect="shift" shift="1" blend="0.18" reach="0.9"><img src="${new URL("wordmark.svg", brandRoot)}" alt="spatiosense" width="753" height="120"></spatio-wordmark>
        <div role="status" aria-live="polite" aria-atomic="true">
          <p class="loading-state">Loading your scene</p>
          <p class="loading-detail">Downloading the 3D viewer…</p>
        </div>
        <div class="loading-progress" role="progressbar" aria-label="Downloading the 3D viewer" aria-valuemin="0" aria-valuemax="100">
          <div class="loading-bar"></div>
        </div>
        <div class="loading-amount"></div>
      </div>`;
    if (mountRoot === document.body) {
      root.style.position = "fixed";
    } else if (
      mountRoot instanceof HTMLElement &&
      getComputedStyle(mountRoot).position === "static"
    ) {
      const position = mountRoot.style.getPropertyValue("position");
      const priority = mountRoot.style.getPropertyPriority("position");
      mountRoot.style.position = "relative";
      restorePosition = () => {
        if (
          mountRoot.style.position === "relative" &&
          !mountRoot.style.getPropertyPriority("position")
        ) {
          if (position)
            mountRoot.style.setProperty("position", position, priority);
          else mountRoot.style.removeProperty("position");
        }
      };
    }
    cube = root.querySelector("spatio-cube");
    state = root.querySelector(".loading-state");
    detail = root.querySelector(".loading-detail");
    amount = root.querySelector(".loading-amount");
    progress = root.querySelector('[role="progressbar"]');
    updateLogo(0);
    mountRoot.prepend(root);
    updateLogo(reveal);
    resizeObserver = new ResizeObserver(() => {
      if (root.isConnected)
        updateLogo(reveal, phase === "ready" || phase === "failed");
      else resizeObserver.disconnect();
    });
    resizeObserver.observe(root);
    // Optional enhancement: static brand artwork remains without WebGPU/network.
    // The SVG wordmark works without WebGPU; the cube keeps its static fallback.
    void import(
      options.brandModuleUrl ?? new URL("spatio-cube.min.js", brandRoot).href
    ).catch(() => {});
  }

  return {
    onStart() {
      unmount();
      phase = "downloading";
      reveal = 0;
      mount();
    },
    onProgress({ current, total }) {
      if (phase !== "downloading") return;
      const knownTotal = Number.isFinite(total) && total > 0;
      const bytes = Number.isFinite(current) ? Math.max(0, current) : 0;
      root.toggleAttribute("data-indeterminate", !knownTotal);
      if (knownTotal) {
        const ratio = Math.min(1, bytes / total);
        // Reserve the final gather for actual runtime success, not a timer.
        updateLogo(ratio * 0.9);
        root.style.setProperty("--download", `${ratio * 100}%`);
        progress.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
        amount.textContent = `${humanBytes(bytes)} / ${humanBytes(total)} · ${Math.round(ratio * 100)}%`;
        if (ratio === 1) preparing();
      } else {
        progress.removeAttribute("aria-valuenow");
        amount.textContent = `${humanBytes(bytes)} downloaded`;
      }
    },
    onComplete: preparing,
    onSuccess() {
      if (phase !== "downloading" && phase !== "preparing") return;
      phase = "ready";
      root.dataset.phase = phase;
      root.removeAttribute("data-indeterminate");
      updateLogo(1, true);
      state.textContent = "Opening your scene";
      detail.textContent = "";
      amount.textContent = "";
      progress.setAttribute("aria-label", "3D viewer ready");
      progress.setAttribute("aria-valuenow", "100");
      // Paint the completed mark, then exit. No minimum loading duration.
      const completedRoot = root;
      exitFrame = requestAnimationFrame(() => {
        exitFrame = requestAnimationFrame(() => {
          if (completedRoot !== root || phase !== "ready") return;
          if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
            unmount();
          } else {
            const finish = () => {
              if (completedRoot === root && phase === "ready") unmount();
            };
            const onExit = (event) => {
              if (
                event.target === completedRoot &&
                event.animationName === "spatio-exit"
              )
                finish();
            };
            completedRoot.addEventListener("animationend", onExit);
            completedRoot.addEventListener("animationcancel", onExit);
            completedRoot.classList.add("leaving");
            // CSS overrides or a motion preference change may suppress events.
            exitTimer = setTimeout(finish, 500);
          }
        });
      });
    },
    onFailure(error) {
      if (!root || phase === "failed") return;
      cancelExit();
      phase = "failed";
      root.dataset.phase = phase;
      root.classList.remove("leaving");
      root.removeAttribute("data-indeterminate");
      updateLogo(1, true);
      state.textContent = "Unable to open the scene";
      console.error("3D viewer startup failed", error);
      const diagnostic = String(error?.message ?? error ?? "");
      detail.textContent =
        /network|failed to fetch|fetch failed|load failed|disconnected/i.test(
          diagnostic,
        )
          ? "Check your connection, then reload the viewer to try again."
          : "Reload the viewer to try again. If the problem continues, contact support.";
      detail.parentElement.setAttribute("role", "alert");
      detail.parentElement.setAttribute("aria-live", "assertive");
      amount.textContent = "";
      const retry = document.createElement("button");
      retry.className = "loading-retry";
      retry.textContent = "Reload viewer";
      retry.addEventListener("click", () => location.reload());
      root.querySelector(".loading-content").append(retry);
    },
  };
}
