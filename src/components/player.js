import React, { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import chordFrequencies from "./chordFrequencies";
import chordProgression from "./chordProgressions";

// filter의 Q값에 따라 gain 변경 함수
const calculateGain = (Q) => {
  return 1 + 69 * (Math.log(Q) / Math.log(700));
};

const OscilloscopeWithFilterToggle = () => {
  const [filterActive, setFilterActive] = useState(true);
  const [filterQ, setFilterQ] = useState(10);
  const computedGain = calculateGain(filterQ);

  // 재생바 관련 state
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Tone 노드 ref
  const dryGainRef = useRef(null);
  const filteredGainRef = useRef(null);
  const playerRef = useRef(null);
  const filtersRef = useRef([]);
  const channelsRef = useRef([]);

  // 재생 위치 계산을 위한 ref
  const seekTimeRef = useRef(0);
  const startOffsetRef = useRef(0);

  // bpm 설정 및 노드 체인 구성 (마운트 시 한 번 실행)
  useEffect(() => {
    Tone.getTransport().bpm.value = 80;
    const masterGain = new Tone.Gain(1.0).toDestination();

    // dry/filtered 게인 노드 생성
    const dryGain = new Tone.Gain(filterActive ? 0 : 1).connect(masterGain);
    const filteredGain = new Tone.Gain(filterActive ? computedGain : 0).connect(masterGain);
    dryGainRef.current = dryGain;
    filteredGainRef.current = filteredGain;

    // 채널과 필터 생성 (4개)
    const filterNum = 4;
    const channels = [];
    const filters = [];
    for (let i = 0; i < filterNum; i++) {
      const channel = new Tone.Channel();
      const filter = new Tone.Filter({
        Q: filterQ,
        type: "bandpass",
        // 초기 주파수는 1000Hz 같은 값으로 설정하거나 이후 Sequence에서 업데이트되도록 할 수 있습니다.
        frequency: 1000,
      });
      channel.connect(filter);
      filter.connect(filteredGain);
      channels.push(channel);
      filters.push(filter);
    }
    channelsRef.current = channels;
    filtersRef.current = filters;

    // Tone.Player 생성 (loop 모드)
    const player = new Tone.Player({
      url: "/sample.m4a",
      autostart: false,
      loop: true,
      onload: () => {
        console.log("Player loaded.");
        setTotalDuration(player.buffer.duration);
        seekTimeRef.current = Tone.getTransport().seconds;
        startOffsetRef.current = 0;
        Tone.start().then(() => {
          Tone.getTransport().start();
          player.start();
        });
      },
    });
    playerRef.current = player;

    // 플레이어 출력 신호 연결: dryGain와 각 채널에 병렬 연결
    player.connect(dryGain);
    channels.forEach((channel) => {
      player.connect(channel);
    });

    // Sequence 생성 (콜백에서 filtersRef.current를 사용)
    const seq = new Tone.Sequence(
      (time, chord) => {
        // chord가 배열일 수도 있으므로 처리
        const chords = Array.isArray(chord) ? chord : [chord];
        chords.forEach((note, i) => {
          if (chordFrequencies[note]) {
            const freq = Tone.Frequency(chordFrequencies[note][i]).toFrequency();
            // 새 필터가 생성되면 filtersRef.current[i]로 업데이트됨
            if (filtersRef.current[i]) {
              filtersRef.current[i].frequency.setValueAtTime(freq, time);
            }
          }
        });
      },
      chordProgression.marching_new,
      "1n"
    );
    seq.start(0);

    dryGain.gain.value = filterActive ? 0 : 1;
    filteredGain.gain.value = filterActive ? computedGain : 0;
    console.log(computedGain);

    return () => {
      Tone.getTransport().stop();
      player.stop();
      player.dispose();
      seq.dispose();
      channelsRef.current.forEach((ch) => ch.dispose());
      filtersRef.current.forEach((f) => f.dispose());
      dryGain.dispose();
      filteredGain.dispose();
      masterGain.dispose();
    };
  }, []);

  // filterActive 상태 변화 시 게인 값 업데이트
  useEffect(() => {
    if (dryGainRef.current && filteredGainRef.current) {
      dryGainRef.current.gain.value = filterActive ? 0 : 1;
      filteredGainRef.current.gain.value = filterActive ? computedGain : 0;
    }
  }, [filterActive, computedGain]);

  // filterQ(state)가 변경되면, resetFilters 호출 (전체 채널/필터 재생성)
  useEffect(() => {
    
    if (channelsRef.current.length && filtersRef.current.length) {
      resetFilters(filterQ);
    }
  }, [filterQ]);

  // 재생 위치 업데이트
  useEffect(() => {
    let rafId;
    const updatePosition = () => {
      if (playerRef.current && totalDuration > 0) {
        const elapsed = Tone.getTransport().seconds - seekTimeRef.current;
        const pos = (startOffsetRef.current + elapsed) % totalDuration;
        setPlaybackPosition(pos);
      }
      rafId = requestAnimationFrame(updatePosition);
    };
    updatePosition();
    return () => cancelAnimationFrame(rafId);
  }, [totalDuration]);

  // 재생바 이동
  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (playerRef.current) {
      playerRef.current.seek(newTime);
      seekTimeRef.current = Tone.getTransport().seconds;
      startOffsetRef.current = newTime;
      setPlaybackPosition(newTime);
    }
  };

  // 재생/일시정지 버튼
  const togglePlayback = () => {
    if (isPlaying) {
      Tone.getTransport().pause();
      setIsPlaying(false);
    } else {
      Tone.getTransport().start();
      setIsPlaying(true);
    }
  };

  // 전체 채널과 필터를 새로 생성하여 player와 다시 연결하는 함수
  const resetFilters = (newQ) => {
    if (!filteredGainRef.current || !playerRef.current) return;
    console.log("resetFilters");
    // 기존 채널, 필터 폐기
    channelsRef.current.forEach((ch) => {
      try {
        ch.disconnect();
      } catch (e) {
        console.error("채널 disconnect 에러:", e);
      }
      ch.dispose();
    });
    channelsRef.current = [];
    if (filtersRef.current && filtersRef.current.length) {
      filtersRef.current.forEach((f) => {
        try {
          f.disconnect();
        } catch (e) {
          console.error("필터 disconnect 에러:", e);
        }
        f.dispose();
      });
    }
    filtersRef.current = [];

    // 새 채널과 필터 생성 (채널 수: 4)
    const newChannels = [];
    const newFilters = [];
    const channelCount = 4;
    for (let i = 0; i < channelCount; i++) {
      const channel = new Tone.Channel();
      // 새 필터 생성: 이전 필터의 중심 주파수 유지 (없으면 기본값 1000Hz)
      const newFilter = new Tone.Filter({
        frequency: 1000, // 또는 oldFilter.frequency.value (필터마다 다르게 적용하려면 다른 방식 필요)
        Q: newQ,
        type: "bandpass",
      });
      channel.connect(newFilter);
      newFilter.connect(filteredGainRef.current);
      newChannels.push(channel);
      newFilters.push(newFilter);
    }
    channelsRef.current = newChannels;
    filtersRef.current = newFilters;

    // player의 출력 재연결
    playerRef.current.disconnect();
    newChannels.forEach((channel) => {
      playerRef.current.connect(channel);
    });
  };

  return (
    <div style={{ color: "#ffffff" }}>
      <button onClick={() => setFilterActive((prev) => !prev)}>
        {filterActive ? "필터 끄기 (바이패스)" : "필터 켜기"}
      </button>
      <button onClick={togglePlayback} style={{ marginLeft: "10px" }}>
        {isPlaying ? "일시정지" : "재생"}
      </button>
      <div style={{ marginTop: "20px" }}>
        {/* 재생바 */}
        <input
          type="range"
          min="0"
          max={totalDuration}
          step="0.01"
          value={playbackPosition}
          onChange={handleSeek}
          style={{ width: "100%" }}
        />
        <div>
          {playbackPosition.toFixed(2)} / {totalDuration.toFixed(2)} 초
        </div>
      </div>
      <div style={{ marginTop: "20px" }}>
        <label>
          Q 값: {filterQ}
          <input
            type="range"
            min="1"
            max="700"
            step="1"
            value={filterQ}
            onChange={(e) => setFilterQ(parseInt(e.target.value, 10))}
            style={{ width: "100%" }}
          />
        </label>
        <div>{computedGain}</div>
      </div>
    </div>
  );
};

export default OscilloscopeWithFilterToggle;
