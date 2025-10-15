// Correção para Mover Geometria (Mapa) - usando eventos DOM
console.log('✅ Correção Mover Geometria (Mapa) carregada!');

// Variáveis globais
var moverGeometriaMapaAtivo = false;
var geometriaSelecionada = null;
var geometriaOriginal = null;
var pontoInicial = null;
var previewLayer = null;
var mapContainer = null;
var mouseMoveHandler = null;
var clickHandler = null;

// Sobrescrever função original
window.openMoverGeometriaMapaDialog = function() {
    console.log('[MOVER] Abrindo dropdown');
    
    // Desativar outras ferramentas
    desativarTodasFerramentasEdicao();
    
    moverGeometriaMapaAtivo = true;
    
    // Criar dropdown
    var dropdown = document.createElement('div');
    dropdown.id = 'dropdown-mover-geometria';
    dropdown.style.cssText = 'position: absolute; top: 80px; left: 250px; z-index: 9999; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    
    var label = document.createElement('label');
    label.textContent = 'Selecione a geometria:';
    label.style.cssText = 'display: block; margin-bottom: 8px; font-weight: bold;';
    
    var select = document.createElement('select');
    select.style.cssText = 'width: 200px; padding: 8px;';
    select.innerHTML = '<option value="">-- Selecione --</option>';
    
    for (var nome in terraManager.layers) {
        var option = document.createElement('option');
        option.value = nome;
        option.textContent = nome;
        select.appendChild(option);
    }
    
    select.onchange = function() {
        if (this.value) {
            selecionarGeometriaParaMover(this.value);
            dropdown.remove();
        }
    };
    
    dropdown.appendChild(label);
    dropdown.appendChild(select);
    document.body.appendChild(dropdown);
    
    showMessage('Selecione a geometria no menu dropdown.', 'info');
};

function selecionarGeometriaParaMover(layerName) {
    geometriaSelecionada = terraManager.layers[layerName];
    
    if (!geometriaSelecionada) {
        showMessage('Geometria não encontrada.', 'error');
        desativarMoverGeometriaMapa();
        return;
    }
    
    console.log('[MOVER] Geometria selecionada:', layerName);
    
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
    };
    
    // Adicionar eventos DOM
    mapContainer.addEventListener('mousemove', mouseMoveHandler);
    mapContainer.addEventListener('click', clickHandler);
    
    // Mudar cursor
    mapContainer.style.cursor = 'move';
    
    // ESC para cancelar
    document.addEventListener('keydown', onKeyDownMover);
    
    showMessage('Mova o mouse para posicionar. Clique para fixar. ESC para cancelar.', 'success');
}

function onKeyDownMover(e) {
    if (e.key === 'Escape' && moverGeometriaMapaAtivo) {
        desativarMoverGeometriaMapa();
    }
}

// Sobrescrever desativar
window.desativarMoverGeometriaMapa = function() {
    if (!moverGeometriaMapaAtivo) return;
    
    console.log('[MOVER] Desativando');
    
    moverGeometriaMapaAtivo = false;
    geometriaSelecionada = null;
    geometriaOriginal = null;
    pontoInicial = null;
    
    // Restaurar cursor
    if (mapContainer) {
        mapContainer.style.cursor = '';
    }
    
    // Remover preview
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
    
    // Reabilitar dragging do mapa
    map.dragging.enable();
    
    // Remover evento ESC
    document.removeEventListener('keydown', onKeyDownMover);
    
    // Restaurar popups
    Object.values(terraManager.layers).forEach(function(tl) {
        if (tl.geometryLayer) {
            var layerName = tl.type === 'polygon' ? 
                tl.name + '_Poligono' : tl.name + '_Polilinha';
            tl.geometryLayer.bindPopup('<b>' + layerName + '</b>');
        }
    });
    
    // Remover dropdown se existir
    var dropdown = document.getElementById('dropdown-mover-geometria');
    if (dropdown) {
        dropdown.remove();
    }
    
    showMessage('Ferramenta Mover Geometria desativada.', 'info');
};

