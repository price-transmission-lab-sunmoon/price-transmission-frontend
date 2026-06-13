// 현재 스테이션으로 카메라를 부드럽게 이동. X폭 기반 동적 거리 + 좌측 패널을 피하는 우측 편향.
import { useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { MathUtils, type PerspectiveCamera } from 'three';
import {
  STAGE_GAP,
  STAGE_HALF_WIDTH,
  STAGE_HALF_HEIGHT,
  CONTENT_USABLE_W,
  CAMERA_PADDING,
  useJourneyProgress,
} from './journeyContract';

export function JourneyRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const stage = useJourneyProgress((s) => s.stage);
  const cameraZoom = useJourneyProgress((s) => s.cameraZoom);
  const setCameraZoom = useJourneyProgress((s) => s.setCameraZoom);

  // 휠로 카메라 dolly 줌. stage 이동 시 1로 리셋.
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const z = useJourneyProgress.getState().cameraZoom;
      setCameraZoom(Math.max(0.55, Math.min(1.8, z * (1 + e.deltaY * 0.0012))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gl, setCameraZoom]);

  useFrame(() => {
    const hw = STAGE_HALF_WIDTH[stage] ?? 8;
    const aspect = size.width / Math.max(1, size.height);
    const vFov = (camera.fov * Math.PI) / 180;
    const tanV = Math.tan(vFov / 2);

    const distX = (hw * CAMERA_PADDING) / (tanV * aspect * CONTENT_USABLE_W);
    const distY = (STAGE_HALF_HEIGHT * CAMERA_PADDING) / tanV;
    const dist = Math.max(distX, distY, 12) * cameraZoom;

    const visibleHalfW = dist * tanV * aspect;
    const targetX = -(1 - CONTENT_USABLE_W) * visibleHalfW;
    const targetY = -stage * STAGE_GAP;

    camera.position.x = MathUtils.lerp(camera.position.x, targetX, 0.12);
    camera.position.y = MathUtils.lerp(camera.position.y, targetY, 0.12);
    camera.position.z = MathUtils.lerp(camera.position.z, dist, 0.12);
    camera.lookAt(camera.position.x, camera.position.y, 0);
  });

  return null;
}
