// ===== CONFIGURAÇÃO// Global variables
let map;
let drawnItems;
let currentProject = null;
let currentTool = null;
let vertexLayers = {}; // Armazena camadas de vértices por nome
let baseLayers = {}; // Armazena camadas base
let currentBaseLayer = null;

// Sistema de gerenciamento de camadas
let layers = {}; // {layerName: {polygon: L.Layer, vertices: L.Layer, visible: true}}
let layerCounter = 0;

// Fusos UTM SIRGAS 2000
const UTM_ZONES = {
    "18S": "+proj=utm +zone=18 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "19S": "+proj=utm +zone=19 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "20S": "+proj=utm +zone=20 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "21S": "+proj=utm +zone=21 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "22S": "+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "23S": "+proj=utm +zone=23 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "24S": "+proj=utm +zone=24 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "25S": "+proj=utm +zone=25 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
};

// Inicializar mapa
function initMap() {
    map = L.map('map', {
        editable: true
    }).setView([-15.7801, -47.9292], 4);
    
    // Criar camadas base
    baseLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    });
    
    baseLayers.satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '© Google',
        maxZoom: 20
    });
    
    // Adicionar camada padrão (OSM)
    currentBaseLayer = baseLayers.osm;
    currentBaseLayer.addTo(map);
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    
    // Configurar controles de desenho
    const drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
            polyline: false,
            polygon: false,
            circle: false,
            rectangle: false,
            marker: false,
            circlemarker: false
        },
        edit: {
            featureGroup: drawnItems,
            remove: true
        }
    });
    map.addControl(drawControl);
}

// ===== FUNÇÕES DE UTILIDADE =====

// Parse float com vírgula como decimal
function parseFloat_BR(txt) {
    try {
        return parseFloat(txt.replace(",", "."));
    } catch {
        return 0.0;
    }
}

// Parse linha com ponto e vírgula
function parseLine(line, expectedFields) {
    const parts = line.split(";").map(p => p.trim());
    if (parts.length < expectedFields) {
        throw new Error("Número de campos inválido");
    }
    return parts;
}

// Converter DMS para decimal
function dmsToDecimal(dmsText) {
    // Normalizar aspas
    let s = dmsText.replace(/'/g, "'").replace(/"/g, '"').replace(/"/g, '"').trim();
    
    // Regex para DMS: graus° minutos' segundos"
    const match = s.match(/^\s*([+-]?\d+)\s*°\s*(\d+)\s*'\s*([\d\.,]+)\s*"\s*$/);
    
    if (!match) {
        throw new Error(`Formato DMS inválido: ${dmsText}`);
    }
    
    const deg = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const seconds = parseFloat_BR(match[3]);
    
    // Validar
    if (minutes < 0 || minutes >= 60) {
        throw new Error(`Minutos inválidos: ${minutes}`);
    }
    if (seconds < 0 || seconds >= 60) {
        throw new Error(`Segundos inválidos: ${seconds}`);
    }
    
    const sign = deg < 0 ? -1 : 1;
    const degAbs = Math.abs(deg);
    const decimal = sign * (degAbs + minutes/60.0 + seconds/3600.0);
    
    return decimal;
}

// Converter azimute GMSS para decimal
function azimuthToDecimal(angStr) {
    const val = parseFloat_BR(angStr);
    const graus = Math.floor(val);
    const frac = val - graus;
    const mmss = Math.round(frac * 10000);
    const minutos = Math.floor(mmss / 100);
    const segundos = mmss % 100;
    return graus + (minutos / 60.0) + (segundos / 3600.0);
}

// Converter rumo para azimute
function bearingToAzimuth(angDec, quad) {
    quad = quad.toUpperCase();
    if (quad === "NE") return angDec;
    else if (quad === "SE") return 180.0 - angDec;
    else if (quad === "SW") return 180.0 + angDec;
    else if (quad === "NW") return 360.0 - angDec;
    return angDec;
}

// Converter UTM para Lat/Lng usando Proj4
function utmToLatLng(e, n, fuso) {
    const utmProj = UTM_ZONES[fuso];
    const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
    
    const result = proj4(utmProj, wgs84, [e, n]);
    return [result[1], result[0]]; // [lat, lng]
}

// Converter Lat/Lng para UTM usando Proj4
function latLngToUTM(lat, lng, fuso) {
    const utmProj = UTM_ZONES[fuso];
    const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
    
    const result = proj4(wgs84, utmProj, [lng, lat]);
    return { e: result[0], n: result[1] };
}

// ===== FUNÇÕES DE DESENHO =====

// Desenhar polígono com vértices
function drawPolygon(coords, ids, layerName, fuso, colors = {}) {
    // Cores padrão
    const defaultColors = {
        line: '#3388ff',
        fill: '#3388ff',
        vertex: '#ff0000'
    };
    
    const lineColor = colors.line || defaultColors.line;
    const fillColor = colors.fill || defaultColors.fill;
    const vertexColor = colors.vertex || defaultColors.vertex;
    
    // === NOVA ARQUITETURA: Usar TerraLayer ===
    
    // Criar TerraLayer
    const terraLayer = new TerraLayer(layerName, 'polygon');
    terraLayer.fuso = fuso;
    terraLayer.color = lineColor;
    terraLayer.vertexColor = vertexColor;
    
    // Adicionar vértices
    coords.forEach(([e, n], i) => {
        const vertexId = ids && ids[i] ? ids[i] : `P-${String(i+1).padStart(2, '0')}`;
        terraLayer.addVertex(vertexId, e, n);
    });
    
    // Sincronizar geometria (cria polígono e marcadores)
    terraLayer.syncGeometry();
    
    // Adicionar ao gerenciador
    const layerKey = terraManager.addLayer(terraLayer);
    
    // === COMPATIBILIDADE: Manter referência no sistema antigo ===
    // Isso permite que o painel de camadas continue funcionando
    const polygon = terraLayer.geometryLayer;
    const verticesLayer = terraLayer.verticesLayer;
    
    addLayer(layerKey, polygon, verticesLayer);
    
    // Armazenar referência à TerraLayer no sistema antigo
    if (layers[layerKey]) {
        layers[layerKey].terraLayer = terraLayer;
        layers[layerKey].coords = coords;
        layers[layerKey].ids = ids;
        layers[layerKey].fuso = fuso;
    }
    
    // Zoom para o polígono
    map.fitBounds(polygon.getBounds());
    
    showMessage(`Polígono "${layerName}" criado com ${coords.length} vértices`, 'success');
}

// Criar camada de vértices numerados
function createVerticesLayer(coords, ids, layerName, fuso, vertexColor = '#ff0000') {
    // Criar novo layer group
    const vertexLayer = L.layerGroup();
    
    coords.forEach(([e, n], i) => {
        const latlng = utmToLatLng(e, n, fuso);
        const vertexId = ids && ids[i] ? ids[i] : `P-${String(i+1).padStart(2, '0')}`;
        
        // Criar ícone de círculo vermelho usando divIcon
        const circleIcon = L.divIcon({
            className: 'vertex-marker',
            html: `<div style="
                width: 12px;
                height: 12px;
                background-color: ${vertexColor};
                border: 2px solid #ffffff;
                border-radius: 50%;
                cursor: pointer;
            "></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
        
        // Criar marcador ARRASTÁVEL usando L.Marker
        const marker = L.marker(latlng, {
            icon: circleIcon,
            draggable: false, // Será ativado quando necessário
            autoPan: true
        });
        
        // Armazenar dados no marcador
        marker._vertexIndex = i;
        marker._vertexId = vertexId;
        marker._coordE = e;
        marker._coordN = n;
        
        // Criar label
        const labelIcon = L.divIcon({
            className: 'vertex-label',
            html: `<div style="background: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: bold; border: 1px solid #333;">${vertexId}</div>`,
            iconSize: [50, 20],
            iconAnchor: [25, -10]
        });
        
        const label = L.marker(latlng, { icon: labelIcon });
        
        // Adicionar popup com coordenadas
        marker.bindPopup(`
            <b>${vertexId}</b><br>
            E: ${e.toFixed(3)}<br>
            N: ${n.toFixed(3)}
        `);
        
        vertexLayer.addLayer(marker);
        vertexLayer.addLayer(label);
    });
    
    return vertexLayer;
}

// ===== FUNÇÕES DE MODAL =====

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// ===== SISTEMA DE ABAS =====

function switchTab(prefix, tabIndex) {
    // Desativar todos os botões
    const buttons = document.querySelectorAll(`#modal-${prefix} .tab-btn`);
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Ativar botão clicado
    buttons[tabIndex].classList.add('active');
    
    // Esconder todos os painéis
    const panes = document.querySelectorAll(`#modal-${prefix} .tab-pane`);
    panes.forEach(pane => pane.classList.remove('active'));
    
    // Mostrar painel selecionado
    document.getElementById(`${prefix}-tab-${tabIndex}`).classList.add('active');
}

// ===== FUNÇÕES DE TABELA =====

function addTableRow(tableBodyId, numCols) {
    const tbody = document.getElementById(tableBodyId);
    const row = tbody.insertRow();
    
    for (let i = 0; i < numCols; i++) {
        const cell = row.insertCell();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'table-input';
        cell.appendChild(input);
    }
}

function removeTableRow(tableBodyId) {
    const tbody = document.getElementById(tableBodyId);
    if (tbody.rows.length > 0) {
        tbody.deleteRow(tbody.rows.length - 1);
    }
}

function getTableData(tableBodyId) {
    const tbody = document.getElementById(tableBodyId);
    const data = [];
    
    for (let i = 0; i < tbody.rows.length; i++) {
        const row = tbody.rows[i];
        const rowData = [];
        
        for (let j = 0; j < row.cells.length; j++) {
            const input = row.cells[j].querySelector('input');
            if (input) {
                rowData.push(input.value.trim());
            }
        }
        
        if (rowData.some(val => val !== '')) {
            data.push(rowData);
        }
    }
    
    return data;
}

// ===== FERRAMENTA: LISTA DE COORDENADAS UTM =====

function openCoordListDialog() {
    openModal('modal-coord-list');
    
    // Preencher com dados de exemplo se o campo estiver vazio
    const textarea = document.getElementById('coord-list-input');
    if (!textarea.value.trim()) {
        textarea.value = 'P-01;752000,250;8569200,750\nP-02;752100,500;8569200,750\nP-03;752100,500;8569300,000\nP-04;752000,250;8569300,000';
    }
}

function createPolygonFromCoordList() {
    console.log('[DEBUG] createPolygonFromCoordList() chamada!');
    const layerName = document.getElementById('coord-list-name').value.trim() || 'TT';
    const fuso = document.getElementById('coord-list-fuso').value;
    const text = document.getElementById('coord-list-input').value;
    console.log('[DEBUG] Nome:', layerName, 'Fuso:', fuso, 'Text length:', text.length);
    
    const coords = [];
    const ids = [];
    
    for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        
        try {
            const parts = parseLine(line, 3);
            const vId = parts[0];
            const e = parseFloat_BR(parts[1]);
            const n = parseFloat_BR(parts[2]);
            
            coords.push([e, n]);
            ids.push(vId);
        } catch (error) {
            console.error('Erro ao processar linha:', line, error);
        }
    }
    
    if (coords.length === 0) {
        showMessage('Nenhuma coordenada válida encontrada', 'error');
        return;
    }
    
    // Obter cor selecionada
    const color = document.getElementById('coord-list-color').value;
    const colors = {
        line: color,
        fill: color,
        vertex: color
    };
    
    drawPolygon(coords, ids, layerName, fuso, colors);
    closeModal('modal-coord-list');
    
    // Limpar campos
    document.getElementById('coord-list-input').value = '';
}

// ===== FERRAMENTA: TABELA DE COORDENADAS UTM =====

function openCoordTableDialog() {
    openModal('modal-coord-table');
    
    // Adicionar 3 linhas iniciais se a tabela estiver vazia
    const tbody = document.getElementById('coord-table-body');
    if (tbody.rows.length === 0) {
        for (let i = 0; i < 3; i++) {
            addTableRow('coord-table-body', 3);
        }
    }
}

function createPolygonFromCoordTable() {
    const layerName = document.getElementById('coord-table-name').value.trim() || 'TT';
    const fuso = document.getElementById('coord-table-fuso').value;
    const tableData = getTableData('coord-table-body');
    
    const coords = [];
    const ids = [];
    
    for (const row of tableData) {
        if (row.length < 3) continue;
        
        try {
            const vId = row[0] || `P-${String(ids.length + 1).padStart(2, '0')}`;
            const e = parseFloat_BR(row[1]);
            const n = parseFloat_BR(row[2]);
            
            coords.push([e, n]);
            ids.push(vId);
        } catch (error) {
            console.error('Erro ao processar linha:', row, error);
        }
    }
    
    if (coords.length === 0) {
        showMessage('Nenhuma coordenada válida encontrada', 'error');
        return;
    }
    
    
    
    // Obter cor selecionada
    const color = document.getElementById('coord-table-color').value;
    const colors = {
        line: color,
        fill: color,
        vertex: color
    };
    
    drawPolygon(coords, ids, layerName, fuso, colors);
    closeModal('modal-coord-table');
}

// ===== FERRAMENTA: AZIMUTE + DISTÂNCIA =====

function openAzimuthDialog() {
    openModal('modal-azimuth');
    
    // Adicionar 3 linhas iniciais se a tabela estiver vazia
    const tbody = document.getElementById('azimuth-table-body');
    if (tbody.rows.length === 0) {
        for (let i = 0; i < 3; i++) {
            addTableRow('azimuth-table-body', 3);
        }
    }
}

function createPolygonFromAzimuth() {
    const layerName = document.getElementById('azimuth-name').value.trim() || 'TT';
    
    // Determinar qual aba está ativa
    const activeTab = document.querySelector('#modal-azimuth .tab-btn.active');
    const tabIndex = Array.from(activeTab.parentElement.children).indexOf(activeTab);
    
    let startPoint = null;
    let fuso = '21S';
    
    // Processar ponto inicial baseado na aba
    try {
        if (tabIndex === 0) {
            // Clique no mapa
            const coordText = document.getElementById('azimuth-coord-mapa').value;
            if (!coordText) {
                showMessage('Selecione um ponto no mapa primeiro', 'error');
                return;
            }
            const parts = parseLine(coordText, 3);
            startPoint = {
                id: parts[0],
                e: parseFloat_BR(parts[1]),
                n: parseFloat_BR(parts[2])
            };
        } else if (tabIndex === 1) {
            // UTM
            fuso = document.getElementById('azimuth-utm-fuso').value;
            const coordText = document.getElementById('azimuth-start-utm').value;
            const parts = parseLine(coordText, 3);
            startPoint = {
                id: parts[0],
                e: parseFloat_BR(parts[1]),
                n: parseFloat_BR(parts[2])
            };
        } else if (tabIndex === 2) {
            // Lat/Long
            fuso = document.getElementById('azimuth-ll-fuso').value;
            const coordText = document.getElementById('azimuth-start-ll').value;
            const parts = parseLine(coordText, 3);
            const lon = dmsToDecimal(parts[1]);
            const lat = dmsToDecimal(parts[2]);
            const utm = latLngToUTM(lat, lon, fuso);
            startPoint = {
                id: parts[0],
                e: utm.e,
                n: utm.n
            };
        }
    } catch (error) {
        showMessage('Erro ao processar ponto inicial: ' + error.message, 'error');
        return;
    }
    
    if (!startPoint) {
        showMessage('Ponto inicial inválido', 'error');
        return;
    }
    
    // Processar tabela de azimute e distância
    const tableData = getTableData('azimuth-table-body');
    
    const coords = [[startPoint.e, startPoint.n]];
    const ids = [startPoint.id];
    
    let x = startPoint.e;
    let y = startPoint.n;
    
    for (const row of tableData) {
        if (row.length < 3) continue;
        
        try {
            const vId = row[0];
            const dist = parseFloat_BR(row[1]);
            const azGmss = row[2];
            
            // Converter azimute para decimal
            const azDec = azimuthToDecimal(azGmss);
            
            // Calcular novo ponto
            const dx = dist * Math.sin(azDec * Math.PI / 180);
            const dy = dist * Math.cos(azDec * Math.PI / 180);
            
            x += dx;
            y += dy;
            
            coords.push([x, y]);
            ids.push(vId);
        } catch (error) {
            console.error('Erro ao processar linha:', row, error);
        }
    }
    
    if (coords.length < 2) {
        showMessage('É necessário pelo menos um segmento', 'error');
        return;
    }
    
    
    
    // Obter cor selecionada
    const color = document.getElementById('azimuth-color').value;
    const colors = {
        line: color,
        fill: color,
        vertex: color
    };
    
    drawPolygon(coords, ids, layerName, fuso, colors);
    closeModal('modal-azimuth');
}

// ===== FERRAMENTA: RUMO + DISTÂNCIA =====

function openBearingDialog() {
    openModal('modal-bearing');
    
    // Adicionar 3 linhas iniciais se a tabela estiver vazia
    const tbody = document.getElementById('bearing-table-body');
    if (tbody.rows.length === 0) {
        for (let i = 0; i < 3; i++) {
            addTableRow('bearing-table-body', 4);
        }
    }
}

function createPolygonFromBearing() {
    const layerName = document.getElementById('bearing-name').value.trim() || 'TT';
    
    // Determinar qual aba está ativa
    const activeTab = document.querySelector('#modal-bearing .tab-btn.active');
    const tabIndex = Array.from(activeTab.parentElement.children).indexOf(activeTab);
    
    let startPoint = null;
    let fuso = '21S';
    
    // Processar ponto inicial baseado na aba
    try {
        if (tabIndex === 0) {
            // Clique no mapa
            const coordText = document.getElementById('bearing-coord-mapa').value;
            if (!coordText) {
                showMessage('Selecione um ponto no mapa primeiro', 'error');
                return;
            }
            const parts = parseLine(coordText, 3);
            startPoint = {
                id: parts[0],
                e: parseFloat_BR(parts[1]),
                n: parseFloat_BR(parts[2])
            };
        } else if (tabIndex === 1) {
            // UTM
            fuso = document.getElementById('bearing-utm-fuso').value;
            const coordText = document.getElementById('bearing-start-utm').value;
            const parts = parseLine(coordText, 3);
            startPoint = {
                id: parts[0],
                e: parseFloat_BR(parts[1]),
                n: parseFloat_BR(parts[2])
            };
        } else if (tabIndex === 2) {
            // Lat/Long
            fuso = document.getElementById('bearing-ll-fuso').value;
            const coordText = document.getElementById('bearing-start-ll').value;
            const parts = parseLine(coordText, 3);
            const lon = dmsToDecimal(parts[1]);
            const lat = dmsToDecimal(parts[2]);
            const utm = latLngToUTM(lat, lon, fuso);
            startPoint = {
                id: parts[0],
                e: utm.e,
                n: utm.n
            };
        }
    } catch (error) {
        showMessage('Erro ao processar ponto inicial: ' + error.message, 'error');
        return;
    }
    
    if (!startPoint) {
        showMessage('Ponto inicial inválido', 'error');
        return;
    }
    
    // Processar tabela de rumo e distância
    const tableData = getTableData('bearing-table-body');
    
    if (tableData.length === 0) {
        showMessage('Adicione pelo menos uma linha na tabela', 'error');
        return;
    }
    
    const coords = [[startPoint.e, startPoint.n]];
    const ids = [startPoint.id];
    
    let x = startPoint.e;
    let y = startPoint.n;
    
    for (let i = 0; i < tableData.length; i++) {
        const row = tableData[i];
        
        // Verificar se a linha tem dados suficientes
        if (row.length < 4) {
            console.log('Linha ignorada (dados insuficientes):', row);
            continue;
        }
        
        // Verificar se todos os campos estão preenchidos
        if (!row[0] || !row[1] || !row[2] || !row[3]) {
            console.log('Linha ignorada (campos vazios):', row);
            continue;
        }
        
        try {
            const vId = row[0].trim();
            const dist = parseFloat_BR(row[1]);
            const angGmss = row[2].trim();
            const quad = row[3].trim().toUpperCase();
            
            // Validar quadrante
            if (!['NE', 'SE', 'SW', 'NW'].includes(quad)) {
                showMessage(`Linha ${i+1}: Quadrante inválido "${quad}". Use: NE, SE, SW ou NW`, 'error');
                return;
            }
            
            // Converter rumo para decimal
            const angDec = azimuthToDecimal(angGmss);
            
            // Converter rumo para azimute
            const az = bearingToAzimuth(angDec, quad);
            
            console.log(`Linha ${i+1}: ${vId}, dist=${dist}, rumo=${angGmss} (${angDec}°), quad=${quad}, azimute=${az}°`);
            
            // Calcular novo ponto
            const dx = dist * Math.sin(az * Math.PI / 180);
            const dy = dist * Math.cos(az * Math.PI / 180);
            
            x += dx;
            y += dy;
            
            coords.push([x, y]);
            ids.push(vId);
        } catch (error) {
            showMessage(`Erro na linha ${i+1}: ${error.message}`, 'error');
            console.error('Erro ao processar linha:', row, error);
            return;
        }
    }
    
    if (coords.length < 2) {
        showMessage('É necessário pelo menos um segmento válido', 'error');
        return;
    }
    
    console.log('Polígono criado com sucesso:', coords.length, 'vértices');
    
    
    // Obter cor selecionada
    const color = document.getElementById('bearing-color').value;
    const colors = {
        line: color,
        fill: color,
        vertex: color
    };
    
    drawPolygon(coords, ids, layerName, fuso, colors);
    closeModal('modal-bearing');
}

// ===== FERRAMENTAS LAT/LONG (SIGEF) =====

function openListaLatLongDialog() {
    openModal('modal-lista-latlong');
}

function openTabelaLatLongDialog() {
    openModal('modal-tabela-latlong');
}

// Converter DMS para decimal
function dmsToDecimal(dmsText) {
    // Limpar texto
    const s = dmsText.replace(/'/g, "'").replace(/"/g, '"').replace(/"/g, '"').trim();
    
    // Regex para formato DMS: -56°23'20,828"
    const match = s.match(/^\s*([+-]?\d+)\s*°\s*(\d+)\s*'\s*([\d\.,]+)\s*"\s*$/);
    
    if (!match) {
        throw new Error(`Formato DMS inválido: ${dmsText}`);
    }
    
    const deg = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const seconds = parseFloat(match[3].replace(",", "."));
    
    // Validar
    if (minutes < 0 || minutes >= 60) {
        throw new Error(`Minutos inválidos: ${minutes}`);
    }
    if (seconds < 0 || seconds >= 60) {
        throw new Error(`Segundos inválidos: ${seconds}`);
    }
    
    const sign = deg < 0 ? -1 : 1;
    const degAbs = Math.abs(deg);
    const decimal = sign * (degAbs + minutes/60.0 + seconds/3600.0);
    
    return decimal;
}

// Converter Lat/Long para UTM usando proj4
function latLongToUTM(lat, lon, zone) {
    // SIRGAS 2000 geográfica (EPSG:4674)
    const src = '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs';
    
    // Fuso UTM de destino
    const dst = UTM_ZONES[zone];
    
    // Converter
    const point = proj4(src, dst, [lon, lat]);
    
    return {
        e: point[0],
        n: point[1]
    };
}

function createPolygonFromListaLatLong() {
    const layerName = document.getElementById('lista-latlong-name').value.trim() || 'TT';
    const fuso = document.getElementById('lista-latlong-utm').value;
    const coordsText = document.getElementById('lista-latlong-coords').value;
    
    const lines = coordsText.split('\n').filter(l => l.trim());
    
    if (lines.length === 0) {
        showMessage('Nenhuma coordenada fornecida', 'error');
        return;
    }
    
    const coords = [];
    const ids = [];
    
    for (const line of lines) {
        try {
            const parts = line.split(';').map(p => p.trim());
            if (parts.length < 3) continue;
            
            const vId = parts[0];
            const lonDMS = parts[1];
            const latDMS = parts[2];
            
            // Converter DMS para decimal
            const lon = dmsToDecimal(lonDMS);
            const lat = dmsToDecimal(latDMS);
            
            // Converter para UTM
            const utm = latLongToUTM(lat, lon, fuso);
            
            coords.push([utm.e, utm.n]);
            ids.push(vId);
        } catch (error) {
            console.error('Erro ao processar linha:', line, error);
            showMessage(`Erro na linha: ${line}`, 'error');
        }
    }
    
    if (coords.length < 3) {
        showMessage('É necessário pelo menos 3 pontos para criar um polígono', 'error');
        return;
    }
    
    
    
    // Obter cor selecionada
    const color = document.getElementById('lista-latlong-color').value;
    const colors = {
        line: color,
        fill: color,
        vertex: color
    };
    
    drawPolygon(coords, ids, layerName, fuso, colors);
    closeModal('modal-lista-latlong');
}

function addRowTabelaLatLong() {
    const table = document.getElementById('tabela-latlong-table').getElementsByTagName('tbody')[0];
    const rowCount = table.rows.length + 1;
    const newRow = table.insertRow();
    
    newRow.innerHTML = `
        <td><input type="text" placeholder="P-${String(rowCount).padStart(2, '0')}"></td>
        <td><input type="text" placeholder='-56°23&#39;20,828"'></td>
        <td><input type="text" placeholder='-14°29&#39;18,542"'></td>
    `;
}

function removeRowTabelaLatLong() {
    const table = document.getElementById('tabela-latlong-table').getElementsByTagName('tbody')[0];
    if (table.rows.length > 1) {
        table.deleteRow(table.rows.length - 1);
    }
}

function createPolygonFromTabelaLatLong() {
    const layerName = document.getElementById('tabela-latlong-name').value.trim() || 'TT';
    const fuso = document.getElementById('tabela-latlong-utm').value;
    const table = document.getElementById('tabela-latlong-table').getElementsByTagName('tbody')[0];
    
    const coords = [];
    const ids = [];
    
    for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        const inputs = row.getElementsByTagName('input');
        
        if (inputs.length < 3) continue;
        
        const vId = inputs[0].value.trim();
        const lonDMS = inputs[1].value.trim();
        const latDMS = inputs[2].value.trim();
        
        if (!vId || !lonDMS || !latDMS) continue;
        
        try {
            // Converter DMS para decimal
            const lon = dmsToDecimal(lonDMS);
            const lat = dmsToDecimal(latDMS);
            
            // Converter para UTM
            const utm = latLongToUTM(lat, lon, fuso);
            
            coords.push([utm.e, utm.n]);
            ids.push(vId);
        } catch (error) {
            console.error('Erro ao processar linha:', i+1, error);
            showMessage(`Erro na linha ${i+1}: ${error.message}`, 'error');
            return;
        }
    }
    
    if (coords.length < 3) {
        showMessage('É necessário pelo menos 3 pontos para criar um polígono', 'error');
        return;
    }
    
    
    
    // Obter cor selecionada
    const color = document.getElementById('tabela-latlong-color').value;
    const colors = {
        line: color,
        fill: color,
        vertex: color
    };
    
    drawPolygon(coords, ids, layerName, fuso, colors);
    closeModal('modal-tabela-latlong');
}

// ===== SELEÇÃO DE PONTO NO MAPA =====

let mapClickCallback = null;

function selectPointOnMap(toolType) {
    // Ocultar modal temporariamente para permitir clique no mapa
    const modalId = `modal-${toolType}`;
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
    
    showMessage('Clique no mapa para selecionar o ponto inicial', 'info');
    
    // Configurar callback
    mapClickCallback = function(e) {
        const latlng = e.latlng;
        
        // Converter para UTM (usando fuso padrão 21S)
        const utm = latLngToUTM(latlng.lat, latlng.lng, '21S');
        
        // Formatar coordenadas com vírgula
        const coordText = `P-01;${utm.e.toFixed(3).replace('.', ',')};${utm.n.toFixed(3).replace('.', ',')}`;
        
        // Atualizar campo
        document.getElementById(`${toolType}-coord-mapa`).value = coordText;
        
        // Restaurar modal
        modal.style.display = 'flex';
        
        // Remover callback
        map.off('click', mapClickCallback);
        mapClickCallback = null;
        
        showMessage('Ponto selecionado com sucesso', 'success');
    };
    
    map.on('click', mapClickCallback);
}

// ===== MENSAGENS =====

function showMessage(message, type = 'info') {
    // Criar elemento de mensagem
    const msgDiv = document.createElement('div');
    msgDiv.className = `message message-${type}`;
    msgDiv.textContent = message;
    msgDiv.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#d32f2f' : type === 'success' ? '#388e3c' : '#1976d2'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(msgDiv);
    
    // Remover após 3 segundos
    setTimeout(() => {
        msgDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => msgDiv.remove(), 300);
    }, 3000);
}

// ===== FUNÇÕES BÁSICAS (Placeholder) =====

function newProject() {
    openModal('modal-new-project');
}

function createProject() {
    const name = document.getElementById('project-name-input').value.trim();
    const fuso = document.getElementById('fuso-utm-select').value;
    
    if (!name || !fuso) {
        showMessage('Preencha todos os campos', 'error');
        return;
    }
    
    currentProject = { name, fuso };
    document.getElementById('project-name').textContent = name;
    
    closeModal('modal-new-project');
    showMessage(`Projeto "${name}" criado com sucesso`, 'success');
}

function saveProject() {
    if (!currentProject) {
        showMessage('Nenhum projeto ativo', 'error');
        return;
    }
    showMessage('Funcionalidade em desenvolvimento', 'info');
}

function openProject() {
    showMessage('Funcionalidade em desenvolvimento', 'info');
}

function activateTool(tool) {
    currentTool = tool;
    updateToolIndicator(tool);
}

function addLayer() {
    openModal('modal-new-layer');
}

function createLayer() {
    closeModal('modal-new-layer');
    showMessage('Camada criada com sucesso', 'success');
}

function showCoordinates() {
    showMessage('Clique no mapa para ver coordenadas', 'info');
}

// ===== TROCA DE CAMADA BASE =====
function changeBaseLayer() {
    const select = document.getElementById('baseLayerSelect');
    const selectedLayer = select.value;
    const ufSelect = document.getElementById('ufSelect');
    const ufLabel = document.getElementById('ufLabel');
    const legendBtn = document.getElementById('legendBtn');
    
    // Remover camada atual
    if (currentBaseLayer) {
        map.removeLayer(currentBaseLayer);
    }
    
    // Adicionar nova camada
    if (selectedLayer === 'osm') {
        currentBaseLayer = baseLayers.osm;
        ufSelect.style.display = 'none';
        ufLabel.style.display = 'none';
        legendBtn.style.display = 'none';
    } else if (selectedLayer === 'satellite') {
        currentBaseLayer = baseLayers.satellite;
        ufSelect.style.display = 'none';
        ufLabel.style.display = 'none';
        legendBtn.style.display = 'none';
    } else if (selectedLayer === 'sigef' || selectedLayer === 'snci') {
        // Mostrar seletor de UF e botão de legenda
        ufSelect.style.display = 'inline-block';
        ufLabel.style.display = 'inline-block';
        legendBtn.style.display = 'inline-block';
        
        // Criar camada WMS INCRA
        const uf = ufSelect.value;
        const layerName = selectedLayer === 'sigef' 
            ? `certificada_sigef_particular_${uf}` 
            : `imoveis_snci_${uf}`;
        
        currentBaseLayer = L.tileLayer.wms("https://acervofundiario.incra.gov.br/i3geo/ogc.php", {
            layers: layerName,
            format: "image/png",
            transparent: true,
            opacity: 0.4,
            attribution: selectedLayer === 'sigef' ? 'SIGEF/INCRA' : 'SNCI/INCRA'
        });
    }
    
    if (currentBaseLayer) {
        currentBaseLayer.addTo(map);
    }
    
    // Manter drawnItems no topo
    if (drawnItems) {
        drawnItems.bringToFront();
    }
}

function updateIncraLayer() {
    // Atualizar camada quando UF mudar
    const select = document.getElementById('baseLayerSelect');
    const selectedLayer = select.value;
    
    if (selectedLayer === 'sigef' || selectedLayer === 'snci') {
        changeBaseLayer();
    }
}

function openLegendModal() {
    const select = document.getElementById('baseLayerSelect');
    const selectedLayer = select.value;
    const ufSelect = document.getElementById('ufSelect');
    const uf = ufSelect.value;
    
    if (selectedLayer !== 'sigef' && selectedLayer !== 'snci') {
        return;
    }
    
    const layerName = selectedLayer === 'sigef' 
        ? `certificada_sigef_particular_${uf}` 
        : `imoveis_snci_${uf}`;
    
    const legendUrl = `https://acervofundiario.incra.gov.br/i3geo/ogc.php?REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER=${layerName}`;
    
    const legendContent = document.getElementById('legend-content');
    legendContent.innerHTML = `
        <h3>${selectedLayer === 'sigef' ? 'SIGEF - Imóveis Certificados' : 'SNCI - Terras Públicas'}</h3>
        <p><strong>Estado:</strong> ${uf}</p>
        <img src="${legendUrl}" alt="Legenda" style="max-width: 100%; margin-top: 15px;" onerror="this.parentElement.innerHTML='<p>Erro ao carregar legenda. Verifique a conexão com o servidor INCRA.</p>'">
    `;
    
    openModal('modal-legend');
}

// ===== POLÍGONO SIGEF =====

let sigefFileData = null;

function openPoligonoSIGEFDialog() {
    openModal('modal-poligono-sigef');
    // Limpar campos
    document.getElementById('sigef-nome-imovel').value = '';
    document.getElementById('sigef-arquivo').value = '';
    document.getElementById('sigef-info').style.display = 'none';
    sigefFileData = null;
}

function handleSIGEFFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('sigef-filename').textContent = file.name;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        sigefFileData = {
            name: file.name,
            content: e.target.result.split(',')[1], // Base64 sem prefixo
            type: file.type
        };
        
        // Mostrar info
        document.getElementById('sigef-info').style.display = 'block';
        document.getElementById('sigef-vertices-count').textContent = '...processando...';
    };
    reader.readAsDataURL(file);
}

async function importarPoligonoSIGEF() {
    const nomeImovel = document.getElementById('sigef-nome-imovel').value.trim();
    const fuso = document.getElementById('sigef-fuso').value;
    
    if (!nomeImovel) {
        showMessage('Digite o nome do imóvel/matrícula', 'error');
        return;
    }
    
    if (!sigefFileData) {
        showMessage('Selecione um arquivo shapefile', 'error');
        return;
    }
    
    try {
        showMessage('Processando shapefile...', 'info');
        
        const response = await fetch('/api/process-sigef', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome_imovel: nomeImovel,
                fuso: fuso,
                file_data: sigefFileData
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erro ao processar shapefile');
        }
        
        // Criar polígono com os dados retornados
        let coords = result.coords;
        const ids = result.ids;
        
        if (coords.length < 3) {
            throw new Error('Shapefile não contém vértices suficientes');
        }
        
        // Detectar se coordenadas estão em Lat/Long e converter para UTM
        const firstCoord = coords[0];
        const isLatLong = Math.abs(firstCoord[0]) <= 180 && Math.abs(firstCoord[1]) <= 90;
        
        if (isLatLong) {
            console.log('Coordenadas em Lat/Long detectadas, convertendo para UTM...');
            const utmCoords = [];
            for (const [lon, lat] of coords) {
                const utmPoint = latLongToUTM(lat, lon, fuso);
                utmCoords.push([utmPoint.e, utmPoint.n]);
            }
            coords = utmCoords;
            console.log(`✓ ${coords.length} coordenadas convertidas para UTM`);
        }
        
        drawPolygon(coords, ids, nomeImovel, fuso);
        
        showMessage(`Polígono '${nomeImovel}' importado com sucesso! (${coords.length} vértices)`, 'success');
        closeModal('modal-poligono-sigef');
        
    } catch (error) {
        console.error('Erro ao importar SIGEF:', error);
        showMessage(`Erro: ${error.message}`, 'error');
    }
}

/// ===== GERENCIAMENTO DE CAMADAS =====

function addLayer(layerName, polygonLayer, verticesLayer) {
    // Adicionar ao mapa
    if (polygonLayer) map.addLayer(polygonLayer);
    if (verticesLayer) map.addLayer(verticesLayer);
    
    // Armazenar referências
    layers[layerName] = {
        polygon: polygonLayer,
        vertices: verticesLayer,
        visible: true
    };
    
    // Atualizar painel de camadas
    updateLayersPanel();
}

function removeLayer(layerName) {
    if (!layers[layerName]) return;
    
    // Remover do mapa
    if (layers[layerName].polygon) map.removeLayer(layers[layerName].polygon);
    if (layers[layerName].vertices) map.removeLayer(layers[layerName].vertices);
    
    // Remover das referências
    delete layers[layerName];
    
    // Atualizar painel
    updateLayersPanel();
}

function toggleLayerVisibility(layerName) {
    if (!layers[layerName]) return;
    
    const layer = layers[layerName];
    layer.visible = !layer.visible;
    
    if (layer.visible) {
        if (layer.polygon) map.addLayer(layer.polygon);
        if (layer.vertices) map.addLayer(layer.vertices);
    } else {
        if (layer.polygon) map.removeLayer(layer.polygon);
        if (layer.vertices) map.removeLayer(layer.vertices);
    }
    
    updateLayersPanel();
}

function zoomToLayer(layerName) {
    if (!layers[layerName]) return;
    
    const layer = layers[layerName];
    if (layer.polygon) {
        map.fitBounds(layer.polygon.getBounds());
    }
}

function updateLayersPanel() {
    const layersList = document.getElementById('layers-list');
    layersList.innerHTML = '';
    
    // Listar camadas em ordem reversa (mais recente primeiro)
    const layerNames = Object.keys(layers).reverse();
    
    if (layerNames.length === 0) {
        layersList.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">Nenhuma camada criada</div>';
        return;
    }
    
    layerNames.forEach(layerName => {
        const layer = layers[layerName];
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        layerItem.innerHTML = `
            <input type="checkbox" class="layer-checkbox" ${layer.visible ? 'checked' : ''} 
                   onchange="toggleLayerVisibility('${layerName}')">
            <span class="layer-name">${layerName}</span>
            <div class="layer-actions">
                <button class="layer-action-btn" onclick="zoomToLayer('${layerName}')" title="Zoom para camada">
                    🔍
                </button>
                <button class="layer-action-btn" onclick="removeLayer('${layerName}')" title="Remover camada">
                    🗑️
                </button>
            </div>
        `;
        layersList.appendChild(layerItem);
    });
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    updateLayersPanel();
    console.log('TerraGIS inicializado com sucesso');
});;
// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);






// ===== FERRAMENTAS DE EDIÇÃO (SEGUINDO PLUGIN TERRATools) =====

// Variáveis globais para ferramentas de edição
let moverVerticesMapaAtivo = false;
let adicionarVerticesMapaAtivo = false;
let removerVerticesMapaAtivo = false;
let renomearVerticeMapaAtivo = false;
let copiarGeometriaMapaAtivo = false;
let fecharPoligonoAtivo = false;

// ===== SUBMENU TOGGLE =====
function toggleSubmenu(submenuId) {
    const submenu = document.getElementById(submenuId);
    const toggle = submenu.previousElementSibling;
    
    if (submenu.style.display === 'none' || submenu.style.display === '') {
        submenu.style.display = 'block';
        submenu.classList.add('show');
        toggle.classList.add('active');
    } else {
        submenu.style.display = 'none';
        submenu.classList.remove('show');
        toggle.classList.remove('active');
    }
}

// ===== MOVER VÉRTICES (MAPA) =====
function ativarMoverVerticesMapa() {
    if (moverVerticesMapaAtivo) {
        desativarMoverVerticesMapa();
        return;
    }
    
    // Desativar outras ferramentas
    desativarTodasFerramentasEdicao();
    
    moverVerticesMapaAtivo = true;
    updateToolIndicator('Mover Vértices (Mapa)');
    
    // === NOVA ARQUITETURA: Usar TerraManager ===
    terraManager.setAllEditable(true);
}

function desativarMoverVerticesMapa() {
    moverVerticesMapaAtivo = false;
    
    // === NOVA ARQUITETURA: Usar TerraManager ===
    terraManager.setAllEditable(false);
    
    updateToolIndicator(null);
}

function habilitarArrasteVertices(layerName, layer) {
    // Percorrer todos os marcadores de vértices
    layer.vertices.eachLayer((marker) => {
        // Apenas processar Markers (não labels)
        if (marker instanceof L.Marker && marker._vertexIndex !== undefined) {
            // Habilitar arraste
            marker.dragging.enable();
            
            // Mudar cursor
            const element = marker.getElement();
            if (element) {
                element.style.cursor = 'move';
            }
            
            // Armazenar referência da camada no marcador
            marker._terraGISLayerName = layerName;
            
            // Evento quando termina de arrastar
            marker.on('dragend', function(e) {
                onVertexDragEnd(e, layerName);
            });
        }
    });
}

function desabilitarArrasteVertices(layer) {
    layer.vertices.eachLayer((marker) => {
        if (marker instanceof L.Marker && marker._vertexIndex !== undefined) {
            marker.dragging.disable();
            marker.off('dragend');
            
            // Restaurar cursor
            const element = marker.getElement();
            if (element) {
                element.style.cursor = 'pointer';
            }
        }
    });
}

function onVertexDragEnd(event, layerName) {
    const marker = event.target;
    const newLatLng = marker.getLatLng();
    
    // === NOVA ARQUITETURA: Usar TerraLayer ===
    const terraLayer = marker._terraLayer;
    
    if (!terraLayer) {
        showMessage('Erro: TerraLayer não encontrada', 'error');
        return;
    }
    
    // Usar índice armazenado no marcador
    const vertexIndex = marker._vertexIndex;
    const vertexId = marker._vertexId;
    
    // Converter nova posição de Lat/Lng para UTM
    const newUTM = latLngToUTM(newLatLng.lat, newLatLng.lng, terraLayer.fuso);
    const newE = newUTM[0];
    const newN = newUTM[1];
    
    // *** CORREÇÃO 1: Mover vértice usando TerraLayer ***
    terraLayer.moveVertex(vertexIndex, newE, newN);
    
    // *** CORREÇÃO 2: Sincronizar geometria (atualiza polígono) ***
    terraLayer.syncGeometry();
    
    // *** CORREÇÃO 3: Recriar camada de vértices (atualiza labels) ***
    terraLayer.updateVerticesLayer();
    
    // Reativar arraste se ainda estiver no modo de mover vértices
    if (moverVerticesMapaAtivo) {
        terraManager.setAllEditable(true);
    }
    
    showMessage(`Vértice ${vertexId} movido para E: ${newE.toFixed(3)}, N: ${newN.toFixed(3)}`, 'success');
}

// ===== MOVER VÉRTICES (COORDENADAS) =====
function openMoverVerticesCoordenadasDialog() {
    // Carregar camadas no select
    const select = document.getElementById('mover-vertice-camada');
    select.innerHTML = '<option value="">Selecione uma camada</option>';
    
    Object.keys(layers).forEach(layerName => {
        const option = document.createElement('option');
        option.value = layerName;
        option.textContent = layerName;
        select.appendChild(option);
    });
    
    openModal('modal-mover-vertice');
}

function loadVerticesForMove() {
    const layerName = document.getElementById('mover-vertice-camada').value;
    const select = document.getElementById('mover-vertice-id');
    select.innerHTML = '<option value="">Selecione um vértice</option>';
    
    if (!layerName || !layers[layerName]) return;
    
    const layer = layers[layerName];
    const ids = layer.ids || [];
    
    ids.forEach((id, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${id} (${index + 1})`;
        select.appendChild(option);
    });
}

function aplicarMoverVertice() {
    const layerName = document.getElementById('mover-vertice-camada').value;
    const vertexIndex = parseInt(document.getElementById('mover-vertice-id').value);
    const newE = parseFloat_BR(document.getElementById('mover-vertice-e').value);
    const newN = parseFloat_BR(document.getElementById('mover-vertice-n').value);
    
    if (!layerName || isNaN(vertexIndex) || isNaN(newE) || isNaN(newN)) {
        showMessage('Preencha todos os campos corretamente', 'error');
        return;
    }
    
    // === NOVA ARQUITETURA: Usar TerraLayer ===
    const terraLayer = terraManager.getLayer(layerName);
    if (!terraLayer) {
        showMessage('Camada não encontrada', 'error');
        return;
    }
    
    const vertex = terraLayer.vertices[vertexIndex];
    if (!vertex) {
        showMessage('Vértice não encontrado', 'error');
        return;
    }
    
    // Mover vértice (sincronização automática)
    terraLayer.moveVertex(vertexIndex, newE, newN);
    
    showMessage(`Vértice ${vertex.id} movido para E: ${newE.toFixed(3)}, N: ${newN.toFixed(3)}`, 'success');
    closeModal('modal-mover-vertice');
}

// ===== ADICIONAR VÉRTICES (MAPA) =====
function ativarAdicionarVerticesMapa() {
    if (adicionarVerticesMapaAtivo) {
        desativarAdicionarVerticesMapa();
        return;
    }
    
    // Desativar outras ferramentas
    desativarTodasFerramentasEdicao();
    
    adicionarVerticesMapaAtivo = true;
    updateToolIndicator('Adicionar Vértices (Mapa)');
    
    // Adicionar evento de clique nos polígonos
    Object.values(terraManager.layers).forEach(terraLayer => {
        if (terraLayer.geometryLayer) {
            // Desabilitar popup temporariamente
            terraLayer.geometryLayer.unbindPopup();
            
            // Usar mousedown para capturar antes de outros eventos
            terraLayer.geometryLayer.on('mousedown', function(e) {
                if (!adicionarVerticesMapaAtivo) return;
                
                L.DomEvent.stopPropagation(e);
                L.DomEvent.preventDefault(e);
                
                const clickLatLng = e.latlng;
                
                // Converter clique para UTM
                const clickUTM = latLngToUTM(clickLatLng.lat, clickLatLng.lng, terraLayer.fuso);
                
                // Encontrar aresta mais próxima
                let minDist = Infinity;
                let insertIndex = -1;
                
                for (let i = 0; i < terraLayer.vertices.length; i++) {
                    const v1 = terraLayer.vertices[i];
                    const v2 = terraLayer.vertices[(i + 1) % terraLayer.vertices.length];
                    
                    // Distância do ponto clicado até a aresta
                    const dist = distanceToSegment(
                        clickUTM.e, clickUTM.n,
                        v1.e, v1.n,
                        v2.e, v2.n
                    );
                    
                    if (dist < minDist) {
                        minDist = dist;
                        insertIndex = i + 1; // Inserir após v1
                    }
                }
                
                if (insertIndex === -1) return;
                
                // Gerar ID automático
                const newId = prompt('Digite o ID do novo vértice:', `P-${terraLayer.vertices.length + 1}`);
                if (!newId) return;
                
                // Adicionar vértice
                try {
                    terraLayer.addVertex(newId, clickUTM.e, clickUTM.n, insertIndex);
                    showMessage(`Vértice '${newId}' adicionado com sucesso!`, 'success');
                    
                    // Desativar ferramenta
                    desativarAdicionarVerticesMapa();
                } catch (error) {
                    showMessage(`Erro: ${error.message}`, 'error');
                }
            });
        }
    });
}

function desativarAdicionarVerticesMapa() {
    adicionarVerticesMapaAtivo = false;
    
    // Remover eventos e restaurar popups
    Object.values(terraManager.layers).forEach(terraLayer => {
        if (terraLayer.geometryLayer) {
            terraLayer.geometryLayer.off('mousedown');
            
            // Restaurar popup
            const layerName = terraLayer.type === 'polygon' ? 
                `${terraLayer.name}_Poligono` : `${terraLayer.name}_Polilinha`;
            terraLayer.geometryLayer.bindPopup(`<b>${layerName}</b>`);
        }
    });
    
    updateToolIndicator(null);
}

// Função auxiliar: distância de ponto até segmento
function distanceToSegment(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
        param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
}

// ===== ADICIONAR VÉRTICES (COORDENADAS) =====
function openAdicionarVerticesCoordenadasDialog() {
    // Carregar camadas no select
    const select = document.getElementById('adicionar-vertice-camada');
    select.innerHTML = '<option value="">Selecione uma camada</option>';
    
    Object.keys(layers).forEach(layerName => {
        const option = document.createElement('option');
        option.value = layerName;
        option.textContent = layerName;
        select.appendChild(option);
    });
    
    openModal('modal-adicionar-vertice');
}

function loadVerticesForAdd() {
    const layerName = document.getElementById('adicionar-vertice-camada').value;
    const select = document.getElementById('adicionar-vertice-posicao');
    select.innerHTML = '<option value="">Selecione posição</option>';
    
    if (!layerName || !layers[layerName]) return;
    
    const layer = layers[layerName];
    const ids = layer.ids || [];
    
    ids.forEach((id, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Após ${id} (${index + 1})`;
        select.appendChild(option);
    });
    
    // Adicionar opção "No final"
    const optionEnd = document.createElement('option');
    optionEnd.value = ids.length - 1;
    optionEnd.textContent = 'No final';
    select.appendChild(optionEnd);
}

function aplicarAdicionarVertice() {
    const layerName = document.getElementById('adicionar-vertice-camada').value;
    const newId = document.getElementById('adicionar-vertice-id').value.trim();
    const newE = parseFloat_BR(document.getElementById('adicionar-vertice-e').value);
    const newN = parseFloat_BR(document.getElementById('adicionar-vertice-n').value);
    const afterIndex = parseInt(document.getElementById('adicionar-vertice-posicao').value);
    
    if (!layerName || !newId || isNaN(newE) || isNaN(newN) || isNaN(afterIndex)) {
        showMessage('Preencha todos os campos corretamente', 'error');
        return;
    }
    
    const layer = layers[layerName];
    if (!layer || !layer.coords) {
        showMessage('Camada não encontrada', 'error');
        return;
    }
    
    // Inserir nova coordenada
    layer.coords.splice(afterIndex + 1, 0, [newE, newN]);
    layer.ids.splice(afterIndex + 1, 0, newId);
    
    // Atualizar polígono
    const fuso = layer.fuso || '21S';
    const latlngs = layer.coords.map(([e, n]) => utmToLatLng(e, n, fuso));
    layer.polygon.setLatLngs(latlngs);
    
    // Atualizar vértices
    if (layer.vertices) {
        map.removeLayer(layer.vertices);
    }
    layer.vertices = createVerticesLayer(layer.coords, layer.ids, layerName, fuso, layer.polygon.options.color);
    map.addLayer(layer.vertices);
    
    showMessage(`Vértice adicionado com sucesso`, 'success');
    closeModal('modal-adicionar-vertice');
}

// ===== ADICIONAR VÉRTICE (AZIMUTE/RUMO) =====
function openAdicionarVerticeAzimuteRumoDialog() {
    // Carregar camadas disponíveis
    const select = document.getElementById('azimute-camada');
    select.innerHTML = '<option value="">Selecione uma camada</option>';
    
    Object.keys(terraManager.layers).forEach(layerName => {
        const option = document.createElement('option');
        option.value = layerName;
        option.textContent = layerName;
        select.appendChild(option);
    });
    
    // Limpar campos
    document.getElementById('azimute-vertice-partida').innerHTML = '<option value="">Selecione um vértice</option>';
    document.getElementById('azimute-novo-id').value = '';
    document.getElementById('azimute-valor').value = '';
    document.getElementById('azimute-distancia').value = '';
    document.getElementById('azimute-quadrante').value = '';
    document.getElementById('azimute-metodo').value = 'azimute';
    toggleQuadranteField();
    
    openModal('modal-adicionar-vertice-azimute');
}

function loadVerticesForAzimute() {
    const layerName = document.getElementById('azimute-camada').value;
    const select = document.getElementById('azimute-vertice-partida');
    
    select.innerHTML = '<option value="">Selecione um vértice</option>';
    
    if (!layerName) return;
    
    const terraLayer = terraManager.layers[layerName];
    if (!terraLayer) return;
    
    // Carregar vértices
    terraLayer.vertices.forEach((vertex, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = vertex.id;
        select.appendChild(option);
    });
}

function toggleQuadranteField() {
    const metodo = document.getElementById('azimute-metodo').value;
    const quadranteGroup = document.getElementById('azimute-quadrante-group');
    const valorLabel = document.getElementById('azimute-valor-label');
    
    if (metodo === 'rumo') {
        quadranteGroup.style.display = 'block';
        valorLabel.textContent = 'Rumo:';
    } else {
        quadranteGroup.style.display = 'none';
        valorLabel.textContent = 'Azimute (°):';
    }
}

function aplicarAdicionarVerticeAzimute() {
    const layerName = document.getElementById('azimute-camada').value;
    const verticePartidaIndex = parseInt(document.getElementById('azimute-vertice-partida').value);
    const metodo = document.getElementById('azimute-metodo').value;
    const novoId = document.getElementById('azimute-novo-id').value.trim();
    const valorStr = document.getElementById('azimute-valor').value.trim();
    const distanciaStr = document.getElementById('azimute-distancia').value.trim();
    const quadrante = document.getElementById('azimute-quadrante').value.trim().toUpperCase();
    
    // Validações
    if (!layerName) {
        showMessage('Selecione uma camada', 'error');
        return;
    }
    
    if (isNaN(verticePartidaIndex)) {
        showMessage('Selecione um vértice de partida', 'error');
        return;
    }
    
    if (!novoId) {
        showMessage('Informe o ID do novo vértice', 'error');
        return;
    }
    
    if (!valorStr || !distanciaStr) {
        showMessage('Preencha azimute/rumo e distância', 'error');
        return;
    }
    
    if (metodo === 'rumo' && !quadrante) {
        showMessage('Informe o quadrante para rumo', 'error');
        return;
    }
    
    const terraLayer = terraManager.layers[layerName];
    if (!terraLayer) {
        showMessage('Camada não encontrada', 'error');
        return;
    }
    
    const verticePartida = terraLayer.vertices[verticePartidaIndex];
    if (!verticePartida) {
        showMessage('Vértice de partida não encontrado', 'error');
        return;
    }
    
    try {
        // Converter azimute/rumo para decimal
        let azimute;
        if (metodo === 'azimute') {
            azimute = parseAzimute(valorStr);
        } else {
            azimute = parseRumoComQuadrante(valorStr, quadrante);
        }
        
        // Converter distância
        const distancia = parseFloat(distanciaStr.replace(',', '.'));
        
        if (isNaN(azimute) || isNaN(distancia)) {
            showMessage('Valores inválidos para azimute/rumo ou distância', 'error');
            return;
        }
        
        // Calcular coordenadas do novo vértice
        const x0 = verticePartida.e;
        const y0 = verticePartida.n;
        
        const azRad = azimute * Math.PI / 180;
        const novoE = x0 + distancia * Math.sin(azRad);
        const novoN = y0 + distancia * Math.cos(azRad);
        
        // Adicionar vértice após o vértice de partida
        terraLayer.addVertex(novoId, novoE, novoN, verticePartidaIndex + 1);
        
        showMessage(`Vértice ${novoId} adicionado com sucesso!`, 'success');
        closeModal('modal-adicionar-vertice-azimute');
        
    } catch (error) {
        showMessage(`Erro ao adicionar vértice: ${error.message}`, 'error');
    }
}

// Funções auxiliares para parsing
function parseAzimute(azStr) {
    // Aceita formato: 45°30'15" ou 45.5042
    azStr = azStr.trim();
    
    // Se já é decimal
    if (!azStr.includes('°') && !azStr.includes("'")) {
        return parseFloat(azStr.replace(',', '.'));
    }
    
    // Formato DMS (graus, minutos, segundos)
    const match = azStr.match(/(\d+)[°º]\s*(\d+)?['′]?\s*(\d+(?:[.,]\d+)?)?["″]?/);
    if (match) {
        const graus = parseFloat(match[1]);
        const minutos = match[2] ? parseFloat(match[2]) : 0;
        const segundos = match[3] ? parseFloat(match[3].replace(',', '.')) : 0;
        
        return graus + minutos / 60 + segundos / 3600;
    }
    
    throw new Error('Formato de azimute inválido');
}

function parseRumoComQuadrante(rumoStr, quadrante) {
    // Converte rumo + quadrante para azimute
    const rumo = parseAzimute(rumoStr); // Reutiliza parser de azimute
    
    // Validar quadrante
    const quadrantesValidos = ['NE', 'SE', 'SW', 'NW', 'NO'];
    if (!quadrantesValidos.includes(quadrante)) {
        throw new Error('Quadrante inválido. Use: NE, SE, SW ou NW');
    }
    
    // Converter para azimute
    let azimute;
    switch (quadrante) {
        case 'NE':
            azimute = rumo;
            break;
        case 'SE':
            azimute = 180 - rumo;
            break;
        case 'SW':
        case 'NO':
            azimute = 180 + rumo;
            break;
        case 'NW':
            azimute = 360 - rumo;
            break;
    }
    
    return azimute;
}

// ===== REMOVER VÉRTICES (MAPA) =====
function ativarRemoverVerticesMapa() {
    if (removerVerticesMapaAtivo) {
        desativarRemoverVerticesMapa();
        return;
    }
    
    // Desativar outras ferramentas
    desativarTodasFerramentasEdicao();
    
    removerVerticesMapaAtivo = true;
    updateToolIndicator('Remover Vértices (Mapa)');
    
    // *** CORREÇÃO: Adicionar evento de clique nos marcadores ***
    Object.values(terraManager.layers).forEach(terraLayer => {
        terraLayer.verticesLayer.eachLayer(marker => {
            // Apenas processar Markers (não labels)
            if (marker instanceof L.Marker && marker._vertexIndex !== undefined) {
                marker.on('click', function(e) {
                    if (!removerVerticesMapaAtivo) return;
                    
                    L.DomEvent.stopPropagation(e); // Evitar propagação para o mapa
                    
                    const vertexIndex = marker._vertexIndex;
                    const vertexId = marker._vertexId;
                    const terraLayer = marker._terraLayer;
                    
                    // *** CORREÇÃO: Validar mínimo de 3 vértices ***
                    if (terraLayer.vertices.length <= 3) {
                        showMessage('Não é possível remover. Mínimo de 3 vértices.', 'error');
                        return;
                    }
                    
                    // *** CORREÇÃO: Confirmar remoção ***
                    if (confirm(`Remover vértice '${vertexId}'?\n\nEsta ação é irreversível.`)) {
                        // Remover vértice
                        terraLayer.removeVertex(vertexIndex);
                        
                        // Sincronizar
                        terraLayer.syncGeometry();
                        terraLayer.updateVerticesLayer();
                        
                        showMessage(`Vértice '${vertexId}' removido com sucesso!`, 'success');
                        
                        // *** CORREÇÃO: Desativar ferramenta após remover ***
                        desativarRemoverVerticesMapa();
                    }
                });
                
                // Mudar cursor para indicar clicável
                const element = marker.getElement();
                if (element) {
                    element.style.cursor = 'pointer';
                }
            }
        });
    });
}

function desativarRemoverVerticesMapa() {
    removerVerticesMapaAtivo = false;
    
    // Remover eventos de clique e restaurar cursor
    Object.values(terraManager.layers).forEach(terraLayer => {
        terraLayer.verticesLayer.eachLayer(marker => {
            if (marker instanceof L.Marker && marker._vertexIndex !== undefined) {
                marker.off('click');
                const element = marker.getElement();
                if (element) {
                    element.style.cursor = '';
                }
            }
        });
    });
    
    updateToolIndicator(null);
}

// ===== RENOMEAR VÉRTICE (MAPA) =====
function ativarRenomearVerticeMapa() {
    if (renomearVerticeMapaAtivo) {
        desativarRenomearVerticeMapa();
        return;
    }
    
    // Desativar outras ferramentas
    desativarTodasFerramentasEdicao();
    
    renomearVerticeMapaAtivo = true;
    updateToolIndicator('Renomear Vértice (Mapa)');
    
    // *** CORREÇÃO: Implementar lógica de renomear vértice ***
    Object.values(terraManager.layers).forEach(terraLayer => {
        terraLayer.verticesLayer.eachLayer(marker => {
            // Apenas processar Markers (não labels)
            if (marker instanceof L.Marker && marker._vertexIndex !== undefined) {
                marker.on('click', function(e) {
                    if (!renomearVerticeMapaAtivo) return;
                    
                    L.DomEvent.stopPropagation(e); // Evitar propagação para o mapa
                    
                    const vertexIndex = marker._vertexIndex;
                    const vertexId = marker._vertexId;
                    const terraLayer = marker._terraLayer;
                    
                    // *** CORREÇÃO: Mostrar prompt para novo nome ***
                    const novoNome = prompt(`Renomear vértice '${vertexId}'\n\nNovo nome:`, vertexId);
                    
                    if (novoNome && novoNome !== vertexId) {
                        // Renomear vértice
                        terraLayer.renameVertex(vertexIndex, novoNome);
                        
                        showMessage(`Vértice renomeado de '${vertexId}' para '${novoNome}'!`, 'success');
                        
                        // *** CORREÇÃO: Desativar ferramenta após renomear ***
                        desativarRenomearVerticeMapa();
                    } else if (novoNome === vertexId) {
                        showMessage('Nome não alterado.', 'info');
                        desativarRenomearVerticeMapa();
                    }
                });
                
                // Mudar cursor para indicar clicável
                const element = marker.getElement();
                if (element) {
                    element.style.cursor = 'pointer';
                }
            }
        });
    });
}

function desativarRenomearVerticeMapa() {
    renomearVerticeMapaAtivo = false;
    
    // Remover eventos de clique e restaurar cursor
    Object.values(terraManager.layers).forEach(terraLayer => {
        terraLayer.verticesLayer.eachLayer(marker => {
            if (marker instanceof L.Marker && marker._vertexIndex !== undefined) {
                marker.off('click');
                const element = marker.getElement();
                if (element) {
                    element.style.cursor = '';
                }
            }
        });
    });
    
    updateToolIndicator(null);
}

// ===== MOVER GEOMETRIA =====
function openMoverGeometriaDialog() {
    // Carregar camadas TerraLayer no select
    const select = document.getElementById('mover-geometria-camada');
    select.innerHTML = '<option value="">Selecione uma camada</option>';
    
    Object.keys(terraManager.layers).forEach(layerName => {
        const option = document.createElement('option');
        option.value = layerName;
        option.textContent = layerName;
        select.appendChild(option);
    });
    
    // Limpar campos
    document.getElementById('mover-geometria-dx').value = '';
    document.getElementById('mover-geometria-dy').value = '';
    
    openModal('modal-mover-geometria');
}

function aplicarMoverGeometria() {
    const layerName = document.getElementById('mover-geometria-camada').value;
    const dx = parseFloat_BR(document.getElementById('mover-geometria-dx').value);
    const dy = parseFloat_BR(document.getElementById('mover-geometria-dy').value);
    
    if (!layerName) {
        showMessage('Selecione uma camada', 'error');
        return;
    }
    
    if (isNaN(dx) || isNaN(dy)) {
        showMessage('Informe valores válidos para dx e dy', 'error');
        return;
    }
    
    const terraLayer = terraManager.layers[layerName];
    if (!terraLayer) {
        showMessage('Camada não encontrada', 'error');
        return;
    }
    
    try {
        // Mover TODOS os vértices da geometria
        terraLayer.vertices.forEach((vertex, index) => {
            const novoE = vertex.e + dx;
            const novoN = vertex.n + dy;
            
            // Usar moveVertex que já sincroniza vértices globais
            terraLayer.moveVertex(index, novoE, novoN);
        });
        
        showMessage(`Geometria ${layerName} movida com sucesso! (dx=${dx.toFixed(3)}m, dy=${dy.toFixed(3)}m)`, 'success');
        closeModal('modal-mover-geometria');
        
    } catch (error) {
        showMessage(`Erro ao mover geometria: ${error.message}`, 'error');
    }
}

// ===== MOVER GEOMETRIA (MAPA) =====
let moverGeometriaMapaAtivo = false;
let geometriaSelecionada = null;
let geometriaOriginal = null;
let pontoInicial = null;
let previewLayer = null;

function ativarMoverGeometriaMapa() {
    if (moverGeometriaMapaAtivo) {
        desativarMoverGeometriaMapa();
        return;
    }
    
    // Verificar se há geometrias disponíveis
    const geometriasDisponiveis = Object.keys(terraManager.layers);
    if (geometriasDisponiveis.length === 0) {
        showMessage('Nenhuma geometria disponível para mover.', 'warning');
        return;
    }
    
    // Desativar outras ferramentas
    desativarTodasFerramentasEdicao();
    
    moverGeometriaMapaAtivo = true;
    geometriaSelecionada = null;
    updateToolIndicator('Mover Geometria (Mapa)');
    
    // Criar dropdown para seleção de geometria
    const dropdown = document.createElement('select');
    dropdown.id = 'moverGeometriaDropdown';
    dropdown.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 10000; padding: 10px; font-size: 16px; background: white; border: 2px solid #007bff; border-radius: 5px;';
    
    const optionDefault = document.createElement('option');
    optionDefault.value = '';
    optionDefault.textContent = '-- Selecione a geometria para mover --';
    dropdown.appendChild(optionDefault);
    
    geometriasDisponiveis.forEach(layerName => {
        const option = document.createElement('option');
        option.value = layerName;
        option.textContent = layerName;
        dropdown.appendChild(option);
    });
    
    dropdown.addEventListener('change', function() {
        if (this.value) {
            selecionarGeometriaParaMover(this.value);
            this.remove();
        }
    });
    
    document.body.appendChild(dropdown);
}

function selecionarGeometriaParaMover(layerName) {
    geometriaSelecionada = terraManager.layers[layerName];
    
    if (!geometriaSelecionada) {
        showMessage('Geometria não encontrada.', 'error');
        desativarMoverGeometriaMapa();
        return;
    }
    
    // Salvar coordenadas originais
    geometriaOriginal = geometriaSelecionada.vertices.map(v => ({e: v.e, n: v.n}));
    
    // Definir ponto inicial como centro da geometria
    const primeiroVertice = geometriaSelecionada.vertices[0];
    pontoInicial = utmToLatLng(primeiroVertice.e, primeiroVertice.n, geometriaSelecionada.fuso);
    
    // Desabilitar popups de todas as geometrias
    Object.values(terraManager.layers).forEach(tl => {
        if (tl.geometryLayer) {
            tl.geometryLayer.closePopup();
            tl.geometryLayer.unbindPopup();
        }
    });
    
    // Criar preview layer
    const coordsOriginais = geometriaSelecionada.vertices.map(v => 
        utmToLatLng(v.e, v.n, geometriaSelecionada.fuso)
    );
    
    previewLayer = L.polygon(coordsOriginais, {
        color: 'red',
        weight: 2,
        dashArray: '5, 5',
        fillOpacity: 0.1
    }).addTo(map);
    
    showMessage('Geometria "' + layerName + '" selecionada. Mova o mouse para posicionar. Clique para fixar. ESC para cancelar.', 'success');
    
    // Adicionar evento de clique no mapa
    map.on('click', onMapClickMoverGeometria);
    map.on('mousemove', onMapMouseMoveMoverGeometria);
}



function desativarMoverGeometriaMapa() {
    if (!moverGeometriaMapaAtivo) return;
    
    moverGeometriaMapaAtivo = false;
    geometriaSelecionada = null;
    geometriaOriginal = null;
    pontoInicial = null;
    
    // Remover preview
    if (previewLayer) {
        map.removeLayer(previewLayer);
        previewLayer = null;
    }
    
    // Remover eventos
    map.off('click', onMapClickMoverGeometria);
    map.off('mousemove', onMapMouseMoveMoverGeometria);
    
    Object.values(terraManager.layers).forEach(terraLayer => {
        if (terraLayer.polygon) {
            terraLayer.polygon.off('click', onPolygonClickMoverGeometria);
        }
        // Restaurar popups
        if (terraLayer.geometryLayer) {
            const layerName = terraLayer.type === 'polygon' ? 
                `${terraLayer.name}_Poligono` : `${terraLayer.name}_Polilinha`;
            terraLayer.geometryLayer.bindPopup(`<b>${layerName}</b>`);
        }
    });
    
    updateToolIndicator(null);
}

function onPolygonClickMoverGeometria(e) {
    L.DomEvent.stopPropagation(e);
    
    if (!moverGeometriaMapaAtivo) return;
    
    if (!geometriaSelecionada) {
        // Primeiro clique - selecionar geometria
        const clickedPolygon = e.target;
        
        // Encontrar TerraLayer correspondente
        for (const [layerName, terraLayer] of Object.entries(terraManager.layers)) {
            if (terraLayer.polygon === clickedPolygon) {
                geometriaSelecionada = terraLayer;
                pontoInicial = e.latlng;
                
                // Salvar coordenadas originais
                geometriaOriginal = terraLayer.vertices.map(v => ({e: v.e, n: v.n}));
                
                // Criar preview
                const coords = terraLayer.vertices.map(v => {
                    const utm = {e: v.e, n: v.n};
                    return utmToLatLng(utm.e, utm.n, terraLayer.fuso);
                });
                
                previewLayer = L.polygon(coords, {
                    color: 'red',
                    weight: 2,
                    fillOpacity: 0.2,
                    dashArray: '5, 5'
                }).addTo(map);
                
                showMessage(`Geometria ${layerName} selecionada. Mova o mouse e clique para fixar.`, 'info');
                break;
            }
        }
    } else {
        // Segundo clique - fixar posição
        fixarGeometriaNovaPosicao(e.latlng);
    }
}

function onMapClickMoverGeometria(e) {
    if (!moverGeometriaMapaAtivo) return;
    
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    
    if (geometriaSelecionada) {
        // Segundo clique no mapa - fixar posição
        fixarGeometriaNovaPosicao(e.latlng);
    }
}

function onMapMouseMoveMoverGeometria(e) {
    if (!moverGeometriaMapaAtivo || !geometriaSelecionada || !previewLayer) return;
    
    // Atualizar preview conforme movimento do mouse
    const pontoAtual = e.latlng;
    
    // Calcular deslocamento em LatLng
    const dLat = pontoAtual.lat - pontoInicial.lat;
    const dLng = pontoAtual.lng - pontoInicial.lng;
    
    // Atualizar preview
    const novasCoords = geometriaOriginal.map(v => {
        const latlng = utmToLatLng(v.e, v.n, geometriaSelecionada.fuso);
        return [latlng.lat + dLat, latlng.lng + dLng];
    });
    
    previewLayer.setLatLngs(novasCoords);
}

function fixarGeometriaNovaPosicao(pontoFinal) {
    if (!geometriaSelecionada) return;
    
    // Converter pontos para UTM para calcular dx, dy preciso
    const inicialUTM = latLngToUTM(pontoInicial.lat, pontoInicial.lng, geometriaSelecionada.fuso);
    const finalUTM = latLngToUTM(pontoFinal.lat, pontoFinal.lng, geometriaSelecionada.fuso);
    
    const dx = finalUTM.e - inicialUTM.e;
    const dy = finalUTM.n - inicialUTM.n;
    
    // Mover todos os vértices
    geometriaSelecionada.vertices.forEach((vertex, index) => {
        const novoE = geometriaOriginal[index].e + dx;
        const novoN = geometriaOriginal[index].n + dy;
        geometriaSelecionada.moveVertex(index, novoE, novoN);
    });
    
    showMessage(`Geometria movida com sucesso! (dx=${dx.toFixed(3)}m, dy=${dy.toFixed(3)}m)`, 'success');
    
    // Desativar ferramenta
    desativarMoverGeometriaMapa();
}

// ===== COPIAR GEOMETRIA (MAPA) =====
function ativarCopiarGeometriaMapa() {
    if (copiarGeometriaMapaAtivo) {
        desativarCopiarGeometriaMapa();
        return;
    }
    
    // Desativar outras ferramentas
    desativarTodasFerramentasEdicao();
    
    copiarGeometriaMapaAtivo = true;
    updateToolIndicator('Copiar Geometria (Mapa)');
    
    // Implementar lógica de copiar geometria
}

function desativarCopiarGeometriaMapa() {
    copiarGeometriaMapaAtivo = false;
    updateToolIndicator(null);
}

// ===== ROTACIONAR GEOMETRIA =====
// Função openRotacionarGeometriaDialog() está implementada em rotacionar-geometria.js

// ===== FECHAR POLÍGONO =====
function ativarFecharPoligono() {
    if (fecharPoligonoAtivo) {
        desativarFecharPoligono();
        return;
    }
    
    // Desativar outras ferramentas
    desativarTodasFerramentasEdicao();
    
    fecharPoligonoAtivo = true;
    updateToolIndicator('Fechar Polígono');
    
    // Implementar lógica de fechar polígono
}

function desativarFecharPoligono() {
    fecharPoligonoAtivo = false;
    updateToolIndicator(null);
}

// ===== DESATIVAR TODAS AS FERRAMENTAS DE EDIÇÃO =====
function desativarTodasFerramentasEdicao() {
    if (moverVerticesMapaAtivo) desativarMoverVerticesMapa();
    if (adicionarVerticesMapaAtivo) desativarAdicionarVerticesMapa();
    if (removerVerticesMapaAtivo) desativarRemoverVerticesMapa();
    if (renomearVerticeMapaAtivo) desativarRenomearVerticeMapa();
    if (copiarGeometriaMapaAtivo) desativarCopiarGeometriaMapa();
    if (fecharPoligonoAtivo) desativarFecharPoligono();
}

// Listener para ESC desativar ferramentas
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        desativarTodasFerramentasEdicao();
    }
});




// ========================================
// FUNÇÕES PARA MENUS SUPERIORES
// ========================================

/**
 * Alterna a visibilidade dos menus dropdown superiores
 * @param {string} menuId - ID do menu dropdown a ser alternado
 */
function toggleTopMenu(menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    
    // Fechar todos os outros menus
    const allMenus = document.querySelectorAll('.top-dropdown');
    allMenus.forEach(m => {
        if (m.id !== menuId) {
            m.style.display = 'none';
        }
    });
    
    // Alternar o menu atual
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
}

/**
 * Fecha todos os menus dropdown quando clicar fora deles
 */
document.addEventListener('click', function(event) {
    // Verificar se o clique foi fora dos menus
    if (!event.target.closest('.menu-item')) {
        const allMenus = document.querySelectorAll('.top-dropdown');
        allMenus.forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

/**
 * Atualiza o indicador de ferramenta ativa
 * @param {string} toolName - Nome da ferramenta ativa
 */
function updateToolIndicator(toolName) {
    const indicator = document.getElementById('current-tool-name');
    if (indicator) {
        indicator.textContent = toolName || 'nenhuma';
    }
}



/**
 * Alterna a visibilidade dos submenus inline (hierárquicos)
 * @param {Event} event - Evento de clique
 * @param {string} submenuId - ID do submenu a ser alternado
 */
function toggleSubmenuInline(event, submenuId) {
    event.stopPropagation(); // Evitar que o clique feche o menu pai
    
    const submenu = document.getElementById(submenuId);
    if (!submenu) {
        console.error('Submenu não encontrado:', submenuId);
        return;
    }
    
    // Alternar o submenu
    if (submenu.style.display === 'none' || submenu.style.display === '') {
        submenu.style.display = 'block';
    } else {
        submenu.style.display = 'none';
    }
}

// ===== FUNÇÕES PARA POLILINHA =====

// Desenhar polilinha com vértices
function drawPolyline(coords, ids, layerName, fuso, colors = {}) {
    // Cores padrão
    const defaultColors = {
        line: '#ff8800',
        vertex: '#ff0000'
    };
    
    const lineColor = colors.line || defaultColors.line;
    const vertexColor = colors.vertex || defaultColors.vertex;
    
    // Criar TerraLayer do tipo polyline
    const terraLayer = new TerraLayer(layerName, 'polyline');
    terraLayer.fuso = fuso;
    terraLayer.color = lineColor;
    terraLayer.vertexColor = vertexColor;
    
    // Adicionar vértices
    coords.forEach(([e, n], i) => {
        const vertexId = ids && ids[i] ? ids[i] : `P-${String(i+1).padStart(2, '0')}`;
        terraLayer.addVertex(vertexId, e, n);
    });
    
    // Sincronizar geometria (cria polilinha e marcadores)
    terraLayer.syncGeometry();
    
    // Adicionar ao gerenciador
    const layerKey = terraManager.addLayer(terraLayer);
    
    // === COMPATIBILIDADE: Manter referência no sistema antigo ===
    // Isso permite que o painel de camadas continue funcionando
    const polyline = terraLayer.geometryLayer;
    const verticesLayer = terraLayer.verticesLayer;
    
    addLayer(layerKey, polyline, verticesLayer);
    
    // Armazenar referência à TerraLayer no sistema antigo
    if (layers[layerKey]) {
        layers[layerKey].terraLayer = terraLayer;
        layers[layerKey].coords = coords;
        layers[layerKey].ids = ids;
        layers[layerKey].fuso = fuso;
    }
    
    // Ajustar zoom
    if (polyline && polyline.getBounds) {
        map.fitBounds(polyline.getBounds());
    }
    
    showMessage(`Polilinha "${layerName}" criada com sucesso!`, 'success');
    updateToolIndicator('nenhuma');
}

// ===== FERRAMENTA: TABELA DE COORDENADAS UTM (POLILINHA) =====

function openPolylineCoordTableDialog() {
    openModal('modal-polyline-coord-table');
    
    // Adicionar 3 linhas iniciais se a tabela estiver vazia
    const tbody = document.getElementById('polyline-coord-table-body');
    if (tbody.rows.length === 0) {
        for (let i = 0; i < 3; i++) {
            addTableRow('polyline-coord-table-body', 3);
        }
    }
}

function createPolylineFromCoordTable() {
    const layerName = document.getElementById('polyline-coord-table-name').value.trim() || 'TT';
    const fuso = document.getElementById('polyline-coord-table-fuso').value;
    const tableData = getTableData('polyline-coord-table-body');
    
    const coords = [];
    const ids = [];
    
    for (const row of tableData) {
        if (row.length < 3) continue;
        
        try {
            const vId = row[0] || `P-${String(ids.length + 1).padStart(2, '0')}`;
            const e = parseFloat_BR(row[1]);
            const n = parseFloat_BR(row[2]);
            
            coords.push([e, n]);
            ids.push(vId);
        } catch (error) {
            console.error('Erro ao processar linha:', row, error);
        }
    }
    
    if (coords.length < 2) {
        showMessage('Polilinha precisa de pelo menos 2 coordenadas válidas', 'error');
        return;
    }
    
    // Obter cor selecionada
    const color = document.getElementById('polyline-coord-table-color').value;
    const colors = {
        line: color,
        vertex: color
    };
    
    drawPolyline(coords, ids, layerName, fuso, colors);
    closeModal('modal-polyline-coord-table');
}

// ===== FERRAMENTA: LISTA DE COORDENADAS UTM (POLILINHA) =====

function openPolylineCoordListDialog() {
    openModal('modal-polyline-coord-list');
}

function createPolylineFromCoordList() {
    const layerName = document.getElementById('polyline-coord-list-name').value.trim() || 'TT';
    const fuso = document.getElementById('polyline-coord-list-fuso').value;
    const coordText = document.getElementById('polyline-coord-list-input').value.trim();
    
    if (!coordText) {
        showMessage('Por favor, digite as coordenadas.', 'error');
        return;
    }
    
    const lines = coordText.split('\n').filter(line => line.trim());
    const coords = [];
    const ids = [];
    
    for (let line of lines) {
        try {
            const parts = parseLine(line, 3);
            const vId = parts[0];
            const e = parseFloat_BR(parts[1]);
            const n = parseFloat_BR(parts[2]);
            
            coords.push([e, n]);
            ids.push(vId);
        } catch (error) {
            console.error('Erro ao processar linha:', line, error);
        }
    }
    
    if (coords.length < 2) {
        showMessage('Polilinha precisa de pelo menos 2 coordenadas válidas', 'error');
        return;
    }
    
    // Obter cor selecionada
    const color = document.getElementById('polyline-coord-list-color').value;
    const colors = {
        line: color,
        vertex: color
    };
    
    drawPolyline(coords, ids, layerName, fuso, colors);
    closeModal('modal-polyline-coord-list');
}

// ===== FERRAMENTA: TABELA LAT/LONG (POLILINHA) =====

function openPolylineTabelaLatLongDialog() {
    openModal('modal-polyline-tabela-latlong');
    
    const tbody = document.getElementById('polyline-tabela-latlong-body');
    if (tbody.rows.length === 0) {
        for (let i = 0; i < 3; i++) {
            addTableRow('polyline-tabela-latlong-body', 3);
        }
    }
}

function createPolylineFromTabelaLatLong() {
    const layerName = document.getElementById('polyline-tabela-latlong-name').value.trim() || 'TT';
    const fuso = document.getElementById('polyline-tabela-latlong-fuso').value;
    const tableData = getTableData('polyline-tabela-latlong-body');
    
    const coords = [];
    const ids = [];
    
    for (const row of tableData) {
        if (row.length < 3) continue;
        
        try {
            const vId = row[0] || `P-${String(ids.length + 1).padStart(2, '0')}`;
            const latText = row[1];
            const lngText = row[2];
            
            const lat = dmsToDecimal(latText);
            const lng = dmsToDecimal(lngText);
            
            const [e, n] = latLngToUTM(lat, lng, fuso);
            
            coords.push([e, n]);
            ids.push(vId);
        } catch (error) {
            console.error('Erro ao processar linha:', row, error);
        }
    }
    
    if (coords.length < 2) {
        showMessage('Polilinha precisa de pelo menos 2 coordenadas válidas', 'error');
        return;
    }
    
    const color = document.getElementById('polyline-tabela-latlong-color').value;
    const colors = {
        line: color,
        vertex: color
    };
    
    drawPolyline(coords, ids, layerName, fuso, colors);
    closeModal('modal-polyline-tabela-latlong');
}

// ===== FERRAMENTA: LISTA LAT/LONG (POLILINHA) =====

function openPolylineListaLatLongDialog() {
    openModal('modal-polyline-lista-latlong');
}

function createPolylineFromListaLatLong() {
    const layerName = document.getElementById('polyline-lista-latlong-name').value.trim() || 'TT';
    const fuso = document.getElementById('polyline-lista-latlong-fuso').value;
    const coordText = document.getElementById('polyline-lista-latlong-input').value.trim();
    
    if (!coordText) {
        showMessage('Por favor, digite as coordenadas.', 'error');
        return;
    }
    
    const lines = coordText.split('\n').filter(line => line.trim());
    const coords = [];
    const ids = [];
    
    for (let line of lines) {
        try {
            const parts = parseLine(line, 3);
            const vId = parts[0];
            const latText = parts[1];
            const lngText = parts[2];
            
            const lat = dmsToDecimal(latText);
            const lng = dmsToDecimal(lngText);
            
            const [e, n] = latLngToUTM(lat, lng, fuso);
            
            coords.push([e, n]);
            ids.push(vId);
        } catch (error) {
            console.error('Erro ao processar linha:', line, error);
        }
    }
    
    if (coords.length < 2) {
        showMessage('Polilinha precisa de pelo menos 2 coordenadas válidas', 'error');
        return;
    }
    
    const color = document.getElementById('polyline-lista-latlong-color').value;
    const colors = {
        line: color,
        vertex: color
    };
    
    drawPolyline(coords, ids, layerName, fuso, colors);
    closeModal('modal-polyline-lista-latlong');
}

// ===== FERRAMENTA: AZIMUTE + DISTÂNCIA (POLILINHA) =====

function openPolylineAzimuthDialog() {
    openModal('modal-polyline-azimuth');
}

function createPolylineFromAzimuth() {
    const layerName = document.getElementById('polyline-azimuth-name').value.trim() || 'TT';
    const startE = parseFloat_BR(document.getElementById('polyline-azimuth-start-e').value);
    const startN = parseFloat_BR(document.getElementById('polyline-azimuth-start-n').value);
    
    // Ler dados da tabela
    const tableBody = document.getElementById('polyline-azimuth-table-body');
    const rows = tableBody.getElementsByTagName('tr');
    
    if (rows.length === 0) {
        showMessage('Por favor, adicione pelo menos uma linha na tabela.', 'error');
        return;
    }
    
    const coords = [[startE, startN]];
    const ids = ['P-00'];
    
    let currentE = startE;
    let currentN = startN;
    
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('input');
        if (cells.length < 3) continue;
        
        const vertexId = cells[0].value.trim();
        const distance = parseFloat_BR(cells[1].value);
        const azimuthDMS = cells[2].value.trim();
        
        if (!vertexId || !distance || !azimuthDMS) continue;
        
        try {
            const azimuthDec = dmsToDecimal(azimuthDMS);
            const azimuthRad = azimuthDec * Math.PI / 180;
            
            const deltaE = distance * Math.sin(azimuthRad);
            const deltaN = distance * Math.cos(azimuthRad);
            
            currentE += deltaE;
            currentN += deltaN;
            
            coords.push([currentE, currentN]);
            ids.push(vertexId);
        } catch (error) {
            console.error('Erro ao processar linha:', i, error);
        }
    }
    
    if (coords.length < 2) {
        showMessage('Polilinha precisa de pelo menos 2 pontos', 'error');
        return;
    }
    
    const color = document.getElementById('polyline-azimuth-color').value;
    const colors = {
        line: color,
        vertex: color
    };
    
    drawPolyline(coords, ids, layerName, fuso, colors);
    closeModal('modal-polyline-azimuth');
}

// ===== FERRAMENTA: RUMO + DISTÂNCIA (POLILINHA) =====

function openPolylineBearingDialog() {
    openModal('modal-polyline-bearing');
}

function createPolylineFromBearing() {
    const layerName = document.getElementById('polyline-bearing-name').value.trim() || 'TT';
    const startE = parseFloat_BR(document.getElementById('polyline-bearing-start-e').value);
    const startN = parseFloat_BR(document.getElementById('polyline-bearing-start-n').value);
    
    // Ler dados da tabela
    const tableBody = document.getElementById('polyline-bearing-table-body');
    const rows = tableBody.getElementsByTagName('tr');
    
    if (rows.length === 0) {
        showMessage('Por favor, adicione pelo menos uma linha na tabela.', 'error');
        return;
    }
    
    const coords = [[startE, startN]];
    const ids = ['P-00'];
    
    let currentE = startE;
    let currentN = startN;
    
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('input');
        if (cells.length < 4) continue;
        
        const vertexId = cells[0].value.trim();
        const distance = parseFloat_BR(cells[1].value);
        const rumo = cells[2].value.trim();
        const quadrante = cells[3].value.trim().toUpperCase();
        
        if (!vertexId || !distance || !rumo || !quadrante) continue;
        
        try {
            const bearingText = `${quadrante} ${rumo}`;
            const azimuthDec = bearingToAzimuth(bearingText);
            const azimuthRad = azimuthDec * Math.PI / 180;
            
            const deltaE = distance * Math.sin(azimuthRad);
            const deltaN = distance * Math.cos(azimuthRad);
            
            currentE += deltaE;
            currentN += deltaN;
            
            coords.push([currentE, currentN]);
            ids.push(vertexId);
        } catch (error) {
            console.error('Erro ao processar linha:', i, error);
        }
    }
    
    if (coords.length < 2) {
        showMessage('Polilinha precisa de pelo menos 2 pontos', 'error');
        return;
    }
    
    const color = document.getElementById('polyline-bearing-color').value;
    const colors = {
        line: color,
        vertex: color
    };
    
    drawPolyline(coords, ids, layerName, fuso, colors);
    closeModal('modal-polyline-bearing');
}

// ==========================================
// DESENHO À MÃO LIVRE
// ==========================================

let freehandDrawingActive = false;
let freehandPoints = [];
let freehandConfig = null;
let freehandMarkers = [];
let freehandPolyline = null;

function openFreehandDrawingDialog(type) {
    // Setar tipo no campo hidden
    if (type === 'polygon' || type === 'polyline') {
        document.getElementById('freehand-type').value = type;
    }
    
    openModal('modal-freehand-drawing');
}

function startFreehandDrawing() {
    // Obter configurações
    const layerName = document.getElementById('freehand-layer-name').value.trim();
    const firstVertex = document.getElementById('freehand-first-vertex').value.trim();
    const color = document.getElementById('freehand-color').value;
    const type = document.getElementById('freehand-type').value;
    
    // Validar
    if (!layerName) {
        alert('Por favor, informe o nome da camada.');
        return;
    }
    
    if (!firstVertex) {
        alert('Por favor, informe o nome do primeiro vértice.');
        return;
    }
    
    // Salvar configuração
    freehandConfig = {
        layerName: layerName,
        firstVertex: firstVertex,
        color: color,
        type: type
    };
    
    // Limpar desenho anterior
    freehandPoints = [];
    freehandMarkers.forEach(marker => map.removeLayer(marker));
    freehandMarkers = [];
    if (freehandPolyline) {
        map.removeLayer(freehandPolyline);
        freehandPolyline = null;
    }
    
    // Ativar modo de desenho
    freehandDrawingActive = true;
    updateToolIndicator(`Desenho à Mão Livre (${type === 'polygon' ? 'Polígono' : 'Polilinha'})`);
    
    // Fechar modal
    closeModal('modal-freehand-drawing');
    
    // Mostrar instruções
    alert(`Desenho à mão livre ativado!\n\nClique no mapa para adicionar pontos.\nClique duplo para finalizar o desenho.\n\nMínimo: ${type === 'polygon' ? '3 pontos' : '2 pontos'}`);
}

function handleFreehandMapClick(e) {
    if (!freehandDrawingActive) return;
    
    // Adicionar ponto
    freehandPoints.push(e.latlng);
    
    // Adicionar marcador
    const marker = L.circleMarker(e.latlng, {
        radius: 5,
        fillColor: freehandConfig.color,
        color: '#000',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
    
    freehandMarkers.push(marker);
    
    // Atualizar linha de visualização
    if (freehandPolyline) {
        map.removeLayer(freehandPolyline);
    }
    
    if (freehandPoints.length > 1) {
        freehandPolyline = L.polyline(freehandPoints, {
            color: freehandConfig.color,
            weight: 2,
            opacity: 0.7
        }).addTo(map);
    }
    
    console.log(`Ponto ${freehandPoints.length} adicionado`);
}

function handleFreehandMapDblClick(e) {
    if (!freehandDrawingActive) return;
    
    // Prevenir que o último clique seja adicionado duas vezes
    e.originalEvent.preventDefault();
    
    // Validar número mínimo de pontos
    const minPoints = freehandConfig.type === 'polygon' ? 3 : 2;
    
    if (freehandPoints.length < minPoints) {
        alert(`É necessário pelo menos ${minPoints} pontos para criar ${freehandConfig.type === 'polygon' ? 'um polígono' : 'uma polilinha'}.`);
        return;
    }
    
    // Finalizar desenho
    finalizeFreehandDrawing();
}

function finalizeFreehandDrawing() {
    if (freehandPoints.length === 0) return;
    
    // Remover marcadores e linha temporária
    freehandMarkers.forEach(marker => map.removeLayer(marker));
    freehandMarkers = [];
    if (freehandPolyline) {
        map.removeLayer(freehandPolyline);
        freehandPolyline = null;
    }
    
    // Criar geometria
    if (freehandConfig.type === 'polygon') {
        createFreehandPolygon();
    } else {
        createFreehandPolyline();
    }
    
    // Desativar modo de desenho
    freehandDrawingActive = false;
    updateToolIndicator('nenhuma');
    
    // Limpar
    freehandPoints = [];
    freehandConfig = null;
}

function createFreehandPolygon() {
    // Extrair coordenadas
    const coords = freehandPoints.map(latlng => [latlng.lat, latlng.lng]);
    
    // Criar IDs dos vértices
    const ids = [];
    const firstVertexName = freehandConfig.firstVertex;
    const match = firstVertexName.match(/^([A-Za-z-]+)(\d+)$/);
    
    if (match) {
        const prefix = match[1];
        let num = parseInt(match[2]);
        for (let i = 0; i < coords.length; i++) {
            ids.push(`${prefix}${String(num).padStart(match[2].length, '0')}`);
            num++;
        }
    } else {
        for (let i = 0; i < coords.length; i++) {
            ids.push(`${firstVertexName}-${i + 1}`);
        }
    }
    
    // Usar função existente para desenhar polígono
    const layerName = `${freehandConfig.layerName}_Poligono`;
    drawPolygon(coords, ids, layerName, freehandConfig.color);
    
    console.log(`Polígono criado: ${layerName} com ${coords.length} vértices`);
}

function createFreehandPolyline() {
    // Extrair coordenadas
    const coords = freehandPoints.map(latlng => [latlng.lat, latlng.lng]);
    
    // Criar IDs dos vértices
    const ids = [];
    const firstVertexName = freehandConfig.firstVertex;
    const match = firstVertexName.match(/^([A-Za-z-]+)(\d+)$/);
    
    if (match) {
        const prefix = match[1];
        let num = parseInt(match[2]);
        for (let i = 0; i < coords.length; i++) {
            ids.push(`${prefix}${String(num).padStart(match[2].length, '0')}`);
            num++;
        }
    } else {
        for (let i = 0; i < coords.length; i++) {
            ids.push(`${firstVertexName}-${i + 1}`);
        }
    }
    
    // Usar função existente para desenhar polilinha
    const layerName = `${freehandConfig.layerName}_Polilinha`;
    drawPolyline(coords, ids, layerName, freehandConfig.color);
    
    console.log(`Polilinha criada: ${layerName} com ${coords.length} vértices`);
}


