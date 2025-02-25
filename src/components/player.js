import React, { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

// 코드별 음 배열 (순서대로: 근음, 3음, 5음, 옥타브/7음)
const chordFrequencies = {
  Am: ["A2", "C3", "E3", "A3"],
  E7: ["E3", "G#3", "B3", "D4"],
  Dm: ["D3", "F3", "A3", "D4"],
  F: ["C3", "F3", "A3", "C4"],
  C: ["C3", "E3", "G3", "C4"],
  G: ["D3", "G3", "B3", "D4"],
  Cm: ["C3", "Eb3", "G3", "C4"],
  Ddim7: ["D3", "F3", "Ab3", "B3"],
  Dhalfdim7: ["D3", "F3", "Ab3", "C4"],
  Csus4: ["C3", "F3", "G3", "C4"],
  Eb: ["Eb3", "G3", "Bb3", "Eb4"],
  Bb: ["Bb2", "D3", "F3", "Bb3"],
  CtoE: ["E3", "G3", "C4", "E4"],
  Fm: ["C3", "F3", "Ab3", "C4"],
};

// filter의 Q값에 따라 gain을 계산하는 함수
const calculateGain = (Q) => {
  return 5 * Math.log10(Q); // 예: Q = 700이면 약 70
};

const OscilloscopeWithFilterToggle = () => {
  const [filterActive, setFilterActive] = useState(true);
  const filterQ = 10;
  const computedGain = calculateGain(filterQ);

  // dryGain, filteredGain, player를 ref로 저장하여 재생 중 업데이트 시 사용
  const dryGainRef = useRef(null);
  const filteredGainRef = useRef(null);
  const playerRef = useRef(null);

  // 오디오 체인을 한 번만 생성 (마운트 시)
  useEffect(() => {
    // bpm 설정
    Tone.getContext().transport.bpm.value = 80;

    // masterGain 생성 및 Destination 연결
    const masterGain = new Tone.Gain(1.0).toDestination();

    // 초기 filterActive 값에 따라 dryGain과 filteredGain 생성
    const dryGain = new Tone.Gain(filterActive ? 0 : 1).connect(masterGain);
    const filteredGain = new Tone.Gain(filterActive ? computedGain : 0).connect(masterGain);

    // ref에 저장
    dryGainRef.current = dryGain;
    filteredGainRef.current = filteredGain;

    // 4개의 채널과 필터 체인 생성 (Tone.Channel + Filter)
    const filterNum = 4;
    const channels = [];
    const filters = [];
    for (let i = 0; i < filterNum; i++) {
      const channel = new Tone.Channel();
      const filter = new Tone.Filter({
        Q: filterQ,
        type: "bandpass",
      });
      channel.connect(filter);
      filter.connect(filteredGain);
      channels.push(channel);
      filters.push(filter);
    }

    // Tone.Player 생성 (노래가 계속 재생되도록 loop:true로 설정)
    const player = new Tone.Player({
      url: "/sample.m4a",
      autostart: false,
      loop: true,
      onload: () => {
        console.log("Player loaded.");
        Tone.start().then(() => {
          Tone.Transport.start();
          player.start();
        });
      },
    });
    playerRef.current = player;

    // 플레이어 출력 신호를 dryGain과 각 채널(필터 체인)에 병렬로 연결
    player.connect(dryGain);
    channels.forEach((channel) => {
      player.connect(channel);
    });

    // Tone.Sequence로 코드 진행에 따라 필터의 주파수를 업데이트
    const chordProgression = ["Am", "Am", "Am", "E7",
      "Dm", "Am", "E7", "Am",
      "Am", "Am", "Am", "E7",
      "Dm", "Am", "E7", "Am",
      "F", "Am", "C", "E7",
      "F", "Am", "C", "G",
      "Am", "Dm", "Am", "E7",
      "Am", "Am", "E7", "Am"];
    const newProgression = [
      "Cm", "Cm", ["Cm", "Cm", "Cm", "Ddim7"], ["Eb", "CtoE"],
      "Fm", "Cm", "G", "Cm",
      "Cm", "Cm", ["Cm", "Cm", "Cm", "Ddim7"], ["Eb", "CtoE"],
      "Fm", "Cm", "G", "Cm",
      "Fm", "Cm", "Bb", ["Eb", "CtoE"],
      "Fm", "Cm", "Dhalfdim7", ["Csus4", "G"],
      "Cm", "Fm", "Eb", "G",
      "Cm", "Eb", "G", "Cm"
    ];
    const seq = new Tone.Sequence(
      (time, chord) => {
        // chord가 배열일 수도 있으므로 처리
        const chords = Array.isArray(chord) ? chord : [chord];
        chords.forEach((note, i) => {
          if (chordFrequencies[note]) {
            const freq = Tone.Frequency(chordFrequencies[note][i]).toFrequency();
            filters[i].frequency.setValueAtTime(freq, time);
          }
        });
      },
      newProgression,
      "1n" // 1 온음표마다 업데이트
    );
    seq.start(0);

    // 컴포넌트 언마운트 시 모든 Tone 노드 정리
    return () => {
      Tone.Transport.stop();
      player.stop();
      player.dispose();
      seq.dispose();
      channels.forEach((ch) => ch.dispose());
      filters.forEach((f) => f.dispose());
      dryGain.dispose();
      filteredGain.dispose();
      masterGain.dispose();
    };
  }, []); // 빈 배열 → 마운트 시 한 번만 실행

  // filterActive 상태 변화 시, 게인 값만 업데이트
  useEffect(() => {
    if (dryGainRef.current && filteredGainRef.current) {
      dryGainRef.current.gain.value = filterActive ? 0 : 1;
      filteredGainRef.current.gain.value = filterActive ? computedGain : 0;
    }
  }, [filterActive, computedGain]);

  return (
    <div>
      <button onClick={() => setFilterActive((prev) => !prev)}>
        {filterActive ? "필터 끄기 (바이패스)" : "필터 켜기"}
      </button>
    </div>
  );
};

export default OscilloscopeWithFilterToggle;
