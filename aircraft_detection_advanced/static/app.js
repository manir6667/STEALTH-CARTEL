// Aircraft Detection System - Frontend Application
// Clean, professional JavaScript - no unnecessary complexity

const API_BASE_URL = 'http://localhost:8000';
const API_KEY = 'dev_key_12345'; // Match config.yaml
const WS_URL = 'ws://localhost:8000/ws/alerts';

let ws = null;
let detectionData = [];
let metricsData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAPIStatus();
    loadMetrics();
    loadDetections();
    initWebSocket();
    setupEventListeners();
    
    // Refresh every 30 seconds
    setInterval(() => {
        loadMetrics();
        loadDetections();
    }, 30000);
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('btn-refresh').addEventListener('click', loadDetections);
    document.getElementById('filter-threat').addEventListener('change', loadDetections);
    document.getElementById('filter-limit').addEventListener('change', loadDetections);
}

// API Status Check
async function checkAPIStatus() {
    const statusEl = document.getElementById('api-status');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/status`);
        const data = await response.json();
        
        if (data.status === 'online') {
            statusEl.textContent = 'Online';
            statusEl.style.color = 'var(--low)';
            document.getElementById('total-detections').textContent = data.logs_loaded || 0;
        }
    } catch (error) {
        statusEl.textContent = 'Offline';
        statusEl.style.color = 'var(--critical)';
        console.error('API check failed:', error);
    }
}

// Load Metrics
async function loadMetrics() {
    try {
        const response = await fetch(`${API_BASE_URL}/metrics`, {
            headers: { 'X-API-Key': API_KEY }
        });
        
        if (!response.ok) throw new Error('Failed to load metrics');
        
        metricsData = await response.json();
        updateMetricsUI(metricsData);
        
        // Also load summary for additional data
        const summaryResponse = await fetch(`${API_BASE_URL}/logs/summary`, {
            headers: { 'X-API-Key': API_KEY }
        });
        
        if (summaryResponse.ok) {
            const summary = await summaryResponse.json();
            updateSummaryUI(summary);
        }
    } catch (error) {
        console.error('Error loading metrics:', error);
    }
}

// Update Metrics UI
function updateMetricsUI(metrics) {
    document.getElementById('total-frames').textContent = metrics.total_frames || '-';
    document.getElementById('avg-fps').textContent = metrics.avg_fps ? metrics.avg_fps.toFixed(1) : '-';
    
    const processingTime = metrics.avg_processing_time_s;
    document.getElementById('processing-time').textContent = 
        processingTime ? `${(processingTime * 1000).toFixed(1)}ms` : '-';
    
    // Threat distribution
    if (metrics.alerts) {
        document.getElementById('critical-count').textContent = metrics.alerts.Critical || 0;
        document.getElementById('high-count').textContent = metrics.alerts.High || 0;
        document.getElementById('medium-count').textContent = metrics.alerts.Medium || 0;
        document.getElementById('low-count').textContent = metrics.alerts.Low || 0;
        
        const totalAlerts = (metrics.alerts.Critical || 0) + (metrics.alerts.High || 0);
        document.getElementById('active-alerts').textContent = totalAlerts;
    }
}

// Update Summary UI
function updateSummaryUI(summary) {
    document.getElementById('unique-tracks').textContent = summary.unique_tracks || '-';
    
    // Aircraft types
    const aircraftTypesEl = document.getElementById('aircraft-types');
    
    if (summary.class_distribution && Object.keys(summary.class_distribution).length > 0) {
        aircraftTypesEl.innerHTML = '';
        
        Object.entries(summary.class_distribution)
            .sort((a, b) => b[1] - a[1])
            .forEach(([type, count]) => {
                const item = document.createElement('div');
                item.className = 'aircraft-type-item';
                item.innerHTML = `
                    <span class="aircraft-type-name">${type}</span>
                    <span class="aircraft-type-count">${count}</span>
                `;
                aircraftTypesEl.appendChild(item);
            });
    } else {
        aircraftTypesEl.innerHTML = '<div class="loading">No data available</div>';
    }
}

// Load Detections
async function loadDetections() {
    const threatFilter = document.getElementById('filter-threat').value;
    const limit = document.getElementById('filter-limit').value || 50;
    
    let url = `${API_BASE_URL}/logs?limit=${limit}`;
    if (threatFilter) {
        url += `&threat_level=${threatFilter}`;
    }
    
    try {
        const response = await fetch(url, {
            headers: { 'X-API-Key': API_KEY }
        });
        
        if (!response.ok) throw new Error('Failed to load detections');
        
        const data = await response.json();
        detectionData = data.logs || [];
        updateDetectionsTable(detectionData);
    } catch (error) {
        console.error('Error loading detections:', error);
        document.getElementById('detection-tbody').innerHTML = 
            '<tr><td colspan="9" class="loading">Error loading detections</td></tr>';
    }
}

// Update Detections Table
function updateDetectionsTable(detections) {
    const tbody = document.getElementById('detection-tbody');
    
    if (detections.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading">No detections found</td></tr>';
        return;
    }
    
    tbody.innerHTML = detections.map(det => {
        const threatClass = det.threat.level.toLowerCase();
        const transponder = det.transponder ? det.transponder.transponder_id : 'N/A';
        const altitude = det.transponder ? det.transponder.altitude : '-';
        
        return `
            <tr>
                <td>${det.frame}</td>
                <td>#${det.id}</td>
                <td>${det.class_label}</td>
                <td>${det.speed_kt.toFixed(0)}</td>
                <td>${altitude}</td>
                <td>${transponder}</td>
                <td><span class="threat-badge threat-badge-${threatClass}">${det.threat.level}</span></td>
                <td>${det.threat.score}</td>
                <td><button class="btn btn-secondary" onclick="showDetails(${det.frame}, ${det.id})">View</button></td>
            </tr>
        `;
    }).join('');
}

// Show Detection Details
function showDetails(frame, trackId) {
    const detection = detectionData.find(d => d.frame === frame && d.id === trackId);
    
    if (!detection) {
        alert('Detection not found');
        return;
    }
    
    const modal = document.getElementById('details-modal');
    const detailsEl = document.getElementById('modal-details');
    
    detailsEl.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Frame:</span>
            <span class="detail-value">${detection.frame}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Track ID:</span>
            <span class="detail-value">#${detection.id}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Timestamp:</span>
            <span class="detail-value">${new Date(detection.timestamp).toLocaleString()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Aircraft Type:</span>
            <span class="detail-value">${detection.class_label} (${(detection.class_confidence * 100).toFixed(1)}%)</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Bounding Box:</span>
            <span class="detail-value">[${detection.bbox.map(v => v.toFixed(0)).join(', ')}]</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Confidence:</span>
            <span class="detail-value">${(detection.confidence * 100).toFixed(1)}%</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">World Position:</span>
            <span class="detail-value">[${detection.world_pos_m.map(v => v.toFixed(1)).join(', ')}] m</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Speed:</span>
            <span class="detail-value">${detection.speed_kt.toFixed(1)} kt (${detection.speed_mps.toFixed(1)} m/s)</span>
        </div>
        ${detection.transponder ? `
        <div class="detail-row">
            <span class="detail-label">Transponder ID:</span>
            <span class="detail-value">${detection.transponder.transponder_id}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Altitude:</span>
            <span class="detail-value">${detection.transponder.altitude} ft</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Match Distance:</span>
            <span class="detail-value">${detection.transponder.match_distance_m.toFixed(1)} m</span>
        </div>
        ` : ''}
        <div class="detail-row">
            <span class="detail-label">Threat Level:</span>
            <span class="detail-value">
                <span class="threat-badge threat-badge-${detection.threat.level.toLowerCase()}">
                    ${detection.threat.level}
                </span>
            </span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Threat Score:</span>
            <span class="detail-value">${detection.threat.score} / 100</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Threat Breakdown:</span>
            <span class="detail-value">
                Zone: ${detection.threat.breakdown.zone}, 
                Transponder: ${detection.threat.breakdown.transponder}, 
                Speed: ${detection.threat.breakdown.speed}, 
                Military: ${detection.threat.breakdown.military}, 
                Altitude: ${detection.threat.breakdown.altitude}
            </span>
        </div>
        ${detection.threat.reasons.length > 0 ? `
        <div class="detail-row">
            <span class="detail-label">Reasons:</span>
            <span class="detail-value">${detection.threat.reasons.join(', ')}</span>
        </div>
        ` : ''}
    `;
    
    modal.classList.add('active');
}

// Close Modal
function closeModal() {
    document.getElementById('details-modal').classList.remove('active');
}

// Close modal on background click
document.getElementById('details-modal').addEventListener('click', (e) => {
    if (e.target.id === 'details-modal') {
        closeModal();
    }
});

// WebSocket Connection
function initWebSocket() {
    const wsStatusEl = document.getElementById('ws-status');
    const wsStatusTextEl = document.getElementById('ws-status-text');
    
    try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            wsStatusEl.classList.add('connected');
            wsStatusEl.classList.remove('disconnected');
            wsStatusTextEl.textContent = 'Connected';
            
            // Send heartbeat every 25 seconds
            setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send('ping');
                }
            }, 25000);
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'alert') {
                addAlert(data.data);
            }
        };
        
        ws.onclose = () => {
            console.log('WebSocket disconnected');
            wsStatusEl.classList.remove('connected');
            wsStatusEl.classList.add('disconnected');
            wsStatusTextEl.textContent = 'Disconnected';
            
            // Reconnect after 5 seconds
            setTimeout(initWebSocket, 5000);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    } catch (error) {
        console.error('WebSocket connection failed:', error);
        wsStatusEl.classList.add('disconnected');
        wsStatusTextEl.textContent = 'Failed';
    }
}

// Add Alert to Panel
function addAlert(detection) {
    const alertsContainer = document.getElementById('alerts-container');
    
    // Remove placeholder if exists
    const placeholder = alertsContainer.querySelector('.alert-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
    
    const alertEl = document.createElement('div');
    alertEl.className = `alert-item ${detection.threat.level.toLowerCase()}`;
    
    const time = new Date(detection.timestamp).toLocaleTimeString();
    
    alertEl.innerHTML = `
        <div class="alert-time">${time}</div>
        <div class="alert-text">
            Track #${detection.id} - ${detection.threat.level} Threat
        </div>
        <div class="alert-details">
            ${detection.class_label} at ${detection.speed_kt.toFixed(0)} kt
        </div>
        <div class="alert-details">
            ${detection.threat.reasons.join(', ')}
        </div>
    `;
    
    // Add to top of list
    alertsContainer.insertBefore(alertEl, alertsContainer.firstChild);
    
    // Keep only last 20 alerts
    const alerts = alertsContainer.querySelectorAll('.alert-item');
    if (alerts.length > 20) {
        alerts[alerts.length - 1].remove();
    }
}
