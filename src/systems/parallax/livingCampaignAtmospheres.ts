import type { LivingWorld } from './livingBackgroundProfile';

export const CAMPAIGN_ATMOSPHERES: Record<Exclude<LivingWorld, 'aurora' | 'clockwork' | 'eventide'>, string> = {
  tideglass: `
vec3 worldColor(vec2 uv, float edge) {
  vec2 p = uv * vec2(7.0, 5.0) + vec2(uTime * 0.02, -uTime * 0.04);
  vec2 warp = warpField(p);
  float gas = field(p + warp * 2.4);
  float waves = pow(0.5 + 0.5 * sin(uv.y * 22.0 + uv.x * 5.0 + warp.x * 7.0 + uTime * 0.25), 5.0);
  float caustic = pow(1.0 - abs(sin(uv.y * 17.0 - uv.x * 13.0 + warp.y * 6.0 - uTime * 0.17)), 8.0);
  vec3 col = vec3(0.025, 0.13, 0.17) * gas + vec3(0.045, 0.22, 0.25) * waves * gas;
  col += vec3(0.035, 0.14, 0.20) * caustic * gas;
  float radius = min(uViewport.x * 0.55, uViewport.y * 0.7);
  vec4 body = worldPlanet(uv, vec2(uViewport.x + radius * 0.68, uViewport.y * 0.65), radius,
    vec3(0.006, 0.025, 0.04), vec3(0.035, 0.15, 0.19), vec2(3.0, 16.0));
  return col * (1.0 - body.a) + body.rgb * uLandmark;
}`,
  ember: `
vec3 worldColor(vec2 uv, float edge) {
  vec2 p = vec2(uv.x * 6.0 + uv.y * 0.9, uv.y * 4.0 + uTime * 0.10);
  vec2 warp = warpField(p);
  float gas = field(p + warp * 2.7);
  float front = exp(-abs(uv.x - 0.15 - sin(uv.y * 5.0 + uTime * 0.2) * 0.06 - (warp.x - 0.5) * 0.12) * 22.0)
              + exp(-abs(uv.x - 0.86 - cos(uv.y * 6.0 - uTime * 0.16) * 0.06) * 22.0);
  float flame = pow(1.0 - abs(sin(p.x * 14.0 + warp.y * 8.0)), 8.0);
  vec3 col = vec3(0.62, 0.14, 0.028) * gas * gas * front;
  col += vec3(0.48, 0.26, 0.05) * flame * gas * front;
  float radius = min(uViewport.x * 0.48, uViewport.y * 0.58);
  vec4 body = worldPlanet(uv, vec2(-radius * 0.7, uViewport.y * 0.65), radius,
    vec3(0.035, 0.014, 0.015), vec3(0.17, 0.065, 0.025), vec2(10.0, 9.0));
  return col * (1.0 - body.a) + body.rgb * uLandmark;
}`,
  reef: `
vec3 worldColor(vec2 uv, float edge) {
  vec2 p = uv * vec2(7.0, 5.0) + vec2(uTime * 0.022, -uTime * 0.028);
  vec2 warp = warpField(p);
  float gas = field(p + warp * 2.5);
  float veins = pow(1.0 - abs(sin(p.x * 5.0 + warp.x * 8.0) * cos(p.y * 4.0 + warp.y * 7.0)), 14.0);
  float fronts = exp(-abs(uv.x - 0.15 - (warp.x - 0.5) * 0.18) * 15.0)
               + exp(-abs(uv.x - 0.85 - (warp.y - 0.5) * 0.18) * 15.0);
  return (vec3(0.13, 0.035, 0.20) * gas + vec3(0.24, 0.085, 0.17) * veins * gas) * fronts;
}`,
  debris: `
vec3 worldColor(vec2 uv, float edge) {
  vec2 p = uv * vec2(5.0, 4.0) + vec2(uTime * 0.018, -uTime * 0.038);
  vec2 warp = warpField(p);
  float gas = field(p + warp * 2.0);
  float shafts = pow(1.0 - abs(sin(uv.x * 12.0 + uv.y * 1.8 + warp.x * 4.0)), 10.0);
  float hot = pow(field(p * 1.7 + warp.y), 4.0);
  return vec3(0.038, 0.075, 0.10) * gas + vec3(0.065, 0.16, 0.20) * shafts * gas
       + vec3(0.12, 0.047, 0.018) * hot;
}`,
  choir: `
vec3 worldColor(vec2 uv, float edge) {
  vec2 p = uv * vec2(6.0, 3.0) + vec2(0.0, -uTime * 0.022);
  vec2 warp = warpField(p);
  float gas = field(p + warp * 2.0);
  float columns = pow(0.5 + 0.5 * cos(uv.x * 31.0 + warp.x * 6.0), 8.0);
  float breath = 0.65 + 0.2 * sin(uv.y * 4.0 + uTime * 0.14 + warp.y * 2.0);
  vec3 col = (vec3(0.07, 0.065, 0.13) * gas + vec3(0.16, 0.22, 0.25) * columns * gas) * breath;
  float radius = min(uViewport.x * 0.42, uViewport.y * 0.55);
  vec4 moon = worldPlanet(uv, vec2(-radius * 0.78, uViewport.y * 0.20), radius,
    vec3(0.03, 0.035, 0.05), vec3(0.11, 0.13, 0.16), vec2(7.0, 7.0));
  return col * (1.0 - moon.a) + moon.rgb * uLandmark;
}`,
  eclipse: `
vec3 worldColor(vec2 uv, float edge) {
  float radius = min(uViewport.x * 0.4, uViewport.y * 0.48);
  vec2 p = (uv * uViewport - uViewport * vec2(0.94, 0.48)) / radius;
  float r = length(p);
  float angle = atan(p.y, p.x);
  float gas = field(vec2(angle * 3.0 + uTime * 0.16, r * 7.0 - uTime * 0.12));
  float corona = exp(-abs(r - 1.0 - (gas - 0.5) * 0.035) * 30.0) * (0.3 + gas);
  float rays = exp(-abs(r - 1.1) * 5.0) * pow(gas, 3.0);
  vec3 col = (vec3(0.72, 0.40, 0.16) * corona + vec3(0.16, 0.07, 0.30) * rays) * uLandmark;
  col *= smoothstep(0.83, 0.97, r);
  float stream = uv.x - 0.13 - sin(uv.y * 6.0 + uTime * 0.16) * 0.045;
  return col + vec3(0.025, 0.06, 0.12) * exp(-abs(stream) * 22.0) * field(uv * 7.0 + uTime * 0.025);
}`,
  hive: `
vec3 worldColor(vec2 uv, float edge) {
  vec2 p = uv * vec2(8.0, 6.0) + vec2(0.0, uTime * 0.045);
  vec2 warp = warpField(p * 0.5);
  p += warp * 2.3;
  vec2 spacing = vec2(1.73205, 1.0);
  vec2 a = mod(p, spacing) - spacing * 0.5;
  vec2 b = mod(p + spacing * 0.5, spacing) - spacing * 0.5;
  vec2 q = dot(a, a) < dot(b, b) ? a : b;
  float cell = max(abs(q.x) * 0.866025 + abs(q.y) * 0.5, abs(q.y));
  float membrane = exp(-abs(cell - 0.43) * 38.0) * smoothstep(0.32, 0.7, field(p * 0.45));
  float gas = field(p * 0.6 + warp);
  float pulse = 0.55 + 0.35 * sin(uTime * 0.22 + gas * 6.0);
  return vec3(0.065, 0.085, 0.024) * gas + vec3(0.20, 0.14, 0.035) * membrane * gas * pulse
       + vec3(0.08, 0.12, 0.035) * pow(gas, 3.0);
}`,
};
