// Ferramenta: Mover Geometria (Mapa) - v2.05
// Usa sistema de camada ativa + drag and drop com logs detalhados
console.log('🔄 [v2.05] Iniciando carregamento de Mover Geometria (Mapa)...');

var moverGeometriaMapaAtivo = false;
var geometriaSelecionada = null;
var geometriaOriginal = null;
var pontoInicial = null;
var arrastando = false;
var previewLayer = null;
var mapContainer = null;

window.openMoverGeometriaMapaDialog = function() {
    console.log('[MOVER v2.05] Ativando ferramenta Mover Geometria (Mapa)');
    
    try {
        if (!terraManager.hasActiveLayer()) {
            showMessage('⚠️ Selecione uma camada no painel CAMADAS primeiro!', 'warning');
            return;
        }
        
        geometriaSelecionada = terraManager.getActiveLayer();
        const layerName = terraManager.getActiveLayerName();
        
        console.log('[MOVER v2.05] Usando camada ativa:', layerName);
        console.log('[MOVER v2.05] geometriaSelecionada:', geometriaSelecionada);
    
        desativarTodasFerramentasEdicao();
        
        moverGeometriaMapaAtivo = true;
        arrastando = false;
        pontoInicial = null;
        
        geometriaOriginal = geometriaSelecionada.vertices.map(function(v) {
            return {e: v.e, n: v.n};
        });
        
        Object.values(terraManager.layers).forEach(function(tl) {
            if (tl.geometryLayer) {
                tl.geometryLayer.closePopup();
                tl.geometryLayer.unbindPopup();
            }
        });
        
        var coordsOriginais = geometriaSelecionada.vertices.map(function(v) {
            return utmToLatLng(v.e, v.n, geometriaSelecionada.fuso);
        });
        
        previewLayer = L.polygon(coordsOriginais, {
            color: 'red',
            weight: 3,
            dashArray: '5, 5',
            fillOpacity: 0.2,
            fillColor: 'red',
            interactive: false,
            pane: 'overlayPane'
        }).addTo(map);
        
        previewLayer.bringToFront();
        
        console.log('[MOVER v2.05] Preview layer criado e adicionado ao mapa');
        
        map.dragging.disable();
        
        mapContainer = map.getContainer();
        mapContainer.style.cursor = 'default';
        
        // Capturar eventos DO MAPA (não do polígono)
        console.log('[MOVER v2.05] Anexando eventos ao mapa');
        map.on('mousedown', onMouseDown);
        map.on('mousemove', onMouseMove);
        map.on('mouseup', onMouseUp);
        
        document.addEventListener('keydown', onKeyDownMover);
        
        console.log('[MOVER v2.05] Ferramenta ativada! Clique no mapa para mover.');
        showMessage('🗺️ Clique e arraste no mapa para mover o polígono. ESC para cancelar.', 'info');
        
    } catch (error) {
        console.error('[MOVER v2.05] ❌ ERRO ao ativar ferramenta:', error);
        console.error('[MOVER v2.05] Stack:', error.stack);
        showMessage('❌ Erro ao ativar ferramenta Mover Geometria: ' + error.message, 'error');
        finalizarMoverGeometriaMapa();
    }
};

function onMouseDown(e) {
    if (!moverGeometriaMapaAtivo || !geometriaSelecionada) {
        console.log('[MOVER v2.05] MouseDown ignorado - ferramenta não ativa');
        return;
    }
    
    console.log('[MOVER v2.05] 🖱️ MouseDown - iniciando arrasto');
    console.log('[MOVER v2.05] e.latlng:', e.latlng);
    console.log('[MOVER v2.05] e.containerPoint:', e.containerPoint);
    
    arrastando = true;
    pontoInicial = e.latlng;
    mapContainer.style.cursor = 'default';
    
    // Esconder polígono original
    if (geometriaSelecionada.geometryLayer) {
        console.log('[MOVER v2.05] Escondendo polígono original');
        geometriaSelecionada.geometryLayer.setStyle({opacity: 0, fillOpacity: 0});
    }
    
    // Trazer preview para frente
    if (previewLayer) {
        console.log('[MOVER v2.05] Trazendo preview para frente');
        previewLayer.bringToFront();
    }
    
    // Prevenir propagação
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    
    console.log('[MOVER v2.05] Arrasto iniciado com sucesso');
}

function onMouseMove(e) {
    if (!moverGeometriaMapaAtivo || !geometriaSelecionada || !arrastando || !pontoInicial || !previewLayer) {
        return;
    }
    
    try {
        var pontoAtual = e.latlng;
        var dLat = pontoAtual.lat - pontoInicial.lat;
        var dLng = pontoAtual.lng - pontoInicial.lng;
        
        console.log('[MOVER v2.05] 🔄 MouseMove - dLat:', dLat.toFixed(8), 'dLng:', dLng.toFixed(8));
        
        var novasCoords = geometriaOriginal.map(function(v) {
            var latlng = utmToLatLng(v.e, v.n, geometriaSelecionada.fuso);
            // utmToLatLng retorna array [lat, lng], não objeto
            return [latlng[0] + dLat, latlng[1] + dLng];
        });
        
        previewLayer.setLatLngs(novasCoords);
        previewLayer.bringToFront();
        
        console.log('[MOVER v2.05] ✅ Preview atualizado');
        
    } catch (error) {
        console.error('[MOVER v2.05] ❌ Erro no mousemove:', error);
        console.error('[MOVER v2.05] Stack:', error.stack);
    }
}

function onMouseUp(e) {
    if (!moverGeometriaMapaAtivo || !geometriaSelecionada || !arrastando) {
        console.log('[MOVER v2.05] MouseUp ignorado - não está arrastando');
        return;
    }
    
    console.log('[MOVER v2.05] 🖱️ MouseUp - finalizando movimento');
    
    try {
        var pontoFinal = e.latlng;
        
        console.log('[MOVER v2.05] Ponto inicial LatLng:', pontoInicial);
        console.log('[MOVER v2.05] Ponto final LatLng:', pontoFinal);
        console.log('[MOVER v2.05] Fuso da geometria:', geometriaSelecionada.fuso);
        
        var pontoInicialUTM = latLngToUTM(pontoInicial.lat, pontoInicial.lng, geometriaSelecionada.fuso);
        console.log('[MOVER v2.05] ✅ Ponto inicial UTM:', pontoInicialUTM);
        
        var pontoFinalUTM = latLngToUTM(pontoFinal.lat, pontoFinal.lng, geometriaSelecionada.fuso);
        console.log('[MOVER v2.05] ✅ Ponto final UTM:', pontoFinalUTM);
        
        var dx = pontoFinalUTM.e - pontoInicialUTM.e;
        var dy = pontoFinalUTM.n - pontoInicialUTM.n;
        
        console.log('[MOVER v2.05] Deslocamento: dx=', dx.toFixed(2), 'm, dy=', dy.toFixed(2), 'm');
        
        geometriaSelecionada.vertices.forEach(function(v) {
            console.log('[MOVER v2.05] Movendo vértice', v.name, 'de E:', v.e.toFixed(2), 'N:', v.n.toFixed(2));
            v.e += dx;
            v.n += dy;
            console.log('[MOVER v2.05] Para E:', v.e.toFixed(2), 'N:', v.n.toFixed(2));
        });
        
        geometriaSelecionada.syncGeometry();
        
        // Restaurar visibilidade do polígono
        if (geometriaSelecionada.geometryLayer) {
            geometriaSelecionada.geometryLayer.setStyle({opacity: 1, fillOpacity: 0.2});
        }
        
        finalizarMoverGeometriaMapa();
        
        showMessage('✅ Geometria movida! Deslocamento: ' + dx.toFixed(2) + 'm E, ' + dy.toFixed(2) + 'm N', 'success');
        
    } catch (error) {
        console.error('[MOVER v2.05] ❌ ERRO ao mover:', error);
        console.error('[MOVER v2.05] Stack:', error.stack);
        finalizarMoverGeometriaMapa();
        showMessage('❌ Erro ao mover geometria: ' + error.message, 'error');
    }
}

function onKeyDownMover(e) {
    if (e.key === 'Escape' && moverGeometriaMapaAtivo) {
        console.log('[MOVER v2.05] ESC pressionado - cancelando');
        finalizarMoverGeometriaMapa();
        showMessage('❌ Movimentação cancelada.', 'info');
    }
}

function finalizarMoverGeometriaMapa() {
    console.log('[MOVER v2.05] Finalizando ferramenta');
    
    moverGeometriaMapaAtivo = false;
    arrastando = false;
    
    if (mapContainer) {
        mapContainer.style.cursor = '';
    }
    
    if (previewLayer) {
        map.removeLayer(previewLayer);
        previewLayer = null;
    }
    
    // Remover eventos do mapa
    map.off('mousedown', onMouseDown);
    map.off('mousemove', onMouseMove);
    map.off('mouseup', onMouseUp);
    
    geometriaSelecionada = null;
    geometriaOriginal = null;
    pontoInicial = null;
    
    document.removeEventListener('keydown', onKeyDownMover);
    
    Object.values(terraManager.layers).forEach(function(tl) {
        if (tl.geometryLayer) {
            var layerName = tl.type === 'polygon' ? 
                tl.name + '_Poligono' : tl.name + '_Polilinha';
            tl.geometryLayer.bindPopup('<b>' + layerName + '</b>');
        }
    });
    
    map.dragging.enable();
    
    console.log('[MOVER v2.05] Ferramenta finalizada');
}

function desativarMoverGeometriaMapa() {
    finalizarMoverGeometriaMapa();
}

console.log('✅ [v2.05] Ferramenta Mover Geometria (Mapa) carregada!');

