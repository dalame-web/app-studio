#!/usr/bin/env python3
"""
scripts/pdf-a-md.py
Convierte un PDF a Markdown usando MarkItDown (Microsoft).
El resultado se puede pegar directamente en el chat del Proyecto Claude.

Instalación (una sola vez):
    pip install markitdown[pdf]

Uso:
    python scripts/pdf-a-md.py ruta/al/archivo.pdf
    python scripts/pdf-a-md.py ruta/al/archivo.pdf --salida fichas-temp.md
    python scripts/pdf-a-md.py ruta/al/archivo.pdf --stdout   (imprime en consola)
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path


def verificar_markitdown():
    """Verifica que markitdown está instalado. Si no, lo instala automáticamente."""
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
            print("✗  No se pudo instalar MarkItDown automáticamente.")
            print("   Ejecuta manualmente: pip install markitdown[pdf]")
            return False


def convertir(ruta_pdf: Path, ruta_salida: Path | None, stdout: bool) -> str:
    """Convierte el PDF a Markdown y devuelve el texto."""
    from markitdown import MarkItDown

    print(f"→  Convirtiendo: {ruta_pdf.name}")

    md = MarkItDown()
    resultado = md.convert(str(ruta_pdf))
    texto = resultado.text_content

    if not texto or not texto.strip():
        print("⚠  El PDF no produjo texto. Puede ser un PDF de imagen sin OCR configurado.")
        print("   Consejo: sube el PDF directamente al chat del Proyecto Claude.")
        print("   Claude puede leer PDFs escaneados con su visión integrada.")
        return ""

    palabras = len(texto.split())
    print(f"✓  Extraídas ~{palabras} palabras")

    # Añadir cabecera informativa
    cabecera = f"<!-- Convertido de: {ruta_pdf.name} | {palabras} palabras -->\n\n"
    contenido_final = cabecera + texto

    # Guardar o imprimir
    if stdout:
        print("\n" + "─" * 60)
        print(contenido_final)
        print("─" * 60)
    else:
        destino = ruta_salida or Path("fichas-temp.md")
        destino.write_text(contenido_final, encoding="utf-8")
        print(f"✓  Guardado en: {destino}")
        print(f"\n📋 Próximo paso:")
        print(f"   1. Abre el archivo '{destino}' y copia su contenido")
        print(f"   2. Abre tu Proyecto Claude → nuevo chat → pega el PROMPT-FICHAS.md")
        print(f"   3. Después del prompt, pega el texto del .md y pide 'genera las fichas'")

    return contenido_final


def main():
    parser = argparse.ArgumentParser(
        description="Convierte PDF a Markdown para usar con el PROMPT de fichas"
    )
    parser.add_argument("pdf", help="Ruta al archivo PDF")
    parser.add_argument("--salida", "-s", help="Nombre del archivo .md de salida (default: fichas-temp.md)")
    parser.add_argument("--stdout", action="store_true", help="Imprimir resultado en consola en lugar de guardar")

    args = parser.parse_args()

    ruta_pdf = Path(args.pdf)
    if not ruta_pdf.exists():
        print(f"✗  Fichero no encontrado: {ruta_pdf}")
        sys.exit(1)
    if not ruta_pdf.suffix.lower() == ".pdf":
        print(f"✗  El fichero debe ser un .pdf (recibido: {ruta_pdf.suffix})")
        sys.exit(1)

    if not verificar_markitdown():
        sys.exit(1)

    ruta_salida = Path(args.salida) if args.salida else None
    convertir(ruta_pdf, ruta_salida, args.stdout)


if __name__ == "__main__":
    main()
