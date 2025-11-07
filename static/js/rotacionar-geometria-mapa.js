console.log('🔄 [v2.00] Iniciando carregamento de Rotacionar Geometria (Mapa)...');

// Variáveis globais para rotação
var geometriaParaRotacionar = null;
var geometriaOriginalRotacao = null;
var verticeEixo = null;
var previewLayerRotacao = null;
var arrastandoRotacao = false;
var mapContainerRotacao = null;

function ativarRotacionarGeometriaMapa() {
    console.log('[ROTACIONAR v2.00] Ativando ferramenta Rotacionar Geometria (Mapa)');
    
    try {
        // Verificar se há camada ativa
        if (!terraManager.activeLayerName) {
            alert('Nenhuma camada ativa! Selecione uma camada primeiro.');
            return;
        }
        
        geometriaParaRotacionar = terraManager.layers[terraManager.activeLayerName];
        
        if (!geometriaParaRotacionar) {
            alert('Camada ativa não encontrada!');
            return;
        }
        
        console.log('[ROTACIONAR v2.00] Usando camada ativa:', terraManager.activeLayerName);
        
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
        
        console.log('[ROTACIONAR v2.00] Vértice eixo (mais ao norte):', verticeEixo);
        
        // Fechar popups
        Object.values(terraManager.layers).forEach(function(tl) {
            if (tl.verticesLayer) {
                tl.verticesLayer.eachLayer(function(marker) {
                    if (marker.getPopup()) marker.closePopup();
                });
            }
        });
        
        // Ocultar polígono original
        if (geometriaParaRotacionar.geometryLayer) {
            geometriaParaRotacionar.geometryLayer.setStyle({opacity: 0, fillOpacity: 0});
        }
        
        // Criar preview layer (laranja)
        var coordsPreview = geometriaOriginalRotacao.map(function(v) {
            return utmToLatLng(v.e, v.n, geometriaParaRotacionar.fuso);
        });
        
        previewLayerRotacao = L.polygon(coordsPreview, {
            color: '#FFA500',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.3
        }).addTo(map);
        
        console.log('[ROTACIONAR v2.00] Preview layer criado');
        
        // Anexar eventos ao mapa
        mapContainerRotacao = map.getContainer();
        map.on('mousedown', onMouseDownRotacionar);
        map.on('mousemove', onMouseMoveRotacionar);
        map.on('mouseup', onMouseUpRotacionar);
        
        console.log('[ROTACIONAR v2.00] Anexando eventos ao mapa');
        
        mapContainerRotacao.style.cursor = 'crosshair';
        
        console.log('[ROTACIONAR v2.00] Ferramenta ativada!');
        
    } catch (error) {
        console.error('[ROTACIONAR v2.00] ❌ ERRO ao ativar:', error);
        finalizarRotacionarGeometriaMapa();
    }
}

function onMouseDownRotacionar(e) {
    if (!geometriaParaRotacionar) return;
    
    console.log('[ROTACIONAR v2.00] 🖱️ MouseDown - iniciando rotação');
    
    arrastandoRotacao = true;
    mapContainerRotacao.style.cursor = 'grabbing';
}

function onMouseMoveRotacionar(e) {
    if (!arrastandoRotacao || !geometriaParaRotacionar) return;
    
    try {
        var pontoAtual = e.latlng;
        
        // Converter eixo para LatLng
        var eixoLatLng = utmToLatLng(verticeEixo.e, verticeEixo.n, geometriaParaRotacionar.fuso);
        
        // Calcular ângulo ABSOLUTO do mouse em relação ao eixo (padrão CAD)
        var dx = pontoAtual.lng - eixoLatLng[1];
        var dy = pontoAtual.lat - eixoLatLng[0];
        var anguloAbsoluto = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // Rotacionar todos os vértices para o ângulo absoluto
        var novasCoords = geometriaOriginalRotacao.map(function(v) {
            var rotacionado = rotacionarPonto(v.e, v.n, verticeEixo.e, verticeEixo.n, anguloAbsoluto);
            return utmToLatLng(rotacionado.e, rotacionado.n, geometriaParaRotacionar.fuso);
        });
        
        previewLayerRotacao.setLatLngs(novasCoords);
        previewLayerRotacao.bringToFront();
        
    } catch (error) {
        console.error('[ROTACIONAR v2.00] ❌ Erro no mousemove:', error);
    }
}

function onMouseUpRotacionar(e) {
    if (!arrastandoRotacao || !geometriaParaRotacionar) return;
    
    arrastandoRotacao = false;
    mapContainerRotacao.style.cursor = 'crosshair';
    
    if (!e || !e.latlng) {
        console.log('[ROTACIONAR v2.00] MouseUp sem posição válida');
        finalizarRotacionarGeometriaMapa();
        return;
    }
    
    console.log('[ROTACIONAR v2.00] 🖱️ MouseUp - finalizando rotação');
    
    try {
        var pontoFinal = e.latlng;
        
        // Converter eixo para LatLng
        var eixoLatLng = utmToLatLng(verticeEixo.e, verticeEixo.n, geometriaParaRotacionar.fuso);
        
        // Calcular ângulo ABSOLUTO final
        var dx = pontoFinal.lng - eixoLatLng[1];
        var dy = pontoFinal.lat - eixoLatLng[0];
        var anguloAbsoluto = Math.atan2(dy, dx) * (180 / Math.PI);
        
        console.log('[ROTACIONAR v2.00] Ângulo absoluto final:', anguloAbsoluto.toFixed(2), 'graus');
        
        // Aplicar rotação aos vértices reais
        geometriaParaRotacionar.vertices.forEach(function(v, index) {
            var vOriginal = geometriaOriginalRotacao[index];
            var rotacionado = rotacionarPonto(vOriginal.e, vOriginal.n, verticeEixo.e, verticeEixo.n, anguloAbsoluto);
            v.e = rotacionado.e;
            v.n = rotacionado.n;
        });
        
        geometriaParaRotacionar.syncGeometry();
        
        // Restaurar visibilidade do polígono
        if (geometriaParaRotacionar.geometryLayer) {
            geometriaParaRotacionar.geometryLayer.setStyle({opacity: 1, fillOpacity: 0.2});
        }
        
        finalizarRotacionarGeometriaMapa();
        
    } catch (error) {
        console.error('[ROTACIONAR v2.00] ❌ ERRO ao rotacionar:', error);
        console.error('[ROTACIONAR v2.00] Stack:', error.stack);
        finalizarRotacionarGeometriaMapa();
    }
}

function finalizarRotacionarGeometriaMapa() {
    console.log('[ROTACIONAR v2.00] Finalizando ferramenta');
    
    // Remover preview
    if (previewLayerRotacao) {
        map.removeLayer(previewLayerRotacao);
        previewLayerRotacao = null;
    }
    
    // Restaurar visibilidade
    if (geometriaParaRotacionar && geometriaParaRotacionar.geometryLayer) {
        geometriaParaRotacionar.geometryLayer.setStyle({opacity: 1, fillOpacity: 0.2});
    }
    
    // Remover eventos
    if (map) {
        map.off('mousedown', onMouseDownRotacionar);
        map.off('mousemove', onMouseMoveRotacionar);
        map.off('mouseup', onMouseUpRotacionar);
    }
    
    // Restaurar cursor
    if (mapContainerRotacao) {
        mapContainerRotacao.style.cursor = '';
    }
    
    // Limpar variáveis
    geometriaParaRotacionar = null;
    geometriaOriginalRotacao = null;
    verticeEixo = null;
    arrastandoRotacao = false;
    mapContainerRotacao = null;
    
    console.log('[ROTACIONAR v2.00] Ferramenta finalizada');
}

function desativarRotacionarGeometriaMapa() {
    finalizarRotacionarGeometriaMapa();
}

// Função auxiliar: rotacionar um ponto (E, N) em torno de um eixo (eixoE, eixoN) por um ângulo ABSOLUTO em graus
function rotacionarPonto(e, n, eixoE, eixoN, anguloAbsolutoGraus) {
    var anguloRad = anguloAbsolutoGraus * (Math.PI / 180);
    
    // Transladar para origem
    var dx = e - eixoE;
    var dy = n - eixoN;
    
    // Rotacionar (fórmula padrão CAD)
    var cosA = Math.cos(anguloRad);
    var sinA = Math.sin(anguloRad);
    
    var novoE = eixoE + (dx * cosA - dy * sinA);
    var novoN = eixoN + (dx * sinA + dy * cosA);
    
    return {e: novoE, n: novoN};
}

console.log('✅ [v2.00] Ferramenta Rotacionar Geometria (Mapa) carregada!');

