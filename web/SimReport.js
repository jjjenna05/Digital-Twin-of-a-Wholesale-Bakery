document.querySelectorAll(".bar").forEach((bar) => {
  const segments = Array.from(bar.querySelectorAll("span"));
  const total = segments.reduce(
    (sum, segment) => sum + Number(segment.dataset.minutes || 0),
    0
  );

  segments.forEach((segment) => {
    const minutes = Number(segment.dataset.minutes || 0);
    segment.style.width = total > 0 ? `${(minutes / total) * 100}%` : "0%";
  });
});

document.getElementById("downloadPdf").addEventListener("click", () => {
  window.print();
});

document.getElementById("newSimulation").addEventListener("click", () => {
  window.location.href = "order-entry.html";
});

document.getElementById("compareRun").addEventListener("click", () => {
  window.location.href = "compare.html";
});
