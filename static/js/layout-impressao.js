// ===== MÓDULO DE LAYOUT DE IMPRESSÃO =====
// Estilo QGIS Print Layout
// Viewport interativo + Campos editáveis + Exportação PDF A4

var layoutImpressao = {
    modalAberto: false,
    mapaViewport: null,
    configuracao: {
        titulo: '',
        responsavel: '',
        observacoes: '',
        data: ''
    }
};

// ===== ABRIR MÓDULO DE LAYOUT =====
function abrirLayoutImpressao() {
    console.log('[LAYOUT] Abrindo módulo de impressão');
    
    // Criar modal
    criarModalLayoutImpressao();
    
    // Inicializar data com hoje
    var hoje = new Date();
    var dataFormatada = hoje.getDate().toString().padStart(2, '0') + '/' + 
                        (hoje.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                        hoje.getFullYear();
    document.getElementById('layout-data').value = dataFormatada;
    layoutImpressao.configuracao.data = dataFormatada;
    
    // Inicializar viewport do mapa
    setTimeout(function() {
        inicializarViewportMapa();
    }, 100);
    
    layoutImpressao.modalAberto = true;
}

// ===== CRIAR MODAL HTML =====
function criarModalLayoutImpressao() {
    // Remover modal existente se houver
    var modalExistente = document.getElementById('modal-layout-impressao');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    var modalHTML = `
        <div id="modal-layout-impressao" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.8);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <div style="
                width: 95%;
                height: 95%;
                background: white;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
            ">
                <!-- Cabeçalho -->
                <div style="
                    padding: 15px 20px;
                    border-bottom: 1px solid #ddd;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #2c3e50;
                    color: white;
                    border-radius: 8px 8px 0 0;
                ">
                    <h2 style="margin: 0; font-size: 20px;">📄 Layout de Impressão</h2>
                    <button onclick="fecharLayoutImpressao()" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                    ">×</button>
                </div>
                
                <!-- Conteúdo Principal -->
                <div style="
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                ">
                    <!-- Painel Esquerdo: Configurações -->
                    <div style="
                        width: 350px;
                        padding: 20px;
                        border-right: 1px solid #ddd;
                        overflow-y: auto;
                    ">
                        <h3 style="margin-top: 0;">⚙️ Configurações</h3>
                        
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Título:</label>
                        <input type="text" id="layout-titulo" 
                            placeholder="Digite o título do mapa"
                            oninput="atualizarPreviewLayout()"
                            style="
                                width: 100%;
                                padding: 8px;
                                margin-bottom: 15px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                box-sizing: border-box;
                            ">
                        
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Responsável:</label>
                        <input type="text" id="layout-responsavel" 
                            placeholder="Nome do responsável"
                            oninput="atualizarPreviewLayout()"
                            style="
                                width: 100%;
                                padding: 8px;
                                margin-bottom: 15px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                box-sizing: border-box;
                            ">
                        
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Observações:</label>
                        <textarea id="layout-observacoes" 
                            placeholder="Observações adicionais"
                            oninput="atualizarPreviewLayout()"
                            rows="4"
                            style="
                                width: 100%;
                                padding: 8px;
                                margin-bottom: 15px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                box-sizing: border-box;
                                resize: vertical;
                            "></textarea>
                        
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Data:</label>
                        <input type="text" id="layout-data" 
                            placeholder="DD/MM/AAAA"
                            oninput="atualizarPreviewLayout()"
                            style="
                                width: 100%;
                                padding: 8px;
                                margin-bottom: 25px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                box-sizing: border-box;
                            ">
                        
                        <button onclick="gerarPDFLayout()" style="
                            width: 100%;
                            padding: 12px;
                            background: #27ae60;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                            margin-bottom: 10px;
                        ">📥 Gerar PDF</button>
                        
                        <button onclick="fecharLayoutImpressao()" style="
                            width: 100%;
                            padding: 12px;
                            background: #e74c3c;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                        ">✖ Cancelar</button>
                    </div>
                    
                    <!-- Painel Direito: Preview A4 -->
                    <div style="
                        flex: 1;
                        padding: 20px;
                        background: #f5f5f5;
                        overflow: auto;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <div id="preview-a4-container" style="
                            width: 210mm;
                            height: 297mm;
                            background: white;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                            position: relative;
                        ">
                            <!-- Viewport do Mapa -->
                            <div id="viewport-mapa" style="
                                position: absolute;
                                top: 10mm;
                                left: 10mm;
                                right: 10mm;
                                bottom: 70mm;
                                border: 1mm solid black;
                                overflow: hidden;
                            ">
                                <!-- Mapa será inserido aqui -->
                            </div>
                            
                            <!-- Controles do Viewport -->
                            <div style="
                                position: absolute;
                                top: 15mm;
                                left: 15mm;
                                background: white;
                                border: 1px solid #ccc;
                                border-radius: 4px;
                                padding: 5px;
                                z-index: 1000;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            ">
                                <button onclick="zoomInViewport()" style="
                                    display: block;
                                    width: 30px;
                                    height: 30px;
                                    margin-bottom: 2px;
                                    background: white;
                                    border: 1px solid #ccc;
                                    cursor: pointer;
                                    font-size: 18px;
                                    font-weight: bold;
                                ">+</button>
                                <button onclick="zoomOutViewport()" style="
                                    display: block;
                                    width: 30px;
                                    height: 30px;
                                    margin-bottom: 2px;
                                    background: white;
                                    border: 1px solid #ccc;
                                    cursor: pointer;
                                    font-size: 18px;
                                    font-weight: bold;
                                ">−</button>
                                <button onclick="enquadrarGeometriaViewport()" title="Enquadrar geometria ativa" style="
                                    display: block;
                                    width: 30px;
                                    height: 30px;
                                    background: white;
                                    border: 1px solid #ccc;
                                    cursor: pointer;
                                    font-size: 14px;
                                ">🎯</button>
                            </div>
                            
                            <!-- Seta Norte -->
                            <div style="
                                position: absolute;
                                top: 15mm;
                                right: 15mm;
                                font-size: 40px;
                                z-index: 1000;
                            ">↑</div>
                            
                            <!-- Rodapé: Título -->
                            <div style="
                                position: absolute;
                                bottom: 50mm;
                                left: 10mm;
                                right: 10mm;
                                height: 15mm;
                                border: 1mm solid black;
                                border-top: none;
                                padding: 2mm;
                                display: flex;
                                flex-direction: column;
                            ">
                                <div style="font-size: 8px; font-weight: bold;">título:</div>
                                <div id="preview-titulo" style="font-size: 14px; font-weight: bold; text-align: center; flex: 1; display: flex; align-items: center; justify-content: center;">TITULO (EDITAVEL)</div>
                            </div>
                            
                            <!-- Rodapé: Responsável e Observações -->
                            <div style="
                                position: absolute;
                                bottom: 20mm;
                                left: 10mm;
                                right: 10mm;
                                height: 30mm;
                                border: 1mm solid black;
                                border-top: none;
                                display: flex;
                            ">
                                <!-- Responsável -->
                                <div style="
                                    flex: 1;
                                    border-right: 1mm solid black;
                                    padding: 2mm;
                                    display: flex;
                                    flex-direction: column;
                                ">
                                    <div style="font-size: 8px; font-weight: bold;">Responsavel:</div>
                                    <div id="preview-responsavel" style="font-size: 10px; flex: 1; overflow: hidden;">RESPONSAVEL (EDITAVEL)</div>
                                </div>
                                
                                <!-- Observações -->
                                <div style="
                                    flex: 1;
                                    padding: 2mm;
                                    display: flex;
                                    flex-direction: column;
                                ">
                                    <div style="font-size: 8px; font-weight: bold;">Observações</div>
                                    <div id="preview-observacoes" style="font-size: 10px; flex: 1; overflow: hidden;">OBSERVAÇÕES (EDITAVEL)</div>
                                </div>
                            </div>
                            
                            <!-- Rodapé: Data -->
                            <div style="
                                position: absolute;
                                bottom: 10mm;
                                left: 10mm;
                                right: 10mm;
                                height: 10mm;
                                border: 1mm solid black;
                                border-top: none;
                                padding: 2mm;
                                display: flex;
                                flex-direction: column;
                            ">
                                <div style="font-size: 8px; font-weight: bold;">Data:</div>
                                <div id="preview-data" style="font-size: 10px;">DATAL 00/00/00 (EDITAVEL)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ===== FECHAR MODAL =====
function fecharLayoutImpressao() {
    console.log('[LAYOUT] Fechando módulo de impressão');
    
    // Destruir mapa viewport
    if (layoutImpressao.mapaViewport) {
        layoutImpressao.mapaViewport.remove();
        layoutImpressao.mapaViewport = null;
    }
    
    // Remover modal
    var modal = document.getElementById('modal-layout-impressao');
    if (modal) {
        modal.remove();
    }
    
    layoutImpressao.modalAberto = false;
}

// ===== INICIALIZAR VIEWPORT DO MAPA =====
function inicializarViewportMapa() {
    console.log('[LAYOUT] Inicializando viewport do mapa');
    
    var container = document.getElementById('viewport-mapa');
    if (!container) {
        console.error('[LAYOUT] Container viewport-mapa não encontrado');
        return;
    }
    
    // Criar mapa Leaflet independente
    layoutImpressao.mapaViewport = L.map('viewport-mapa', {
        zoomControl: true,
        attributionControl: false
    });
    
    // Adicionar camada base (mesma do mapa principal)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(layoutImpressao.mapaViewport);
    
    // Copiar centro e zoom do mapa principal
    var centro = map.getCenter();
    var zoom = map.getZoom();
    layoutImpressao.mapaViewport.setView(centro, zoom);
    
    // Copiar camadas do mapa principal
    copiarCamadasParaViewport();
    
    console.log('[LAYOUT] Viewport inicializado');
}

// ===== COPIAR CAMADAS DO MAPA PRINCIPAL =====
function copiarCamadasParaViewport() {
    console.log('[LAYOUT] Copiando camadas para viewport');
    
    if (!terraManager || !layoutImpressao.mapaViewport) {
        return;
    }
    
    // Percorrer todas as camadas do terraManager
    for (var key in terraManager.layers) {
        var layer = terraManager.layers[key];
        
        if (!layer.visible) {
            continue; // Pular camadas invisíveis
        }
        
        // Copiar polígonos/polilinhas
        if (layer.group) {
            layer.group.eachLayer(function(l) {
                if (l instanceof L.Polygon || l instanceof L.Polyline) {
                    var coords = l.getLatLngs();
                    var copia = l instanceof L.Polygon ? 
                        L.polygon(coords, {color: l.options.color, weight: 2}) :
                        L.polyline(coords, {color: l.options.color, weight: 2});
                    copia.addTo(layoutImpressao.mapaViewport);
                } else if (l instanceof L.CircleMarker || l instanceof L.Marker) {
                    var latlng = l.getLatLng();
                    L.circleMarker(latlng, {
                        radius: 4,
                        color: l.options.color || 'blue',
                        fillColor: l.options.fillColor || 'blue',
                        fillOpacity: 0.8
                    }).addTo(layoutImpressao.mapaViewport);
                }
            });
        }
    }
    
    console.log('[LAYOUT] Camadas copiadas');
}

// ===== ATUALIZAR PREVIEW EM TEMPO REAL =====
function atualizarPreviewLayout() {
    layoutImpressao.configuracao.titulo = document.getElementById('layout-titulo').value;
    layoutImpressao.configuracao.responsavel = document.getElementById('layout-responsavel').value;
    layoutImpressao.configuracao.observacoes = document.getElementById('layout-observacoes').value;
    layoutImpressao.configuracao.data = document.getElementById('layout-data').value;
    
    document.getElementById('preview-titulo').textContent = layoutImpressao.configuracao.titulo || 'TITULO (EDITAVEL)';
    document.getElementById('preview-responsavel').textContent = layoutImpressao.configuracao.responsavel || 'RESPONSAVEL (EDITAVEL)';
    document.getElementById('preview-observacoes').textContent = layoutImpressao.configuracao.observacoes || 'OBSERVAÇÕES (EDITAVEL)';
    document.getElementById('preview-data').textContent = layoutImpressao.configuracao.data || 'DATAL 00/00/00 (EDITAVEL)';
}

// ===== GERAR PDF =====
function gerarPDFLayout() {
    console.log('[LAYOUT] Gerando PDF...');
    
    // Verificar se bibliotecas estão carregadas
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        alert('Erro: Bibliotecas de geração de PDF não carregadas. Verifique a conexão com a internet.');
        return;
    }
    
    // Mostrar mensagem de progresso
    var btnGerar = event.target;
    var textoOriginal = btnGerar.textContent;
    btnGerar.textContent = '⏳ Gerando PDF...';
    btnGerar.disabled = true;
    
    // Capturar o container A4
    var container = document.getElementById('preview-a4-container');
    
    // Forçar renderização do mapa antes de capturar
    if (layoutImpressao.mapaViewport) {
        layoutImpressao.mapaViewport.invalidateSize();
    }
    
    setTimeout(function() {
        html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        }).then(function(canvas) {
            console.log('[LAYOUT] Canvas capturado');
            
            // Criar PDF A4 (210mm x 297mm)
            var pdf = new jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Adicionar imagem ao PDF
            var imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            
            // Gerar nome do arquivo
            var titulo = layoutImpressao.configuracao.titulo || 'mapa';
            var nomeArquivo = 'TerraGIS_' + titulo.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
            
            // Salvar PDF
            pdf.save(nomeArquivo);
            
            console.log('[LAYOUT] PDF gerado: ' + nomeArquivo);
            
            // Restaurar botão
            btnGerar.textContent = textoOriginal;
            btnGerar.disabled = false;
            
            alert('✅ PDF gerado com sucesso: ' + nomeArquivo);
        }).catch(function(erro) {
            console.error('[LAYOUT] Erro ao gerar PDF:', erro);
            alert('❌ Erro ao gerar PDF: ' + erro.message);
            
            // Restaurar botão
            btnGerar.textContent = textoOriginal;
            btnGerar.disabled = false;
        });
    }, 500);
}

// ===== CONTROLES DO VIEWPORT =====
function zoomInViewport() {
    if (layoutImpressao.mapaViewport) {
        layoutImpressao.mapaViewport.zoomIn();
    }
}

function zoomOutViewport() {
    if (layoutImpressao.mapaViewport) {
        layoutImpressao.mapaViewport.zoomOut();
    }
}

function enquadrarGeometriaViewport() {
    console.log('[LAYOUT] Enquadrando geometria ativa');
    
    if (!layoutImpressao.mapaViewport || !terraManager) {
        alert('Viewport não inicializado');
        return;
    }
    
    var camadaAtiva = terraManager.getActiveLayer();
    if (!camadaAtiva) {
        alert('Nenhuma camada ativa selecionada');
        return;
    }
    
    // Calcular bounds da geometria
    var bounds = null;
    if (camadaAtiva.group) {
        camadaAtiva.group.eachLayer(function(l) {
            if (l instanceof L.Polygon || l instanceof L.Polyline) {
                if (!bounds) {
                    bounds = l.getBounds();
                } else {
                    bounds.extend(l.getBounds());
                }
            } else if (l instanceof L.CircleMarker || l instanceof L.Marker) {
                var latlng = l.getLatLng();
                if (!bounds) {
                    bounds = L.latLngBounds([latlng, latlng]);
                } else {
                    bounds.extend(latlng);
                }
            }
        });
    }
    
    if (bounds) {
        layoutImpressao.mapaViewport.fitBounds(bounds, {padding: [20, 20]});
        console.log('[LAYOUT] Geometria enquadrada');
    } else {
        alert('Geometria não encontrada na camada ativa');
    }
}

console.log('[LAYOUT] Módulo de Layout de Impressão carregado');

