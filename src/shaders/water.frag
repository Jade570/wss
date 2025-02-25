// Author @patriciogv - 2015
// http://patriciogonzalezvivo.com

#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265358979323846
#define TWO_PI 6.28318530718

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_flowerNum;

uniform float u_patternNum;

// 2D Random
float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))
                 * 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    // Smooth Interpolation

    // Cubic Hermine Curve.  Same as SmoothStep()
    vec2 u = f*f*(3.0-2.0*f);
    // u = smoothstep(0.,1.,f);

    // Mix 4 coorners percentages
    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

vec2 rotate2D(vec2 _st, float _angle){
    _st -= 0.5;
    _st =  mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle)) * _st;
    _st += 0.5;
    return _st;
}

vec3 hsb2rgb( in vec3 c ){
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),
                             6.0)-3.0)-1.0,
                     0.0,
                     1.0 );
    rgb = rgb*rgb*(3.0-2.0*rgb);
    return c.z * mix( vec3(1.0), rgb, c.y);
}

vec2 skew (vec2 st) {
    vec2 r = vec2(0.0);
    r.x = 1.1547*st.x;
    r.y = st.y+0.5*r.x;
    return r;
}

void main(){
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    // st = rotate2D(st,PI+u_time);
    vec3 color = vec3(0.0);
    vec3 bgcolor = vec3(0.);

    // polar coordinates for the background
    vec2 toCenter = vec2(0.5)-st;
    vec2 bgst = st;
    float angle = atan(toCenter.y,toCenter.x);
    float radius = length(toCenter)*100.;
    
    
    
    // color = vec3(0.2+sin(u_time*0.3)*0.15,abs(0.5*cos(u_time*0.5))+0.2,sin(u_time)*0.5+1.);
    color = hsb2rgb(vec3((abs(22.*sin(u_time*0.3))+185.)/360., 1.,1.));
    
    //윤슬
    color += smoothstep(.02,.5,noise(bgst*10.+u_time)+sin(u_time)/3.)*(sin(u_time*1.1)*0.4+0.5);
    color -= smoothstep(.4,.8,noise(bgst*10.+u_time)+sin(u_time)/3.)*(sin(u_time*1.1)*0.4+0.5);

    color -= vec3(clamp(0.,0.99,u_time*0.01));



    gl_FragColor = vec4(color, 1.0);
}
