// Ferramenta: Rotacionar Geometria (Mapa) - v1.00
// Rotaciona geometria usando drag-and-drop com vértice mais ao norte como eixo
console.log('🔄 [v1.00] Iniciando carregamento de Rotacionar Geometria (Mapa)...');

var rotacionarGeometriaMapaAtivo = false;
var geometriaParaRotacionar = null;
var geometriaOriginalRotacao = null;
var pontoInicialRotacao = null;
var arrastandoRotacao = false;
var previewLayerRotacao = null;
var mapContainerRotacao = null;
var verticeEixo = null; // Vértice mais ao norte (eixo de rotação)
var anguloInicial = null;

window.openRotacionarGeometriaMapaDialog = function() {
    console.log('[ROTACIONAR v1.00] Ativando ferramenta Rotacionar Geometria (Mapa)');
    
    try {
        if (!terraManager.hasActiveLayer()) {
            showMessage('⚠️ Selecione uma camada no painel CAMADAS primeiro!', 'warning');
            return;
        }
        
        geometriaParaRotacionar = terraManager.getActiveLayer();
        const layerName = terraManager.getActiveLayerName();
        
        console.log('[ROTACIONAR v1.00] Usando camada ativa:', layerName);
        console.log('[ROTACIONAR v1.00] geometriaParaRotacionar:', geometriaParaRotacionar);
    
        desativarTodasFerramentasEdicao();
        
        rotacionarGeometriaMapaAtivo = true;
        arrastandoRotacao = false;
        pontoInicialRotacao = null;
        anguloInicial = null;
        
        // Guardar cópia dos vértices originais
        geometriaOriginalRotacao = geometriaParaRotacionar.vertices.map(function(v) {
            return {name: v.name, e: v.e, n: v.n};
        });
        
        // Encontrar vértice mais ao NORTE (maior N)
        verticeEixo = geometriaOriginalRotacao[0];
        for (var i = 1; i < geometriaOriginalRotacao.length; i++) {
            if (geometriaOriginalRotacao[i].n > verticeEixo.n) {
                verticeEixo = geometriaOriginalRotacao[i];
            }
        }
        
        console.log('[ROTACIONAR v1.00] Vértice eixo (mais ao norte):', verticeEixo);
        
        // Fechar popups
        Object.values(terraManager.layers).forEach(function(tl) {
            if (tl.geometryLayer) {
                tl.geometryLayer.closePopup();
                tl.geometryLayer.unbindPopup();
            }
        });
        
        // Criar preview layer
        var coordsOriginais = geometriaParaRotacionar.vertices.map(function(v) {
            return utmToLatLng(v.e, v.n, geometriaParaRotacionar.fuso);
        });
        
        previewLayerRotacao = L.polygon(coordsOriginais, {
            color: 'orange',
            weight: 3,
            dashArray: '5, 5',
            fillOpacity: 0.2,
            fillColor: 'orange',
            interactive: false,
            pane: 'overlayPane'
        }).addTo(map);
        
        previewLayerRotacao.bringToFront();
        
        console.log('[ROTACIONAR v1.00] Preview layer criado');
        
        map.dragging.disable();
        
        mapContainerRotacao = map.getContainer();
        mapContainerRotacao.style.cursor = 'crosshair';
        
        // Capturar eventos do mapa
        console.log('[ROTACIONAR v1.00] Anexando eventos ao mapa');
        map.on('mousedown', onMouseDownRotacionar);
        map.on('mousemove', onMouseMoveRotacionar);
        map.on('mouseup', onMouseUpRotacionar);
        
        document.addEventListener('keydown', onKeyDownRotacionar);
        
        console.log('[ROTACIONAR v1.00] Ferramenta ativada!');
        showMessage('🔄 Clique e arraste para rotacionar o polígono. Eixo: vértice mais ao norte. ESC para cancelar.', 'info');
        
    } catch (error) {
        console.error('[ROTACIONAR v1.00] ❌ ERRO ao ativar ferramenta:', error);
        console.error('[ROTACIONAR v1.00] Stack:', error.stack);
        showMessage('❌ Erro ao ativar ferramenta Rotacionar Geometria: ' + error.message, 'error');
        finalizarRotacionarGeometriaMapa();
    }
};

function onMouseDownRotacionar(e) {
    if (!rotacionarGeometriaMapaAtivo || !geometriaParaRotacionar) {
        console.log('[ROTACIONAR v1.00] MouseDown ignorado - ferramenta não ativa');
        return;
    }
    
    console.log('[ROTACIONAR v1.00] 🖱️ MouseDown - iniciando rotação');
    
    arrastandoRotacao = true;
    pontoInicialRotacao = e.latlng;
    
    // Converter eixo para LatLng
    var eixoLatLng = utmToLatLng(verticeEixo.e, verticeEixo.n, geometriaParaRotacionar.fuso);
    
    // Calcular ângulo inicial (do eixo até o ponto de clique)
    anguloInicial = calcularAngulo(eixoLatLng, pontoInicialRotacao);
    
    console.log('[ROTACIONAR v1.00] Ângulo inicial:', anguloInicial.toFixed(2), 'graus');
    
    mapContainerRotacao.style.cursor = 'grabbing';
    
    // Esconder polígono original
    if (geometriaParaRotacionar.geometryLayer) {
        geometriaParaRotacionar.geometryLayer.setStyle({opacity: 0, fillOpacity: 0});
    }
    
    // Trazer preview para frente
    if (previewLayerRotacao) {
        previewLayerRotacao.bringToFront();
    }
    
    // Prevenir propagação
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    
    console.log('[ROTACIONAR v1.00] Rotação iniciada');
}

function onMouseMoveRotacionar(e) {
    if (!rotacionarGeometriaMapaAtivo || !geometriaParaRotacionar || !arrastandoRotacao || !pontoInicialRotacao || !previewLayerRotacao) {
        return;
    }
    
    try {
        var pontoAtual = e.latlng;
        
        // Converter eixo para LatLng
        var eixoLatLng = utmToLatLng(verticeEixo.e, verticeEixo.n, geometriaParaRotacionar.fuso);
        
        // Calcular ângulo atual
        var anguloAtual = calcularAngulo(eixoLatLng, pontoAtual);
        
        // Calcular diferença de ângulo (rotação)
        var deltaAngulo = anguloAtual - anguloInicial;
        
        // Rotacionar todos os vértices em torno do eixo
        var novasCoords = geometriaOriginalRotacao.map(function(v) {
            var rotacionado = rotacionarPonto(v.e, v.n, verticeEixo.e, verticeEixo.n, deltaAngulo);
            return utmToLatLng(rotacionado.e, rotacionado.n, geometriaParaRotacionar.fuso);
        });
        
        previewLayerRotacao.setLatLngs(novasCoords);
        previewLayerRotacao.bringToFront();
        
    } catch (error) {
        console.error('[ROTACIONAR v1.00] ❌ Erro no mousemove:', error);
        console.error('[ROTACIONAR v1.00] Stack:', error.stack);
    }
}

function onMouseUpRotacionar(e) {
    if (!rotacionarGeometriaMapaAtivo || !geometriaParaRotacionar || !arrastandoRotacao) {
        console.log('[ROTACIONAR v1.00] MouseUp ignorado - não está arrastando');
        return;
    }
    
    console.log('[ROTACIONAR v1.00] 🖱️ MouseUp - finalizando rotação');
    
    try {
        var pontoFinal = e.latlng;
        
        // Converter eixo para LatLng
        var eixoLatLng = utmToLatLng(verticeEixo.e, verticeEixo.n, geometriaParaRotacionar.fuso);
        
        // Calcular ângulo final
        var anguloFinal = calcularAngulo(eixoLatLng, pontoFinal);
        
        // Calcular rotação total
        var anguloRotacao = anguloFinal - anguloInicial;
        
        console.log('[ROTACIONAR v1.00] Rotação final:', anguloRotacao.toFixed(2), 'graus');
        
        // Aplicar rotação aos vértices reais
        var coordenadasValidas = true;
        geometriaParaRotacionar.vertices.forEach(function(v, index) {
            var vOriginal = geometriaOriginalRotacao[index];
            var rotacionado = rotacionarPonto(vOriginal.e, vOriginal.n, verticeEixo.e, verticeEixo.n, anguloRotacao);
            
            if (!isFinite(rotacionado.e) || !isFinite(rotacionado.n)) {
                console.error('[ROTACIONAR] Coordenada inválida no vértice', index, ':', rotacionado);
                console.error('[ROTACIONAR] vOriginal:', vOriginal, 'eixo:', verticeEixo, 'ângulo:', anguloRotacao);
                coordenadasValidas = false;
                return;
            }
            
            v.e = rotacionado.e;
            v.n = rotacionado.n;
        });
        
        if (!coordenadasValidas) {
            throw new Error('Coordenadas rotacionadas inválidas');
        }
        
        geometriaParaRotacionar.syncGeometry();
        
        // Restaurar visibilidade do polígono
        if (geometriaParaRotacionar.geometryLayer) {
            geometriaParaRotacionar.geometryLayer.setStyle({opacity: 1, fillOpacity: 0.2});
        }
        
        finalizarRotacionarGeometriaMapa();
        
        showMessage('✅ Geometria rotacionada! Ângulo: ' + anguloRotacao.toFixed(2) + '°', 'success');
        
    } catch (error) {
        console.error('[ROTACIONAR v1.00] ❌ ERRO ao rotacionar:', error);
        console.error('[ROTACIONAR v1.00] Stack:', error.stack);
        finalizarRotacionarGeometriaMapa();
        showMessage('❌ Erro ao rotacionar geometria: ' + error.message, 'error');
    }
}

function onKeyDownRotacionar(e) {
    if (e.key === 'Escape' && rotacionarGeometriaMapaAtivo) {
        console.log('[ROTACIONAR v1.00] ESC pressionado - cancelando');
        finalizarRotacionarGeometriaMapa();
        showMessage('❌ Rotação cancelada.', 'info');
    }
}

function finalizarRotacionarGeometriaMapa() {
    console.log('[ROTACIONAR v1.00] Finalizando ferramenta');
    
    rotacionarGeometriaMapaAtivo = false;
    arrastandoRotacao = false;
    
    if (mapContainerRotacao) {
        mapContainerRotacao.style.cursor = '';
    }
    
    if (previewLayerRotacao) {
        map.removeLayer(previewLayerRotacao);
        previewLayerRotacao = null;
    }
    
    // Remover eventos do mapa
    map.off('mousedown', onMouseDownRotacionar);
    map.off('mousemove', onMouseMoveRotacionar);
    map.off('mouseup', onMouseUpRotacionar);
    
    geometriaParaRotacionar = null;
    geometriaOriginalRotacao = null;
    pontoInicialRotacao = null;
    verticeEixo = null;
    anguloInicial = null;
    
    document.removeEventListener('keydown', onKeyDownRotacionar);
    
    // Restaurar popups
    Object.values(terraManager.layers).forEach(function(tl) {
        if (tl.geometryLayer) {
            var layerName = tl.type === 'polygon' ? 
                tl.name + '_Poligono' : tl.name + '_Polilinha';
            tl.geometryLayer.bindPopup('<b>' + layerName + '</b>');
        }
    });
    
    map.dragging.enable();
    
    console.log('[ROTACIONAR v1.00] Ferramenta finalizada');
}

function desativarRotacionarGeometriaMapa() {
    finalizarRotacionarGeometriaMapa();
}

// Função auxiliar: calcular ângulo entre dois pontos LatLng (em graus, sentido horário a partir do norte)
function calcularAngulo(centro, ponto) {
    var dy = ponto.lat - centro[0];
    var dx = ponto.lng - centro[1];
    var anguloRad = Math.atan2(dx, dy);
    var anguloGraus = anguloRad * (180 / Math.PI);
    return anguloGraus;
}

// Função auxiliar: rotacionar um ponto (E, N) em torno de um eixo (eixoE, eixoN) por um ângulo em graus
function rotacionarPonto(e, n, eixoE, eixoN, anguloGraus) {
    // Validar entradas
    if (!isFinite(e) || !isFinite(n) || !isFinite(eixoE) || !isFinite(eixoN) || !isFinite(anguloGraus)) {
        console.error('[rotacionarPonto] Entrada inválida: e=', e, 'n=', n, 'eixoE=', eixoE, 'eixoN=', eixoN, 'ângulo=', anguloGraus);
        return {e: NaN, n: NaN};
    }
    
    var anguloRad = anguloGraus * (Math.PI / 180);
    
    // Transladar para origem
    var dx = e - eixoE;
    var dy = n - eixoN;
    
    // Rotacionar
    var cosA = Math.cos(anguloRad);
    var sinA = Math.sin(anguloRad);
    
    var novoE = eixoE + (dx * cosA - dy * sinA);
    var novoN = eixoN + (dx * sinA + dy * cosA);
    
    return {e: novoE, n: novoN};
}

console.log('✅ [v1.00] Ferramenta Rotacionar Geometria (Mapa) carregada!');

