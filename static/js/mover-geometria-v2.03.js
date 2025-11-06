// Ferramenta Mover Geometria (Mapa) - TerraGIS v2.03
// Captura eventos DIRETAMENTE do polígono
console.log('🔄 [v2.03] Iniciando carregamento de Mover Geometria (Mapa)...');

var moverGeometriaMapaAtivo = false;
var geometriaSelecionada = null;
var geometriaOriginal = null;
var pontoInicial = null;
var arrastando = false;
var previewLayer = null;
var mapContainer = null;

window.openMoverGeometriaMapaDialog = function() {
    console.log('[MOVER v2.03] Ativando ferramenta Mover Geometria (Mapa)');
    
    try {
        if (!terraManager.hasActiveLayer()) {
            showMessage('⚠️ Selecione uma camada no painel CAMADAS primeiro!', 'warning');
            return;
        }
        
        geometriaSelecionada = terraManager.getActiveLayer();
        const layerName = terraManager.getActiveLayerName();
        
        console.log('[MOVER v2.03] Usando camada ativa:', layerName);
        console.log('[MOVER v2.03] geometriaSelecionada:', geometriaSelecionada);
    
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
            interactive: false,
            pane: 'overlayPane'
        }).addTo(map);
        
        previewLayer.bringToFront();
        
        console.log('[MOVER v2.03] Preview layer criado');
        
        map.dragging.disable();
        
        mapContainer = map.getContainer();
        mapContainer.style.cursor = 'grab';
        
        // MUDANÇA: Capturar eventos DO POLÍGONO, não do mapa
        if (geometriaSelecionada.geometryLayer) {
            console.log('[MOVER v2.03] Anexando eventos ao polígono');
            geometriaSelecionada.geometryLayer.on('mousedown', onMouseDown);
        }
        
        // Eventos do mapa para mousemove e mouseup (funcionam globalmente)
        map.on('mousemove', onMouseMove);
        map.on('mouseup', onMouseUp);
        
        document.addEventListener('keydown', onKeyDownMover);
        
        console.log('[MOVER v2.03] Ferramenta ativada! Clique e arraste o polígono.');
        showMessage('🗺️ Clique e arraste o polígono para mover. ESC para cancelar.', 'info');
        
    } catch (error) {
        console.error('[MOVER v2.03] ❌ ERRO ao ativar ferramenta:', error);
        showMessage('❌ Erro ao ativar ferramenta Mover Geometria: ' + error.message, 'error');
        finalizarMoverGeometriaMapa();
    }
};

function onMouseDown(e) {
    if (!moverGeometriaMapaAtivo || !geometriaSelecionada) return;
    
    console.log('[MOVER v2.03] 🖱️ MouseDown - iniciando arrasto');
    console.log('[MOVER v2.03] Ponto inicial:', e.latlng);
    
    arrastando = true;
    pontoInicial = e.latlng;
    mapContainer.style.cursor = 'grabbing';
    
    // Esconder polígono original
    if (geometriaSelecionada.geometryLayer) {
        console.log('[MOVER v2.03] Escondendo polígono original');
        geometriaSelecionada.geometryLayer.setStyle({opacity: 0, fillOpacity: 0});
    }
    
    // Trazer preview para frente
    if (previewLayer) {
        console.log('[MOVER v2.03] Trazendo preview para frente');
        previewLayer.bringToFront();
    }
    
    // Prevenir propagação para evitar que o mapa capture o evento
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
}

function onMouseMove(e) {
    if (!moverGeometriaMapaAtivo || !geometriaSelecionada || !arrastando || !pontoInicial || !previewLayer) {
        return;
    }
    
    try {
        var pontoAtual = e.latlng;
        var dLat = pontoAtual.lat - pontoInicial.lat;
        var dLng = pontoAtual.lng - pontoInicial.lng;
        
        console.log('[MOVER v2.03] 🔄 Atualizando preview - dLat:', dLat.toFixed(6), 'dLng:', dLng.toFixed(6));
        
        var novasCoords = geometriaOriginal.map(function(v) {
            var latlng = utmToLatLng(v.e, v.n, geometriaSelecionada.fuso);
            return [latlng.lat + dLat, latlng.lng + dLng];
        });
        
        previewLayer.setLatLngs(novasCoords);
        previewLayer.bringToFront();
        
        console.log('[MOVER v2.03] ✅ Preview atualizado');
        
    } catch (error) {
        console.error('[MOVER v2.03] ❌ Erro no mousemove:', error);
    }
}

function onMouseUp(e) {
    if (!moverGeometriaMapaAtivo || !geometriaSelecionada || !arrastando) return;
    
    console.log('[MOVER v2.03] 🖱️ MouseUp - finalizando movimento');
    
    try {
        var pontoFinal = e.latlng;
        
        console.log('[MOVER v2.03] Ponto inicial LatLng:', pontoInicial);
        console.log('[MOVER v2.03] Ponto final LatLng:', pontoFinal);
        console.log('[MOVER v2.03] Fuso da geometria:', geometriaSelecionada.fuso);
        
        var pontoInicialUTM = latLngToUTM(pontoInicial.lat, pontoInicial.lng, geometriaSelecionada.fuso);
        console.log('[MOVER v2.03] ✅ Ponto inicial UTM:', pontoInicialUTM);
        
        var pontoFinalUTM = latLngToUTM(pontoFinal.lat, pontoFinal.lng, geometriaSelecionada.fuso);
        console.log('[MOVER v2.03] ✅ Ponto final UTM:', pontoFinalUTM);
        
        var dx = pontoFinalUTM.e - pontoInicialUTM.e;
        var dy = pontoFinalUTM.n - pontoInicialUTM.n;
        
        console.log('[MOVER v2.03] Deslocamento: dx=', dx.toFixed(2), 'm, dy=', dy.toFixed(2), 'm');
        
        geometriaSelecionada.vertices.forEach(function(v) {
            console.log('[MOVER v2.03] Movendo vértice', v.name, 'de E:', v.e.toFixed(2), 'N:', v.n.toFixed(2));
            v.e += dx;
            v.n += dy;
            console.log('[MOVER v2.03] Para E:', v.e.toFixed(2), 'N:', v.n.toFixed(2));
        });
        
        geometriaSelecionada.syncGeometry();
        
        // Restaurar visibilidade do polígono
        if (geometriaSelecionada.geometryLayer) {
            geometriaSelecionada.geometryLayer.setStyle({opacity: 1, fillOpacity: 0.2});
        }
        
        finalizarMoverGeometriaMapa();
        
        showMessage('✅ Geometria movida! Deslocamento: ' + dx.toFixed(2) + 'm E, ' + dy.toFixed(2) + 'm N', 'success');
        
    } catch (error) {
        console.error('[MOVER v2.03] ❌ ERRO ao mover:', error);
        console.error('[MOVER v2.03] Stack:', error.stack);
        finalizarMoverGeometriaMapa();
        showMessage('❌ Erro ao mover geometria: ' + error.message, 'error');
    }
}

function onKeyDownMover(e) {
    if (e.key === 'Escape' && moverGeometriaMapaAtivo) {
        console.log('[MOVER v2.03] ESC pressionado - cancelando');
        finalizarMoverGeometriaMapa();
        showMessage('❌ Movimentação cancelada.', 'info');
    }
}

function finalizarMoverGeometriaMapa() {
    console.log('[MOVER v2.03] Finalizando ferramenta');
    
    moverGeometriaMapaAtivo = false;
    arrastando = false;
    
    if (mapContainer) {
        mapContainer.style.cursor = '';
    }
    
    if (previewLayer) {
        map.removeLayer(previewLayer);
        previewLayer = null;
    }
    
    // Remover eventos do polígono
    if (geometriaSelecionada && geometriaSelecionada.geometryLayer) {
        geometriaSelecionada.geometryLayer.off('mousedown', onMouseDown);
    }
    
    geometriaSelecionada = null;
    geometriaOriginal = null;
    pontoInicial = null;
    
    map.off('mousemove', onMouseMove);
    map.off('mouseup', onMouseUp);
    document.removeEventListener('keydown', onKeyDownMover);
    
    Object.values(terraManager.layers).forEach(function(tl) {
        if (tl.geometryLayer) {
            var layerName = tl.type === 'polygon' ? 
                tl.name + '_Poligono' : tl.name + '_Polilinha';
            tl.geometryLayer.bindPopup('<b>' + layerName + '</b>');
        }
    });
    
    map.dragging.enable();
}

function desativarMoverGeometriaMapa() {
    finalizarMoverGeometriaMapa();
}

console.log('✅ [v2.03] Ferramenta Mover Geometria (Mapa) carregada!');

