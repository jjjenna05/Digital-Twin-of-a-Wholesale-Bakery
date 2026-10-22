document.addEventListener('DOMContentLoaded', () => {
    const runBtn = document.getElementById('run-comparison-btn');
    const scenarioSelect = document.getElementById('scenario-select');
    const orderMultiplier = document.getElementById('order-multiplier');
    const priorityHandling = document.getElementById('priority-handling');
    const ordersBody = document.getElementById('scenario-orders-body');

    //Mock dataset for different ordering scenarios
    const scenarioDatasets = {
        'scenario-a': [
            { item: 'Item 1', baseQty: 150, deadline: '6:00 AM' },
            { item: 'Item 2', baseQty: 200, deadline: '8:00 AM' },
            { item: 'Item 3', baseQty: 100, deadline: '10:00 AM' },
        ],
        'scenario-b': [
            { item: 'Item 4', baseQty: 300, deadline: '9:00 AM' },
            { item: 'Item 5', baseQty: 250, deadline: '11:00 AM' },
            { item: 'Item 6', baseQty: 180, deadline: '12:00 PM' }
        ]
    };
    //Function to update the order table dynamically
    function updateScenarioTable(scenarioKey, multiplier) {
        const dataset = scenarioDatasets[scenarioKey] || scenarioDatasets['scenario-a'];

        ordersBody.innerHTML = ''; // Clear existing rows

        //Populate table rows
        dataset.forEach(order => {
            const adjustedQuantity = Math.round(order.baseQty * (multiplier / 100));

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${order.item}</td>
                <td>${adjustedQuantity}</td>
                <td>${order.deadline}</td>
                `;
            ordersBody.appendChild(tr);
        });
    }
    //Event listeners for the Run Comparison
    if (runBtn) {
        runBtn.addEventListener('click', () => {
            const selectedScenario = scenarioSelect.value;
            const multiplier = parseInt(orderMultiplier.value) || 100;
            const selectedPriority = priorityHandling.value;

            //Log or use parameters for run calculations
            console.log(`Running comparison -> Scenario: ${selectedScenario}, Multiplier: ${multiplier}%, Priority: ${selectedPriority}`);

            //Update the table data based on user input
            updateScenarioTable(selectedScenario, multiplier);

            //Visual Feedback
            runBtn.textContent = 'Updated!';
            setTimeout(() => {
                runBtn.textContent = 'Run Comparison';
            }, 1500);
        });
    }

    //Inital render on page load
    updateScenarioTable(scenarioSelect.value, parseInt(orderMultiplier.value) || 100);
});