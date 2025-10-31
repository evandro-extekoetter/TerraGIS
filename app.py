# -*- coding: utf-8 -*-
"""
TerraGIS - Sistema de Análise e Edição GIS
Ferramentas de desenho, edição e análise geoespacial
"""

from flask import Flask, render_template, request, jsonify, send_file, session, make_response
import json
import os
import tempfile
import zipfile
from datetime import datetime
import secrets

# Configurar caminhos - templates e static estão no mesmo diretório que main.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, 
            template_folder=TEMPLATE_DIR,
            static_folder=STATIC_DIR)
app.secret_key = secrets.token_hex(16)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Desabilitar cache de arquivos estáticos
app.config['UPLOAD_FOLDER'] = '/tmp/terra_gis_uploads'
app.config['PROJECTS_FOLDER'] = '/tmp/terra_gis_projects'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PROJECTS_FOLDER'], exist_ok=True)

# Armazenamento temporário em sessão
def get_current_project():
    if 'current_project' not in session:
        session['current_project'] = {
            'name': None,
            'fuso_utm': None,
            'layers': []
        }
    return session['current_project']

@app.route('/')
def index():
    """Página principal do TerraGIS"""
    return render_template('index.html')

@app.route('/api/project/new', methods=['POST'])
def create_project():
    """Criar novo projeto"""
    try:
        data = request.json
        project = get_current_project()
        project['name'] = data.get('name')
        project['fuso_utm'] = data.get('fuso_utm')
        project['layers'] = []
        session.modified = True
        
        return jsonify({'success': True, 'project': project})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/project/save', methods=['POST'])
def save_project():
    """Salvar projeto"""
    try:
        project = get_current_project()
        
        if not project['name']:
            return jsonify({'success': False, 'error': 'Nenhum projeto aberto'})
        
        # Criar arquivo .terragis
        filename = f"{project['name'].replace(' ', '_')}.terragis"
        filepath = os.path.join(app.config['PROJECTS_FOLDER'], filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(project, f, ensure_ascii=False, indent=2)
        
        return send_file(filepath, as_attachment=True, download_name=filename)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/project/open', methods=['POST'])
def open_project():
    """Abrir projeto"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'Nenhum arquivo enviado'})
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'Nenhum arquivo selecionado'})
        
        if not file.filename.endswith('.terragis'):
            return jsonify({'success': False, 'error': 'Formato inválido. Use .terragis'})
        
        # Ler arquivo
        content = file.read().decode('utf-8')
        project_data = json.loads(content)
        
        # Atualizar sessão
        session['current_project'] = project_data
        session.modified = True
        
        return jsonify({'success': True, 'project': project_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/layer/add', methods=['POST'])
def add_layer():
    """Adicionar nova camada"""
    try:
        data = request.json
        project = get_current_project()
        
        layer = {
            'id': data.get('id'),
            'name': data.get('name'),
            'type': data.get('type'),  # polygon, line, point
            'features': [],
            'visible': True,
            'style': {
                'color': data.get('color', '#3388ff'),
                'weight': data.get('weight', 3),
                'opacity': data.get('opacity', 0.8),
                'fillColor': data.get('fillColor', '#3388ff'),
                'fillOpacity': data.get('fillOpacity', 0.2)
            }
        }
        
        project['layers'].append(layer)
        session.modified = True
        
        return jsonify({'success': True, 'layer': layer})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/layer/update', methods=['POST'])
def update_layer():
    """Atualizar camada"""
    try:
        data = request.json
        project = get_current_project()
        layer_id = data.get('id')
        
        for layer in project['layers']:
            if layer['id'] == layer_id:
                layer.update(data)
                session.modified = True
                return jsonify({'success': True, 'layer': layer})
        
        return jsonify({'success': False, 'error': 'Camada não encontrada'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/layer/delete', methods=['POST'])
def delete_layer():
    """Remover camada"""
    try:
        data = request.json
        project = get_current_project()
        layer_id = data.get('id')
        
        project['layers'] = [l for l in project['layers'] if l['id'] != layer_id]
        session.modified = True
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/feature/add', methods=['POST'])
def add_feature():
    """Adicionar feature (geometria) a uma camada"""
    try:
        data = request.json
        project = get_current_project()
        layer_id = data.get('layer_id')
        
        for layer in project['layers']:
            if layer['id'] == layer_id:
                feature = {
                    'id': data.get('id'),
                    'type': data.get('type'),
                    'geometry': data.get('geometry'),
                    'properties': data.get('properties', {})
                }
                layer['features'].append(feature)
                session.modified = True
                return jsonify({'success': True, 'feature': feature})
        
        return jsonify({'success': False, 'error': 'Camada não encontrada'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/feature/update', methods=['POST'])
def update_feature():
    """Atualizar feature"""
    try:
        data = request.json
        project = get_current_project()
        layer_id = data.get('layer_id')
        feature_id = data.get('id')
        
        for layer in project['layers']:
            if layer['id'] == layer_id:
                for i, feature in enumerate(layer['features']):
                    if feature['id'] == feature_id:
                        layer['features'][i].update(data)
                        session.modified = True
                        return jsonify({'success': True, 'feature': layer['features'][i]})
        
        return jsonify({'success': False, 'error': 'Feature não encontrada'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/feature/delete', methods=['POST'])
def delete_feature():
    """Remover feature"""
    try:
        data = request.json
        project = get_current_project()
        layer_id = data.get('layer_id')
        feature_id = data.get('id')
        
        for layer in project['layers']:
            if layer['id'] == layer_id:
                layer['features'] = [f for f in layer['features'] if f['id'] != feature_id]
                session.modified = True
                return jsonify({'success': True})
        
        return jsonify({'success': False, 'error': 'Camada não encontrada'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/analysis/area', methods=['POST'])
def calculate_area():
    """Calcular área de um polígono"""
    try:
        data = request.json
        coordinates = data.get('coordinates')
        
        # Cálculo simples de área usando fórmula de Shoelace
        # Para produção, usar biblioteca como Shapely
        area = 0
        n = len(coordinates)
        for i in range(n):
            j = (i + 1) % n
            area += coordinates[i][0] * coordinates[j][1]
            area -= coordinates[j][0] * coordinates[i][1]
        area = abs(area) / 2.0
        
        return jsonify({'success': True, 'area': area})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/analysis/distance', methods=['POST'])
def calculate_distance():
    """Calcular distância entre dois pontos"""
    try:
        data = request.json
        point1 = data.get('point1')
        point2 = data.get('point2')
        
        # Distância euclidiana
        import math
        dx = point2[0] - point1[0]
        dy = point2[1] - point1[1]
        distance = math.sqrt(dx*dx + dy*dy)
        
        return jsonify({'success': True, 'distance': distance})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/export/geojson', methods=['POST'])
def export_geojson():
    """Exportar projeto como GeoJSON"""
    try:
        project = get_current_project()
        
        if not project['name']:
            return jsonify({'success': False, 'error': 'Nenhum projeto aberto'})
        
        # Criar GeoJSON
        geojson = {
            'type': 'FeatureCollection',
            'features': []
        }
        
        for layer in project['layers']:
            for feature in layer['features']:
                geojson['features'].append({
                    'type': 'Feature',
                    'geometry': feature['geometry'],
                    'properties': {
                        **feature['properties'],
                        'layer': layer['name']
                    }
                })
        
        # Salvar arquivo
        filename = f"{project['name'].replace(' ', '_')}.geojson"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)
        
        return send_file(filepath, as_attachment=True, download_name=filename)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/process-sigef', methods=['POST'])
def process_sigef():
    """Processar shapefile SIGEF e extrair vértices"""
    try:
        import base64
        import struct
        
        data = request.json
        nome_imovel = data.get('nome_imovel')
        fuso = data.get('fuso')
        file_data = data.get('file_data')
        
        if not all([nome_imovel, fuso, file_data]):
            return jsonify({'error': 'Dados incompletos'}), 400
        
        # Decodificar arquivo base64
        file_content = base64.b64decode(file_data['content'])
        file_name = file_data['name']
        
        # Salvar arquivo temporário
        temp_dir = tempfile.mkdtemp()
        
        # Verificar se é ZIP
        if not file_name.endswith('.zip'):
            return jsonify({'error': 'Por favor, envie um arquivo ZIP contendo todos os arquivos do shapefile (.shp, .dbf, .shx, .prj)'}), 400
        
        # Extrair ZIP
        zip_path = os.path.join(temp_dir, file_name)
        with open(zip_path, 'wb') as f:
            f.write(file_content)
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
        except Exception as e:
            return jsonify({'error': f'Erro ao extrair ZIP: {str(e)}'}), 400
        
        # Procurar arquivo .shp
        shp_files = [f for f in os.listdir(temp_dir) if f.endswith('.shp')]
        if not shp_files:
            return jsonify({'error': 'Nenhum arquivo .shp encontrado no ZIP. Certifique-se de que o ZIP contém todos os arquivos do shapefile.'}), 400
        
        shp_path = os.path.join(temp_dir, shp_files[0])
        
        # Processar shapefile usando leitura binária simples
        coords, ids = process_shapefile_simple(shp_path)
        
        if not coords:
            return jsonify({'error': 'Não foi possível extrair vértices do shapefile'}), 400
        
        # Limpar arquivos temporários
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        return jsonify({
            'success': True,
            'coords': coords,
            'ids': ids,
            'count': len(coords)
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def process_shapefile_simple(shp_path):
    """Processar shapefile SIGEF seguindo EXATAMENTE a lógica do plugin TERRATools"""
    coords = []
    ids = []
    
    try:
        import shapefile
        
        # Verificar se arquivo existe
        if not os.path.exists(shp_path):
            print(f"❌ Arquivo não encontrado: {shp_path}")
            return [], []
        
        print(f"📖 Abrindo shapefile...")
        sf = shapefile.Reader(shp_path)
        
        # Obter tipo de shape
        shape_type = sf.shapeType
        shape_type_name = sf.shapeTypeName
        print(f"📐 Tipo de geometria: {shape_type} ({shape_type_name})")
        
        # Obter todas as shapes
        shapes = sf.shapes()
        records = sf.records()
        print(f"📊 Total de geometrias: {len(shapes)}")
        
        if not shapes:
            print("❌ Shapefile não contém geometrias")
            return [], []
        
        # Obter campos
        field_names = [field[0] for field in sf.fields[1:]]  # Pular DeletionFlag
        field_names_upper = [f.upper() for f in field_names]
        print(f"📋 Campos: {field_names}")
        
        # Detectar CRS do shapefile (ler .prj se existir)
        base_path = shp_path[:-4]
        prj_path = base_path + '.prj'
        source_crs = None
        is_geographic = False
        
        if os.path.exists(prj_path):
            with open(prj_path, 'r') as f:
                prj_text = f.read()
                # Detectar se é geográfico (Lat/Long) ou projetado (UTM)
                if 'GEOGCS' in prj_text or 'Geographic' in prj_text:
                    source_crs = 'EPSG:4674'  # SIRGAS 2000 geográfico
                    is_geographic = True
                    print(f"🌐 CRS detectado: SIRGAS 2000 Geográfico (Lat/Long)")
                elif 'PROJCS' in prj_text:
                    # Tentar extrair zona UTM
                    if 'UTM zone 21S' in prj_text or 'Zone_21' in prj_text:
                        source_crs = 'EPSG:31981'  # SIRGAS 2000 UTM 21S
                        print(f"🌐 CRS detectado: SIRGAS 2000 UTM 21S")
                    else:
                        print(f"⚠️ CRS projetado não identificado, assumindo UTM 21S")
                        source_crs = 'EPSG:31981'
        
        # Se não conseguiu detectar, tentar pela magnitude das coordenadas
        if not source_crs:
            first_point = shapes[0].points[0]
            if abs(first_point[0]) <= 180 and abs(first_point[1]) <= 90:
                source_crs = 'EPSG:4674'  # Lat/Long
                is_geographic = True
                print(f"🌐 CRS detectado por coordenadas: Lat/Long")
            else:
                source_crs = 'EPSG:31981'  # UTM
                print(f"🌐 CRS detectado por coordenadas: UTM")
        
        # Processar baseado no tipo de geometria
        if shape_type == shapefile.POINT:  # 1 = Point
            print(f"✅ Processando {len(shapes)} pontos (vértices)...")
            
            # Criar lista de features (shape + record)
            features = list(zip(shapes, records))
            
            # Procurar campo de ordenação (INDICE, ID, ORDEM, SEQ, NUM)
            order_field_idx = None
            for i, field_name in enumerate(field_names_upper):
                if 'INDICE' in field_name:
                    order_field_idx = i
                    print(f"🔢 Campo de ordenação: {field_names[i]}")
                    break
            
            # Se não encontrou INDICE, procurar outros campos
            if order_field_idx is None:
                for i, field_name in enumerate(field_names_upper):
                    if any(keyword in field_name for keyword in ['ID', 'ORDEM', 'SEQ', 'NUM']):
                        order_field_idx = i
                        print(f"🔢 Campo de ordenação: {field_names[i]}")
                        break
            
            # Ordenar se encontrou campo
            if order_field_idx is not None:
                try:
                    # Ordenar por valor numérico do campo
                    features.sort(key=lambda f: int(f[1][order_field_idx] or 0))
                    print("✅ Pontos ordenados")
                except:
                    print("⚠️ Não foi possível ordenar, usando ordem original")
            
            # Procurar campo de ID (VERTICE, CODIGO, NOME)
            id_field_idx = None
            for i, field_name in enumerate(field_names_upper):
                if field_name in ['VERTICE', 'CODIGO', 'NOME', 'ID']:
                    id_field_idx = i
                    print(f"🏷️ Campo de ID: {field_names[i]}")
                    break
            
            # Extrair coordenadas
            for i, (shape, record) in enumerate(features):
                if not shape.points:
                    continue
                
                x, y = shape.points[0]
                coords.append([x, y])
                
                # Usar ID do atributo ou gerar sequencial
                vertex_id = f"P-{i+1:02d}"
                if id_field_idx is not None:
                    try:
                        attr_value = record[id_field_idx]
                        if attr_value:
                            vertex_id = str(attr_value).strip()
                    except:
                        pass
                
                ids.append(vertex_id)
        
        elif shape_type == shapefile.POLYGON:  # 5 = Polygon
            print(f"✅ Processando polígono (extraindo vértices)...")
            
            # Usar primeiro polígono
            shape = shapes[0]
            points = shape.points
            
            # Remover último ponto se for duplicado (fechamento)
            if len(points) > 1 and points[0] == points[-1]:
                points = points[:-1]
            
            # Extrair vértices
            for i, (x, y) in enumerate(points):
                coords.append([x, y])
                ids.append(f"P-{i+1:02d}")
        
        else:
            print(f"❌ Tipo não suportado: {shape_type_name}")
            return [], []
        
        print(f"✅ Total de vértices extraídos: {len(coords)}")
        print(f"📍 CRS fonte: {source_crs}")
        
        if len(coords) < 3:
            print(f"⚠️ Poucos vértices ({len(coords)})")
            return [], []
        
        # Se as coordenadas estão em geográfico (Lat/Long), retornar como estão
        # A conversão para UTM será feita no frontend
        if is_geographic:
            print("📍 Retornando coordenadas geográficas (Lat/Long)")
            # Retornar no formato [longitude, latitude] para compatibilidade com Leaflet
            return coords, ids
        else:
            print("📍 Retornando coordenadas projetadas (UTM)")
            return coords, ids
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return [], []

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
