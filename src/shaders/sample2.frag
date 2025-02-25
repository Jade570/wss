#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;   // 화면 해상도
uniform float u_time;        // 시간값
uniform float u_fade;        // fade 값 (필요시 사용)
uniform vec3 u_ambientLightColor;         // 앰비언트 라이트 색상
uniform vec3 u_directionalLightColor;     // 방향성 라이트 색상
uniform vec3 u_directionalLightDirection; // 방향성 라이트의 방향
uniform vec3 u_cameraPosition;            // 카메라의 월드 좌표 (Fresnel 효과용)

// vertex shader에서 전달받은 varyings
varying vec2 vUv;           // UV 좌표
varying vec3 vNormal;       // 변환된 법선
varying vec3 vWorldPosition; // 각 정점의 월드 좌표

// 2D 랜덤 함수
float random (in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// cosine based palette, 4 vec3 params
vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
{
    return a + b*cos( 6.283185*(c*t+d) );
}

// 2D 노이즈 함수 (부드러운 보간)
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
}

// -- 조명 계산 함수 --
// 주어진 정규화된 법선(norm)을 기반으로 Lambert 조명 계산을 수행하여
// 앰비언트 라이트와 방향성 라이트의 기여를 합산하여 반환합니다.
vec3 computeLighting(vec3 norm) {
    float diff = max(dot(norm, normalize(u_directionalLightDirection)), 0.0);
    return u_ambientLightColor + u_directionalLightColor * diff;
}


void main(){
    vec2 st_full = (gl_FragCoord.xy*2. - u_resolution.xy) / u_resolution.y;
    vec2 st_tileIndex = floor(st_full * 1.95*sin(u_time*0.5));
    vec2 st_tile = fract(st_full * 1.95*sin(u_time*0.5)) - 0.5;
    float circleTile;
    float finalPattern1 = 0.0;
    vec3 col = palette(length(st_tile)+0.3*u_time, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(2.0, 1.0, 0.0), vec3(0.50, 0.20, 0.25));

    // vec3 col = palette(0.3*u_time, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(2.0, 1.0, 0.0), vec3(0.50, 0.20, 0.25));

    for (float i = 0.0; i<20.0; i++){ 
        float d_tile = length(st_tile);
        d_tile = sin(d_tile*8. + u_time)/8.;
        d_tile = abs(d_tile);

        float R0 = 0.2* pow(0.55, float(i));
        float R1 = 0.05* float(i);
        float edge = 0.01; 
        float n = noise(st_tile + u_time + st_tileIndex)-0.1;
        finalPattern1 -= (step(d_tile, R0 + edge+0.25*n*abs(sin(u_time))) - step(d_tile, R0 - edge+0.25*n*abs(sin(u_time))));
        finalPattern1 -= (step(d_tile, R1 + edge) - step(d_tile, R1 - edge));
        // col*=  1.25*n;
    }
finalPattern1 *= 0.5;
    
// [2] 새 중심 좌표 계산: 전체 화면의 (1/3, 2/5)
    vec2 newCenter = vec2(u_resolution.x * (1.0 / 3.0), u_resolution.y * (2.0 / 5.0));
    vec2 st_new = (gl_FragCoord.xy - newCenter) / u_resolution.y;
    
    float finalPattern2 = 0.0;
    for (float i = 0.0; i < 5.0; i++){
        vec2 st_tileIndex2 = floor(st_new * 1.0);
        vec2 st_tile2 = fract(st_new * 0.95*sin(u_time*0.5)) - 0.5;
        
        float d_tile2 = length(st_tile2);
        d_tile2 = sin(d_tile2 * 18.0 + u_time) / 18.0;
        d_tile2 = abs(d_tile2);
        
        // col += palette(d_tile2+0.25*u_time, vec3(0.1, 0.1, 0.1), vec3(0.1, 0.1, 0.1), vec3(0.5, 0.6, 0.0), vec3(0.70, 0.20, 0.5));
        float R1_2 = 0.2* float(i) ;
        float n2 = noise(st_tile2 + u_time + st_tileIndex2)-0.1;
        float edge2 = 0.2*n2;
        // finalPattern2 += (step(d_tile2, R1_2 + edge2+0.25*n2*abs(sin(u_time))) - step(d_tile2, R1_2 - edge2+0.25*n2*abs(sin(u_time))));
        finalPattern2 += (step(d_tile2, R1_2 + edge2) - step(d_tile2, R1_2 - edge2));
    }
    // finalPattern2 *= 0.1;
    finalPattern2 = clamp(finalPattern2, 0.0, 1.0);
//     // =====[ 최종 결과: 두 패턴을 합산 (블렌딩) ]=====
    float combinedPattern = clamp(finalPattern1 + finalPattern2, 0.0, 1.0);
    col -= vec3(combinedPattern)*sin(u_time)+0.3;
    // vec3 color = vec3(combinedPattern);


    // 현재 픽셀의 화면 좌표를 [0,1] 범위로 정규화 (디버깅용으로 남겨둠)
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    
    // 초기 색상 (0으로 시작)
    vec3 bgcolor = vec3(0.0);
    
    // 화면 중앙(0.5,0.5)으로부터 현재 픽셀까지의 벡터 계산
    vec2 toCenter = vec2(0.5) - st;
    vec2 bgst = st;
    
    // 중심에서의 각도와 거리 계산
    float angle = atan(toCenter.y, toCenter.x);
    float radius = length(toCenter) * 100.0;
    
    // 법선(vNormal)을 정규화하여 조명 계산 함수에 전달
    vec3 norm = normalize(vNormal);
    vec3 lighting = computeLighting(norm);
    
    // 조명 결과를 곱하여 최종 색상에 적용
    col *= lighting;
    
    // -- 자체발광(emissive) 효과 추가 --  
    // 기본 색상과 별개로, 시간에 따라 진동하는 emissive 색상을 더합니다.
    // 이 부분은 조명 계산과 독립적으로 항상 빛을 내는 느낌을 줍니다.
    vec3 emissive = vec3(0.2, 0.2, 0.2) * abs(sin(u_time * 2.0));
    col += emissive;
    
    // --- Fresnel(림) 효과 계산 ---
    // 1. 카메라와 현재 픽셀의 월드 좌표 간의 뷰 방향 계산
    vec3 viewDir = normalize(u_cameraPosition - vWorldPosition);
    // 2. Fresnel 계수를 계산:
    //    - 정점의 법선과 뷰 방향의 내적을 사용해, 정점의 가장자리에서 값이 커지도록 계산
    float fresnel = pow(1.0 - max(dot(norm, viewDir), 0.0), 3.0);
    
    // 3. Rim 컬러: 원하는 자체발광(림) 색상을 지정 (여기서는 약간 어두운 회색)
    vec3 rimColor = vec3(0.2, 0.2, 0.2) * fresnel;
    
    // 4. 기본 색상에 rim 효과를 추가하여 최종 색상 결정
    col += rimColor;


    


    gl_FragColor = vec4(col, 1.0);
}
