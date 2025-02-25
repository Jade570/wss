"use client";

import React, { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import * as Tone from "tone";

import vertexShader from "../shaders/sample.vert";
import fragmentShader1 from "../shaders/sample.frag";
import fragmentShader2 from "../shaders/sample2.frag";



// Tone.js: 간단한 Tone 재생 함수 (짧은 소리)
const playTone = (freq) => {
  // Tone.js 컨텍스트 시작 (최초 상호작용 시 필요)
  Tone.start();
  // 단일 음을 짧게 재생하는 Synth 생성 후 재생
  const synth = new Tone.Synth().toDestination();
  synth.triggerAttackRelease(freq, "8n");
};

// Star 컴포넌트: path와 선택된 fragment shader를 prop으로 받아 적용합니다.
function Star({ path, fragShader }) {
  const gltf = useGLTF(path);
  const { camera } = useThree();

  
  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader: fragShader,
          uniforms: {
            u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            u_time: { value: 0 },
            u_flowerFade: { value: 0.0 },
            u_ambientLightColor: { value: new THREE.Color(0.5, 0.5, 0.5) },
            u_directionalLightColor: { value: new THREE.Color(1, 1, 1) },
            u_directionalLightDirection: { value: new THREE.Vector3(5, 5, 5).normalize() },
            u_cameraPosition: { value: camera.position.clone() },
          },
        });
      }
    });
  }, [gltf, fragShader, camera]);

  useFrame(({ clock }) => {
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.material.uniforms && child.material.uniforms.u_time) {
        child.material.uniforms.u_time.value = clock.getElapsedTime();
        child.material.uniforms.u_cameraPosition.value.copy(camera.position);
      }
    });
  });

  return <primitive object={gltf.scene} />;
}

function Stick() {
  const gltf = useGLTF("/stick.glb");
  return <primitive object={gltf.scene} />;
}

export default function Scene() {
  // 모델 배열: planet, star, heart
  const models = ["/planet.glb", "/star.glb", "/heart.glb"];
  const [modelIndex, setModelIndex] = useState(0);
  // shader 배열: 두 가지 fragment shader 옵션
  const shaders = [fragmentShader1, fragmentShader2];
  const [shaderIndex, setShaderIndex] = useState(0);

  // 모델별로 재생할 주파수 (Planet: 440Hz, Star: 550Hz, Heart: 660Hz)
  const frequencies = [440, 550, 660];

  // 모델 선택 버튼 클릭 시, 해당 주파수의 소리도 재생합니다.
  const handleModelChange = (index) => {
    setModelIndex(index);
    playTone(frequencies[index]);
  };

  const handlePlay = async () => {
    // Tone.js의 AudioContext를 시작 (최초 상호작용 시 필요)
    await Tone.start();
    console.log("Audio context started");

    // m4a 파일을 로드하고, destination(스피커)로 연결
    const player = new Tone.Player("/sample.m4a").toDestination();
    
    // 파일이 로드되면 재생합니다.
    player.autostart = true;}

  return (
    <>
      {/* 모델 선택 버튼 */}
      <div
        style={{
          position: "absolute",
          zIndex: 1,
          top: "20px",
          left: "20px",
          display: "flex",
          gap: "10px",
        }}
      >
        <button onClick={() => handleModelChange(0)} style={{ padding: "10px 20px" }}>
          Planet
        </button>
        <button onClick={() => handleModelChange(1)} style={{ padding: "10px 20px" }}>
          Star
        </button>
        <button onClick={() => handleModelChange(2)} style={{ padding: "10px 20px" }}>
          Heart
        </button>
        <button onClick={handlePlay}>Play M4A</button>
      </div>
      {/* Shader 선택 버튼 */}
      <div
        style={{
          position: "absolute",
          zIndex: 1,
          top: "70px",
          left: "20px",
          display: "flex",
          gap: "10px",
        }}
      >
        <button onClick={() => setShaderIndex(0)} style={{ padding: "10px 20px" }}>
          Shader1
        </button>
        <button onClick={() => setShaderIndex(1)} style={{ padding: "10px 20px" }}>
          Shader2
        </button>
      </div>
      <Canvas
        style={{ width: "100vw", height: "100vh", background: "transparent" }}
        camera={{ position: [0, 0, 20], fov: 45 }}
      >
        <OrbitControls />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        {/* Background은 주석 처리 혹은 유지 */}
        {/* <Background /> */}
        <group position={[0, 2, 0]}>
          <Star path={models[modelIndex]} fragShader={shaders[shaderIndex]} />
        </group>
        <group position={[0, -3, 0]}>
          <Stick />
        </group>
      </Canvas>
    </>
  );
}
