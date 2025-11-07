// ============================================
// TerraGIS Core - Sistema de Camadas e Sincronização
// Baseado na arquitetura do plugin TERRATools QGIS
// ============================================

// ===== CLASSE TERR AVERTEX =====
class TerraVertex {
    constructor(id, e, n, layer) {
        this.id = id;           // ID do vértice (ex: "P-01")
        this.e = e;             // Coordenada E (Leste) em metros
        this.n = n;             // Coordenada N (Norte) em metros
        this.layer = layer;     // Referência à TerraLayer pai
        this.marker = null;     // Marcador visual (L.Marker)
        this.label = null;      // Label visual (L.Marker)
    }
    
    // Renomear vértice
    renameVertex(index, newId) {
        this.vertices[index].id = newId;
        this.updateVerticesLayer();
    }

    // Mover vértice
    moveTo(newE, newN) {
        const index = this.layer.vertices.indexOf(this);
        if (index !== -1) {
            this.layer.moveVertex(index, newE, newN);
        }
    }
    
    // Obter LatLng
    getLatLng() {
        return utmToLatLng(this.e, this.n, this.layer.fuso);
    }
    
    // Distância para outro ponto (em metros)
    distanceTo(e, n) {
        return Math.sqrt(Math.pow(this.e - e, 2) + Math.pow(this.n - n, 2));
    }
}

// ===== CLASSE TERRALAYER =====
class TerraLayer {
    constructor(name, type = 'polygon') {
        this.name = name;                    // Nome base (ex: "Teste")
        this.type = type;                    // 'polygon', 'polyline', 'line'
        this.fuso = '21S';                   // Fuso UTM
        this.color = '#3388ff';              // Cor da geometria
        this.vertexColor = '#ff0000';        // Cor dos vértices
        
        // Geometria (Leaflet Layer)
        this.geometryLayer = null;           // L.Polygon ou L.Polyline
        
        // Vértices (array de TerraVertex)
        this.vertices = [];                  // [{id, e, n, feature}, ...]
        
        // Camada visual de vértices (Leaflet LayerGroup)
        this.verticesLayer = null;           // L.LayerGroup com marcadores
        
        // Estado
        this.visible = true;
        this.editable = false;
    }
    
    // Adicionar vértice
    addVertex(id, e, n, index = -1) {
        // Registrar vértice globalmente
        const globalVertex = terraManager.getOrCreateVertex(id, e, n, this.fuso);
        
        // Criar vértice local que referencia o global
        const vertex = new TerraVertex(id, e, n, this);
        
        if (index === -1) {
            this.vertices.push(vertex);
        } else {
            this.vertices.splice(index, 0, vertex);
        }
        
        // Registrar que esta layer usa este vértice
        const layerKey = `${this.name}_${this.type === 'polygon' ? 'Poligono' : 'Polilinha'}`;
        terraManager.registerVertexUsage(id, layerKey);
        
        this.syncGeometry();
        return vertex;
    }
    
    // Remover vértice
    removeVertex(index) {
        if (this.vertices.length <= 3 && this.type === 'polygon') {
            throw new Error('Polígono precisa de pelo menos 3 vértices');
        }
        if (this.vertices.length <= 2 && this.type !== 'polygon') {
            throw new Error('Linha precisa de pelo menos 2 vértices');
        }
        
        const vertex = this.vertices[index];
        const vertexId = vertex.id;
        
        // Remover vértice
        this.vertices.splice(index, 1);
        
        // Desregistrar uso do vértice global
        const layerKey = `${this.name}_${this.type === 'polygon' ? 'Poligono' : 'Polilinha'}`;
        terraManager.unregisterVertexUsage(vertexId, layerKey);
        
        this.syncGeometry();
        this.updateVerticesLayer();
    }
    
    // Renomear vértice
    renameVertex(index, newId) {
        this.vertices[index].id = newId;
        this.updateVerticesLayer();
    }

    // Mover vértice
    moveVertex(index, newE, newN) {
        const vertex = this.vertices[index];
        const vertexId = vertex.id;
        const oldE = vertex.e;
        const oldN = vertex.n;
        
        // Atualizar vértice local
        vertex.e = newE;
        vertex.n = newN;
        
        // Atualizar vértice global
        if (terraManager.globalVertices[vertexId]) {
            terraManager.globalVertices[vertexId].e = newE;
            terraManager.globalVertices[vertexId].n = newN;
            
            // Atualizar TODAS as layers que usam este vértice
            const affectedLayers = terraManager.globalVertices[vertexId].layers;
            affectedLayers.forEach(layerName => {
                const layer = terraManager.getLayer(layerName);
                if (layer && layer !== this) {
                    // Encontrar vértice nesta layer e atualizar
                    layer.vertices.forEach(v => {
                        if (v.id === vertexId) {
                            v.e = newE;
                            v.n = newN;
                        }
                    });
                    layer.syncGeometry();
                    layer.updateVerticesLayer();
                }
            });
        }
        
        // Atualizar esta layer
        this.syncGeometry();
        this.updateVerticesLayer();
    }
    
    // Sincronizar geometria com vértices
    syncGeometry() {
        const latlngs = this.vertices.map(v => utmToLatLng(v.e, v.n, this.fuso));
        
        if (this.geometryLayer) {
            this.geometryLayer.setLatLngs(latlngs);
        } else {
            if (this.type === 'polygon') {
                this.geometryLayer = L.polygon(latlngs, {
                    color: this.color,
                    fillColor: this.color,
                    fillOpacity: 0.2,
                    weight: 2
                });
                this.geometryLayer.bindPopup(`<b>${this.name}_Poligono</b>`);
            } else {
                this.geometryLayer = L.polyline(latlngs, {
                    color: this.color,
                    weight: 2
                });
                this.geometryLayer.bindPopup(`<b>${this.name}_Polilinha</b>`);
            }
            
            if (this.visible && map) {
                map.addLayer(this.geometryLayer);
            }
        }
        
        this.updateVerticesLayer();
    }
    
    // Atualizar camada visual de vértices
    updateVerticesLayer() {
        if (this.verticesLayer && map) {
            map.removeLayer(this.verticesLayer);
        }
        
        this.verticesLayer = L.layerGroup();
        
        this.vertices.forEach((vertex, index) => {
            const latlng = utmToLatLng(vertex.e, vertex.n, this.fuso);
            
            // Criar marcador arrastável
            const marker = L.marker(latlng, {
                icon: this.createVertexIcon(),
                draggable: this.editable,
                autoPan: true,
                zIndexOffset: 1000  // Garantir que fica acima de tudo
            });
            
            // Armazenar referências
            marker._terraVertex = vertex;
            marker._terraLayer = this;
            marker._vertexIndex = index;
            marker._vertexId = vertex.id;  // *** CORREÇÃO: Adicionar ID ***
            
            // *** CORREÇÃO: Adicionar stopPropagation em TODOS os eventos de clique ***
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
            });
            marker.on('mousedown', (e) => {
                L.DomEvent.stopPropagation(e);
            });
            
            // Eventos de arraste
            if (this.editable) {
                marker.on('dragstart', (e) => {
                    L.DomEvent.stopPropagation(e);
                });
                marker.on('drag', (e) => {
                    L.DomEvent.stopPropagation(e);
                });
                marker.on('dragend', (e) => {
                    L.DomEvent.stopPropagation(e);
                    this.onVertexDragEnd(e, index);
                });
            }
            
            // Popup com coordenadas
            marker.bindPopup(`
                <b>${vertex.id}</b><br>
                E: ${vertex.e.toFixed(3)}<br>
                N: ${vertex.n.toFixed(3)}
            `);
            
            // Label
            const label = L.marker(latlng, {
                icon: this.createLabelIcon(vertex.id)
            });
            
            this.verticesLayer.addLayer(marker);
            this.verticesLayer.addLayer(label);
            
            vertex.marker = marker;
            vertex.label = label;
        });
        
        if (this.visible && map) {
            map.addLayer(this.verticesLayer);
        }
    }
    
    // Criar ícone de vértice
    createVertexIcon() {
        return L.divIcon({
            className: 'terra-vertex-marker',
            html: `<div style="
                width: 12px;
                height: 12px;
                background-color: ${this.vertexColor};
                border: 2px solid #ffffff;
                border-radius: 50%;
                cursor: ${this.editable ? 'move' : 'pointer'};
                position: relative;
                z-index: 1000;
            "></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
    }
    
    // Criar ícone de label
    createLabelIcon(text) {
        return L.divIcon({
            className: 'terra-vertex-label',
            html: `<div style="
                background: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                font-weight: bold;
                border: 1px solid #333;
            ">${text}</div>`,
            iconSize: [50, 20],
            iconAnchor: [25, -10]
        });
    }
    
    // Callback quando vértice é arrastado
    onVertexDragEnd(event, index) {
        const marker = event.target;
        const newLatLng = marker.getLatLng();
        const newUTM = latLngToUTM(newLatLng.lat, newLatLng.lng, this.fuso);
        
        this.moveVertex(index, newUTM.e, newUTM.n);
        
        showMessage(`Vértice ${this.vertices[index].id} movido para E: ${newUTM.e.toFixed(3)}, N: ${newUTM.n.toFixed(3)}`, 'success');
    }
    
    // Habilitar edição
    enableEditing() {
        this.editable = true;
        this.updateVerticesLayer();
    }
    
    // Desabilitar edição
    disableEditing() {
        this.editable = false;
        this.updateVerticesLayer();
    }
    
    // Mostrar/ocultar
    setVisible(visible) {
        this.visible = visible;
        if (visible) {
            if (this.geometryLayer && map) map.addLayer(this.geometryLayer);
            if (this.verticesLayer && map) map.addLayer(this.verticesLayer);
        } else {
            if (this.geometryLayer && map) map.removeLayer(this.geometryLayer);
            if (this.verticesLayer && map) map.removeLayer(this.verticesLayer);
        }
    }
    
    // Zoom para a camada
    zoomToLayer() {
        if (!this.geometryLayer || !map) return;
        
        try {
            const bounds = this.geometryLayer.getBounds();
            map.fitBounds(bounds, { padding: [50, 50] });
            console.log('[ZOOM] Aproximou da camada:', this.name);
        } catch (error) {
            console.error('[ZOOM] Erro ao aproximar da camada:', error);
        }
    }
    
    // Remover do mapa
    remove() {
        if (this.geometryLayer && map) map.removeLayer(this.geometryLayer);
        if (this.verticesLayer && map) map.removeLayer(this.verticesLayer);
    }
}

// ===== CLASSE TERRAMANAGER =====
class TerraManager {
    constructor() {
        this.layers = {};           // {layerName: TerraLayer}
        this.globalVertices = {};   // {vertexId: {e, n, fuso, layers: [layerNames]}}
        this.activeLayer = null;    // Nome da camada ativa (padrão QGIS)
    }
    
    // Obter ou criar vértice global
    getOrCreateVertex(id, e, n, fuso) {
        // Verificar se vértice com mesmo ID já existe
        if (this.globalVertices[id]) {
            const existing = this.globalVertices[id];
            // Verificar se está na mesma posição (tolerância 1mm)
            const distance = Math.sqrt(
                Math.pow(existing.e - e, 2) + 
                Math.pow(existing.n - n, 2)
            );
            
            if (distance <= 0.001) {
                return existing;  // Mesmo vértice
            }
        }
        
        // Criar novo vértice global
        this.globalVertices[id] = {
            e: e,
            n: n,
            fuso: fuso,
            layers: []  // Lista de layers que usam este vértice
        };
        
        return this.globalVertices[id];
    }
    
    // Registrar que uma layer usa um vértice
    registerVertexUsage(vertexId, layerName) {
        if (this.globalVertices[vertexId]) {
            if (!this.globalVertices[vertexId].layers.includes(layerName)) {
                this.globalVertices[vertexId].layers.push(layerName);
            }
        }
    }
    
    // Remover registro de uso de vértice
    unregisterVertexUsage(vertexId, layerName) {
        if (this.globalVertices[vertexId]) {
            const index = this.globalVertices[vertexId].layers.indexOf(layerName);
            if (index !== -1) {
                this.globalVertices[vertexId].layers.splice(index, 1);
            }
            
            // Se nenhuma layer usa mais, remover vértice global
            if (this.globalVertices[vertexId].layers.length === 0) {
                delete this.globalVertices[vertexId];
            }
        }
    }
    
    // Adicionar camada
    addLayer(layer) {
        const key = `${layer.name}_${layer.type === 'polygon' ? 'Poligono' : 'Polilinha'}`;
        this.layers[key] = layer;
        
        // Adicionar ao mapa
        if (layer.geometryLayer && map) map.addLayer(layer.geometryLayer);
        if (layer.verticesLayer && map) map.addLayer(layer.verticesLayer);
        
        return key;
    }
    
    // Remover camada
    removeLayer(layerName) {
        const layer = this.layers[layerName];
        if (!layer) return;
        
        layer.remove();
        delete this.layers[layerName];
    }
    
    // Obter camada por nome
    getLayer(layerName) {
        return this.layers[layerName];
    }
    
    // Listar todas as camadas
    getAllLayers() {
        return Object.values(this.layers);
    }
    
    // Sincronizar TODAS as geometrias quando um vértice é movido
    // Lógica EXATA do plugin TERRATools (_sincronizar_geometrias)
    syncAllGeometries(oldE, oldN, newE, newN, tolerance = 0.001) {
        Object.values(this.layers).forEach(layer => {
            let modified = false;
            
            layer.vertices.forEach(vertex => {
                const distance = vertex.distanceTo(oldE, oldN);
                
                // Se vértice está na posição antiga (tolerância 1mm)
                if (distance <= tolerance) {
                    vertex.e = newE;
                    vertex.n = newN;
                    modified = true;
                }
            });
            
            // Se algum vértice foi modificado, sincronizar geometria
            if (modified) {
                layer.syncGeometry();
            }
        });
    }
    
    // Encontrar vértices próximos a um ponto (em coordenadas UTM)
    findNearbyVertices(e, n, tolerance = 5.0) {
        const found = [];
        
        Object.values(this.layers).forEach(layer => {
            layer.vertices.forEach((vertex, index) => {
                const distance = vertex.distanceTo(e, n);
                
                if (distance <= tolerance) {
                    found.push({
                        vertex: vertex,
                        layer: layer,
                        index: index,
                        distance: distance
                    });
                }
            });
        });
        
        // Ordenar por distância
        found.sort((a, b) => a.distance - b.distance);
        
        return found;
    }
    
    // Encontrar vértice por clique no mapa (LatLng)
    findVertexByClick(latlng, fuso = '21S', toleranceMeters = 5.0) {
        // Converter LatLng para UTM
        const utm = latLngToUTM(latlng.lat, latlng.lng, fuso);
        return this.findNearbyVertices(utm[0], utm[1], toleranceMeters);
    }
    
    // Mostrar/ocultar todas as camadas
    setAllVisible(visible) {
        Object.values(this.layers).forEach(layer => {
            layer.setVisible(visible);
        });
    }
    
    // Habilitar/desabilitar edição em todas as camadas
    setAllEditable(editable) {
        Object.values(this.layers).forEach(layer => {
            if (editable) {
                layer.enableEditing();
            } else {
                layer.disableEditing();
            }
        });
    }
    
    // ===== SISTEMA DE CAMADA ATIVA (PADRÃO QGIS) =====
    
    // Definir camada ativa
    setActiveLayer(layerName) {
        // Validar se camada existe
        if (layerName && !this.layers[layerName]) {
            console.warn(`[TerraManager] Camada "${layerName}" não encontrada`);
            return false;
        }
        
        this.activeLayer = layerName;
        console.log(`[TerraManager] Camada ativa: ${layerName || 'nenhuma'}`);
        
        // Atualizar UI do painel de camadas
        this.updateLayerListUI();
        
        // Disparar evento customizado
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('activeLayerChanged', {
                detail: { layerName: layerName }
            }));
        }
        
        return true;
    }
    
    // Obter camada ativa
    getActiveLayer() {
        if (!this.activeLayer) {
            return null;
        }
        return this.layers[this.activeLayer];
    }
    
    // Obter nome da camada ativa
    getActiveLayerName() {
        return this.activeLayer;
    }
    
    // Renomear camada
    renameLayer(oldName) {
        if (!this.layers[oldName]) {
            console.error('[TerraManager] Camada não encontrada:', oldName);
            return;
        }
        
        const newName = prompt('Digite o novo nome da camada:', oldName);
        if (!newName || newName.trim() === '') {
            return; // Cancelou ou nome vazio
        }
        
        const trimmedName = newName.trim();
        
        // Verificar se já existe camada com este nome
        if (this.layers[trimmedName] && trimmedName !== oldName) {
            alert('Já existe uma camada com este nome!');
            return;
        }
        
        // Renomear camada
        const layer = this.layers[oldName];
        layer.name = trimmedName;
        
        // Atualizar chave no objeto layers
        this.layers[trimmedName] = layer;
        delete this.layers[oldName];
        
        // Atualizar camada ativa se necessário
        if (this.activeLayer === oldName) {
            this.activeLayer = trimmedName;
        }
        
        // Atualizar registro de vértices globais
        const oldLayerKey = `${oldName}_${layer.type === 'polygon' ? 'Poligono' : 'Polilinha'}`;
        const newLayerKey = `${trimmedName}_${layer.type === 'polygon' ? 'Poligono' : 'Polilinha'}`;
        
        Object.values(this.globalVertices).forEach(vertex => {
            const index = vertex.layers.indexOf(oldLayerKey);
            if (index !== -1) {
                vertex.layers[index] = newLayerKey;
            }
        });
        
        this.updateLayerListUI();
        console.log(`[TerraManager] Camada renomeada: ${oldName} -> ${trimmedName}`);
        showMessage(`Camada renomeada para "${trimmedName}"`, 'success');
    }
    
    // Deletar camada
    deleteLayer(layerName) {
        if (!this.layers[layerName]) {
            console.error('[TerraManager] Camada não encontrada:', layerName);
            return;
        }
        
        // Confirmação
        const confirmacao = confirm(`Tem certeza que deseja deletar a camada "${layerName}"?\n\nEsta ação não pode ser desfeita!`);
        if (!confirmacao) {
            return;
        }
        
        const layer = this.layers[layerName];
        const layerKey = `${layerName}_${layer.type === 'polygon' ? 'Poligono' : 'Polilinha'}`;
        
        // Remover do mapa
        layer.remove();
        
        // Desregistrar todos os vértices desta camada
        layer.vertices.forEach(vertex => {
            this.unregisterVertexUsage(vertex.id, layerKey);
        });
        
        // Remover camada do gerenciador
        delete this.layers[layerName];
        
        // Se era a camada ativa, desativar
        if (this.activeLayer === layerName) {
            this.activeLayer = null;
        }
        
        this.updateLayerListUI();
        console.log(`[TerraManager] Camada deletada: ${layerName}`);
        showMessage(`Camada "${layerName}" deletada com sucesso`, 'success');
    }
    
    // Verificar se há camada ativa
    hasActiveLayer() {
        return this.activeLayer !== null && this.layers[this.activeLayer] !== undefined;
    }
    
    // Atualizar UI do painel de camadas
    updateLayerListUI() {
        const layersList = document.getElementById('layers-list');
        if (!layersList) return;
        
        // Limpar lista antiga
        layersList.innerHTML = '';
        
        // Adicionar cada camada
        Object.keys(this.layers).forEach(layerName => {
            const layer = this.layers[layerName];
            const isActive = layerName === this.activeLayer;
            
            // Container da camada
            const layerContainer = document.createElement('div');
            layerContainer.style.cssText = `
                margin: 4px 0;
                padding: 4px;
                border-radius: 4px;
                background: ${isActive ? '#fff8dc' : 'transparent'};
                border: ${isActive ? '2px solid #ff8c00' : '1px solid #ddd'};
            `;
            
            // Linha 1: Nome da camada (clicável para ativar)
            const nameRow = document.createElement('div');
            nameRow.style.cssText = `
                padding: 6px 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                font-weight: ${isActive ? 'bold' : 'normal'};
            `;
            
            // Ícone de ativo
            if (isActive) {
                const activeIcon = document.createElement('span');
                activeIcon.textContent = '⭐';
                activeIcon.title = 'Camada Ativa';
                nameRow.appendChild(activeIcon);
            }
            
            // Nome da camada
            const nameSpan = document.createElement('span');
            nameSpan.textContent = layerName;
            nameSpan.style.flex = '1';
            nameRow.appendChild(nameSpan);
            
            // Evento de clique para ativar camada
            nameRow.onclick = () => {
                this.setActiveLayer(layerName);
            };
            
            // Hover effect no nome
            nameRow.onmouseenter = () => {
                if (!isActive) {
                    nameRow.style.background = '#f0f0f0';
                }
            };
            nameRow.onmouseleave = () => {
                if (!isActive) {
                    nameRow.style.background = 'transparent';
                }
            };
            
            layerContainer.appendChild(nameRow);
            
            // Linha 2: Botões de ação
            const actionsRow = document.createElement('div');
            actionsRow.style.cssText = `
                display: flex;
                gap: 4px;
                padding: 4px;
                border-top: 1px solid #e0e0e0;
            `;
            
            // Botão Visível
            const visBtn = document.createElement('button');
            visBtn.textContent = layer.visible ? '👁️ Visível' : '🚫 Oculta';
            visBtn.title = layer.visible ? 'Ocultar camada' : 'Mostrar camada';
            visBtn.style.cssText = `
                flex: 1;
                padding: 4px 6px;
                font-size: 11px;
                cursor: pointer;
                border: 1px solid #ccc;
                border-radius: 3px;
                background: white;
            `;
            visBtn.onclick = (e) => {
                e.stopPropagation();
                layer.setVisible(!layer.visible);
                this.updateLayerListUI();
            };
            actionsRow.appendChild(visBtn);
            
            // Botão Zoom
            const zoomBtn = document.createElement('button');
            zoomBtn.textContent = '🔍 Zoom';
            zoomBtn.title = 'Aproximar da camada';
            zoomBtn.style.cssText = `
                flex: 1;
                padding: 4px 6px;
                font-size: 11px;
                cursor: pointer;
                border: 1px solid #ccc;
                border-radius: 3px;
                background: white;
            `;
            zoomBtn.onclick = (e) => {
                e.stopPropagation();
                layer.zoomToLayer();
            };
            actionsRow.appendChild(zoomBtn);
            
            // Botão Renomear
            const renameBtn = document.createElement('button');
            renameBtn.textContent = '✏️ Renomear';
            renameBtn.title = 'Renomear camada';
            renameBtn.style.cssText = `
                flex: 1;
                padding: 4px 6px;
                font-size: 11px;
                cursor: pointer;
                border: 1px solid #ccc;
                border-radius: 3px;
                background: white;
            `;
            renameBtn.onclick = (e) => {
                e.stopPropagation();
                this.renameLayer(layerName);
            };
            actionsRow.appendChild(renameBtn);
            
            // Botão Deletar
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️ Deletar';
            deleteBtn.title = 'Deletar camada';
            deleteBtn.style.cssText = `
                flex: 1;
                padding: 4px 6px;
                font-size: 11px;
                cursor: pointer;
                border: 1px solid #ccc;
                border-radius: 3px;
                background: white;
                color: #cc0000;
            `;
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteLayer(layerName);
            };
            actionsRow.appendChild(deleteBtn);
            
            layerContainer.appendChild(actionsRow);
            layersList.appendChild(layerContainer);
        });
    }
}

// Instância global do gerenciador
const terraManager = new TerraManager();

