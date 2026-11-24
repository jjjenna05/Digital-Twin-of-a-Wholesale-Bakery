// Download menu for report pages: PDF (print) or CSV built from the page content.
(function () {
  const menu = document.querySelector(".downloadMenu");
  if (!menu) return;

  const toggle = menu.querySelector(".pdfButton");
  const options = menu.querySelector(".downloadOptions");

  function setOpen(open) {
    options.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(options.hidden);
  });
  document.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  options.addEventListener("click", (e) => {
    const item = e.target.closest("[data-format]");
    if (!item) return;
    setOpen(false);
    if (item.dataset.format === "pdf") {
      window.print();
    } else {
      downloadCsv(menu.dataset.csvName || "report.csv");
    }
  });

  const clean = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");

  function tableRows(table) {
    return Array.from(table.rows).map((tr) =>
      Array.from(tr.cells).map((cell) => clean(cell))
    );
  }

  function timelineRows(list) {
    const rows = [["Time", "Event", "Detail"]];
    list.querySelectorAll(":scope > li").forEach((li) => {
      const event = li.querySelector(".event");
      const detail = li.querySelector(".detail");
      let eventText = clean(event);
      const detailText = clean(detail);
      if (detailText && eventText.endsWith(detailText)) {
        eventText = eventText.slice(0, -detailText.length).trim();
      }
      rows.push([clean(li.querySelector(".stamp")).replace(/^At\s+/i, ""), eventText, detailText]);
    });
    return rows;
  }

  // Bar breakdowns: one row per bar, one column per legend category.
  function breakdownRows(legend) {
    const prev = legend.previousElementSibling;
    const barRows = prev && prev.classList.contains("bars")
      ? Array.from(prev.querySelectorAll(".barRow"))
      : Array.from(legend.parentElement.querySelectorAll(":scope > .breakdownRow"));
    if (!barRows.length) return [];

    const categories = Array.from(legend.querySelectorAll("li, span")).map((entry) => {
      const swatch = entry.querySelector("span, i");
      const key = swatch ? Array.from(swatch.classList).find((c) => c !== "swatch") : null;
      return { key, label: clean(entry) };
    }).filter((c) => c.key);

    const usesMinutes = barRows.some((r) => r.querySelector(".bar [data-minutes]"));
    const unit = usesMinutes ? " (min)" : " (% of run)";
    const hasScenario = barRows.some((r) => r.querySelector(".barScenario"));

    const header = ["Name"];
    if (hasScenario) header.push("Scenario");
    header.push("Summary", ...categories.map((c) => c.label + unit));
    const rows = [header];

    let lastName = "";
    barRows.forEach((r) => {
      const name = clean(r.querySelector(".barName, .rowLabel")) || lastName;
      lastName = name;
      const row = [name];
      if (hasScenario) row.push(clean(r.querySelector(".barScenario")));
      row.push(clean(r.querySelector(".barLabel, .rowValue")));
      categories.forEach((c) => {
        const seg = r.querySelector(".bar > ." + CSS.escape(c.key));
        if (!seg) { row.push(usesMinutes ? "0" : "0"); return; }
        if (usesMinutes) {
          row.push(String(Number(seg.dataset.minutes || 0)));
        } else {
          const pct = parseFloat(seg.style.width) || 0;
          row.push(pct.toFixed(1));
        }
      });
      rows.push(row);
    });
    return rows;
  }

  function buildCsvRows() {
    const main = document.querySelector("main");
    const rows = [[clean(main.querySelector("h1")) || document.title]];
    const parts = main.querySelectorAll(
      "h2, p.hint, p.sectionNote, p.breakdownNote, table, ol.timeline, .legend"
    );
    parts.forEach((el) => {
      if (el.matches("h2")) {
        rows.push([], [clean(el)]);
      } else if (el.matches("p")) {
        rows.push([clean(el)]);
      } else if (el.matches("table")) {
        if (rows[rows.length - 1].length) rows.push([]);
        rows.push(...tableRows(el));
      } else if (el.matches("ol.timeline")) {
        rows.push(...timelineRows(el));
      } else if (el.matches(".legend")) {
        rows.push(...breakdownRows(el));
      }
    });
    return rows;
  }

  function toCsv(rows) {
    return rows.map((row) =>
      row.map((value) => {
        const v = String(value ?? "");
        return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(",")
    ).join("\r\n");
  }

  function downloadCsv(filename) {
    // BOM so Excel opens it as UTF-8.
    const blob = new Blob(["﻿" + toCsv(buildCsvRows())], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
})();
