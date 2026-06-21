(function () {
  const STORAGE_KEY = "bead-stock-v1";

  const initialState = {
    colors: [],
    projects: [],
  };

  const STAR_BEAD_PALETTE = createStarBeadPalette();

  let state = loadState();
  let usageItems = [];
  let historyFilter = "active";

  const $ = (id) => document.getElementById(id);

  const els = {
    totalColors: $("totalColors"),
    totalBeads: $("totalBeads"),
    lowStockCount: $("lowStockCount"),
    outStockCount: $("outStockCount"),
    inventoryBody: $("inventoryBody"),
    colorForm: $("colorForm"),
    colorCode: $("colorCode"),
    colorName: $("colorName"),
    colorHex: $("colorHex"),
    currentQty: $("currentQty"),
    lowThreshold: $("lowThreshold"),
    inventorySearch: $("inventorySearch"),
    inventoryFilter: $("inventoryFilter"),
    applyPaletteBtn: $("applyPaletteBtn"),
    csvInput: $("csvInput"),
    downloadCsvTemplateBtn: $("downloadCsvTemplateBtn"),
    exportDataBtn: $("exportDataBtn"),
    importDataInput: $("importDataInput"),
    projectForm: $("projectForm"),
    projectName: $("projectName"),
    projectNote: $("projectNote"),
    usageCode: $("usageCode"),
    usageQty: $("usageQty"),
    addUsageBtn: $("addUsageBtn"),
    bulkUsage: $("bulkUsage"),
    parseBulkBtn: $("parseBulkBtn"),
    usageBody: $("usageBody"),
    clearUsageBtn: $("clearUsageBtn"),
    shortageNotice: $("shortageNotice"),
    historyList: $("historyList"),
    toast: $("toast"),
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const loaded = raw ? JSON.parse(raw) : structuredClone(initialState);
      if (applyStarPalette(loaded, false)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
      }
      return loaded;
    } catch {
      return structuredClone(initialState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function normalizeCode(code) {
    return String(code || "").trim().toUpperCase();
  }

  function codeAliases(code) {
    const normalized = normalizeCode(code);
    const match = normalized.match(/^([A-Z])0?(\d+)$/);
    if (!match) return [normalized];
    const number = Number.parseInt(match[2], 10);
    return [normalized, `${match[1]}${number}`, `${match[1]}${String(number).padStart(2, "0")}`];
  }

  function toInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("zh-CN").format(value || 0);
  }

  function getColor(code) {
    return state.colors.find((color) => color.code === normalizeCode(code));
  }

  function upsertColor(color) {
    const code = normalizeCode(color.code);
    if (!code) return false;

    const existing = getColor(code);
    const record = {
      code,
      name: String(color.name || "").trim(),
      hex: color.hex || paletteHex(code) || "#ffffff",
      qty: toInt(color.qty),
      threshold: toInt(color.threshold, 50),
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      Object.assign(existing, record);
    } else {
      state.colors.push(record);
    }

    state.colors.sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
    saveState();
    return true;
  }

  function deleteColor(code) {
    state.colors = state.colors.filter((color) => color.code !== normalizeCode(code));
    saveState();
    renderAll();
  }

  function statusFor(color) {
    if (color.qty <= 0) return { key: "out", label: "缺货" };
    if (color.qty <= color.threshold) return { key: "low", label: "低库存" };
    return { key: "ok", label: "充足" };
  }

  function renderDashboard() {
    const totalBeads = state.colors.reduce((sum, color) => sum + color.qty, 0);
    const low = state.colors.filter((color) => color.qty > 0 && color.qty <= color.threshold).length;
    const out = state.colors.filter((color) => color.qty <= 0).length;

    els.totalColors.textContent = state.colors.length;
    els.totalBeads.textContent = formatNumber(totalBeads);
    els.lowStockCount.textContent = low;
    els.outStockCount.textContent = out;
  }

  function applyStarPalette(targetState = state, overwrite = false) {
    if (!Array.isArray(targetState.colors)) return false;
    let changed = false;
    targetState.colors.forEach((color) => {
      const hex = paletteHex(color.code);
      const current = String(color.hex || "").toLowerCase();
      const shouldFill = !current || current === "#fff" || current === "#ffffff";
      if (hex && (overwrite || shouldFill)) {
        color.hex = hex;
        changed = true;
      }
    });
    return changed;
  }

  function paletteHex(code) {
    for (const alias of codeAliases(code)) {
      if (STAR_BEAD_PALETTE[alias]) return STAR_BEAD_PALETTE[alias];
    }
    return "";
  }

  function createStarBeadPalette() {
    const ranges = {
      A: [
        "#fff3c8", "#e8edc8", "#f7f48a", "#d8c400", "#f4c600", "#e59a00", "#e66b12",
        "#c7a000", "#f0995f", "#f27a22", "#e6bd70", "#f2a58e", "#ffc241", "#f04123",
        "#f3ea16", "#eceb7d", "#f0c535", "#ffc06c", "#c94d4b", "#bfa23e", "#f2cf65",
        "#f2df64", "#c9a48f", "#eff1b5", "#bfa24a", "#d99a18"
      ],
      B: ramp(["#c8f34a", "#91de4a", "#53c94f", "#168e52", "#0b5a45", "#55cfc3", "#b7df7a"], 32),
      C: [
        "#c9e7d4", "#b7eee7", "#c8edf6", "#66d5e9", "#18abc1", "#7ab9de", "#3167b9",
        "#1262ab", "#355dc5", "#28a6d6", "#18aaa6", "#1d314d", "#b4d3e9", "#d6f2ee",
        "#1ab4aa", "#0b5588", "#5ecad5", "#13283a", "#0d7c8d", "#116fa0", "#c3e2ed",
        "#a8d0d2", "#96c3c9", "#63a5d0", "#75d1c1", "#157d87", "#bdddec", "#92b2c6",
        "#493a9a"
      ],
      D: ramp(["#243bc0", "#3341b6", "#4c2d8b", "#6b28a5", "#9b1aa8", "#d35cc1", "#b8a3df"], 26),
      E: [
        "#ff9a8e", "#f6a8d7", "#ee4c9a", "#c23288", "#de00a6", "#ff2d78", "#8c0059",
        "#ffc5d5", "#d84f9f", "#e3009f", "#f3d2bf", "#ef6aae", "#720071", "#d5726b",
        "#d8b4aa", "#efe5d9", "#f5c8dc", "#ff8eb8", "#f0abc8", "#9b7584", "#73585f",
        "#70405f", "#4f4657", "#eed8ef"
      ],
      F: [
        "#ff796e", "#e93032", "#ff4d55", "#f20e18", "#c80c18", "#8e2d22", "#771329",
        "#e51a31", "#ff2f58", "#9e3e20", "#582a26", "#f24b78", "#e63718", "#ffb1b9",
        "#b40010", "#f0a280", "#ff725f", "#c77962", "#ff5e5e", "#dc7e6c", "#ef7fa3",
        "#ff9c86", "#ff4738", "#ff867a", "#f7464b"
      ],
      G: ramp(["#7a4b22", "#9b6a2d", "#d49b42", "#f1c77d", "#d87b1f", "#8b3c18", "#4c241a"], 21),
      H: [
        "#f4f4ef", "#e6e4d8", "#cfcfc7", "#b9b9b0", "#96968e", "#62645f", "#151515",
        "#3f3934", "#5b5148", "#8b8175", "#bdb5a9", "#d6d0c7", "#a09c91", "#7f7a72",
        "#5d5a55", "#333331", "#212121", "#454d4d", "#69706c", "#90958f", "#b4b6ae",
        "#c9c9bf", "#9a9a92"
      ],
      M: [
        "#dfe6e0", "#a7d8d2", "#77c0b7", "#4b938a", "#2f716b", "#1e4c4b", "#31414f",
        "#4e3561", "#5d244f", "#7a3e37", "#9a5a37", "#b3734b", "#c4936d", "#ddb08b",
        "#f1d6b9"
      ],
    };

    const palette = {};
    Object.entries(ranges).forEach(([series, colors]) => {
      colors.forEach((hex, index) => {
        const number = index + 1;
        palette[`${series}${String(number).padStart(2, "0")}`] = hex;
        palette[`${series}${number}`] = hex;
      });
    });
    return palette;
  }

  function ramp(anchors, count) {
    const colors = anchors.map(hexToRgb);
    const output = [];
    for (let index = 0; index < count; index += 1) {
      const position = count === 1 ? 0 : (index / (count - 1)) * (colors.length - 1);
      const left = Math.floor(position);
      const right = Math.min(colors.length - 1, left + 1);
      const mix = position - left;
      output.push(rgbToHex({
        r: Math.round(colors[left].r + (colors[right].r - colors[left].r) * mix),
        g: Math.round(colors[left].g + (colors[right].g - colors[left].g) * mix),
        b: Math.round(colors[left].b + (colors[right].b - colors[left].b) * mix),
      }));
    }
    return output;
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    return {
      r: Number.parseInt(clean.slice(0, 2), 16),
      g: Number.parseInt(clean.slice(2, 4), 16),
      b: Number.parseInt(clean.slice(4, 6), 16),
    };
  }

  function rgbToHex({ r, g, b }) {
    return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
  }

  function renderInventory() {
    const search = normalizeCode(els.inventorySearch.value);
    const filter = els.inventoryFilter.value;

    const rows = state.colors.filter((color) => {
      const status = statusFor(color).key;
      const matchesSearch =
        !search ||
        color.code.includes(search) ||
        color.name.toUpperCase().includes(search);
      const matchesFilter =
        filter === "all" ||
        (filter === "low" && status === "low") ||
        (filter === "out" && status === "out");
      return matchesSearch && matchesFilter;
    });

    if (!rows.length) {
      els.inventoryBody.innerHTML = '<tr><td class="empty" colspan="6">还没有符合条件的库存记录。</td></tr>';
      return;
    }

    els.inventoryBody.innerHTML = rows
      .map((color) => {
        const status = statusFor(color);
        return `
          <tr>
            <td><strong>${escapeHtml(color.code)}</strong></td>
            <td><span class="swatch" style="background:${escapeAttr(color.hex)}"></span>${escapeHtml(color.name || "未命名")}</td>
            <td>${formatNumber(color.qty)}</td>
            <td>${formatNumber(color.threshold)}</td>
            <td><span class="status ${status.key}">${status.label}</span></td>
            <td>
              <div class="row-actions">
                <button class="button ghost" data-action="edit-color" data-code="${escapeAttr(color.code)}">编辑</button>
                <button class="button danger" data-action="delete-color" data-code="${escapeAttr(color.code)}">删除</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderUsage() {
    if (!usageItems.length) {
      els.usageBody.innerHTML = '<tr><td class="empty" colspan="5">还没有加入用量。</td></tr>';
      els.shortageNotice.classList.add("hidden");
      els.shortageNotice.textContent = "";
      return;
    }

    const shortages = [];
    els.usageBody.innerHTML = usageItems
      .map((item) => {
        const color = getColor(item.code);
        const current = color ? color.qty : 0;
        const after = current - item.qty;
        if (!color) {
          shortages.push(`${item.code} 不在库存表里`);
        } else if (after < 0) {
          shortages.push(`${item.code} 缺 ${Math.abs(after)} 颗`);
        }

        return `
          <tr>
            <td><strong>${escapeHtml(item.code)}</strong>${color ? ` ${escapeHtml(color.name || "")}` : " 未建库存"}</td>
            <td>${formatNumber(item.qty)}</td>
            <td>${formatNumber(current)}</td>
            <td class="${after < 0 ? "danger-text" : ""}">${formatNumber(after)}</td>
            <td><button class="button ghost" data-action="remove-usage" data-code="${escapeAttr(item.code)}">移除</button></td>
          </tr>
        `;
      })
      .join("");

    if (shortages.length) {
      els.shortageNotice.classList.remove("hidden");
      els.shortageNotice.innerHTML = `<strong>库存不足：</strong>${shortages.map(escapeHtml).join("，")}`;
    } else {
      els.shortageNotice.classList.add("hidden");
      els.shortageNotice.textContent = "";
    }
  }

  function renderHistory() {
    if (!state.projects.length) {
      els.historyList.innerHTML = '<div class="empty">还没有扣库存记录。</div>';
      return;
    }

    const activeProjects = state.projects.filter((project) => !project.undone);
    const undoneProjects = state.projects.filter((project) => project.undone);
    const selectedProjects = historyFilter === "undone" ? undoneProjects : activeProjects;
    const emptyMessage = historyFilter === "undone" ? "还没有已撤销的成品。" : "还没有正在扣库存的成品。";

    const listHtml = selectedProjects.length
      ? selectedProjects
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((project) => {
        const total = project.items.reduce((sum, item) => sum + item.qty, 0);
        const itemText = project.items
          .map((item) => `${escapeHtml(item.code)}: ${formatNumber(item.qty)}`)
          .join(" / ");
        const canUndo = !project.undone;
        const canRestore = project.undone;
        return `
          <article class="history-item">
            <div class="history-head">
              <div>
                <strong>${escapeHtml(project.name)}</strong>
                <div class="history-meta">${new Date(project.createdAt).toLocaleString("zh-CN")} · ${project.items.length} 色 · ${formatNumber(total)} 颗${project.undone ? " · 已撤销" : ""}</div>
              </div>
              <div class="row-actions">
                <button class="button ghost" data-action="copy-project" data-id="${escapeAttr(project.id)}">复制到编辑</button>
                ${canUndo ? `<button class="button danger" data-action="undo-project" data-id="${escapeAttr(project.id)}">撤销扣库存</button>` : ""}
                ${canRestore ? `<button class="button secondary" data-action="restore-project" data-id="${escapeAttr(project.id)}">恢复扣库存</button>` : ""}
              </div>
            </div>
            ${project.note ? `<p class="history-meta">${escapeHtml(project.note)}</p>` : ""}
            <p class="history-items">${itemText}</p>
          </article>
        `;
      })
      .join("")
      : `<div class="empty">${emptyMessage}</div>`;

    els.historyList.innerHTML = `
      <div class="history-tabs" role="tablist" aria-label="历史记录分类">
        <button class="history-tab ${historyFilter === "active" ? "active" : ""}" data-action="history-filter" data-filter="active" type="button">
          已扣库存 <span>${activeProjects.length}</span>
        </button>
        <button class="history-tab ${historyFilter === "undone" ? "active" : ""}" data-action="history-filter" data-filter="undone" type="button">
          已撤销 <span>${undoneProjects.length}</span>
        </button>
      </div>
      ${listHtml}
    `;
  }

  function renderAll() {
    renderDashboard();
    renderInventory();
    renderUsage();
    renderHistory();
  }

  function addUsage(code, qty) {
    const normalizedCode = normalizeCode(code);
    const amount = toInt(qty);
    if (!normalizedCode || amount <= 0) {
      showToast("请输入有效的色号和数量。");
      return;
    }

    const existing = usageItems.find((item) => item.code === normalizedCode);
    if (existing) {
      existing.qty += amount;
    } else {
      usageItems.push({ code: normalizedCode, qty: amount });
    }
    usageItems.sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
    renderUsage();
  }

  function parseBulkUsage(text) {
    const lines = String(text || "").split(/\r?\n/);
    let count = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const parts = trimmed.split(/[\s,;，、]+/).filter(Boolean);
      if (parts.length < 2) return;
      const code = parts[0];
      const qty = parts.find((part, index) => index > 0 && /^\d+$/.test(part));
      if (qty) {
        addUsage(code, qty);
        count += 1;
      }
    });

    showToast(count ? `已解析 ${count} 行用量。` : "没有解析到有效用量。");
  }

  function commitProject(event) {
    event.preventDefault();
    const name = els.projectName.value.trim();
    if (!name) {
      showToast("请输入项目名称。");
      return;
    }
    if (!usageItems.length) {
      showToast("请先加入项目用量。");
      return;
    }

    const problems = usageItems.flatMap((item) => {
      const color = getColor(item.code);
      if (!color) return [`${item.code} 不在库存表里`];
      if (color.qty < item.qty) return [`${item.code} 缺 ${item.qty - color.qty} 颗`];
      return [];
    });

    if (problems.length) {
      showToast(`不能扣库存：${problems.join("，")}`);
      return;
    }

    usageItems.forEach((item) => {
      const color = getColor(item.code);
      color.qty -= item.qty;
      color.updatedAt = new Date().toISOString();
    });

    state.projects.push({
      id: createId(),
      name,
      note: els.projectNote.value.trim(),
      items: usageItems.map((item) => ({ ...item })),
      createdAt: new Date().toISOString(),
      undone: false,
    });

    usageItems = [];
    els.projectForm.reset();
    saveState();
    renderAll();
    showToast("已扣库存并保存项目记录。");
  }

  function undoProject(id) {
    const project = state.projects.find((item) => item.id === id);
    if (!project || project.undone) return;

    project.items.forEach((item) => {
      const color = getColor(item.code);
      if (color) color.qty += item.qty;
    });
    project.undone = true;
    project.undoneAt = new Date().toISOString();
    saveState();
    renderAll();
    historyFilter = "undone";
    showToast("已撤销项目扣库存，并归类到已撤销。");
  }

  function restoreProject(id) {
    const project = state.projects.find((item) => item.id === id);
    if (!project || !project.undone) return;

    const problems = project.items.flatMap((item) => {
      const color = getColor(item.code);
      if (!color) return [`${item.code} 不在库存表里`];
      if (color.qty < item.qty) return [`${item.code} 缺 ${item.qty - color.qty} 颗`];
      return [];
    });

    if (problems.length) {
      showToast(`不能恢复扣库存：${problems.join("，")}`);
      return;
    }

    project.items.forEach((item) => {
      const color = getColor(item.code);
      color.qty -= item.qty;
      color.updatedAt = new Date().toISOString();
    });
    project.undone = false;
    project.restoredAt = new Date().toISOString();
    saveState();
    historyFilter = "active";
    renderAll();
    showToast("已恢复项目扣库存。");
  }

  function copyProjectToEditor(id) {
    const project = state.projects.find((item) => item.id === id);
    if (!project) return;
    usageItems = project.items.map((item) => ({ ...item }));
    els.projectName.value = project.undone ? project.name : `${project.name} - 修改版`;
    els.projectNote.value = project.note || "";
    renderUsage();
    switchTab("project");
    els.projectName.focus();
    showToast("已复制到新项目表单，可以修改后再确认扣库存。");
  }

  function importCsv(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result || ""));
      let imported = 0;

      rows.forEach((row) => {
        const code = row.color_code || row.code || row["色号"];
        if (!code) return;
        const ok = upsertColor({
          code,
          name: row.color_name || row.name || row["颜色名"] || "",
          hex: row.hex || row["颜色"] || "#ffffff",
          qty: row.current_qty || row.qty || row["当前数量"] || row.initial_qty || 0,
          threshold: row.low_stock_threshold || row.threshold || row["低库存线"] || 50,
        });
        if (ok) imported += 1;
      });

      saveState();
      renderAll();
      els.csvInput.value = "";
      showToast(imported ? `已导入 ${imported} 个颜色。` : "CSV 没有可导入的颜色。");
    };
    reader.readAsText(file, "utf-8");
  }

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];
    const headers = splitCsvLine(lines[0]).map((item) => item.trim());
    return lines.slice(1).map((line) => {
      const values = splitCsvLine(line);
      return headers.reduce((row, header, index) => {
        row[header] = values[index] || "";
        return row;
      }, {});
    });
  }

  function splitCsvLine(line) {
    const result = [];
    let current = "";
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"' && quoted && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportData() {
    download(
      `bead-stock-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(state, null, 2),
      "application/json"
    );
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result || ""));
        if (!Array.isArray(imported.colors) || !Array.isArray(imported.projects)) {
          throw new Error("Invalid backup");
        }
        state = imported;
        applyStarPalette(state, false);
        saveState();
        renderAll();
        showToast("备份已导入。");
      } catch {
        showToast("备份格式不正确。");
      } finally {
        els.importDataInput.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function downloadCsvTemplate() {
    const template = [
      "color_code,color_name,hex,current_qty,low_stock_threshold",
      "A01,白色,#ffffff,1000,50",
      "A02,黑色,#111111,1000,50",
    ].join("\n");
    download("bead-stock-template.csv", template, "text/csv;charset=utf-8");
  }

  function editColor(code) {
    const color = getColor(code);
    if (!color) return;
    els.colorCode.value = color.code;
    els.colorName.value = color.name;
    els.colorHex.value = color.hex || "#ffffff";
    els.currentQty.value = color.qty;
    els.lowThreshold.value = color.threshold;
    switchTab("inventory");
    els.colorCode.focus();
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2400);
  }

  function createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function switchTab(tabId) {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabId);
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === tabId);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  els.colorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const ok = upsertColor({
      code: els.colorCode.value,
      name: els.colorName.value,
      hex: els.colorHex.value,
      qty: els.currentQty.value,
      threshold: els.lowThreshold.value,
    });
    if (ok) {
      els.colorForm.reset();
      els.colorHex.value = "#ffffff";
      els.lowThreshold.value = "50";
      renderAll();
      showToast("颜色库存已保存。");
    }
  });

  els.inventorySearch.addEventListener("input", renderInventory);
  els.inventoryFilter.addEventListener("change", renderInventory);
  els.csvInput.addEventListener("change", (event) => importCsv(event.target.files[0]));
  els.downloadCsvTemplateBtn.addEventListener("click", downloadCsvTemplate);
  els.applyPaletteBtn.addEventListener("click", () => {
    applyStarPalette(state, true);
    saveState();
    renderAll();
    showToast("已应用星芒/MARD 221 色色卡。");
  });
  els.exportDataBtn.addEventListener("click", exportData);
  els.importDataInput.addEventListener("change", (event) => importData(event.target.files[0]));

  els.addUsageBtn.addEventListener("click", () => {
    addUsage(els.usageCode.value, els.usageQty.value);
    els.usageCode.value = "";
    els.usageQty.value = "";
    els.usageCode.focus();
  });

  els.parseBulkBtn.addEventListener("click", () => parseBulkUsage(els.bulkUsage.value));
  els.clearUsageBtn.addEventListener("click", () => {
    usageItems = [];
    renderUsage();
  });
  els.projectForm.addEventListener("submit", commitProject);

  document.body.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const code = button.dataset.code;
    const id = button.dataset.id;

    if (action === "edit-color") editColor(code);
    if (action === "delete-color" && confirm(`删除 ${code} 的库存记录？`)) deleteColor(code);
    if (action === "remove-usage") {
      usageItems = usageItems.filter((item) => item.code !== code);
      renderUsage();
    }
    if (action === "history-filter") {
      historyFilter = button.dataset.filter || "active";
      renderHistory();
    }
    if (action === "copy-project") copyProjectToEditor(id);
    if (action === "undo-project" && confirm("确定撤销这个成品项目的扣库存？库存数量会加回去。")) undoProject(id);
    if (action === "restore-project" && confirm("确定恢复这个成品项目的扣库存？库存数量会再次扣除。")) restoreProject(id);
  });

  renderAll();
})();
