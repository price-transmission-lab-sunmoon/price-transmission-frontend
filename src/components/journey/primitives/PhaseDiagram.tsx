// Phase별 개념 도식. 호버 패널 안 작은 SVG로 표시한다. teal=주선, gray=보조, red=이상, dashed=기준선.
const T = '#0d9488';
const G = '#a8a298';
const R = '#dc2626';
const D = '#d4cec1';

function Body({ phase }: { phase: string }) {
  switch (phase) {
    case 'phase0':
      return (
        <>
          {[6, 15, 24, 33].map((y, i) => (
            <line key={i} x1="3" y1={y} x2="60" y2="20" stroke={G} strokeWidth="1.1" />
          ))}
          <line x1="60" y1="20" x2="96" y2="20" stroke={T} strokeWidth="2" />
          <circle cx="60" cy="20" r="2.6" fill={T} />
        </>
      );
    case 'phase1': // STL: 원본, 추세, 계절 3단
      return (
        <>
          <polyline
            points="2,9 14,5 26,11 38,5 50,9 62,4 74,9 86,3 96,7"
            fill="none"
            stroke={G}
            strokeWidth="1.1"
          />
          <polyline
            points="2,22 24,21 48,19 72,17 96,15"
            fill="none"
            stroke={T}
            strokeWidth="1.6"
          />
          <path
            d="M2,33 Q11,29 20,33 T38,33 T56,33 T74,33 T96,33"
            fill="none"
            stroke={G}
            strokeWidth="1.1"
          />
        </>
      );
    case 'phase2': // 비정상(좌) vs 정상(우)
      return (
        <>
          <line x1="50" y1="3" x2="50" y2="37" stroke={D} strokeWidth="0.8" strokeDasharray="2 2" />
          <polyline
            points="3,34 11,28 19,30 27,22 35,24 44,13"
            fill="none"
            stroke={R}
            strokeWidth="1.4"
          />
          <line
            x1="56"
            y1="20"
            x2="97"
            y2="20"
            stroke={D}
            strokeWidth="0.6"
            strokeDasharray="1 2"
          />
          <polyline
            points="57,20 64,15 71,23 78,16 85,23 92,17 97,21"
            fill="none"
            stroke={T}
            strokeWidth="1.4"
          />
        </>
      );
    case 'phase3': // 공적분: 두 시계열 장기 동행
      return (
        <>
          <polyline
            points="3,22 22,18 41,20 60,15 79,11 96,4"
            fill="none"
            stroke={T}
            strokeWidth="1.5"
          />
          <polyline
            points="3,26 22,22 41,24 60,23 79,26 96,32"
            fill="none"
            stroke={G}
            strokeWidth="1.5"
          />
        </>
      );
    case 'phase4_var':
      return (
        <>
          <polyline points="3,13 25,9 47,16 69,11 96,14" fill="none" stroke={T} strokeWidth="1.4" />
          <polyline
            points="3,29 25,25 47,31 69,26 96,29"
            fill="none"
            stroke={G}
            strokeWidth="1.4"
          />
          <line x1="42" y1="21" x2="58" y2="21" stroke="#78736a" strokeWidth="1" />
          <polygon points="58,21 53,18.5 53,23.5" fill="#78736a" />
        </>
      );
    case 'phase4_vecm': // ECT 균형 복귀
      return (
        <>
          <line
            x1="3"
            y1="20"
            x2="97"
            y2="20"
            stroke="#78736a"
            strokeWidth="0.8"
            strokeDasharray="3 2"
          />
          <polyline
            points="3,20 12,7 22,31 32,12 42,26 52,16 62,23 72,19 82,21 96,20"
            fill="none"
            stroke={T}
            strokeWidth="1.5"
          />
        </>
      );
    case 'phase5': // Granger 인과
      return (
        <>
          <polyline
            points="3,11 18,7 33,13 48,8 63,12 78,8 96,11"
            fill="none"
            stroke={T}
            strokeWidth="1.4"
          />
          <polyline
            points="3,30 22,26 41,32 60,27 79,31 96,29"
            fill="none"
            stroke={G}
            strokeWidth="1.4"
          />
          <line x1="50" y1="16" x2="50" y2="25" stroke="#78736a" strokeWidth="1" />
          <polygon points="50,25 47.5,20 52.5,20" fill="#78736a" />
        </>
      );
    case 'phase6': // 구조변화: 변화점 레벨 꺾임
      return (
        <>
          <line x1="52" y1="3" x2="52" y2="37" stroke={R} strokeWidth="0.9" strokeDasharray="2 2" />
          <polyline points="3,26 18,25 34,27 50,26" fill="none" stroke={T} strokeWidth="1.6" />
          <polyline points="54,14 70,13 86,15 96,14" fill="none" stroke={T} strokeWidth="1.6" />
        </>
      );
    case 'phase7': // 계량 규칙: 임계 초과 스파이크
      return (
        <>
          <rect x="3" y="14" width="93" height="12" fill="#ede8de" opacity="0.7" />
          <line x1="3" y1="14" x2="96" y2="14" stroke={D} strokeWidth="0.6" strokeDasharray="2 2" />
          <line x1="3" y1="26" x2="96" y2="26" stroke={D} strokeWidth="0.6" strokeDasharray="2 2" />
          <polyline
            points="3,20 18,22 33,19 48,21 58,5 66,20 81,21 96,19"
            fill="none"
            stroke={T}
            strokeWidth="1.5"
          />
          <circle cx="58" cy="5" r="2.4" fill={R} />
        </>
      );
    case 'phase7_ml': // ML: 군집과 고립점
      return (
        <>
          {[
            [40, 18],
            [46, 22],
            [44, 15],
            [51, 20],
            [37, 23],
            [53, 16],
            [48, 26],
            [42, 20],
            [56, 23],
            [35, 19],
            [50, 13],
            [45, 29],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.4" fill={G} opacity="0.7" />
          ))}
          <circle cx="86" cy="8" r="2.8" fill={R} />
        </>
      );
    case 'phase8': // 신뢰도 등급화 2×2 교차표
      return (
        <>
          <rect x="30" y="6" width="19" height="13" fill={R} opacity="0.85" />
          <rect x="51" y="6" width="19" height="13" fill="#ca8a04" opacity="0.75" />
          <rect x="30" y="21" width="19" height="13" fill="#0891b2" opacity="0.7" />
          <rect x="51" y="21" width="19" height="13" fill="#ede8de" />
          <text x="39.5" y="16" fontSize="8" textAnchor="middle" fill="#fff">
            H
          </text>
          <text x="60.5" y="16" fontSize="8" textAnchor="middle" fill="#fff">
            M
          </text>
          <text x="39.5" y="31" fontSize="8" textAnchor="middle" fill="#fff">
            R
          </text>
        </>
      );
    case 'grade_high':
    case 'grade_medium':
    case 'grade_reference': {
      // 해당 등급 셀만 강조.
      const activeGrade = phase.slice(6); // high|medium|reference
      const cells = [
        { g: 'high', x: 30, y: 8, label: 'H', color: '#dc2626' },
        { g: 'medium', x: 51, y: 8, label: 'M', color: '#ca8a04' },
        { g: 'reference', x: 30, y: 23, label: 'R', color: '#0891b2' },
        { g: 'none', x: 51, y: 23, label: '·', color: '#ede8de' },
      ];
      return (
        <>
          <text x="50" y="5" fontSize="4.5" textAnchor="middle" fill={G}>
            계량 × ML
          </text>
          {cells.map((cl) => {
            const on = cl.g === activeGrade;
            return (
              <g key={cl.g}>
                <rect
                  x={cl.x}
                  y={cl.y}
                  width="19"
                  height="13"
                  fill={cl.color}
                  opacity={cl.g === 'none' ? 1 : on ? 0.95 : 0.22}
                  stroke={on ? '#1a1814' : 'none'}
                  strokeWidth="0.9"
                />
                <text
                  x={cl.x + 9.5}
                  y={cl.y + 9}
                  fontSize="8"
                  textAnchor="middle"
                  fill={cl.g === 'none' ? '#a8a298' : '#fff'}
                >
                  {cl.label}
                </text>
              </g>
            );
          })}
        </>
      );
    }
    case 'pat_pattern1': // 방향 역전: 상류↑ vs 하류↓
      return (
        <>
          <polyline points="6,30 28,22 50,13 78,6" fill="none" stroke={T} strokeWidth="1.4" />
          <polyline points="6,10 28,18 50,27 78,34" fill="none" stroke={R} strokeWidth="1.4" />
          <text x="82" y="11" fontSize="4.5" fill={G}>
            상류
          </text>
          <text x="82" y="35" fontSize="4.5" fill={R}>
            하류
          </text>
        </>
      );
    case 'pat_pattern2': // 전이율 이탈: 밴드 돌파 스파이크
      return (
        <>
          <rect x="4" y="15" width="92" height="11" fill="#ede8de" opacity="0.7" />
          <polyline
            points="4,20 20,22 36,19 50,6 60,21 78,20 96,19"
            fill="none"
            stroke={T}
            strokeWidth="1.5"
          />
          <circle cx="50" cy="6" r="2.4" fill={R} />
        </>
      );
    case 'pat_pattern3': // 스프레드 누적
      return (
        <>
          <polyline points="6,17 34,16 62,14 92,11" fill="none" stroke={T} strokeWidth="1.4" />
          <polyline points="6,23 34,25 62,29 92,35" fill="none" stroke={G} strokeWidth="1.4" />
        </>
      );
    case 'term_zscore': // Z-score: 2.0/2.5 임계
      return (
        <>
          <path
            d="M4,36 C22,36 32,6 50,6 C68,6 78,36 96,36"
            fill="none"
            stroke={T}
            strokeWidth="1.4"
          />
          <line x1="50" y1="6" x2="50" y2="38" stroke={D} strokeWidth="0.8" />
          <line
            x1="76"
            y1="14"
            x2="76"
            y2="38"
            stroke={G}
            strokeWidth="0.9"
            strokeDasharray="2 2"
          />
          <line
            x1="84"
            y1="14"
            x2="84"
            y2="38"
            stroke={R}
            strokeWidth="0.9"
            strokeDasharray="2 2"
          />
          <circle cx="90" cy="34" r="2" fill={R} />
          <text x="73" y="11" fontSize="4.2" fill={G}>
            2.0
          </text>
          <text x="84" y="11" fontSize="4.2" fill={R}>
            2.5
          </text>
        </>
      );
    case 'term_iqr': // IQR 상자그림
      return (
        <>
          <line x1="8" y1="20" x2="28" y2="20" stroke={G} strokeWidth="1" />
          <line x1="8" y1="15" x2="8" y2="25" stroke={G} strokeWidth="1" />
          <rect x="28" y="11" width="32" height="18" fill="#ede8de" stroke={G} strokeWidth="1" />
          <line x1="42" y1="11" x2="42" y2="29" stroke={T} strokeWidth="1.3" />
          <line x1="60" y1="20" x2="78" y2="20" stroke={G} strokeWidth="1" />
          <line x1="78" y1="15" x2="78" y2="25" stroke={G} strokeWidth="1" />
          <circle cx="90" cy="20" r="2.2" fill={R} />
          <text x="62" y="9" fontSize="4.2" fill={G}>
            Q3+1.5×IQR
          </text>
        </>
      );
    default:
      return <circle cx="50" cy="20" r="3" fill={T} />;
  }
}

export function PhaseDiagram({ phase }: { phase: string }) {
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet" className="w-full h-[70px]">
      <Body phase={phase} />
    </svg>
  );
}
