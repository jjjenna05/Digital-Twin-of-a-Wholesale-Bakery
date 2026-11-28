const SIMULATIONS_KEY = "bakery.simulations";
const SELECTION_KEY = "bakery.comparisonSelection";

document.addEventListener("DOMContentLoaded", () => {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = Array.from(document.querySelectorAll(".scenario-panel"));
  const error = document.getElementById("selection-error");
  const compareButton = document.getElementById("compare-button");
  let simulations = readJson(SIMULATIONS_KEY, []);
  let selection = readJson(SELECTION_KEY, {});

  if (!Array.isArray(simulations)) simulations = [];
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) selection = {};

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function writeSelection() {
    try {
      localStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
    } catch {
      showError("Your scenario selections could not be saved in this browser.");
    }
  }

  function asText(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    return "";
  }

  function firstText(...values) {
    return values.map(asText).find((value) => value.trim() !== "") || "";
  }

  function simulationId(simulation, index) {
    return firstText(simulation.id, simulation.simulationId, simulation.runId) || String(index);
  }

  function configIdentity(simulation) {
    const config = simulation.bakeryConfig ?? simulation.config ?? simulation.configuration;
    const explicitId = firstText(
      simulation.bakeryConfigId,
      simulation.configId,
      config && config.id,
      config && config.configId
    );
    if (explicitId) return `id:${explicitId}`;

    const configName = firstText(
      simulation.bakeryConfigName,
      simulation.configName,
      config && config.name
    );
    if (configName) return `name:${configName.trim().toLocaleLowerCase()}`;
    if (config && typeof config === "object") return `json:${JSON.stringify(config)}`;
    return "";
  }

  function orderName(simulation) {
    const orders = simulation.orders ?? simulation.order;
    const fromOrders = Array.isArray(orders)
      ? orders.map((order) => firstText(order.name, order.item)).filter(Boolean).join(", ")
      : firstText(orders && orders.name, orders && orders.item);
    return firstText(simulation.orderName, simulation.inputOrderName, fromOrders);
  }

  function bakeryConfigName(simulation) {
    const config = simulation.bakeryConfig ?? simulation.config ?? simulation.configuration;
    return firstText(simulation.bakeryConfigName, simulation.configName, config && config.name);
  }

  function simulationName(simulation) {
    return firstText(simulation.simulationName, simulation.name, simulation.title);
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = !message;
  }

  function selectedConfigInOtherScenario(scenario, id) {
    const otherScenario = scenario === "1" ? "2" : "1";
    const otherId = selection[otherScenario];
    if (!otherId) return false;
    const current = simulations.findIndex((simulation, index) => simulationId(simulation, index) === id);
    const other = simulations.findIndex((simulation, index) => simulationId(simulation, index) === otherId);
    return current >= 0 && other >= 0 &&
      configIdentity(simulations[current]) !== "" &&
      configIdentity(simulations[current]) === configIdentity(simulations[other]);
  }

  function render() {
    for (const container of document.querySelectorAll(".simulation-rows")) {
      const scenario = container.dataset.scenario;
      const selectedId = selection[scenario];
      container.replaceChildren();

      if (simulations.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No saved simulations are available.";
        container.append(empty);
        continue;
      }

      simulations.forEach((simulation, index) => {
        if (!simulation || typeof simulation !== "object") return;
        const id = simulationId(simulation, index);
        const row = document.createElement("div");
        row.className = "row body simulation-row";
        row.setAttribute("role", "row");
        if (selectedId === id) row.classList.add("selected");

        for (const value of [
          simulationName(simulation),
          orderName(simulation),
          bakeryConfigName(simulation)
        ]) {
          const cell = document.createElement("span");
          cell.className = row.children.length === 0 ? "c1" : row.children.length === 1 ? "c2" : "c3";
          cell.setAttribute("role", "cell");
          cell.textContent = value;
          row.append(cell);
        }

        const actions = document.createElement("div");
        actions.className = "actions";
        const button = document.createElement("button");
        button.type = "button";
        const isSelected = selectedId === id;
        const conflicts = selectedConfigInOtherScenario(scenario, id);
        button.textContent = isSelected ? "Selected" : "Select";
        button.setAttribute("aria-pressed", String(isSelected));
        button.disabled = conflicts;
        button.title = conflicts ? "This bakery configuration is already selected for the other scenario." : "";
        button.addEventListener("click", () => {
          if (selectedConfigInOtherScenario(scenario, id)) {
            showError("Choose a different bakery configuration for each scenario.");
            return;
          }
          selection[scenario] = id;
          showError("");
          writeSelection();
          render();
        });
        actions.append(button);
        row.append(actions);
        container.append(row);
      });
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const active = tab.id === "scenario-1-tab" ? "1" : "2";
      tabs.forEach((candidate) => {
        const selected = candidate === tab;
        candidate.classList.toggle("active", selected);
        candidate.setAttribute("aria-selected", String(selected));
      });
      panels.forEach((panel) => {
        panel.hidden = panel.id !== `scenario-${active}-panel`;
      });
    });
  });

  compareButton.addEventListener("click", () => {
    if (!selection["1"] || !selection["2"]) {
      showError("Select one saved simulation in Scenario 1 and one in Scenario 2.");
      return;
    }
    if (selectedConfigInOtherScenario("1", selection["1"])) {
      showError("Choose a different bakery configuration for each scenario.");
      return;
    }
    const first = simulations.find((simulation, index) => simulationId(simulation, index) === selection["1"]);
    const second = simulations.find((simulation, index) => simulationId(simulation, index) === selection["2"]);
    if (!first || !second) {
      showError("A selected simulation is no longer available. Choose both scenarios again.");
      return;
    }
    window.location.href = "comparisonReport.html";
  });

  render();
});
