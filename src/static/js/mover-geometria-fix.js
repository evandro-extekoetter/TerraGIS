// Sobrescrever função ativarMoverGeometriaMapa
window.ativarMoverGeometriaMapa = function() {
    if (moverGeometriaMapaAtivo) {
        desativarMoverGeometriaMapa();
        return;
    }
    
    const geometriasDisponiveis = Object.keys(terraManager.layers);
    if (geometriasDisponiveis.length === 0) {
        showMessage('Nenhuma geometria disponível para mover.', 'warning');
        return;
    }
    
    desativarTodasFerramentasEdicao();
    
    moverGeometriaMapaAtivo = true;
    geometriaSelecionada = null;
    
    const dropdown = document.createElement('select');
    dropdown.id = 'moverGeometriaDropdown';
    dropdown.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 10000; padding: 10px; font-size: 16px; background: white; border: 2px solid #007bff; border-radius: 5px;';
    
    const optionDefault = document.createElement('option');
    optionDefault.value = '';
    optionDefault.textContent = '-- Selecione a geometria para mover --';
    dropdown.appendChild(optionDefault);
    
    geometriasDisponiveis.forEach(layerName => {
        const option = document.createElement('option');
        option.value = layerName;
        option.textContent = layerName;
        dropdown.appendChild(option);
    });
    
    dropdown.addEventListener('change', function() {
        if (this.value) {
            selecionarGeometriaParaMover(this.value);
            this.remove();
        }
    });
    
    document.body.appendChild(dropdown);
    
    showMessage('Selecione a geometria no menu dropdown acima.', 'info');
};

window.selecionarGeometriaParaMover = function(layerName) {
    geometriaSelecionada = terraManager.layers[layerName];
    
    if (!geometriaSelecionada) {
        showMessage('Geometria não encontrada.', 'error');
        desativarMoverGeometriaMapa();
        return;
    }
    
    geometriaOriginal = geometriaSelecionada.vertices.map(v => ({e: v.e, n: v.n}));
    
    const primeiroVertice = geometriaSelecionada.vertices[0];
    pontoInicial = utmToLatLng(primeiroVertice.e, primeiroVertice.n, geometriaSelecionada.fuso);
    
    showMessage('Geometria "' + layerName + '" selecionada. Clique no mapa para mover para a nova posição. ESC para cancelar.', 'success');
    
    map.on('click', onMapClickMoverGeometria);
    map.on('mousemove', onMapMouseMoveMoverGeometria);
};

console.log('✅ Correção Mover Geometria (Mapa) carregada!');
