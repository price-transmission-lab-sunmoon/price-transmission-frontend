# 기준 커밋 대비 "주석 제외 코드"가 바뀐 파일 목록 추출.
# 양쪽에 동일한 주석 스트리퍼를 적용하므로 스트리퍼의 한계는 비교에서 상쇄된다.
import re
import subprocess
import sys
from pathlib import Path

BASE = "70e5fa7"
ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "verify_code_equal_report.txt"

def strip_comments(src: str) -> str:
    out = []
    i, n = 0, len(src)
    state = None  # None | "'" | '"' | '`' | 'line' | 'block'
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        if state is None:
            if c == "/" and nxt == "/":
                state = "line"; i += 2; continue
            if c == "/" and nxt == "*":
                state = "block"; i += 2; continue
            if c in ("'", '"', "`"):
                state = c
            out.append(c); i += 1
        elif state == "line":
            if c == "\n":
                state = None; out.append(c)
            i += 1
        elif state == "block":
            if c == "*" and nxt == "/":
                state = None; i += 2; continue
            i += 1
        else:  # in string
            if c == "\\":
                out.append(c)
                if i + 1 < n: out.append(nxt)
                i += 2; continue
            if c == state:
                state = None
            out.append(c); i += 1
    code = "".join(out)
    return re.sub(r"\s+", " ", code).strip()

def main():
    lines = []
    changed = []
    try:
        ls = subprocess.run(["git", "ls-tree", "-r", "--name-only", BASE, "src"],
                            cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
        files = [f for f in ls.stdout.splitlines() if f.endswith((".ts", ".tsx", ".css"))]
        for f in files:
            old = subprocess.run(["git", "show", f"{BASE}:{f}"], cwd=ROOT,
                                 capture_output=True, text=True, encoding="utf-8").stdout
            p = ROOT / f
            if not p.exists():
                lines.append(f"DELETED\t{f}"); continue
            new = p.read_text(encoding="utf-8")
            if strip_comments(old) != strip_comments(new):
                changed.append(f)
        lines.append(f"checked={len(files)} code_changed={len(changed)}")
        lines.extend(changed)
        OUT.write_text("\n".join(lines), encoding="utf-8")
    except Exception as e:
        OUT.write_text(f"FAILED: {type(e).__name__}: {e}", encoding="utf-8")
        sys.exit(1)

if __name__ == "__main__":
    main()
