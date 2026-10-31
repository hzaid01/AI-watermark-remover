#!/usr/bin/env python3
"""Build script to freeze service/scripts/server.py as a standalone Windows executable.

This bundles only the Python stdlib-first core cleaning engine without torch,
markllm, markdiffusion, or ctrlregen.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SERVICE_DIR = ROOT_DIR / "service" / "scripts"
SERVER_PY = SERVICE_DIR / "server.py"
OUTPUT_DIR = ROOT_DIR / "resources" / "bin"


def ensure_pyinstaller() -> bool:
    try:
        import PyInstaller  # type: ignore
        return True
    except ImportError:
        print("[*] PyInstaller not found. Installing via pip...")
        r = subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=False)
        return r.returncode == 0


def build() -> int:
    print("=" * 60)
    print("Building Document & Text Cleaner Backend (PyInstaller)")
    print("=" * 60)

    if not SERVER_PY.is_file():
        print(f"Error: {SERVER_PY} not found!", file=sys.stderr)
        return 1

    if not ensure_pyinstaller():
        print("Error: Failed to install or locate PyInstaller.", file=sys.stderr)
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    dist_dir = ROOT_DIR / "build_temp" / "dist"
    work_dir = ROOT_DIR / "build_temp" / "build"
    spec_dir = ROOT_DIR / "build_temp"

    # Exclude heavy unnecessary modules
    excludes = [
        "torch",
        "torchvision",
        "torchaudio",
        "numpy",
        "scipy",
        "transformers",
        "diffusers",
        "matplotlib",
        "PIL",
        "tkinter",
        "unittest",
    ]

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--name=server",
        f"--distpath={dist_dir}",
        f"--workpath={work_dir}",
        f"--specpath={spec_dir}",
        f"--paths={SERVICE_DIR}",
    ]

    for exc in excludes:
        cmd.extend(["--exclude-module", exc])

    cmd.append(str(SERVER_PY))

    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=str(ROOT_DIR), check=False)
    if result.returncode != 0:
        print("PyInstaller build failed!", file=sys.stderr)
        return result.returncode

    built_exe = dist_dir / ("server.exe" if os.name == "nt" else "server")
    target_exe = OUTPUT_DIR / ("server.exe" if os.name == "nt" else "server")

    if built_exe.is_file():
        shutil.copy2(built_exe, target_exe)
        print(f"[+] Successfully generated backend executable: {target_exe}")
        # Clean up temp build folder
        shutil.rmtree(ROOT_DIR / "build_temp", ignore_errors=True)
        return 0
    else:
        print(f"Error: Expected binary {built_exe} was not found!", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(build())
