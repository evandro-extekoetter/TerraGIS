console.log('🔄 [v2.13] Iniciando carregamento de Rotacionar Geometria (Mapa)...');

// Variáveis globais para rotação
var geometriaParaRotacionar = null;
var geometriaOriginalRotacao = null;
var verticeEixo = null;
var previewLayerRotacao = null;
var arrastandoRotacao = false;
var mapContainerRotacao = null;

function ativarRotacionarGeometriaMapa() {
    console.log('[ROTACIONAR v2.13] Ativando ferramenta Rotacionar Geometria (Mapa)');
    
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
        
        if (!geometriaParaRotacionar.vertices || geometriaParaRotacionar.vertices.length < 3) {
            alert('A geometria precisa ter pelo menos 3 vértices!');
            return;
        }
        
        console.log('[ROTACIONAR v2.13] Usando camada ativa:', terraManager.activeLayerName);
        
        // Guardar cópia dos vértices originais
        geometriaOriginalRotacao = geometriaParaRotacionar.vertices.map(function(v) {
            return {name: v.name, e: parseFloat(v.e), n: parseFloat(v.n)};
        });
        
        // Encontrar vértice mais ao NORTE (maior N)
        verticeEixo = geometriaOriginalRotacao[0];
        for (var i = 1; i < geometriaOriginalRotacao.length; i++) {
            if (geometriaOriginalRotacao[i].n > verticeEixo.n) {
                verticeEixo = geometriaOriginalRotacao[i];
            }
        }
        
        console.log('[ROTACIONAR v2.13] Vértice eixo (mais ao norte): E=' + verticeEixo.e + ', N=' + verticeEixo.n);
        
        // Fechar popups
        Object.values(terraManager.layers).forEach(function(tl) {
            if (tl.verticesLayer) {
                tl.verticesLayer.eachLayer(function(marker) {
                    if (marker.getPopup()) marker.closePopup();
                });
            }
        });
        
        // Criar layer de preview (laranja)
        var coordsOriginais = geometriaOriginalRotacao.map(function(v) {
            return utmToLatLng(v.e, v.n, geometriaParaRotacionar.fuso);
        });
        
        previewLayerRotacao = L.polygon(coordsOriginais, {
            color: '#ff8800',
            weight: 2,
            fillOpacity: 0.2,
            interactive: false
        }).addTo(map);
        
        // Anexar eventos ao mapa
        mapContainerRotacao = document.getElementById('map');
        map.on('mousedown', onMouseDownRotacionar);
        map.on('mousemove', onMouseMoveRotacionar);
        map.on('mouseup', onMouseUpRotacionar);
        
        // Cursor
        mapContainerRotacao.style.cursor = 'crosshair';
        
        console.log('[ROTACIONAR v2.13] Ferramenta ativada! Clique e arraste para rotacionar.');
        
    } catch (error) {
        console.error('[ROTACIONAR v2.13] ❌ ERRO ao ativar:', error);
        finalizarRotacionarGeometriaMapa();
    }
}

function onMouseDownRotacionar(e) {
    if (!geometriaParaRotacionar) return;
    
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
        var novasCoords = [];
        for (var i = 0; i < geometriaOriginalRotacao.length; i++) {
            var v = geometriaOriginalRotacao[i];
            var rotacionado = rotacionarPonto(v.e, v.n, verticeEixo.e, verticeEixo.n, anguloAbsoluto);
            
            // Validar coordenadas rotacionadas
            if (!isFinite(rotacionado.e) || !isFinite(rotacionado.n)) {
                console.error('[ROTACIONAR v2.13] Coordenada inválida no vértice ' + i + ': E=' + rotacionado.e + ', N=' + rotacionado.n);
                return; // Abortar preview
            }
            
            var coord = utmToLatLng(rotacionado.e, rotacionado.n, geometriaParaRotacionar.fuso);
            novasCoords.push(coord);
        }
        
        previewLayerRotacao.setLatLngs(novasCoords);
        previewLayerRotacao.bringToFront();
        
    } catch (error) {
        console.error('[ROTACIONAR v2.13] ❌ Erro no mousemove:', error);
    }
}

function onMouseUpRotacionar(e) {
    if (!arrastandoRotacao || !geometriaParaRotacionar) return;
    
    arrastandoRotacao = false;
    mapContainerRotacao.style.cursor = 'crosshair';
    
    if (!e || !e.latlng) {
        console.log('[ROTACIONAR v2.13] MouseUp sem posição válida');
        finalizarRotacionarGeometriaMapa();
        return;
    }
    
    try {
        var pontoFinal = e.latlng;
        
        // Converter eixo para LatLng
        var eixoLatLng = utmToLatLng(verticeEixo.e, verticeEixo.n, geometriaParaRotacionar.fuso);
        
        // Calcular ângulo ABSOLUTO final
        var dx = pontoFinal.lng - eixoLatLng[1];
        var dy = pontoFinal.lat - eixoLatLng[0];
        var anguloFinal = Math.atan2(dy, dx) * (180 / Math.PI);
        
        console.log('[ROTACIONAR v2.13] Rotação final: ' + anguloFinal.toFixed(2) + ' graus');
        
        // Rotacionar todos os vértices
        var verticesRotacionados = [];
        for (var i = 0; i < geometriaOriginalRotacao.length; i++) {
            var v = geometriaOriginalRotacao[i];
            var rotacionado = rotacionarPonto(v.e, v.n, verticeEixo.e, verticeEixo.n, anguloFinal);
            
            // Validar coordenadas
            if (!isFinite(rotacionado.e) || !isFinite(rotacionado.n)) {
                alert('Erro: Coordenadas inválidas geradas durante a rotação!');
                finalizarRotacionarGeometriaMapa();
                return;
            }
            
            verticesRotacionados.push({
                name: v.name,
                e: rotacionado.e,
                n: rotacionado.n
            });
        }
        
        // Atualizar geometria
        geometriaParaRotacionar.vertices = verticesRotacionados;
        geometriaParaRotacionar.syncGeometry();
        
        console.log('[ROTACIONAR v2.13] ✅ Rotação aplicada com sucesso!');
        finalizarRotacionarGeometriaMapa();
        
    } catch (error) {
        console.error('[ROTACIONAR v2.13] ❌ ERRO ao rotacionar:', error);
        alert('Erro ao aplicar rotação: ' + error.message);
        finalizarRotacionarGeometriaMapa();
    }
}

function finalizarRotacionarGeometriaMapa() {
    // Remover eventos
    if (map) {
        map.off('mousedown', onMouseDownRotacionar);
        map.off('mousemove', onMouseMoveRotacionar);
        map.off('mouseup', onMouseUpRotacionar);
    }
    
    // Remover preview
    if (previewLayerRotacao && map) {
        map.removeLayer(previewLayerRotacao);
        previewLayerRotacao = null;
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
    
    console.log('[ROTACIONAR v2.13] Ferramenta finalizada');
}

function desativarRotacionarGeometriaMapa() {
    finalizarRotacionarGeometriaMapa();
}

// Função auxiliar: rotacionar um ponto (E, N) em torno de um eixo (eixoE, eixoN) por um ângulo ABSOLUTO em graus
function rotacionarPonto(e, n, eixoE, eixoN, anguloAbsolutoGraus) {
    // Validar entradas
    if (!isFinite(e) || !isFinite(n) || !isFinite(eixoE) || !isFinite(eixoN) || !isFinite(anguloAbsolutoGraus)) {
        console.error('[rotacionarPonto] Entrada inválida: e=' + e + ', n=' + n + ', eixoE=' + eixoE + ', eixoN=' + eixoN + ', ângulo=' + anguloAbsolutoGraus);
        return {e: NaN, n: NaN};
    }
    
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

console.log('✅ [v2.13] Ferramenta Rotacionar Geometria (Mapa) carregada!');

