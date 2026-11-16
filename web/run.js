// Run simulation page: name the run, pick saved Orders and a configuration.
// Lists come from GET /api/scenarios and GET /api/configs,
// and the run is sent to POST /api/runs.

const runForm = document.getElementById("runForm");
const nameInput = document.getElementById("runName");
const ordersPick = document.getElementById("ordersPick");
const configPick = document.getElementById("configPick");
const loadingScreen = document.getElementById("loadingScreen");
const loadingName = document.getElementById("loadingName");
const cancelRunButton = document.getElementById("cancelRun");

let runRequest = null; // lets Cancel stop the POST

// fill a dropdown with names
function fillPick(select, names) {
    select.innerHTML = "";
    names.forEach(function (name) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

function makeHintName() {
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "short" });
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return ordersPick.value + ", " + month + " " + now.getDate() + ", " + hours + ":" + minutes;
}

function updateHint() {
    nameInput.placeholder = makeHintName();
}

function showLoading(runName) {
    loadingName.textContent = runName;
    loadingScreen.hidden = false;
    cancelRunButton.focus();
}

// show a problem under the form
function showError(message) {
    let box = document.getElementById("runError");
    if (!box) {
        box = document.createElement("p");
        box.id = "runError";
        box.className = "hint";
        box.setAttribute("role", "alert");
        runForm.appendChild(box);
    }
    box.textContent = message;
}

async function getJson(url, options) {
    const response = await fetch(url, options);
    if (response.status === 401) {
        window.location.href = "login.html";
        throw new Error("Not logged in.");
    }
    const data = await response.json().catch(function () { return null; });
    if (!response.ok) {
        throw new Error(data && data.error ? data.error.message : "Something went wrong.");
    }
    return data;
}

// start the run
runForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    updateHint(); // so an empty name gets the time of clicking
    const run = {
        name: nameInput.value.trim() || nameInput.placeholder,
        scenario: ordersPick.value,
        config: configPick.value
    };
    showLoading(run.name);

    runRequest = new AbortController();
    try {
        await getJson("/api/runs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(run),
            signal: runRequest.signal
        });
        // open the Results page for this run
        window.location.href = "SimReport.html?run=" + encodeURIComponent(run.name);
    } catch (error) {
        if (error.name === "AbortError") return; // user pressed Cancel
        loadingScreen.hidden = true;
        showError("Could not run the simulation: " + error.message);
    }
});

// cancel goes back to the dashboard
cancelRunButton.addEventListener("click", function () {
    if (runRequest) runRequest.abort();
    window.location.href = "dashboard.html";
});

ordersPick.addEventListener("change", updateHint);

async function loadLists() {
    try {
        const lists = await Promise.all([getJson("/api/scenarios"), getJson("/api/configs")]);
        fillPick(ordersPick, lists[0]);
        fillPick(configPick, lists[1]);
        updateHint();
    } catch (error) {
        showError("Could not load saved Orders and configurations: " + error.message);
    }
}

loadLists();
// keep the time in the hint current while the page is open
setInterval(updateHint, 30000);
