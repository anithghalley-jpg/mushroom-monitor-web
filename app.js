// app.js - Mushroom House Monitor Web Application

// ============================================================================
// CONFIGURATION
// ============================================================================

// Replace this with the URL of your deployed Google Apps Script Web App
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyQ1GRK1IZ_aSp0UyOH-2JrcqrS3pPpwqjKLoEIsgzHBo7Lp7UFaqZBkmBOOTla6fbh_A/exec";

// Data refresh interval in milliseconds (60 seconds = 60000 ms)
const REFRESH_INTERVAL = 60000;

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let allData = [];
let currentRange = 60; // Default: last 60 minutes
let currentFilteredData = []; // Store the currently displayed filtered data
let temperatureChart = null;
let humidityChart = null;
let combinedChart = null;
let lastUpdateTime = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Application initialized');
    
    // Initialize charts
    initializeCharts();
    
    // Fetch data immediately
    fetchData();
    
    // Set up auto-refresh
    setInterval(fetchData, REFRESH_INTERVAL);
    
    // Set up control button listeners
    setupControlButtons();
});

// ============================================================================
// CHART INITIALIZATION
// ============================================================================

function initializeCharts() {
    const tempCtx = document.getElementById('temperatureChart').getContext('2d');
    const humCtx = document.getElementById('humidityChart').getContext('2d');
    const combCtx = document.getElementById('combinedChart').getContext('2d');

    // Tooltip callback function to show full date/time
    const customTooltipCallbacks = {
        title: function(context) {
            const index = context[0].dataIndex;
            const data = currentFilteredData[index];
            if (data) {
                return `${data.date} ${data.time}`;
            }
            return 'Data';
        },
        label: function(context) {
            if (context.dataset.yAxisID === 'y' || context.chart.id === temperatureChart.id) {
                return `Temperature: ${context.parsed.y.toFixed(1)}°C`;
            } else {
                return `Humidity: ${context.parsed.y.toFixed(1)}%`;
            }
        }
    };

    // Temperature Chart
    temperatureChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature (°C)',
                data: [],
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#e74c3c',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { size: 12, weight: 'bold' },
                        color: '#2c3e50',
                        padding: 15,
                    }
                },
                filler: {
                    propagate: true
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 12 },
                    borderColor: '#e74c3c',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: customTooltipCallbacks
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { color: '#7f8c8d' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#7f8c8d' },
                    title: { display: true, text: 'Time', color: '#2c3e50' }
                }
            }
        }
    });

    // Humidity Chart
    humidityChart = new Chart(humCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Humidity (%)',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#3498db',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { size: 12, weight: 'bold' },
                        color: '#2c3e50',
                        padding: 15,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 12 },
                    borderColor: '#3498db',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: customTooltipCallbacks
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { color: '#7f8c8d' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#7f8c8d' },
                    title: { display: true, text: 'Time', color: '#2c3e50' }
                }
            }
        }
    });

    // Combined Chart
    combinedChart = new Chart(combCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.05)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#e74c3c',
                    yAxisID: 'y',
                },
                {
                    label: 'Humidity (%)',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.05)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#3498db',
                    yAxisID: 'y1',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { size: 12, weight: 'bold' },
                        color: '#2c3e50',
                        padding: 15,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 12 },
                    borderColor: '#6b8e23',
                    borderWidth: 1,
                    displayColors: true,
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            const data = currentFilteredData[index];
                            if (data) {
                                return `${data.date} ${data.time}`;
                            }
                            return 'Data';
                        },
                        label: function(context) {
                            if (context.dataset.yAxisID === 'y') {
                                return `Temperature: ${context.parsed.y.toFixed(1)}°C`;
                            } else {
                                return `Humidity: ${context.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { color: '#7f8c8d' },
                    title: { display: true, text: 'Temperature (°C)', color: '#e74c3c' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#7f8c8d' },
                    title: { display: true, text: 'Humidity (%)', color: '#3498db' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#7f8c8d' },
                    title: { display: true, text: 'Time', color: '#2c3e50' }
                }
            }
        }
    });
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchData() {
    try {
        updateStatusIndicator('connecting');
        
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const result = await response.json();

        if (result.status === 'SUCCESS' && result.data) {
            allData = result.data;
            console.log(`Fetched ${allData.length} data points`);
            
            updateLiveData();
            updateCharts();
            updateDataTable();
            updateStatusIndicator('connected');
            lastUpdateTime = new Date();
        } else {
            console.error('Error fetching data:', result.message);
            updateStatusIndicator('error');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        updateStatusIndicator('error');
    }
}

// ============================================================================
// DATA PROCESSING AND FORMATTING
// ============================================================================

function getFilteredData(range) {
    if (range === 60) {
        // Last 60 minutes
        return allData.slice(-60);
    } else if (range === 'day') {
        // Last 24 hours (1440 minutes)
        return allData.slice(-1440);
    } else if (range === 'month') {
        // Last 30 days (43200 minutes)
        return allData.slice(-43200);
    } else if (range === 'year') {
        // All data (last 365 days)
        return allData.slice(-525600);
    }
    return allData;
}

/**
 * Create simple sequential labels for the X-axis
 * The actual date and time will be shown in the tooltip on hover
 */
function createSimpleLabels(dataLength) {
    // Return empty labels - Chart.js will use indices
    return Array(dataLength).fill('');
}

// ============================================================================
// UI UPDATES
// ============================================================================

function updateLiveData() {
    if (allData.length === 0) return;

    const latestData = allData[allData.length - 1];
    
    // Extract values (handle different possible key names from Google Sheets)
    const temp = parseFloat(latestData.temperature || latestData.temperaturec || 0);
    const hum = parseFloat(latestData.humidity || latestData.humidity1 || 0);
    const date = latestData.date || '--';
    const time = latestData.time || '--';

    // Update temperature card
    document.getElementById('tempValue').textContent = temp.toFixed(1);
    document.getElementById('tempTime').textContent = `Last update: ${date} ${time}`;

    // Update humidity card
    document.getElementById('humValue').textContent = hum.toFixed(1);
    document.getElementById('humTime').textContent = `Last update: ${date} ${time}`;

    // Update system status
    document.getElementById('dataCount').textContent = allData.length;
    document.getElementById('lastSync').textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function updateCharts() {
    currentFilteredData = getFilteredData(currentRange);
    
    if (currentFilteredData.length === 0) {
        console.warn('No data available for the selected range');
        return;
    }

    // Create simple labels (empty strings - tooltips will show the actual date/time)
    const labels = createSimpleLabels(currentFilteredData.length);
    const tempData = currentFilteredData.map(d => parseFloat(d.temperature || d.temperaturec || 0));
    const humData = currentFilteredData.map(d => parseFloat(d.humidity || d.humidity1 || 0));

    // Update Temperature Chart
    temperatureChart.data.labels = labels;
    temperatureChart.data.datasets[0].data = tempData;
    temperatureChart.update();

    // Update Humidity Chart
    humidityChart.data.labels = labels;
    humidityChart.data.datasets[0].data = humData;
    humidityChart.update();

    // Update Combined Chart
    combinedChart.data.labels = labels;
    combinedChart.data.datasets[0].data = tempData;
    combinedChart.data.datasets[1].data = humData;
    combinedChart.update();
    
    console.log(`Charts updated with ${currentFilteredData.length} data points for range: ${currentRange}`);
}

function updateDataTable() {
    const tableBody = document.getElementById('dataTableBody');
    
    if (allData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="no-data">No data available yet. Waiting for sensor readings...</td></tr>';
        return;
    }

    // Show the last 10 readings in reverse order (newest first)
    const recentData = allData.slice(-10).reverse();
    
    tableBody.innerHTML = recentData.map(row => `
        <tr>
            <td>${row.date || '--'}</td>
            <td>${row.time || '--'}</td>
            <td>${parseFloat(row.temperature || row.temperaturec || 0).toFixed(1)}</td>
            <td>${parseFloat(row.humidity || row.humidity1 || 0).toFixed(1)}</td>
        </tr>
    `).join('');
}

function updateStatusIndicator(status) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    statusDot.classList.remove('connected', 'error');

    if (status === 'connected') {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
    } else if (status === 'error') {
        statusDot.classList.add('error');
        statusText.textContent = 'Connection Error';
    } else {
        statusText.textContent = 'Connecting...';
    }
}

// ============================================================================
// CONTROL BUTTONS
// ============================================================================

function setupControlButtons() {
    const buttons = document.querySelectorAll('.control-btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            buttons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Update current range and refresh charts
            const range = button.getAttribute('data-range');
            if (range === 'day') {
                currentRange = 'day';
            } else if (range === 'month') {
                currentRange = 'month';
            } else if (range === 'year') {
                currentRange = 'year';
            } else {
                currentRange = 60; // Default to 60 minutes
            }
            
            updateCharts();
        });
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Optional: Function to export data as CSV
function exportDataAsCSV() {
    if (allData.length === 0) {
        alert('No data to export');
        return;
    }

    let csv = 'Date,Time,Temperature (°C),Humidity (%)\n';
    allData.forEach(row => {
        csv += `${row.date},${row.time},${row.temperature || row.temperaturec},${row.humidity || row.humidity1}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mushroom_monitor_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Log application version
console.log('Mushroom House Monitor v2.2 - Final Fixes for Tooltip and Table');
