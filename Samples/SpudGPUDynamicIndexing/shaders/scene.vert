#version 450

layout(location = 0) in vec3 in_position;
layout(location = 1) in vec2 in_uv;

layout(location = 0) out vec2 frag_uv;

layout(set = 2, binding = 0) uniform CBV {
	mat4 mvp;
} cb;

void main() {
	gl_Position = cb.mvp * vec4(in_position, 1.0);
	frag_uv = in_uv;
}
