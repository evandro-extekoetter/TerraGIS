// Ferramenta Rotacionar Geometria - TerraGIS
console.log('🔄 Iniciando carregamento de Rotacionar Geometria...');

var rotacionarAtivo = false;
var geometriaParaRotacionar = null;
var verticeEixo = null;
var anguloAtual = 0;
var previewLayerRotacao = null;

// Abrir diálogo de rotação
function openRotacionarGeometriaDialog() {
    console.log('📋 Abrindo diálogo de rotação');
    
    // Desativar outras ferramentas
    desativarTodasFerramentasEdicao();
    
    rotacionarAtivo = true;
    
    // Criar modal
    var modal = document.createElement('div');
    modal.id = 'modalRotacionar';
    modal.innerHTML = '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">' +
        '<div style="background: white; padding: 30px; border-radius: 8px; max-width: 500px; width: 90%;">' +
        '<h3 style="margin: 0 0 20px 0; color: #333;">🔄 Rotacionar Geometria</h3>' +
        '<label style="display: block; margin-bottom: 10px; font-weight: bold;">Selecione a geometria:</label>' +
        '<select id="selectGeometriaRotacionar" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px;">' +
        '<option value="">-- Selecione --</option>' +
        '</select>' +
        '<label style="display: block; margin-bottom: 10px; font-weight: bold;">Modo de rotação:</label>' +
        '<div style="display: flex; gap: 10px; margin-bottom: 20px;">' +
        '<button id="btnRotacionarMapa" style="flex: 1; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">🗺️ Mapa (Livre)</button>' +
        '<button id="btnRotacionarAngulo" style="flex: 1; padding: 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">📐 Ângulo Específico</button>' +
        '</div>' +
        '<div style="text-align: right;">' +
        '<button id="btnCancelarRotacionar" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    
    document.body.appendChild(modal);
    
    // Preencher dropdown com geometrias
    var select = document.getElementById('selectGeometriaRotacionar');
    for (var nome in terraManager.layers) {
        var option = document.createElement('option');
        option.value = nome;
        option.textContent = nome;
        select.appendChild(option);
    }
    
    // Event listeners
    document.getElementById('btnRotacionarMapa').onclick = function() {
        var geometriaNome = document.getElementById('selectGeometriaRotacionar').value;
        if (!geometriaNome) {
            showMessage('Selecione uma geometria primeiro!', 'warning');
            return;
        }
        document.getElementById('modalRotacionar').remove();
        iniciarRotacaoMapa(geometriaNome);
    };
    
    document.getElementById('btnRotacionarAngulo').onclick = function() {
        var geometriaNome = document.getElementById('selectGeometriaRotacionar').value;
        if (!geometriaNome) {
            showMessage('Selecione uma geometria primeiro!', 'warning');
            return;
        }
        document.getElementById('modalRotacionar').remove();
        abrirDialogoAnguloEspecifico(geometriaNome);
    };
    
    document.getElementById('btnCancelarRotacionar').onclick = function() {
        document.getElementById('modalRotacionar').remove();
        rotacionarAtivo = false;
    };
}

function encontrarVerticeMaisAoNorte(vertices) {
    var verticeMaisNorte = vertices[0];
    for (var i = 1; i < vertices.length; i++) {
        if (vertices[i].n > verticeMaisNorte.n) {
            verticeMaisNorte = vertices[i];
        }
    }
    return verticeMaisNorte;
}

function rotacionarPonto(ponto, eixo, anguloGraus) {
    var anguloRad = anguloGraus * Math.PI / 180;
    var cos = Math.cos(anguloRad);
    var sin = Math.sin(anguloRad);
    
    var dx = ponto.e - eixo.e;
    var dy = ponto.n - eixo.n;
    
    return {
        e: eixo.e + (dx * cos - dy * sin),
        n: eixo.n + (dx * sin + dy * cos)
    };
}

var mapContainerRotacao = null;
var mouseMoveHandlerRotacao = null;
var clickHandlerRotacao = null;

function iniciarRotacaoMapa(nomeGeometria) {
    geometriaParaRotacionar = terraManager.layers[nomeGeometria];
    
    if (!geometriaParaRotacionar) {
        showMessage('Geometria não encontrada.', 'error');
        return;
    }
    
    console.log('[ROTACIONAR] Geometria selecionada:', nomeGeometria);
    
    // Desabilitar popups
    Object.values(terraManager.layers).forEach(function(tl) {
        if (tl.geometryLayer) {
            tl.geometryLayer.closePopup();
            tl.geometryLayer.unbindPopup();
        }
    });
    
    rotacionarAtivo = true;
    verticeEixo = encontrarVerticeMaisAoNorte(geometriaParaRotacionar.vertices);
    anguloAtual = 0;
    
    // Desabilitar dragging do mapa
    map.dragging.disable();
    
    // Obter container do mapa
    mapContainerRotacao = map.getContainer();
    
    // Criar handlers de eventos DOM
    mouseMoveHandlerRotacao = function(e) {
        if (!rotacionarAtivo || !geometriaParaRotacionar) return;
        
        // Converter posição do mouse para coordenadas do mapa
        var containerPoint = L.point(e.clientX - mapContainerRotacao.getBoundingClientRect().left, 
                                      e.clientY - mapContainerRotacao.getBoundingClientRect().top);
        var mouseLatLng = map.containerPointToLatLng(containerPoint);
        
        // Converter mouse LatLng para UTM
        var mouseUTM = latLngToUtm(mouseLatLng.lat, mouseLatLng.lng, geometriaParaRotacionar.fuso);
        
        // Calcular ângulo entre eixo e mouse em coordenadas UTM
        var dx = mouseUTM.e - verticeEixo.e;
        var dy = mouseUTM.n - verticeEixo.n;
        anguloAtual = Math.atan2(dx, dy) * 180 / Math.PI;
        
        // Atualizar preview
        atualizarPreviewRotacao();
    };
    
    clickHandlerRotacao = function(e) {
        if (!rotacionarAtivo) return;
        
        e.stopPropagation();
        e.preventDefault();
        
        console.log('[ROTACIONAR] Confirmando rotação');
        
        aplicarRotacao();
        finalizarRotacao();
    };
    
    // Adicionar eventos DOM
    mapContainerRotacao.addEventListener('mousemove', mouseMoveHandlerRotacao);
    mapContainerRotacao.addEventListener('click', clickHandlerRotacao);
    
    // Mudar cursor
    mapContainerRotacao.style.cursor = 'crosshair';
    
    // ESC para cancelar
    document.addEventListener('keydown', onKeyDownRotacao);
    
    // Criar preview inicial
    atualizarPreviewRotacao();
    
    showMessage('Mova o mouse para rotacionar. Clique para confirmar. ESC para cancelar.', 'info');
}

function onMouseMoveRotacao(e) {
    if (!rotacionarAtivo || !geometriaParaRotacionar) return;
    
    var eixoLatLng = utmToLatLng(verticeEixo.e, verticeEixo.n, geometriaParaRotacionar.fuso);
    var mouseLatLng = e.latlng;
    
    // Calcular ângulo entre eixo e mouse
    var dx = mouseLatLng.lng - eixoLatLng.lng;
    var dy = mouseLatLng.lat - eixoLatLng.lat;
    anguloAtual = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Atualizar preview
    atualizarPreviewRotacao();
}

function onClickConfirmarRotacao(e) {
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    
    if (!rotacionarAtivo) return;
    
    aplicarRotacao();
    finalizarRotacao();
}

function onKeyDownRotacao(e) {
    if (e.key === 'Escape' && rotacionarAtivo) {
        finalizarRotacao();
        showMessage('Rotação cancelada.', 'info');
    }
}

function atualizarPreviewRotacao() {
    if (previewLayerRotacao) {
        map.removeLayer(previewLayerRotacao);
    }
    
    // Rotacionar todos os vértices
    var verticesRotacionados = geometriaParaRotacionar.vertices.map(function(v) {
        return rotacionarPonto(v, verticeEixo, anguloAtual);
    });
    
    // Converter para LatLng
    var latlngs = verticesRotacionados.map(function(v) {
        return utmToLatLng(v.e, v.n, geometriaParaRotacionar.fuso);
    });
    
    // Criar preview
    previewLayerRotacao = L.polygon(latlngs, {
        color: 'red',
        weight: 2,
        dashArray: '5, 5',
        fillOpacity: 0.1
    }).addTo(map);
}

function aplicarRotacao() {
    // Rotacionar todos os vértices
    geometriaParaRotacionar.vertices = geometriaParaRotacionar.vertices.map(function(v) {
        return rotacionarPonto(v, verticeEixo, anguloAtual);
    });
    
    // Atualizar geometria no mapa
    geometriaParaRotacionar.syncGeometry();
    
    showMessage('Geometria rotacionada ' + anguloAtual.toFixed(2) + '° com sucesso!', 'success');
}

function finalizarRotacao() {
    rotacionarAtivo = false;
    geometriaParaRotacionar = null;
    verticeEixo = null;
    anguloAtual = 0;
    
    // Restaurar cursor
    if (mapContainerRotacao) {
        mapContainerRotacao.style.cursor = '';
    }
    
    if (previewLayerRotacao) {
        map.removeLayer(previewLayerRotacao);
        previewLayerRotacao = null;
    }
    
    // Remover eventos DOM
    if (mapContainerRotacao && mouseMoveHandlerRotacao) {
        mapContainerRotacao.removeEventListener('mousemove', mouseMoveHandlerRotacao);
    }
    if (mapContainerRotacao && clickHandlerRotacao) {
        mapContainerRotacao.removeEventListener('click', clickHandlerRotacao);
    }
    
    mouseMoveHandlerRotacao = null;
    clickHandlerRotacao = null;
    
    // Restaurar popups
    Object.values(terraManager.layers).forEach(function(tl) {
        if (tl.geometryLayer) {
            var layerName = tl.type === 'polygon' ? 
                tl.name + '_Poligono' : tl.name + '_Polilinha';
            tl.geometryLayer.bindPopup('<b>' + layerName + '</b>');
        }
    });
    
    document.removeEventListener('keydown', onKeyDownRotacao);
    
    // Reabilitar dragging do mapa
    map.dragging.enable();
}

function abrirDialogoAnguloEspecifico(nomeGeometria) {
    var modal = document.createElement('div');
    modal.id = 'modalAnguloEspecifico';
    modal.innerHTML = '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">' +
        '<div style="background: white; padding: 30px; border-radius: 8px; max-width: 400px; width: 90%;">' +
        '<h3 style="margin: 0 0 20px 0; color: #333;">📐 Rotacionar por Ângulo</h3>' +
        '<label style="display: block; margin-bottom: 10px; font-weight: bold;">Ângulo (GG,MMSS):</label>' +
        '<input type="text" id="inputAngulo" placeholder="Ex: 45,3015" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px;">' +
        '<label style="display: block; margin-bottom: 10px; font-weight: bold;">Sentido:</label>' +
        '<select id="selectSentido" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px;">' +
        '<option value="horario">Horário</option>' +
        '<option value="antihorario">Anti-horário</option>' +
        '</select>' +
        '<div style="display: flex; gap: 10px;">' +
        '<button id="btnAplicarAngulo" style="flex: 1; padding: 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Aplicar</button>' +
        '<button id="btnCancelarAngulo" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    
    document.body.appendChild(modal);
    
    document.getElementById('btnAplicarAngulo').onclick = function() {
        var anguloStr = document.getElementById('inputAngulo').value;
        var sentido = document.getElementById('selectSentido').value;
        
        if (!anguloStr) {
            showMessage('Digite um ângulo!', 'warning');
            return;
        }
        
        var partes = anguloStr.split(',');
        if (partes.length !== 2) {
            showMessage('Formato inválido! Use GG,MMSS (ex: 45,3015)', 'error');
            return;
        }
        
        var graus = parseFloat(partes[0]);
        var mmss = parseFloat(partes[1]);
        var minutos = Math.floor(mmss / 100);
        var segundos = mmss % 100;
        
        var anguloDecimal = graus + (minutos / 60) + (segundos / 3600);
        
        if (sentido === 'horario') {
            anguloDecimal = -anguloDecimal;
        }
        
        var geometria = terraManager.layers[nomeGeometria];
        if (!geometria) {
            showMessage('Geometria não encontrada.', 'error');
            return;
        }
        
        var eixo = encontrarVerticeMaisAoNorte(geometria.vertices);
        geometria.vertices = geometria.vertices.map(function(v) {
            return rotacionarPonto(v, eixo, anguloDecimal);
        });
        geometria.syncGeometry();
        
        document.getElementById('modalAnguloEspecifico').remove();
        showMessage('Geometria rotacionada ' + anguloDecimal.toFixed(4) + '° com sucesso!', 'success');
    };
    
    document.getElementById('btnCancelarAngulo').onclick = function() {
        document.getElementById('modalAnguloEspecifico').remove();
    };
}

// Listener ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && rotacionarAtivo) {
        finalizarRotacao();
    }
});

console.log('✅ Ferramenta Rotacionar Geometria carregada!');
