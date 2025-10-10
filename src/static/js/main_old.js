// TerraGIS - Main JavaScript
// Variáveis globais
let map;
let drawnItems;
let currentProject = null;
let currentLayer = null;
let currentTool = null;
let drawControl;
let editableLayers = {};

// Inicializar mapa
function initMap() {
    // Criar mapa centrado no Brasil
    map = L.map('map', {
        center: [-15.7801, -47.9292],
        zoom: 4,
        zoomControl: true
    });

    // Adicionar camada base
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Camada para desenhos
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Configurar controles de desenho
    setupDrawControls();

    // Eventos do mapa
    map.on('mousemove', updateCursorCoordinates);
    map.on('click', handleMapClick);

    // Eventos de desenho
    map.on(L.Draw.Event.CREATED, function (event) {
        const layer = event.layer;
        const type = event.layerType;
        
        drawnItems.addLayer(layer);
        
        // Calcular e exibir informações
        if (type === 'polygon') {
            calculatePolygonInfo(layer);
        } else if (type === 'polyline') {
            calculateLineInfo(layer);
        }
        
        // Salvar feature
        saveFeature(layer, type);
    });

    map.on(L.Draw.Event.EDITED, function (event) {
        const layers = event.layers;
        layers.eachLayer(function (layer) {
            updateFeature(layer);
            
            // Atualizar informações
            if (layer instanceof L.Polygon) {
                calculatePolygonInfo(layer);
            } else if (layer instanceof L.Polyline) {
                calculateLineInfo(layer);
            }
        });
    });

    map.on(L.Draw.Event.DELETED, function (event) {
        const layers = event.layers;
        layers.eachLayer(function (layer) {
            deleteFeature(layer);
        });
    });
}

// Configurar controles de desenho
function setupDrawControls() {
    drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
            polygon: {
                allowIntersection: false,
                showArea: true,
                metric: true
            },
            polyline: {
                metric: true
            },
            rectangle: false,
            circle: false,
            marker: true,
            circlemarker: false
        },
        edit: {
            featureGroup: drawnItems,
            remove: true
        }
    });
    
    map.addControl(drawControl);
}

// Atualizar coordenadas do cursor
function updateCursorCoordinates(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    document.getElementById('cursor-coords').textContent = `${lat}, ${lng}`;
}

// Handler de clique no mapa
function handleMapClick(e) {
    // Implementar lógica específica se necessário
}

// Calcular informações do polígono
function calculatePolygonInfo(layer) {
    const latlngs = layer.getLatLngs()[0];
    
    // Usar Turf.js para cálculos precisos
    const polygon = turf.polygon([latlngs.map(ll => [ll.lng, ll.lat])]);
    const area = turf.area(polygon);
    const perimeter = turf.length(turf.polygonToLine(polygon), {units: 'meters'});
    
    // Atualizar UI
    document.getElementById('current-area').textContent = `${area.toFixed(2)} m²`;
    document.getElementById('current-perimeter').textContent = `${perimeter.toFixed(2)} m`;
    
    // Adicionar popup
    layer.bindPopup(`
        <strong>Polígono</strong><br>
        Área: ${area.toFixed(2)} m²<br>
        Perímetro: ${perimeter.toFixed(2)} m
    `);
}

// Calcular informações da linha
function calculateLineInfo(layer) {
    const latlngs = layer.getLatLngs();
    
    // Usar Turf.js para cálculo de comprimento
    const line = turf.lineString(latlngs.map(ll => [ll.lng, ll.lat]));
    const length = turf.length(line, {units: 'meters'});
    
    // Atualizar UI
    document.getElementById('current-perimeter').textContent = `${length.toFixed(2)} m`;
    
    // Adicionar popup
    layer.bindPopup(`
        <strong>Linha</strong><br>
        Comprimento: ${length.toFixed(2)} m
    `);
}

// Ativar ferramenta
function activateTool(tool) {
    // Desativar ferramenta anterior
    if (currentTool) {
        document.getElementById(currentTool)?.classList.remove('active');
    }
    
    currentTool = tool;
    
    // Ativar nova ferramenta
    const toolBtn = document.getElementById(tool) || document.getElementById(`draw-${tool}`);
    if (toolBtn) {
        toolBtn.classList.add('active');
    }
    
    // Atualizar UI
    const toolNames = {
        'polygon': 'Desenhar Polígono',
        'line': 'Desenhar Linha',
        'point': 'Desenhar Ponto',
        'freehand': 'Desenho Livre',
        'edit': 'Editar Geometria',
        'delete': 'Deletar Geometria',
        'measure-area': 'Medir Área',
        'measure-distance': 'Medir Distância'
    };
    
    document.getElementById('current-tool').textContent = toolNames[tool] || tool;
    
    // Implementar lógica da ferramenta
    switch(tool) {
        case 'polygon':
            new L.Draw.Polygon(map, drawControl.options.polygon).enable();
            break;
        case 'line':
            new L.Draw.Polyline(map, drawControl.options.polyline).enable();
            break;
        case 'point':
            new L.Draw.Marker(map, drawControl.options.marker).enable();
            break;
        case 'edit':
            new L.EditToolbar.Edit(map, {
                featureGroup: drawnItems
            }).enable();
            break;
        case 'delete':
            new L.EditToolbar.Delete(map, {
                featureGroup: drawnItems
            }).enable();
            break;
        case 'measure-area':
            enableMeasureArea();
            break;
        case 'measure-distance':
            enableMeasureDistance();
            break;
    }
}

// Habilitar medição de área
function enableMeasureArea() {
    showNotification('Clique no mapa para desenhar um polígono e medir a área');
    new L.Draw.Polygon(map, {
        ...drawControl.options.polygon,
        showArea: true
    }).enable();
}

// Habilitar medição de distância
function enableMeasureDistance() {
    showNotification('Clique no mapa para desenhar uma linha e medir a distância');
    new L.Draw.Polyline(map, drawControl.options.polyline).enable();
}

// Mostrar coordenadas
function showCoordinates() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    
    alert(`
        Coordenadas do Centro:
        Latitude: ${center.lat.toFixed(6)}
        Longitude: ${center.lng.toFixed(6)}
        Zoom: ${zoom}
    `);
}

// Projeto
function newProject() {
    openModal('modal-new-project');
}

function createProject() {
    const name = document.getElementById('project-name-input').value;
    const fuso = document.getElementById('fuso-utm-select').value;
    
    if (!name || !fuso) {
        showNotification('Preencha todos os campos', 'error');
        return;
    }
    
    fetch('/api/project/new', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, fuso_utm: fuso})
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            currentProject = data.project;
            document.getElementById('project-name').textContent = name;
            closeModal('modal-new-project');
            showNotification('Projeto criado com sucesso!');
            
            // Limpar campos
            document.getElementById('project-name-input').value = '';
            document.getElementById('fuso-utm-select').value = '';
        } else {
            showNotification(data.error, 'error');
        }
    });
}

function saveProject() {
    if (!currentProject || !currentProject.name) {
        showNotification('Nenhum projeto aberto', 'error');
        return;
    }
    
    fetch('/api/project/save', {
        method: 'POST'
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentProject.name}.terragis`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        showNotification('Projeto salvo com sucesso!');
    })
    .catch(err => {
        showNotification('Erro ao salvar projeto', 'error');
    });
}

function openProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.terragis';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);
        
        fetch('/api/project/open', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                currentProject = data.project;
                document.getElementById('project-name').textContent = data.project.name;
                loadProjectLayers(data.project);
                showNotification('Projeto aberto com sucesso!');
            } else {
                showNotification(data.error, 'error');
            }
        });
    };
    input.click();
}

// Camadas
function addLayer() {
    openModal('modal-new-layer');
}

function createLayer() {
    const name = document.getElementById('layer-name-input').value;
    const type = document.getElementById('layer-type-select').value;
    const color = document.getElementById('layer-color-input').value;
    
    if (!name) {
        showNotification('Digite um nome para a camada', 'error');
        return;
    }
    
    const layerId = 'layer_' + Date.now();
    
    fetch('/api/layer/add', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            id: layerId,
            name,
            type,
            color,
            fillColor: color
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            addLayerToUI(data.layer);
            currentLayer = data.layer;
            closeModal('modal-new-layer');
            showNotification('Camada criada com sucesso!');
            
            // Limpar campos
            document.getElementById('layer-name-input').value = '';
        } else {
            showNotification(data.error, 'error');
        }
    });
}

function addLayerToUI(layer) {
    const layersList = document.getElementById('layers-list');
    
    // Remover mensagem "nenhuma camada"
    const noLayers = layersList.querySelector('.no-layers');
    if (noLayers) noLayers.remove();
    
    const layerItem = document.createElement('div');
    layerItem.className = 'layer-item';
    layerItem.dataset.layerId = layer.id;
    layerItem.innerHTML = `
        <div class="layer-info">
            <div class="layer-color" style="background: ${layer.style.color}"></div>
            <span class="layer-name">${layer.name}</span>
        </div>
        <div class="layer-actions">
            <button class="layer-action-btn" onclick="toggleLayer('${layer.id}')" title="Mostrar/Ocultar">
                👁️
            </button>
            <button class="layer-action-btn" onclick="removeLayer('${layer.id}')" title="Remover">
                🗑️
            </button>
        </div>
    `;
    
    layersList.appendChild(layerItem);
    
    // Criar grupo de camada no mapa
    editableLayers[layer.id] = new L.FeatureGroup();
    map.addLayer(editableLayers[layer.id]);
}

function toggleLayer(layerId) {
    const layerGroup = editableLayers[layerId];
    if (!layerGroup) return;
    
    if (map.hasLayer(layerGroup)) {
        map.removeLayer(layerGroup);
    } else {
        map.addLayer(layerGroup);
    }
}

function removeLayer(layerId) {
    if (!confirm('Deseja realmente remover esta camada?')) return;
    
    fetch('/api/layer/delete', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: layerId})
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Remover do mapa
            const layerGroup = editableLayers[layerId];
            if (layerGroup) {
                map.removeLayer(layerGroup);
                delete editableLayers[layerId];
            }
            
            // Remover da UI
            const layerItem = document.querySelector(`[data-layer-id="${layerId}"]`);
            if (layerItem) layerItem.remove();
            
            showNotification('Camada removida');
        }
    });
}

function loadProjectLayers(project) {
    // Limpar camadas existentes
    Object.values(editableLayers).forEach(layer => {
        map.removeLayer(layer);
    });
    editableLayers = {};
    drawnItems.clearLayers();
    
    // Carregar camadas do projeto
    if (project.layers && project.layers.length > 0) {
        project.layers.forEach(layer => {
            addLayerToUI(layer);
            
            // Adicionar features ao mapa
            layer.features.forEach(feature => {
                const geoJsonLayer = L.geoJSON(feature.geometry, {
                    style: layer.style
                });
                editableLayers[layer.id].addLayer(geoJsonLayer);
            });
        });
    }
}

// Features
function saveFeature(layer, type) {
    if (!currentLayer) {
        showNotification('Selecione uma camada primeiro', 'error');
        return;
    }
    
    const featureId = 'feature_' + Date.now();
    const geometry = layer.toGeoJSON().geometry;
    
    fetch('/api/feature/add', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            layer_id: currentLayer.id,
            id: featureId,
            type,
            geometry
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            layer._featureId = featureId;
        }
    });
}

function updateFeature(layer) {
    if (!layer._featureId) return;
    
    const geometry = layer.toGeoJSON().geometry;
    
    fetch('/api/feature/update', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            layer_id: currentLayer.id,
            id: layer._featureId,
            geometry
        })
    });
}

function deleteFeature(layer) {
    if (!layer._featureId) return;
    
    fetch('/api/feature/delete', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            layer_id: currentLayer.id,
            id: layer._featureId
        })
    });
}

// Exportar
function exportGeoJSON() {
    if (!currentProject || !currentProject.name) {
        showNotification('Nenhum projeto aberto', 'error');
        return;
    }
    
    fetch('/api/export/geojson', {
        method: 'POST'
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentProject.name}.geojson`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        showNotification('GeoJSON exportado com sucesso!');
    })
    .catch(err => {
        showNotification('Erro ao exportar GeoJSON', 'error');
    });
}

// Modal
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Notificações
function showNotification(message, type = 'success') {
    // Implementação simples com alert
    // Em produção, usar biblioteca de notificações
    if (type === 'error') {
        alert('Erro: ' + message);
    } else {
        console.log(message);
    }
}

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    initMap();
});

// Fechar modal ao clicar fora
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
};


// ========================================
// FERRAMENTAS DE CONSTRUÇÃO DE POLÍGONOS
// ========================================

// Abrir modal de Lista de Coordenadas UTM
function openCoordListDialog() {
    document.getElementById('modal-coord-list').classList.add('active');
}

// Abrir modal de Tabela de Coordenadas UTM
function openCoordTableDialog() {
    document.getElementById('modal-coord-table').classList.add('active');
}

// Abrir modal de Azimute + Distância
function openAzimuthDialog() {
    document.getElementById('modal-azimuth').classList.add('active');
}

// Abrir modal de Rumo + Distância
function openBearingDialog() {
    document.getElementById('modal-bearing').classList.add('active');
}

// Criar polígono a partir de lista de coordenadas UTM
function createPolygonFromCoordList() {
    const name = document.getElementById('coord-list-name').value.trim();
    const coordText = document.getElementById('coord-list-input').value.trim();
    
    if (!name) {
        alert('Por favor, digite um nome para o polígono.');
        return;
    }
    
    if (!coordText) {
        alert('Por favor, digite as coordenadas.');
        return;
    }
    
    try {
        // Parse coordenadas
        const lines = coordText.split('\n').filter(line => line.trim());
        const coords = [];
        
        for (let line of lines) {
            // Remover espaços extras e substituir vírgula/ponto-e-vírgula por espaço
            line = line.trim().replace(/[,;]/g, ' ').replace(/\s+/g, ' ');
            const parts = line.split(' ');
            
            if (parts.length >= 2) {
                const e = parseFloat(parts[0]);
                const n = parseFloat(parts[1]);
                
                if (!isNaN(e) && !isNaN(n)) {
                    // Converter UTM para Lat/Lng (aproximação simples)
                    // Para uma conversão precisa, seria necessário usar biblioteca específica
                    // Aqui vamos usar uma conversão simplificada
                    const lat = (n - 10000000) / 111320;
                    const lng = (e - 500000) / (111320 * Math.cos(lat * Math.PI / 180));
                    coords.push([lat, lng]);
                }
            }
        }
        
        if (coords.length < 3) {
            alert('É necessário pelo menos 3 coordenadas para criar um polígono.');
            return;
        }
        
        // Fechar polígono
        coords.push(coords[0]);
        
        // Criar polígono no mapa
        const polygon = L.polygon(coords, {
            color: '#3388ff',
            fillColor: '#3388ff',
            fillOpacity: 0.2,
            weight: 2
        }).addTo(map);
        
        polygon.bindPopup(`<b>${name}</b><br>Polígono criado por coordenadas UTM`);
        
        // Ajustar zoom para mostrar o polígono
        map.fitBounds(polygon.getBounds());
        
        // Limpar campos
        document.getElementById('coord-list-name').value = '';
        document.getElementById('coord-list-input').value = '';
        
        // Fechar modal
        closeModal('modal-coord-list');
        
        alert(`Polígono "${name}" criado com sucesso!`);
        
    } catch (error) {
        console.error('Erro ao criar polígono:', error);
        alert('Erro ao processar as coordenadas. Verifique o formato.');
    }
}

// Criar polígono a partir de tabela de coordenadas UTM
function createPolygonFromCoordTable() {
    const name = document.getElementById('coord-table-name').value.trim();
    const tableText = document.getElementById('coord-table-input').value.trim();
    
    if (!name) {
        alert('Por favor, digite um nome para o polígono.');
        return;
    }
    
    if (!tableText) {
        alert('Por favor, cole a tabela de coordenadas.');
        return;
    }
    
    try {
        // Parse tabela
        const lines = tableText.split('\n').filter(line => line.trim());
        const coords = [];
        
        // Pular primeira linha se for cabeçalho
        let startIndex = 0;
        if (lines[0].toLowerCase().includes('e') || lines[0].toLowerCase().includes('norte')) {
            startIndex = 1;
        }
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            // Suportar separadores: tab, vírgula, ponto-e-vírgula, espaços múltiplos
            const parts = line.split(/[\t,;]+/).map(p => p.trim());
            
            if (parts.length >= 2) {
                const e = parseFloat(parts[0]);
                const n = parseFloat(parts[1]);
                
                if (!isNaN(e) && !isNaN(n)) {
                    // Converter UTM para Lat/Lng (aproximação)
                    const lat = (n - 10000000) / 111320;
                    const lng = (e - 500000) / (111320 * Math.cos(lat * Math.PI / 180));
                    coords.push([lat, lng]);
                }
            }
        }
        
        if (coords.length < 3) {
            alert('É necessário pelo menos 3 coordenadas para criar um polígono.');
            return;
        }
        
        // Fechar polígono
        coords.push(coords[0]);
        
        // Criar polígono no mapa
        const polygon = L.polygon(coords, {
            color: '#3388ff',
            fillColor: '#3388ff',
            fillOpacity: 0.2,
            weight: 2
        }).addTo(map);
        
        polygon.bindPopup(`<b>${name}</b><br>Polígono criado por tabela UTM`);
        
        // Ajustar zoom
        map.fitBounds(polygon.getBounds());
        
        // Limpar campos
        document.getElementById('coord-table-name').value = '';
        document.getElementById('coord-table-input').value = '';
        
        // Fechar modal
        closeModal('modal-coord-table');
        
        alert(`Polígono "${name}" criado com sucesso!`);
        
    } catch (error) {
        console.error('Erro ao criar polígono:', error);
        alert('Erro ao processar a tabela. Verifique o formato.');
    }
}

// Criar polígono a partir de Azimute + Distância
function createPolygonFromAzimuth() {
    const name = document.getElementById('azimuth-name').value.trim();
    const startE = parseFloat(document.getElementById('azimuth-start-e').value);
    const startN = parseFloat(document.getElementById('azimuth-start-n').value);
    const azimuthText = document.getElementById('azimuth-data').value.trim();
    
    if (!name) {
        alert('Por favor, digite um nome para o polígono.');
        return;
    }
    
    if (isNaN(startE) || isNaN(startN)) {
        alert('Por favor, digite as coordenadas do ponto inicial.');
        return;
    }
    
    if (!azimuthText) {
        alert('Por favor, digite os dados de azimute e distância.');
        return;
    }
    
    try {
        // Parse azimute e distância
        const lines = azimuthText.split('\n').filter(line => line.trim());
        const coords = [];
        
        // Ponto inicial
        let currentE = startE;
        let currentN = startN;
        
        // Converter ponto inicial para Lat/Lng
        let lat = (currentN - 10000000) / 111320;
        let lng = (currentE - 500000) / (111320 * Math.cos(lat * Math.PI / 180));
        coords.push([lat, lng]);
        
        for (let line of lines) {
            // Parse: azimute, distância
            line = line.trim().replace(/[,;]/g, ' ').replace(/\s+/g, ' ');
            const parts = line.split(' ');
            
            if (parts.length >= 2) {
                const azimuth = parseFloat(parts[0]); // graus
                const distance = parseFloat(parts[1]); // metros
                
                if (!isNaN(azimuth) && !isNaN(distance)) {
                    // Calcular novo ponto
                    // Azimute: 0° = Norte, sentido horário
                    const azimuthRad = azimuth * Math.PI / 180;
                    
                    currentE += distance * Math.sin(azimuthRad);
                    currentN += distance * Math.cos(azimuthRad);
                    
                    // Converter para Lat/Lng
                    lat = (currentN - 10000000) / 111320;
                    lng = (currentE - 500000) / (111320 * Math.cos(lat * Math.PI / 180));
                    coords.push([lat, lng]);
                }
            }
        }
        
        if (coords.length < 3) {
            alert('É necessário pelo menos 2 segmentos para criar um polígono.');
            return;
        }
        
        // Fechar polígono
        coords.push(coords[0]);
        
        // Criar polígono no mapa
        const polygon = L.polygon(coords, {
            color: '#3388ff',
            fillColor: '#3388ff',
            fillOpacity: 0.2,
            weight: 2
        }).addTo(map);
        
        polygon.bindPopup(`<b>${name}</b><br>Polígono criado por Azimute + Distância`);
        
        // Ajustar zoom
        map.fitBounds(polygon.getBounds());
        
        // Limpar campos
        document.getElementById('azimuth-name').value = '';
        document.getElementById('azimuth-start-e').value = '';
        document.getElementById('azimuth-start-n').value = '';
        document.getElementById('azimuth-data').value = '';
        
        // Fechar modal
        closeModal('modal-azimuth');
        
        alert(`Polígono "${name}" criado com sucesso!`);
        
    } catch (error) {
        console.error('Erro ao criar polígono:', error);
        alert('Erro ao processar azimute e distância. Verifique o formato.');
    }
}

// Criar polígono a partir de Rumo + Distância
function createPolygonFromBearing() {
    const name = document.getElementById('bearing-name').value.trim();
    const startE = parseFloat(document.getElementById('bearing-start-e').value);
    const startN = parseFloat(document.getElementById('bearing-start-n').value);
    const bearingText = document.getElementById('bearing-data').value.trim();
    
    if (!name) {
        alert('Por favor, digite um nome para o polígono.');
        return;
    }
    
    if (isNaN(startE) || isNaN(startN)) {
        alert('Por favor, digite as coordenadas do ponto inicial.');
        return;
    }
    
    if (!bearingText) {
        alert('Por favor, digite os dados de rumo e distância.');
        return;
    }
    
    try {
        // Parse rumo e distância
        const lines = bearingText.split('\n').filter(line => line.trim());
        const coords = [];
        
        // Ponto inicial
        let currentE = startE;
        let currentN = startN;
        
        // Converter ponto inicial para Lat/Lng
        let lat = (currentN - 10000000) / 111320;
        let lng = (currentE - 500000) / (111320 * Math.cos(lat * Math.PI / 180));
        coords.push([lat, lng]);
        
        for (let line of lines) {
            // Parse: rumo (NE/SE/SW/NW + ângulo), distância
            // Exemplo: "NE 45°30'15", 100.50" ou "NE 45.5042, 100.50"
            line = line.trim();
            
            // Extrair quadrante
            let quadrant = '';
            if (line.match(/^NE/i)) quadrant = 'NE';
            else if (line.match(/^SE/i)) quadrant = 'SE';
            else if (line.match(/^SW/i)) quadrant = 'SW';
            else if (line.match(/^NW/i)) quadrant = 'NW';
            
            if (!quadrant) continue;
            
            // Remover quadrante
            line = line.substring(2).trim();
            
            // Separar ângulo e distância
            const parts = line.split(',');
            if (parts.length < 2) continue;
            
            // Parse ângulo (pode ser decimal ou DMS)
            let angle = 0;
            const anglePart = parts[0].trim();
            
            if (anglePart.includes('°')) {
                // Formato DMS: 45°30'15"
                const dmsMatch = anglePart.match(/(\d+)°\s*(\d*)'\s*(\d*)"?/);
                if (dmsMatch) {
                    const degrees = parseFloat(dmsMatch[1] || 0);
                    const minutes = parseFloat(dmsMatch[2] || 0);
                    const seconds = parseFloat(dmsMatch[3] || 0);
                    angle = degrees + minutes/60 + seconds/3600;
                }
            } else {
                // Formato decimal
                angle = parseFloat(anglePart);
            }
            
            const distance = parseFloat(parts[1].trim());
            
            if (isNaN(angle) || isNaN(distance)) continue;
            
            // Converter rumo para azimute
            let azimuth = 0;
            switch(quadrant) {
                case 'NE': azimuth = angle; break;
                case 'SE': azimuth = 180 - angle; break;
                case 'SW': azimuth = 180 + angle; break;
                case 'NW': azimuth = 360 - angle; break;
            }
            
            // Calcular novo ponto
            const azimuthRad = azimuth * Math.PI / 180;
            
            currentE += distance * Math.sin(azimuthRad);
            currentN += distance * Math.cos(azimuthRad);
            
            // Converter para Lat/Lng
            lat = (currentN - 10000000) / 111320;
            lng = (currentE - 500000) / (111320 * Math.cos(lat * Math.PI / 180));
            coords.push([lat, lng]);
        }
        
        if (coords.length < 3) {
            alert('É necessário pelo menos 2 segmentos para criar um polígono.');
            return;
        }
        
        // Fechar polígono
        coords.push(coords[0]);
        
        // Criar polígono no mapa
        const polygon = L.polygon(coords, {
            color: '#3388ff',
            fillColor: '#3388ff',
            fillOpacity: 0.2,
            weight: 2
        }).addTo(map);
        
        polygon.bindPopup(`<b>${name}</b><br>Polígono criado por Rumo + Distância`);
        
        // Ajustar zoom
        map.fitBounds(polygon.getBounds());
        
        // Limpar campos
        document.getElementById('bearing-name').value = '';
        document.getElementById('bearing-start-e').value = '';
        document.getElementById('bearing-start-n').value = '';
        document.getElementById('bearing-data').value = '';
        
        // Fechar modal
        closeModal('modal-bearing');
        
        alert(`Polígono "${name}" criado com sucesso!`);
        
    } catch (error) {
        console.error('Erro ao criar polígono:', error);
        alert('Erro ao processar rumo e distância. Verifique o formato.');
    }
}
