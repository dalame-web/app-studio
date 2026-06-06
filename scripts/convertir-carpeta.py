#!/usr/bin/env python3
"""
scripts/convertir-carpeta.py
Convierte TODOS los PDFs de la carpeta 'PDF a texto' a Markdown.
Muestra una verificación de cada conversión.

Uso:
    python scripts/convertir-carpeta.py
    python scripts/convertir-carpeta.py --verificar   (solo muestra el contenido, no guarda de nuevo)
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path

# ── Configuración ──────────────────────────────────────────────────────────────
CARPETA_PDF = Path(__file__).parent.parent / "PDF a texto"
LINEAS_PREVIEW = 30       # líneas de preview en la verificación
MIN_PALABRAS_OK = 50      # menos de esto = conversión sospechosa


# ── Dependencias ───────────────────────────────────────────────────────────────
def verificar_markitdown():
    try:
        from markitdown import MarkItDown  # noqa: F401
        return True
    except ImportError:
        print("⚠  MarkItDown no está instalado. Instalando...")
        try:
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", "markitdown[pdf]"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            print("✓  MarkItDown instalado correctamente.\n")
            return True
        except subprocess.CalledProcessError:
            print("✗  No se pudo instalar. Ejecuta: pip install markitdown[pdf]")
            return False


# ── Conversión ─────────────────────────────────────────────────────────────────
def convertir_pdf(ruta_pdf: Path) -> tuple[str, Path | None]:
    """Convierte un PDF a Markdown. Devuelve (texto, ruta_salida) o ("", None) si falla."""
    from markitdown import MarkItDown

    ruta_salida = ruta_pdf.with_suffix(".md")

    print(f"\n{'─'*60}")
    print(f"📄 Convirtiendo: {ruta_pdf.name}")

    try:
        md = MarkItDown()
        resultado = md.convert(str(ruta_pdf))
        texto = resultado.text_content
    except Exception as e:
        print(f"✗  Error al convertir: {e}")
        return "", None

    if not texto or not texto.strip():
        print("⚠  No se extrajo texto. PDF posiblemente escaneado.")
        print("   → Sube el PDF directamente al chat de Claude (tiene visión para PDFs).")
        return "", None

    palabras = len(texto.split())
    cabecera = f"<!-- PDF: {ruta_pdf.name} | {palabras} palabras -->\n\n"
    contenido = cabecera + texto

    ruta_salida.write_text(contenido, encoding="utf-8")

    estado = "✓" if palabras >= MIN_PALABRAS_OK else "⚠"
    print(f"{estado}  {palabras} palabras extraídas → guardado en: {ruta_salida.name}")

    if palabras < MIN_PALABRAS_OK:
        print(f"   ↑ Pocas palabras. Puede ser PDF de imagen. Revisa el .md generado.")

    return texto, ruta_salida


# ── Verificación ───────────────────────────────────────────────────────────────
def verificar_md(ruta_md: Path, texto: str):
    """Muestra un preview del Markdown generado para que el usuario valide."""
    lineas = texto.strip().splitlines()
    lineas_mostrar = lineas[:LINEAS_PREVIEW]

    print(f"\n{'─'*60}")
    print(f"🔍 VERIFICACIÓN: {ruta_md.name}")
    print(f"{'─'*60}")
    for linea in lineas_mostrar:
        print(linea)

    if len(lineas) > LINEAS_PREVIEW:
        restantes = len(lineas) - LINEAS_PREVIEW
        print(f"\n... ({restantes} líneas más en el archivo)")

    print(f"{'─'*60}")
    print(f"¿El texto tiene sentido? Si es ilegible → sube el PDF directamente a Claude.")


# ── Solo verificación de .md existentes ────────────────────────────────────────
def verificar_existentes():
    """Lee los .md ya generados y muestra su preview."""
    archivos_md = sorted(CARPETA_PDF.glob("*.md"))
    if not archivos_md:
        print("No hay archivos .md en la carpeta. Ejecuta sin --verificar para convertir primero.")
        return

    for ruta_md in archivos_md:
        texto = ruta_md.read_text(encoding="utf-8")
        verificar_md(ruta_md, texto)


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Convierte PDFs de la carpeta 'PDF a texto' a Markdown"
    )
    parser.add_argument(
        "--verificar", "-v",
        action="store_true",
        help="Solo muestra el contenido de los .md ya generados, sin reconvertir"
    )
    args = parser.parse_args()

    # Verificar que la carpeta existe
    if not CARPETA_PDF.exists():
        print(f"✗  Carpeta no encontrada: {CARPETA_PDF}")
        print(f"   Créala en: {CARPETA_PDF}")
        sys.exit(1)

    # Modo solo verificación
    if args.verificar:
        verificar_existentes()
        return

    # Buscar PDFs
    pdfs = sorted(CARPETA_PDF.glob("*.pdf")) + sorted(CARPETA_PDF.glob("*.PDF"))
    if not pdfs:
        print(f"No hay PDFs en: {CARPETA_PDF}")
        print("Copia tus PDFs en esa carpeta y vuelve a ejecutar.")
        sys.exit(0)

    print(f"📁 Carpeta: {CARPETA_PDF}")
    print(f"📄 PDFs encontrados: {len(pdfs)}")

    if not verificar_markitdown():
        sys.exit(1)

    # Convertir todos
    resultados = []
    for ruta_pdf in pdfs:
        texto, ruta_salida = convertir_pdf(ruta_pdf)
        if texto and ruta_salida:
            resultados.append((ruta_salida, texto))

    # Verificación de cada archivo
    if resultados:
        print(f"\n{'='*60}")
        print(f"VERIFICACIÓN DEL CONTENIDO EXTRAÍDO")
        print(f"{'='*60}")
        for ruta_salida, texto in resultados:
            verificar_md(ruta_salida, texto)

    # Resumen final
    print(f"\n{'='*60}")
    print(f"RESUMEN")
    print(f"{'='*60}")
    print(f"✓  Convertidos: {len(resultados)} / {len(pdfs)}")
    if resultados:
        print(f"\nPRÓXIMO PASO:")
        print(f"1. Revisa el preview de arriba — ¿el texto tiene sentido?")
        print(f"2. Si sí → abre Claude Project → nuevo chat → pega el PROMPT")
        print(f"3. En el siguiente mensaje → pega el contenido del .md generado")
        print(f"4. Claude hará el índice → confirma cuántas fichas por tanda")
        if len(resultados) > 1:
            print(f"\nArchivos generados:")
            for ruta_salida, _ in resultados:
                print(f"   • {ruta_salida.name}")


if __name__ == "__main__":
    main()
