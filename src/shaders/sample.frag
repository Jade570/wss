#ifdef GL_ES
precision mediump float;
#endif

// 상수 정의
#define PI 3.14159265358979323846
#define TWO_PI 6.283185307589793

// CPU에서 전달하는 uniform 변수들
uniform vec2 u_resolution;                // 화면 해상도
uniform float u_time;                     // 시간값 (애니메이션 용)
uniform vec3 u_ambientLightColor;         // 앰비언트 라이트 색상
uniform vec3 u_directionalLightColor;     // 방향성 라이트 색상
uniform vec3 u_directionalLightDirection; // 방향성 라이트의 방향
uniform vec3 u_cameraPosition;            // 카메라의 월드 좌표 (Fresnel 효과용)

// vertex shader에서 전달받은 varyings
varying vec2 vUv;           // UV 좌표
varying vec3 vNormal;       // 변환된 법선
varying vec3 vWorldPosition; // 각 정점의 월드 좌표

// 2D 랜덤값 생성 함수
float random (in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
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

// 2D 좌표 회전 함수 (중심 0.5 기준)
vec2 rotate2D(vec2 _st, float _angle){
    _st -= 0.5;
    _st = mat2(cos(_angle), -sin(_angle),
               sin(_angle), cos(_angle)) * _st;
    _st += 0.5;
    return _st;
}

// HSB에서 RGB로 변환 (필요시 사용)
vec3 hsb2rgb( in vec3 c ){
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0),
                             6.0) - 3.0) - 1.0, 0.0, 1.0);
    rgb = rgb * rgb * (3.0 - 2.0 * rgb);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

// 좌표 skew 함수
vec2 skew(vec2 st) {
    vec2 r = vec2(0.0);
    r.x = 1.1547 * st.x;
    r.y = st.y + 0.5 * r.x;
    return r;
}

// -- 조명 계산 함수 --
// 주어진 정규화된 법선(norm)을 기반으로 Lambert 조명 계산을 수행하여
// 앰비언트 라이트와 방향성 라이트의 기여를 합산하여 반환합니다.
vec3 computeLighting(vec3 norm) {
    float diff = max(dot(norm, normalize(u_directionalLightDirection)), 0.0);
    return u_ambientLightColor + u_directionalLightColor * diff;
}

void main(){
    // 현재 픽셀의 화면 좌표를 [0,1] 범위로 정규화 (디버깅용으로 남겨둠)
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    
    // 초기 색상 (0으로 시작)
    vec3 color = vec3(0.0);
    vec3 bgcolor = vec3(0.0);
    
    // 화면 중앙(0.5,0.5)으로부터 현재 픽셀까지의 벡터 계산
    vec2 toCenter = vec2(0.5) - st;
    vec2 bgst = st;
    
    // 중심에서의 각도와 거리 계산
    float angle = atan(toCenter.y, toCenter.x);
    float radius = length(toCenter) * 100.0;
    
    // 화면 비율 보정
    st.x *= u_resolution.x / u_resolution.y;
    // 시간에 따라 좌표계를 회전시킴
    st = rotate2D(st, PI - u_time * 0.5);
    
    // 좌표를 타일링하기 위해 정수/소수부 분리
    vec2 i_st = floor(st);
    vec2 f_st = fract(st);
    
    // 중심 좌표에서의 상대적 위치 계산
    vec2 pos = vec2(0.5) - st;
    float r = length(pos) * 5.0;
    float a = atan(pos.y, pos.x);
    
    // 사인과 노이즈를 사용해 패턴을 계산
    float f = (abs(sin(a * 2.5)) + 0.01) * noise(st * u_time * 0.1);
    
    // 기본 색상과 패턴을 결합하여 최종 색상 계산
    color = vec3(bgst.x, bgst.y, abs(sin(u_time)));
    color += smoothstep(0.08, 0.2, noise(bgst * 10.0 + u_time) + sin(u_time) / 3.0) * 0.25;
    color -= smoothstep(0.25, 0.4, noise(bgst * 10.0 + u_time) + sin(u_time) / 3.0) * 0.25;
    color -= vec3(clamp(0.0, 0.99, u_time * 0.0001));
    
    // 법선(vNormal)을 정규화하여 조명 계산 함수에 전달
    vec3 norm = normalize(vNormal);
    vec3 lighting = computeLighting(norm);
    
    // 조명 결과를 곱하여 최종 색상에 적용
    color *= lighting;
    
    // -- 자체발광(emissive) 효과 추가 --  
    // 기본 색상과 별개로, 시간에 따라 진동하는 emissive 색상을 더합니다.
    // 이 부분은 조명 계산과 독립적으로 항상 빛을 내는 느낌을 줍니다.
    vec3 emissive = vec3(0.2, 0.2, 0.2) * abs(sin(u_time * 2.0));
    color += emissive;
    
    // --- Fresnel(림) 효과 계산 ---
    // 1. 카메라와 현재 픽셀의 월드 좌표 간의 뷰 방향 계산
    vec3 viewDir = normalize(u_cameraPosition - vWorldPosition);
    // 2. Fresnel 계수를 계산:
    //    - 정점의 법선과 뷰 방향의 내적을 사용해, 정점의 가장자리에서 값이 커지도록 계산
    float fresnel = pow(1.0 - max(dot(norm, viewDir), 0.0), 3.0);
    
    // 3. Rim 컬러: 원하는 자체발광(림) 색상을 지정 (여기서는 약간 어두운 회색)
    vec3 rimColor = vec3(0.2, 0.2, 0.2) * fresnel;
    
    // 4. 기본 색상에 rim 효과를 추가하여 최종 색상 결정
    color += rimColor;
    
    // 최종 fragment 색상을 출력
    gl_FragColor = vec4(color, 1.0);
}
