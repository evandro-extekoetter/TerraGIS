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
        const vertex = new TerraVertex(id, e, n, this);
        if (index === -1) {
            this.vertices.push(vertex);
        } else {
            this.vertices.splice(index, 0, vertex);
        }
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
        this.vertices.splice(index, 1);
        this.syncGeometry();
    }
    
    // Renomear vértice
    renameVertex(index, newId) {
        this.vertices[index].id = newId;
        this.updateVerticesLayer();
    }

    // Mover vértice
    moveVertex(index, newE, newN) {
        const vertex = this.vertices[index];
        const oldE = vertex.e;
        const oldN = vertex.n;
        
        vertex.e = newE;
        vertex.n = newN;
        
        // Sincronizar TODAS as geometrias que compartilham este vértice
        terraManager.syncAllGeometries(oldE, oldN, newE, newN);
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
                autoPan: true
            });
            
            // Armazenar referências
            marker._terraVertex = vertex;
            marker._terraLayer = this;
            marker._vertexIndex = index;
            
            // Eventos de arraste
            if (this.editable) {
                marker.on('dragend', (e) => {
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
        
        this.moveVertex(index, newUTM[0], newUTM[1]);
        
        showMessage(`Vértice ${this.vertices[index].id} movido para E: ${newUTM[0].toFixed(3)}, N: ${newUTM[1].toFixed(3)}`, 'success');
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
    
    // Remover do mapa
    remove() {
        if (this.geometryLayer && map) map.removeLayer(this.geometryLayer);
        if (this.verticesLayer && map) map.removeLayer(this.verticesLayer);
    }
}

// ===== CLASSE TERRAMANAGER =====
class TerraManager {
    constructor() {
        this.layers = {};  // {layerName: TerraLayer}
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
}

// Instância global do gerenciador
const terraManager = new TerraManager();

