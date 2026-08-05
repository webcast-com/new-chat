import { useEffect, useRef } from 'react';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from 'three';

interface ParticleSphereProps {
  className?: string;
}

export default function ParticleSphere({ className = '' }: ParticleSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.z = 3.35;

    const renderer = new WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'h-full w-full';
    container.appendChild(renderer.domElement);

    const count = 850;
    const positions = new Float32Array(count * 3);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let index = 0; index < count; index += 1) {
      const y = 1 - (index / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const angle = goldenAngle * index;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const material = new PointsMaterial({
      color: new Color('#c4b5fd'),
      size: 0.018,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new Points(geometry, material);
    scene.add(points);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    let frameId = 0;
    const animate = () => {
      points.rotation.y += 0.0018;
      points.rotation.x = Math.sin(performance.now() * 0.00022) * 0.12;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} aria-hidden="true" className={`pointer-events-none ${className}`} />;
}
