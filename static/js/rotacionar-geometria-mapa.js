// Ferramenta Rotacionar Geometria (Mapa) - TerraGIS v2.14
console.log('🔄 [v2.14] Iniciando carregamento de Rotacionar Geometria (Mapa)...');

var rotacionarGeometriaMapaAtivo = false;
var geometriaParaRotacionar = null;
var geometriaOriginalRotacao = null;
var verticeEixo = null;
var anguloInicial = null;  // Azimute do 1º clique
var previewLayerRotacao = null;

// Função principal: ativar ferramenta
function ativarRotacionarGeometriaMapa() {
    console.log('[ROTACIONAR v2.14] Ativando ferramenta Rotacionar Geometria (Mapa)');
    
    // Verificar se há camada ativa
    if (!terraManager.hasActiveLayer()) {
        showMessage('Nenhuma camada ativa! Selecione uma camada primeiro.', 'warning');
        return;
    }
    
    // Obter camada ativa
    geometriaParaRotacionar = terraManager.getActiveLayer();
    var layerName = terraManager.getActiveLayerName();
    
    if (!geometriaParaRotacionar || !geometriaParaRotacionar.vertices || geometriaParaRotacionar.vertices.length < 3) {
        showMessage('A camada selecionada não possui geometria válida!', 'error');
        return;
    }
    
    console.log('[ROTACIONAR v2.14] Usando camada ativa:', layerName);
    
    // Desativar outras ferramentas
    desativarTodasFerramentasEdicao();
    
    // Guardar cópia dos vértices originais
    geometriaOriginalRotacao = geometriaParaRotacionar.vertices.map(function(v) {
        return {
            name: v.name,
            e: parseFloat(v.e),
            n: parseFloat(v.n)
        };
    });
    
    // Encontrar vértice mais ao norte (maior N)
    verticeEixo = geometriaOriginalRotacao[0];
    for (var i = 1; i < geometriaOriginalRotacao.length; i++) {
        if (geometriaOriginalRotacao[i].n > verticeEixo.n) {
            verticeEixo = geometriaOriginalRotacao[i];
        }
    }
    
    console.log('[ROTACIONAR v2.14] Vértice eixo (mais ao norte): E=' + verticeEixo.e.toFixed(2) + ', N=' + verticeEixo.n.toFixed(2));
    
    // Ativar ferramenta
    rotacionarGeometriaMapaAtivo = true;
    anguloInicial = null;  // Será definido no mousedown
    
    // Desabilitar dragging do mapa
    map.dragging.disable();
    
    // Anexar eventos ao mapa
    map.on('mousedown', onMouseDownRotacionar);
    map.on('mousemove', onMouseMoveRotacionar);
    map.on('mouseup', onMouseUpRotacionar);
    
    // ESC para cancelar
    document.addEventListener('keydown', onKeyDownRotacionar);
    
    // Criar preview layer inicial (laranja)
    criarPreviewRotacao();
    
    // Mudar cursor
    map.getContainer().style.cursor = 'crosshair';
    
    console.log('[ROTACIONAR v2.14] Ferramenta ativada! Clique e arraste para rotacionar.');
    showMessage('🔄 Clique e arraste para rotacionar. ESC para cancelar.', 'info');
}

// Criar preview layer (laranja)
function criarPreviewRotacao() {
    if (previewLayerRotacao) {
        map.removeLayer(previewLayerRotacao);
    }
    
    // Converter vértices originais para LatLng
    var latlngs = geometriaOriginalRotacao.map(function(v) {
        return utmToLatLng(v.e, v.n, geometriaParaRotacionar.fuso);
    });
    
    // Criar preview laranja
    previewLayerRotacao = L.polygon(latlngs, {
        color: '#ff8800',
        weight: 3,
        fillOpacity: 0.3,
        fillColor: '#ff8800'
    }).addTo(map);
}

// MouseDown: Salvar ângulo inicial
function onMouseDownRotacionar(e) {
    if (!rotacionarGeometriaMapaAtivo) return;
    
    L.DomEvent.stopPropagation(e);
    
    // Converter posição do mouse para UTM
    var mouseUTM = latLongToUTM(e.latlng.lat, e.latlng.lng, geometriaParaRotacionar.fuso);
    
    // Calcular azimute entre eixo e ponto do 1º clique
    var dx = mouseUTM.e - verticeEixo.e;
    var dy = mouseUTM.n - verticeEixo.n;
    
    // Azimute topográfico: atan2(dx, dy) em graus
    anguloInicial = Math.atan2(dx, dy) * (180 / Math.PI);
    
    console.log('[ROTACIONAR v2.14] 🖱️ MouseDown - Ângulo inicial: ' + anguloInicial.toFixed(2) + '°');
}

// MouseMove: Atualizar preview com rotação
function onMouseMoveRotacionar(e) {
    if (!rotacionarGeometriaMapaAtivo || anguloInicial === null) return;
    
    L.DomEvent.stopPropagation(e);
    
    // Converter posição do mouse para UTM
    var mouseUTM = latLongToUTM(e.latlng.lat, e.latlng.lng, geometriaParaRotacionar.fuso);
    
    // Calcular azimute atual entre eixo e posição do mouse
    var dx = mouseUTM.e - verticeEixo.e;
    var dy = mouseUTM.n - verticeEixo.n;
    var anguloAtual = Math.atan2(dx, dy) * (180 / Math.PI);
    
    // Calcular diferença angular (deltaAngulo)
    var deltaAngulo = -(anguloAtual - anguloInicial); // Invertido para rotação seguir mouse
    
    // Rotacionar vértices originais pela diferença
    var verticesRotacionados = geometriaOriginalRotacao.map(function(v) {
        return rotacionarPonto(v, verticeEixo, deltaAngulo);
    });
    
    // Atualizar preview
    var latlngs = verticesRotacionados.map(function(v) {
        return utmToLatLng(v.e, v.n, geometriaParaRotacionar.fuso);
    });
    
    if (previewLayerRotacao) {
        previewLayerRotacao.setLatLngs(latlngs);
    }
}

// MouseUp: Aplicar rotação final
function onMouseUpRotacionar(e) {
    if (!rotacionarGeometriaMapaAtivo || anguloInicial === null) return;
    
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    
    console.log('[ROTACIONAR v2.14] 🖱️ MouseUp - finalizando rotação');
    
    // Converter posição do mouse para UTM
    var mouseUTM = latLongToUTM(e.latlng.lat, e.latlng.lng, geometriaParaRotacionar.fuso);
    
    // Calcular azimute final
    var dx = mouseUTM.e - verticeEixo.e;
    var dy = mouseUTM.n - verticeEixo.n;
    var anguloFinal = Math.atan2(dx, dy) * (180 / Math.PI);
    
    // Calcular diferença angular
    var deltaAngulo = -(anguloFinal - anguloInicial); // Invertido para rotação seguir mouse
    
    console.log('[ROTACIONAR v2.14] Rotação final: ' + deltaAngulo.toFixed(2) + '° (de ' + anguloInicial.toFixed(2) + '° para ' + anguloFinal.toFixed(2) + '°)');
    
    // Aplicar rotação aos vértices originais
    console.log('[DEBUG] Antes da rotação:', geometriaOriginalRotacao.map(function(v) { return v.name; }));
    geometriaParaRotacionar.vertices = geometriaOriginalRotacao.map(function(v) {
        return rotacionarPonto(v, verticeEixo, deltaAngulo);
    });
    console.log('[DEBUG] Depois da rotação:', geometriaParaRotacionar.vertices.map(function(v) { return v.name; }));
    
    // Atualizar geometria no mapa
    geometriaParaRotacionar.syncGeometry();
    
    // Finalizar ferramenta
    finalizarRotacionarGeometriaMapa();
    
    showMessage('✅ Geometria rotacionada ' + deltaAngulo.toFixed(2) + '° com sucesso!', 'success');
}

// Função auxiliar: rotacionar um ponto (E, N) em torno de um eixo por um ângulo (diferença angular)
function rotacionarPonto(ponto, eixo, anguloGraus) {
    var anguloRad = anguloGraus * (Math.PI / 180);
    
    // Transladar para origem
    var dx = ponto.e - eixo.e;
    var dy = ponto.n - eixo.n;
    
    // Rotacionar (fórmula padrão)
    var cosA = Math.cos(anguloRad);
    var sinA = Math.sin(anguloRad);
    
    var novoE = eixo.e + (dx * cosA - dy * sinA);
    var novoN = eixo.n + (dx * sinA + dy * cosA);
    
    return {
        name: ponto.name,
        e: novoE,
        n: novoN
    };
}

// ESC para cancelar
function onKeyDownRotacionar(e) {
    if (e.key === 'Escape' && rotacionarGeometriaMapaAtivo) {
        finalizarRotacionarGeometriaMapa();
        showMessage('Rotação cancelada.', 'info');
    }
}

// Finalizar ferramenta
function finalizarRotacionarGeometriaMapa() {
    console.log('[ROTACIONAR v2.14] Finalizando ferramenta');
    
    rotacionarGeometriaMapaAtivo = false;
    geometriaParaRotacionar = null;
    geometriaOriginalRotacao = null;
    verticeEixo = null;
    anguloInicial = null;
    
    // Remover preview
    if (previewLayerRotacao) {
        map.removeLayer(previewLayerRotacao);
        previewLayerRotacao = null;
    }
    
    // Remover eventos
    map.off('mousedown', onMouseDownRotacionar);
    map.off('mousemove', onMouseMoveRotacionar);
    map.off('mouseup', onMouseUpRotacionar);
    document.removeEventListener('keydown', onKeyDownRotacionar);
    
    // Restaurar cursor
    map.getContainer().style.cursor = '';
    
    // Reabilitar dragging do mapa
    map.dragging.enable();
    
    console.log('[ROTACIONAR v2.14] Ferramenta finalizada');
}

console.log('✅ [v2.14] Ferramenta Rotacionar Geometria (Mapa) carregada!');

