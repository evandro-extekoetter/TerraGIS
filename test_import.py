#!/usr/bin/env python3
"""
Script de teste para importação de arquivos GIS
"""

import sys
import os
sys.path.insert(0, '/home/ubuntu/TerraGIS')

from app import process_dxf, process_kml, process_kmz, process_shapefile
from io import BytesIO

test_files_dir = '/home/ubuntu/TerraGIS/test_files'

print("=" * 60)
print("TESTE DE IMPORTAÇÃO DE ARQUIVOS GIS (v4.0.0)")
print("=" * 60)

# Teste 1: DXF
print("\n[1] Testando DXF...")
try:
    with open(f'{test_files_dir}/exemplodedxf.dxf', 'rb') as f:
        class MockFile:
            def read(self):
                return f.read()
        
        result = process_dxf(MockFile(), '21S')
        print(f"✅ DXF: {len(result['features'])} geometrias encontradas")
        if result['features']:
            print(f"   Primeira geometria: {result['features'][0]['geometry']['type']}")
except Exception as e:
    print(f"❌ DXF: Erro - {e}")
    import traceback
    traceback.print_exc()

# Teste 2: KML
print("\n[2] Testando KML...")
try:
    with open(f'{test_files_dir}/exemplodeKMZ.kmz', 'rb') as f:
        # Extrair KML do KMZ primeiro
        import zipfile
        with zipfile.ZipFile(f) as zf:
            kml_files = [f for f in zf.namelist() if f.lower().endswith('.kml')]
            if kml_files:
                kml_content = zf.read(kml_files[0])
                
                class MockKMLFile:
                    def read(self):
                        return kml_content
                
                result = process_kml(MockKMLFile(), '21S')
                print(f"✅ KML (do KMZ): {len(result['features'])} geometrias encontradas")
                if result['features']:
                    print(f"   Primeira geometria: {result['features'][0]['geometry']['type']}")
except Exception as e:
    print(f"❌ KML: Erro - {e}")
    import traceback
    traceback.print_exc()

# Teste 3: KMZ
print("\n[3] Testando KMZ...")
try:
    with open(f'{test_files_dir}/exemplodeKMZ.kmz', 'rb') as f:
        class MockFile:
            def __init__(self, data):
                self.data = data
            def read(self):
                return self.data
        
        result = process_kmz(MockFile(f.read()), '21S')
        print(f"✅ KMZ: {len(result['features'])} geometrias encontradas")
        if result['features']:
            print(f"   Primeira geometria: {result['features'][0]['geometry']['type']}")
except Exception as e:
    print(f"❌ KMZ: Erro - {e}")
    import traceback
    traceback.print_exc()

# Teste 4: Shapefile (áreas)
print("\n[4] Testando Shapefile (áreas)...")
try:
    with open(f'{test_files_dir}/exemplodeSHP-areas.zip', 'rb') as f:
        class MockFile:
            def __init__(self, data):
                self.data = data
            def read(self):
                return self.data
        
        result = process_shapefile(MockFile(f.read()), '21S')
        print(f"✅ Shapefile (áreas): {len(result['features'])} geometrias encontradas")
        if result['features']:
            print(f"   Primeira geometria: {result['features'][0]['geometry']['type']}")
except Exception as e:
    print(f"❌ Shapefile (áreas): Erro - {e}")
    import traceback
    traceback.print_exc()

# Teste 5: Shapefile (linhas)
print("\n[5] Testando Shapefile (linhas)...")
try:
    with open(f'{test_files_dir}/exemplodeSHP-linhas.zip', 'rb') as f:
        class MockFile:
            def __init__(self, data):
                self.data = data
            def read(self):
                return self.data
        
        result = process_shapefile(MockFile(f.read()), '21S')
        print(f"✅ Shapefile (linhas): {len(result['features'])} geometrias encontradas")
        if result['features']:
            print(f"   Primeira geometria: {result['features'][0]['geometry']['type']}")
except Exception as e:
    print(f"❌ Shapefile (linhas): Erro - {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("TESTES CONCLUÍDOS")
print("=" * 60)
