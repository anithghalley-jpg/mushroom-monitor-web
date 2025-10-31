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
                    ticks: { color: '#7f8c8d' }
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
                    ticks: { color: '#7f8c8d' }
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
                    ticks: { color: '#7f8c8d' }
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
// DATA PROCESSING
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

function parseDateTime(dateStr, timeStr) {
    // Expected format: date="2025-10-31", time="12:34:56"
    try {
        return new Date(`${dateStr}T${timeStr}`);
    } catch (e) {
        return new Date();
    }
}

function formatTimeLabel(dateStr, timeStr, range) {
    const date = parseDateTime(dateStr, timeStr);
    
    if (range === 60) {
        // Show HH:MM for last hour
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (range === 'day') {
        // Show HH:MM for last day
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (range === 'month') {
        // Show MM-DD for last month
        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    } else if (range === 'year') {
        // Show MM-DD for last year
        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    }
    return timeStr;
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
    const filteredData = getFilteredData(currentRange);
    
    if (filteredData.length === 0) {
        console.warn('No data available for the selected range');
        return;
    }

    // Prepare labels and data
    const labels = filteredData.map(d => formatTimeLabel(d.date, d.time, currentRange));
    const tempData = filteredData.map(d => parseFloat(d.temperature || d.temperaturec || 0));
    const humData = filteredData.map(d => parseFloat(d.humidity || d.humidity1 || 0));

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
}

function updateDataTable() {
    const tableBody = document.getElementById('dataTableBody');
    
    if (allData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="no-data">No data available yet. Waiting for sensor readings...</td></tr>';
        return;
    }

    // Show the last 20 readings in reverse order (newest first)
    const recentData = allData.slice(-20).reverse();
    
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
console.log('Mushroom House Monitor v1.0 - Ready');
