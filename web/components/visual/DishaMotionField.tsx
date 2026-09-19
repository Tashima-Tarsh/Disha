"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import styles from "./disha-motion-field.module.css";

const PARTICLE_COUNT = 520;
const RING_POINTS = 160;

function seeded(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function DishaMotionField() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 0, 8.4);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const radius = 2.4 + seeded(index, 1) * 7.6;
      const angle = seeded(index, 2) * Math.PI * 2;
      const lift = (seeded(index, 3) - 0.5) * 7.2;
      positions[index * 3] = Math.cos(angle) * radius * 1.45;
      positions[index * 3 + 1] = lift;
      positions[index * 3 + 2] = Math.sin(angle) * radius - 3;
      sizes[index] = 0.65 + seeded(index, 4) * 1.8;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color("#74d8bf"),
      size: 0.035,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const ringGeometry = new THREE.BufferGeometry();
    const ringPositions = new Float32Array(RING_POINTS * 3);
    for (let index = 0; index < RING_POINTS; index += 1) {
      const angle = (index / RING_POINTS) * Math.PI * 2;
      const radius = 3.25 + Math.sin(angle * 4) * 0.08;
      ringPositions[index * 3] = Math.cos(angle) * radius;
      ringPositions[index * 3 + 1] = Math.sin(angle) * radius * 0.42;
      ringPositions[index * 3 + 2] = -1.8;
    }
    ringGeometry.setAttribute("position", new THREE.BufferAttribute(ringPositions, 3));
    const ringMaterial = new THREE.PointsMaterial({
      color: new THREE.Color("#d4b86e"),
      size: 0.025,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Points(ringGeometry, ringMaterial);
    ring.rotation.z = -0.22;
    scene.add(ring);

    const sweepGeometry = new THREE.RingGeometry(2.25, 2.265, 96);
    const sweepMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#69c7ae"),
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sweep = new THREE.Mesh(sweepGeometry, sweepMaterial);
    sweep.scale.y = 0.44;
    sweep.position.z = -2.1;
    sweep.rotation.z = 0.25;
    scene.add(sweep);

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    const onPointerMove = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth - 0.5) * 2;
      target.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    const resize = () => {
      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight;
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const clock = new THREE.Clock();
    let frame = 0;

    const render = () => {
      const elapsed = clock.getElapsedTime();
      pointer.x += (target.x - pointer.x) * 0.025;
      pointer.y += (target.y - pointer.y) * 0.025;

      if (!reduceMotion) {
        particles.rotation.y = elapsed * 0.018;
        particles.rotation.x = Math.sin(elapsed * 0.11) * 0.035;
        ring.rotation.z = -0.22 + elapsed * 0.025;
        ring.rotation.y = Math.sin(elapsed * 0.16) * 0.14;
        sweep.rotation.z = 0.25 - elapsed * 0.035;
        sweepMaterial.opacity = 0.065 + (Math.sin(elapsed * 0.7) + 1) * 0.018;
      }

      camera.position.x = pointer.x * 0.18;
      camera.position.y = -pointer.y * 0.12;
      camera.lookAt(0, 0, -1.7);
      renderer.render(scene, camera);

      if (!reduceMotion) frame = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      material.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      sweepGeometry.dispose();
      sweepMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className={styles.field} ref={hostRef} aria-hidden="true">
      <div className={styles.auroraA} />
      <div className={styles.auroraB} />
      <div className={styles.grid} />
      <div className={styles.horizon} />
      <div className={styles.scan} />
      <div className={styles.vignette} />
      <div className={styles.noise} />
    </div>
  );
}
