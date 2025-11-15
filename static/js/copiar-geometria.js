// Ferramenta: Copiar Geometria - v2.10
// Cria cópia da geometria em nova posição mantendo a original
console.log('🔄 [v2.10] Iniciando carregamento de Copiar Geometria...');

var copiarGeometriaAtivo = false;
var geometriaSelecionadaCopiar = null;
var geometriaOriginalCopiar = null;
var pontoInicialCopiar = null;
var arrastandoCopiar = false;
var previewLayerCopiar = null;
var mapContainerCopiar = null;

window.openCopiarGeometriaDialog = function() {
    console.log('[COPIAR v2.10] Ativando ferramenta Copiar Geometria');
    
    try {
        if (!terraManager.hasActiveLayer()) {
            showMessage('⚠️ Selecione uma camada no painel CAMADAS primeiro!', 'warning');
            return;
        }
        
        geometriaSelecionadaCopiar = terraManager.getActiveLayer();
        const layerName = terraManager.getActiveLayerName();
        
        console.log('[COPIAR v2.10] Usando camada ativa:', layerName);
        console.log('[COPIAR v2.10] geometriaSelecionadaCopiar:', geometriaSelecionadaCopiar);
    
        desativarTodasFerramentasEdicao();
        
        copiarGeometriaAtivo = true;
        arrastandoCopiar = false;
        pontoInicialCopiar = null;
        
        geometriaOriginalCopiar = geometriaSelecionadaCopiar.vertices.map(function(v) {
            return {e: v.e, n: v.n};
        });
        
        Object.values(terraManager.layers).forEach(function(tl) {
            if (tl.geometryLayer) {
                tl.geometryLayer.closePopup();
                tl.geometryLayer.unbindPopup();
            }
        });
        
        var coordsOriginais = geometriaSelecionadaCopiar.vertices.map(function(v) {
            return utmToLatLng(v.e, v.n, geometriaSelecionadaCopiar.fuso);
        });
        
        previewLayerCopiar = L.polygon(coordsOriginais, {
            color: 'blue',
            weight: 3,
            dashArray: '5, 5',
            fillOpacity: 0.2,
            fillColor: 'blue',
            interactive: false,
            pane: 'overlayPane'
        }).addTo(map);
        
        previewLayerCopiar.bringToFront();
        
        console.log('[COPIAR v2.10] Preview layer criado e adicionado ao mapa');
        
        map.dragging.disable();
        
        mapContainerCopiar = map.getContainer();
        mapContainerCopiar.style.cursor = 'copy';
        
        // Capturar eventos DO MAPA
        console.log('[COPIAR v2.10] Anexando eventos ao mapa');
        map.on('mousedown', onMouseDownCopiar);
        map.on('mousemove', onMouseMoveCopiar);
        map.on('mouseup', onMouseUpCopiar);
        
        document.addEventListener('keydown', onKeyDownCopiar);
        
        console.log('[COPIAR v2.10] Ferramenta ativada! Clique no mapa para copiar.');
        showMessage('📋 Clique e arraste no mapa para copiar o polígono. ESC para cancelar.', 'info');
        
    } catch (error) {
        console.error('[COPIAR v2.10] ❌ ERRO ao ativar ferramenta:', error);
        console.error('[COPIAR v2.10] Stack:', error.stack);
        showMessage('❌ Erro ao ativar ferramenta Copiar Geometria: ' + error.message, 'error');
        finalizarCopiarGeometria();
    }
};

function onMouseDownCopiar(e) {
    if (!copiarGeometriaAtivo || !geometriaSelecionadaCopiar) {
        console.log('[COPIAR v2.10] MouseDown ignorado - ferramenta não ativa');
        return;
    }
    
    console.log('[COPIAR v2.10] 🖱️ MouseDown - iniciando arrasto');
    
    arrastandoCopiar = true;
    pontoInicialCopiar = e.latlng;
    mapContainerCopiar.style.cursor = 'default';
    
    // Trazer preview para frente
    if (previewLayerCopiar) {
        console.log('[COPIAR v2.10] Trazendo preview para frente');
        previewLayerCopiar.bringToFront();
    }
    
    // Prevenir propagação
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    
    console.log('[COPIAR v2.10] Arrasto iniciado com sucesso');
}

function onMouseMoveCopiar(e) {
    if (!copiarGeometriaAtivo || !geometriaSelecionadaCopiar || !arrastandoCopiar || !pontoInicialCopiar || !previewLayerCopiar) {
        return;
    }
    
    try {
        var pontoAtual = e.latlng;
        var dLat = pontoAtual.lat - pontoInicialCopiar.lat;
        var dLng = pontoAtual.lng - pontoInicialCopiar.lng;
        
        var novasCoords = geometriaOriginalCopiar.map(function(v) {
            var latlng = utmToLatLng(v.e, v.n, geometriaSelecionadaCopiar.fuso);
            return [latlng[0] + dLat, latlng[1] + dLng];
        });
        
        previewLayerCopiar.setLatLngs(novasCoords);
        previewLayerCopiar.bringToFront();
        
    } catch (error) {
        console.error('[COPIAR v2.10] ❌ Erro no mousemove:', error);
    }
}

function onMouseUpCopiar(e) {
    if (!copiarGeometriaAtivo || !geometriaSelecionadaCopiar || !arrastandoCopiar) {
        console.log('[COPIAR v2.10] MouseUp ignorado - não está arrastando');
        return;
    }
    
    console.log('[COPIAR v2.10] 🖱️ MouseUp - finalizando cópia');
    
    try {
        var pontoFinal = e.latlng;
        
        var pontoInicialUTM = latLngToUTM(pontoInicialCopiar.lat, pontoInicialCopiar.lng, geometriaSelecionadaCopiar.fuso);
        var pontoFinalUTM = latLngToUTM(pontoFinal.lat, pontoFinal.lng, geometriaSelecionadaCopiar.fuso);
        
        var dx = pontoFinalUTM.e - pontoInicialUTM.e;
        var dy = pontoFinalUTM.n - pontoInicialUTM.n;
        
        console.log('[COPIAR v2.10] Deslocamento: dx=', dx.toFixed(2), 'm, dy=', dy.toFixed(2), 'm');
        
        // Pedir nome da nova camada
        var nomeOriginal = geometriaSelecionadaCopiar.name;
        var novoNome = prompt('Digite o nome da nova camada:', nomeOriginal + '_Copia');
        
        if (!novoNome || novoNome.trim() === '') {
            console.log('[COPIAR v2.10] Usuário cancelou ou nome vazio');
            finalizarCopiarGeometria();
            showMessage('❌ Cópia cancelada.', 'info');
            return;
        }
        
        novoNome = novoNome.trim();
        
        // Criar nova TerraLayer com os vértices copiados e deslocados
        var novaTerraLayer = new TerraLayer(novoNome, geometriaSelecionadaCopiar.type);
        novaTerraLayer.fuso = geometriaSelecionadaCopiar.fuso;
        novaTerraLayer.color = geometriaSelecionadaCopiar.color;
        novaTerraLayer.vertexColor = geometriaSelecionadaCopiar.vertexColor;
        
        geometriaSelecionadaCopiar.vertices.forEach(function(v) {
            var novoE = v.e + dx;
            var novoN = v.n + dy;
            console.log('[COPIAR DEBUG] Copiando vértice:', v.name, 'E:', v.e, 'N:', v.n);
            novaTerraLayer.addVertex(v.name, novoE, novoN);
        });
        
        novaTerraLayer.syncGeometry();
        
        var layerKey = terraManager.addLayer(novaTerraLayer);
        terraManager.updateLayerListUI();
        terraManager.setActiveLayer(layerKey);
        
        // Compatibilidade com sistema antigo
        var polyline = novaTerraLayer.geometryLayer;
        var verticesLayer = novaTerraLayer.verticesLayer;
        addLayer(layerKey, polyline, verticesLayer);
        
        if (layers[layerKey]) {
            layers[layerKey].terraLayer = novaTerraLayer;
            layers[layerKey].fuso = novaTerraLayer.fuso;
        }
        
        finalizarCopiarGeometria();
        
        showMessage('✅ Geometria copiada! Nova camada: ' + novoNome, 'success');
        
    } catch (error) {
        console.error('[COPIAR v2.10] ❌ ERRO ao copiar:', error);
        console.error('[COPIAR v2.10] Stack:', error.stack);
        finalizarCopiarGeometria();
        showMessage('❌ Erro ao copiar geometria: ' + error.message, 'error');
    }
}

function onKeyDownCopiar(e) {
    if (e.key === 'Escape' && copiarGeometriaAtivo) {
        console.log('[COPIAR v2.10] ESC pressionado - cancelando');
        finalizarCopiarGeometria();
        showMessage('❌ Cópia cancelada.', 'info');
    }
}

function finalizarCopiarGeometria() {
    console.log('[COPIAR v2.10] Finalizando ferramenta');
    
    copiarGeometriaAtivo = false;
    arrastandoCopiar = false;
    
    if (mapContainerCopiar) {
        mapContainerCopiar.style.cursor = '';
    }
    
    if (previewLayerCopiar) {
        map.removeLayer(previewLayerCopiar);
        previewLayerCopiar = null;
    }
    
    // Remover eventos do mapa
    map.off('mousedown', onMouseDownCopiar);
    map.off('mousemove', onMouseMoveCopiar);
    map.off('mouseup', onMouseUpCopiar);
    
    geometriaSelecionadaCopiar = null;
    geometriaOriginalCopiar = null;
    pontoInicialCopiar = null;
    
    document.removeEventListener('keydown', onKeyDownCopiar);
    
    Object.values(terraManager.layers).forEach(function(tl) {
        if (tl.geometryLayer) {
            var layerName = tl.type === 'polygon' ? 
                tl.name + '_Poligono' : tl.name + '_Polilinha';
            tl.geometryLayer.bindPopup('<b>' + layerName + '</b>');
        }
    });
    
    map.dragging.enable();
    
    console.log('[COPIAR v2.10] Ferramenta finalizada');
}

function desativarCopiarGeometria() {
    finalizarCopiarGeometria();
}

console.log('✅ [v2.10] Ferramenta Copiar Geometria carregada!');

