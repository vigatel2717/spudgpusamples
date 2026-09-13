#version 450

layout(location = 0) in vec2 in_position;
layout(location = 1) in vec3 in_color;

layout(location = 0) out vec3 frag_color;

layout(set = 0, binding = 0) uniform SceneConstantBuffer {
    vec4 offset;
} scene;

void main() {
    gl_Position = vec4(in_position, 0.0, 1.0) + scene.offset;
    frag_color = in_color;
}
