// Correção Mover Geometria (Mapa) - TerraGIS
console.log('✅ Correção Mover Geometria (Mapa) carregada!');

// Sobrescrever função original
window.openMoverGeometriaMapaDialog = function() {
    console.log('[MOVER] Abrindo diálogo');
    
    // Desativar outras ferramentas
    desativarTodasFerramentasEdicao();
    
    moverGeometriaMapaAtivo = true;
    
    showMessage('Clique no polígono que deseja mover. ESC para cancelar.', 'info');
    
    // Adicionar evento mousedown nos polígonos
    Object.values(terraManager.layers).forEach(function(terraLayer) {
        if (terraLayer.geometryLayer) {
            // Desabilitar popup
            terraLayer.geometryLayer.unbindPopup();
            
            // Usar mousedown (igual adicionar vértice)
            terraLayer.geometryLayer.on('mousedown', onPolygonMouseDownMover);
        }
    });
};

function onPolygonMouseDownMover(e) {
    if (!moverGeometriaMapaAtivo) return;
    
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    
    console.log('[MOVER] Polígono clicado');
    
    // Encontrar qual terraLayer foi clicado
    var terraLayerClicado = null;
    for (var nome in terraManager.layers) {
        var tl = terraManager.layers[nome];
        if (tl.geometryLayer === e.target) {
            terraLayerClicado = tl;
            break;
        }
    }
    
    if (!terraLayerClicado) {
        console.error('[MOVER] TerraLayer não encontrado');
        return;
    }
    
    console.log('[MOVER] Geometria selecionada:', terraLayerClicado.name);
    
    // Salvar geometria selecionada
    geometriaSelecionada = terraLayerClicado;
    geometriaOriginal = terraLayerClicado.vertices.map(function(v) {
        return {e: v.e, n: v.n};
    });
    
    // Ponto inicial = primeiro vértice
    var primeiroVertice = terraLayerClicado.vertices[0];
    pontoInicial = utmToLatLng(primeiroVertice.e, primeiroVertice.n, terraLayerClicado.fuso);
    
    // Criar preview vermelho tracejado
    var coordsOriginais = terraLayerClicado.vertices.map(function(v) {
        return utmToLatLng(v.e, v.n, terraLayerClicado.fuso);
    });
    
    previewLayer = L.polygon(coordsOriginais, {
        color: 'red',
        weight: 2,
        dashArray: '5, 5',
        fillOpacity: 0.1
    }).addTo(map);
    
    // Remover eventos dos polígonos
    Object.values(terraManager.layers).forEach(function(tl) {
        if (tl.geometryLayer) {
            tl.geometryLayer.off('mousedown', onPolygonMouseDownMover);
        }
    });
    
    // Adicionar eventos do mapa
    map.on('mousemove', onMapMouseMoveMover);
    map.on('click', onMapClickConfirmarMover);
    
    showMessage('Mova o mouse para posicionar. Clique para fixar. ESC para cancelar.', 'success');
}

function onMapMouseMoveMover(e) {
    if (!moverGeometriaMapaAtivo || !geometriaSelecionada || !previewLayer) return;
    
    var pontoAtual = e.latlng;
    
    // Calcular deslocamento
    var dLat = pontoAtual.lat - pontoInicial.lat;
    var dLng = pontoAtual.lng - pontoInicial.lng;
    
    // Atualizar preview
    var novasCoords = geometriaOriginal.map(function(v) {
        var latlng = utmToLatLng(v.e, v.n, geometriaSelecionada.fuso);
        return [latlng.lat + dLat, latlng.lng + dLng];
    });
    
    previewLayer.setLatLngs(novasCoords);
}

function onMapClickConfirmarMover(e) {
    if (!moverGeometriaMapaAtivo || !geometriaSelecionada) return;
    
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    
    console.log('[MOVER] Confirmando nova posição');
    
    var pontoFinal = e.latlng;
    
    // Converter para UTM
    var pontoInicialUTM = latLngToUTM(pontoInicial.lat, pontoInicial.lng, geometriaSelecionada.fuso);
    var pontoFinalUTM = latLngToUTM(pontoFinal.lat, pontoFinal.lng, geometriaSelecionada.fuso);
    
    var dx = pontoFinalUTM.e - pontoInicialUTM.e;
    var dy = pontoFinalUTM.n - pontoInicialUTM.n;
    
    // Aplicar deslocamento
    geometriaSelecionada.vertices = geometriaSelecionada.vertices.map(function(v) {
        return {
            id: v.id,
            e: v.e + dx,
            n: v.n + dy
        };
    });
    
    // Atualizar geometria
    geometriaSelecionada.syncGeometry();
    
    showMessage('Geometria movida ' + dx.toFixed(2) + 'm (E), ' + dy.toFixed(2) + 'm (N)', 'success');
    
    // Desativar ferramenta
    desativarMoverGeometriaMapa();
}

// Sobrescrever desativar
window.desativarMoverGeometriaMapa = function() {
    if (!moverGeometriaMapaAtivo) return;
    
    console.log('[MOVER] Desativando');
    
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
    map.off('mousemove', onMapMouseMoveMover);
    map.off('click', onMapClickConfirmarMover);
    
    // Remover eventos dos polígonos e restaurar popups
    Object.values(terraManager.layers).forEach(function(tl) {
        if (tl.geometryLayer) {
            tl.geometryLayer.off('mousedown', onPolygonMouseDownMover);
            
            // Restaurar popup
            var layerName = tl.type === 'polygon' ? 
                tl.name + '_Poligono' : tl.name + '_Polilinha';
            tl.geometryLayer.bindPopup('<b>' + layerName + '</b>');
        }
    });
    
    showMessage('Ferramenta Mover Geometria (Mapa) desativada.', 'info');
};

// Adicionar ao listener de ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && moverGeometriaMapaAtivo) {
        desativarMoverGeometriaMapa();
    }
});
