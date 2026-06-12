# @guide 마커 단독 행 일괄 삭제. 보고서는 UTF-8 파일로 출력.
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src"
REPORT = Path(__file__).resolve().parent / "remove_guide_report.txt"
PATTERN = re.compile(r"^[ \t]*// @guide:.*\n", flags=re.MULTILINE)

def main():
    lines = []
    total = 0
    files_changed = 0
    try:
        if not ROOT.is_dir():
            raise RuntimeError(f"src 디렉터리 없음: {ROOT}")
        for p in sorted(ROOT.rglob("*")):
            if p.suffix not in (".ts", ".tsx"):
                continue
            text = p.read_text(encoding="utf-8")
            new_text, n = PATTERN.subn("", text)
            if n > 0:
                p.write_text(new_text, encoding="utf-8", newline="")
                total += n
                files_changed += 1
                lines.append(f"{n}\t{p.relative_to(ROOT.parent)}")
        # 잔존 검증
        residue = []
        for p in sorted(ROOT.rglob("*")):
            if p.suffix in (".ts", ".tsx") and "@guide" in p.read_text(encoding="utf-8"):
                residue.append(str(p.relative_to(ROOT.parent)))
        lines.append(f"\nTOTAL removed={total} files={files_changed} residue={len(residue)}")
        for r in residue:
            lines.append(f"RESIDUE\t{r}")
        REPORT.write_text("\n".join(lines), encoding="utf-8")
    except Exception as e:
        REPORT.write_text(f"FAILED at stage: {type(e).__name__}: {e}", encoding="utf-8")
        sys.exit(1)

if __name__ == "__main__":
    main()
