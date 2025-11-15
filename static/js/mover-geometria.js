// Ferramenta Mover Geometria (Mapa) - TerraGIS
// Usa sistema de Camada Ativa (padrão QGIS)
console.log('🔄 Iniciando carregamento de Mover Geometria (Mapa)...');

var moverGeometriaMapaAtivo = false;
var geometriaSelecionada = null;
var geometriaOriginal = null;
var pontoInicial = null;
var previewLayer = null;
var mapContainer = null;
var mouseMoveHandler = null;
var clickHandler = null;

// Abrir ferramenta Mover Geometria (Mapa)
window.openMoverGeometriaMapaDialog = function() {
    console.log('[MOVER] Ativando ferramenta Mover Geometria (Mapa)');
    
    // Verificar se há camada ativa
    if (!terraManager.hasActiveLayer()) {
        showMessage('⚠️ Selecione uma camada no painel CAMADAS primeiro!', 'warning');
        return;
    }
    
    // Obter camada ativa
    geometriaSelecionada = terraManager.getActiveLayer();
    const layerName = terraManager.getActiveLayerName();
    
    console.log('[MOVER] Usando camada ativa:', layerName);
    
    // Desativar outras ferramentas
    desativarTodasFerramentasEdicao();
    
    moverGeometriaMapaAtivo = true;
    
    // Salvar coordenadas originais
    geometriaOriginal = geometriaSelecionada.vertices.map(function(v) {
        return {e: v.e, n: v.n};
    });
    
    // Ponto inicial = primeiro vértice
    var primeiroVertice = geometriaSelecionada.vertices[0];
    pontoInicial = utmToLatLng(primeiroVertice.e, primeiroVertice.n, geometriaSelecionada.fuso);
    
    // Desabilitar popups
    Object.values(terraManager.layers).forEach(function(tl) {
        if (tl.geometryLayer) {
            tl.geometryLayer.closePopup();
            tl.geometryLayer.unbindPopup();
        }
    });
    
    // Criar preview vermelho tracejado
    var coordsOriginais = geometriaSelecionada.vertices.map(function(v) {
        return utmToLatLng(v.e, v.n, geometriaSelecionada.fuso);
    });
    
    previewLayer = L.polygon(coordsOriginais, {
        color: 'red',
        weight: 2,
        dashArray: '5, 5',
        fillOpacity: 0.1
    }).addTo(map);
    
    // Desabilitar dragging do mapa
    map.dragging.disable();
    
    // Obter container do mapa
    mapContainer = map.getContainer();
    
    // Criar handlers de eventos DOM
    mouseMoveHandler = function(e) {
        if (!moverGeometriaMapaAtivo || !geometriaSelecionada || !previewLayer) return;
        
        // Converter posição do mouse para coordenadas do mapa
        var containerPoint = L.point(e.clientX - mapContainer.getBoundingClientRect().left, 
                                      e.clientY - mapContainer.getBoundingClientRect().top);
        var pontoAtual = map.containerPointToLatLng(containerPoint);
        
        // Calcular deslocamento
        var dLat = pontoAtual.lat - pontoInicial.lat;
        var dLng = pontoAtual.lng - pontoInicial.lng;
        
        // Atualizar preview
        var novasCoords = geometriaOriginal.map(function(v) {
            var latlng = utmToLatLng(v.e, v.n, geometriaSelecionada.fuso);
            return [latlng.lat + dLat, latlng.lng + dLng];
        });
        
        previewLayer.setLatLngs(novasCoords);
    };
    
    clickHandler = function(e) {
        if (!moverGeometriaMapaAtivo || !geometriaSelecionada) return;
        
        e.stopPropagation();
        e.preventDefault();
        
        console.log('[MOVER] Confirmando nova posição');
        
        // Converter posição do clique para coordenadas do mapa
        var containerPoint = L.point(e.clientX - mapContainer.getBoundingClientRect().left, 
                                      e.clientY - mapContainer.getBoundingClientRect().top);
        var pontoFinal = map.containerPointToLatLng(containerPoint);
        
        // Converter para UTM
        var pontoInicialUTM = latLngToUtm(pontoInicial.lat, pontoInicial.lng, geometriaSelecionada.fuso);
        var pontoFinalUTM = latLngToUtm(pontoFinal.lat, pontoFinal.lng, geometriaSelecionada.fuso);
        
        var dx = pontoFinalUTM.e - pontoInicialUTM.e;
        var dy = pontoFinalUTM.n - pontoInicialUTM.n;
        
        // Aplicar deslocamento a todos os vértices
        geometriaSelecionada.vertices.forEach(function(v) {
            v.e += dx;
            v.n += dy;
        });
        
        // Sincronizar geometria
        geometriaSelecionada.syncGeometry();
        
        // Finalizar
        finalizarMoverGeometriaMapa();
        
        showMessage('✅ Geometria movida com sucesso!', 'success');
    };
    
    // Adicionar eventos DOM
    mapContainer.addEventListener('mousemove', mouseMoveHandler);
    mapContainer.addEventListener('click', clickHandler);
    
    // Mudar cursor
    mapContainer.style.cursor = 'default';
    
    // ESC para cancelar
    document.addEventListener('keydown', onKeyDownMover);
    
    showMessage('🗺️ Mova o mouse e clique para fixar nova posição. ESC para cancelar.', 'info');
};

function onKeyDownMover(e) {
    if (e.key === 'Escape' && moverGeometriaMapaAtivo) {
        finalizarMoverGeometriaMapa();
        showMessage('❌ Movimentação cancelada.', 'info');
    }
}

function finalizarMoverGeometriaMapa() {
    moverGeometriaMapaAtivo = false;
    geometriaSelecionada = null;
    geometriaOriginal = null;
    pontoInicial = null;
    
    // Restaurar cursor
    if (mapContainer) {
        mapContainer.style.cursor = '';
    }
    
    if (previewLayer) {
        map.removeLayer(previewLayer);
        previewLayer = null;
    }
    
    // Remover eventos DOM
    if (mapContainer && mouseMoveHandler) {
        mapContainer.removeEventListener('mousemove', mouseMoveHandler);
    }
    if (mapContainer && clickHandler) {
        mapContainer.removeEventListener('click', clickHandler);
    }
    
    mouseMoveHandler = null;
    clickHandler = null;
    
    // Restaurar popups
    Object.values(terraManager.layers).forEach(function(tl) {
        if (tl.geometryLayer) {
            var layerName = tl.type === 'polygon' ? 
                tl.name + '_Poligono' : tl.name + '_Polilinha';
            tl.geometryLayer.bindPopup('<b>' + layerName + '</b>');
        }
    });
    
    document.removeEventListener('keydown', onKeyDownMover);
    
    // Reabilitar dragging do mapa
    map.dragging.enable();
}

function desativarMoverGeometriaMapa() {
    finalizarMoverGeometriaMapa();
}

console.log('✅ Ferramenta Mover Geometria (Mapa) carregada!');

