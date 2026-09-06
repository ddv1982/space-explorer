import type { LivingWorld } from './livingBackgroundProfile';
import { CAMPAIGN_ATMOSPHERES } from './livingCampaignAtmospheres';

const HEADER = `
precision highp float;
varying vec2 outTexCoord;
uniform sampler2D uNoise;
uniform vec2 uViewport;
uniform float uTime;
uniform float uActivity;
uniform float uLandmark;
uniform float uLive;

float hash(vec2 cell) {
  cell = mod(cell, 64.0);
  float n = mod(dot(cell, vec2(37.0, 113.0)) + 19.0, 2003.0);
  n = mod(n * n + 71.0, 2003.0);
  return mod(n * n + n * 37.0, 2003.0) / 2003.0;
}

float noise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  if (uLive > 0.5) {
    return mix(mix(hash(cell), hash(cell + vec2(1., 0.)), f.x),
               mix(hash(cell + vec2(0., 1.)), hash(cell + vec2(1., 1.)), f.x), f.y);
  }
  return texture2D(uNoise, (mod(cell, 64.0) + 0.5 + f) / 65.0).r;
}

float field(vec2 p) {
  return 0.53 * noise(p) + 0.27 * noise(p * 2.01 + 13.7)
       + 0.13 * noise(p * 4.03 + 5.2) + 0.07 * noise(p * 8.07 + 23.1);
}


vec2 warpField(vec2 p) {
  return vec2(field(p * 0.7 + uTime * 0.016), field(p * 0.65 + vec2(11.3, -uTime * 0.021)));
}

vec4 worldPlanet(vec2 uv, vec2 center, float radius, vec3 dark, vec3 light, vec2 bands) {
  vec2 q = (uv * uViewport - center) / radius;
  float r = length(q);
  float cover = 1.0 - smoothstep(0.99, 1.01, r);
  vec3 n = vec3(q.x, -q.y, sqrt(max(0.0, 1.0 - r * r)));
  float sun = max(0.0, dot(n, normalize(vec3(0.3, 0.45, 0.8))));
  vec3 surface = mix(dark, light, field(q * bands + uTime * 0.012));
  return vec4(surface * (0.22 + sun) * cover + light * exp(-abs(r - 1.0) * 48.0) * 0.55, cover);
}
`;
const EXISTING = {
  aurora: `vec3 worldColor(vec2 uv, float edge) {
  float t = uTime;
  vec2 p = vec2(uv.x * 6.0, uv.y * 4.0 - t * 0.06);
  vec2 warp = vec2(field(p * 0.7 + t * 0.018), field(p * 0.65 + vec2(8.3, -t * 0.024)));
  float gas = field(p + warp * 2.7);
  float left = uv.x - (0.12 + sin(uv.y * 6.2 + t * 0.18) * 0.055 + (warp.x - 0.5) * 0.13);
  float right = uv.x - (0.88 + cos(uv.y * 5.0 - t * 0.13) * 0.065 + (warp.y - 0.5) * 0.10);
  float inner = uv.x - (0.24 + sin(uv.y * 7.0 - t * 0.21) * 0.04 + (warp.y - 0.5) * 0.10);
  float ribbons = exp(-abs(left) * 75.0) + exp(-abs(right) * 64.0) * 0.7
                + exp(-abs(inner) * 90.0) * 0.55;
  float veils = exp(-abs(left + 0.06) * 18.0) + exp(-abs(right - 0.03) * 23.0);
  float density = smoothstep(0.24, 0.72, gas);
  vec3 col = vec3(0.024, 0.15, 0.16) * density * veils;
  col += mix(vec3(0.065, 0.55, 0.32), vec3(0.05, 0.24, 0.46), uv.y)
       * ribbons * (0.30 + density * 0.8) * edge;
  col += vec3(0.045, 0.10, 0.15) * pow(density, 3.0) * edge;
  float filaments = pow(1.0 - abs(sin((p.x + warp.x * 1.9) * 22.0 + gas * 12.0)), 9.0);
  col += vec3(0.024, 0.11, 0.105) * filaments * density * veils * edge;

  float radius = min(uViewport.x * 0.55, uViewport.y * 0.75);
  vec2 q = (uv * uViewport - vec2(-radius * 0.70, uViewport.y * 0.56)) / radius;
  float r = length(q);
  col += vec3(0.015, 0.17, 0.20) * exp(-abs(r - 1.0) * 48.0);
  if (r < 1.025) {
    vec3 n = vec3(q.x, -q.y, sqrt(max(0.0, 1.0 - r * r)));
    float light = max(0.0, dot(n, normalize(vec3(0.3, 0.45, 0.8))));
    float bands = field(vec2(q.x * 4.0 + t * 0.014, q.y * 18.0));
    vec3 surface = mix(vec3(0.012, 0.035, 0.042), vec3(0.045, 0.125, 0.115), bands);
    vec3 planet = surface * (0.25 + light * 1.1) + vec3(0.025, 0.15, 0.18) * pow(1.0 - n.z, 4.0);
    col = mix(col, planet * uLandmark, 1.0 - smoothstep(0.991, 1.015, r));
  }
  return col;
}

`,
  clockwork: `vec3 worldColor(vec2 uv, float edge) {
  vec2 p = uv * vec2(5.0, 4.0) + vec2(uTime * 0.015, -uTime * 0.035);
  float gas = field(p + vec2(field(p * 0.5), field(p * 0.5 + 17.0)) * 1.4);
  return mix(vec3(0.016, 0.025, 0.035), vec3(0.12, 0.065, 0.025), gas * gas)
       * edge * (0.7 + 0.3 * sin(uv.y * 3.0 + 1.0));
}

`,
  eventide: `vec3 worldColor(vec2 uv, float edge) {
  float radius = min(uViewport.x * 0.29, uViewport.y * 0.38);
  vec2 p = (uv * uViewport - vec2(uViewport.x * 0.87, uViewport.y * 0.30)) / radius;
  float r = length(p);
  float a = atan(p.y, p.x);
  float swirl = field(vec2(a * 2.2 + uTime * 0.055 + r * 3.0, r * 8.0 - uTime * 0.025));
  float disc = exp(-abs(r - 0.76) * 25.0) * (0.32 + swirl * 0.95);
  float outer = exp(-abs(r - 1.05) * 4.0) * pow(swirl, 3.0);
  float beltRadius = length(p * vec2(1.0, 2.15));
  float belt = exp(-abs(beltRadius - 1.13) * 16.0) * (0.3 + swirl * 0.9);
  float photon = exp(-abs(r - 0.565) * 105.0);
  vec3 col = mix(vec3(0.28, 0.10, 0.46), vec3(0.55, 0.19, 0.085), 0.5 + 0.5 * sin(a)) * disc;
  col += vec3(0.33, 0.16, 0.095) * belt + vec3(0.20, 0.095, 0.26) * photon;
  col += vec3(0.08, 0.028, 0.13) * outer;
  col += vec3(0.02, 0.025, 0.07) * field(uv * 5.0 + uTime * 0.012) * edge;
  return col * smoothstep(0.53, 0.65, r) * uLandmark;
}

`,
};
const ATMOSPHERES: Record<LivingWorld, string> = { ...EXISTING, ...CAMPAIGN_ATMOSPHERES };
const MAIN = `void main() {
  vec2 uv = vec2(outTexCoord.x, 1.0 - outTexCoord.y);
  float edge = smoothstep(0.13, 0.47, abs(uv.x - 0.5));
  vec3 base = vec3(0.011, 0.03, 0.057);
  vec3 col = worldColor(uv, edge);
  col *= mix(0.08, 1.0, edge) * uActivity;
  float vignette = 0.78 + 0.22 * sin(uv.y * 3.14159265);
  gl_FragColor = vec4((base + col) * vignette, 1.0);
}
`;

export function createLivingBackgroundFragment(world: LivingWorld): string {
  return HEADER + ATMOSPHERES[world] + MAIN;
}
