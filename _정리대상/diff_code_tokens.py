# 주석 제거 후 토큰 diff: 파일별 실제 코드 변경 지점을 압축 출력.
import difflib
import re
import subprocess
import sys
from pathlib import Path

BASE = "70e5fa7"
ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "diff_code_tokens_report.txt"

def strip_comments(src: str) -> str:
    out = []
    i, n = 0, len(src)
    state = None
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
        else:
            if c == "\\":
                out.append(c)
                if i + 1 < n: out.append(nxt)
                i += 2; continue
            if c == state:
                state = None
            out.append(c); i += 1
    return "".join(out)

def tokens(src: str):
    return re.sub(r"\s+", " ", strip_comments(src)).strip().split(" ")

def main():
    lines = []
    try:
        flist = (Path(__file__).resolve().parent / "verify_code_equal_report.txt").read_text(encoding="utf-8").splitlines()[1:]
        for f in flist:
            old = subprocess.run(["git", "show", f"{BASE}:{f}"], cwd=ROOT,
                                 capture_output=True, text=True, encoding="utf-8").stdout
            new = (ROOT / f).read_text(encoding="utf-8")
            a, b = tokens(old), tokens(new)
            sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
            lines.append(f"### {f}")
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag == "equal":
                    continue
                ctx_a = " ".join(a[max(0, i1 - 6):i1])
                rem = " ".join(a[i1:i2])[:300]
                add = " ".join(b[j1:j2])[:300]
                lines.append(f"  ctx: ...{ctx_a[-80:]}")
                lines.append(f"  - {rem}")
                lines.append(f"  + {add}")
            lines.append("")
        OUT.write_text("\n".join(lines), encoding="utf-8")
    except Exception as e:
        OUT.write_text(f"FAILED: {type(e).__name__}: {e}", encoding="utf-8")
        sys.exit(1)

if __name__ == "__main__":
    main()
