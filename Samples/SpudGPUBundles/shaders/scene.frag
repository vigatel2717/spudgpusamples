#version 450

layout(location = 0) in vec3 frag_color;
layout(location = 1) in vec3 frag_normal;

layout(location = 0) out vec4 out_color;

// Basic directional (Lambertian) lighting -- a fixed light direction and no
// per-object light data, so no new uniform is needed beyond the existing
// per-building CBV.
const vec3 LIGHT_DIR = normalize(vec3(0.4, -1.0, 0.3)); // direction the light travels
const float AMBIENT   = 0.95;

void main() {
	vec3 n = normalize(frag_normal);
	float diffuse   = max(dot(n, -LIGHT_DIR), 0.0);
	float intensity = AMBIENT + (1.0 - AMBIENT) * diffuse;
	out_color = vec4(frag_color * intensity, 1.0);
}
