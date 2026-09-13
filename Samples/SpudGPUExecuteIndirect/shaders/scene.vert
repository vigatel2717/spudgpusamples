#version 450

// Must match TRIANGLE_COUNT in ../main.c / cull.comp.
const uint TRIANGLE_COUNT = 256;

layout(location = 0) in vec3 in_position;
layout(location = 0) out vec4 frag_color;

struct SceneConstantBuffer {
	vec4 velocity;
	vec4 offset;
	vec4 color;
};

layout(set = 0, binding = 0) uniform SceneBuffer {
	SceneConstantBuffer triangles[TRIANGLE_COUNT];
} scene;

layout(set = 0, binding = 1) uniform ProjectionBuffer {
	mat4 projection;
} proj;

void main() {
	// gl_InstanceIndex carries the per-draw first_instance baked into each
	// spudgpu_draw_indirect_args entry at init time (see ../main.c) -- the
	// portable stand-in for the original D3D12 sample's per-draw root CBV
	// update, which has no equivalent in a single generic indirect-draw
	// argument shape (see ../../../README.md).
	SceneConstantBuffer triangle = scene.triangles[gl_InstanceIndex];

	gl_Position = proj.projection * (vec4(in_position, 1.0) + triangle.offset);

	float intensity = clamp((4.0 - gl_Position.z) / 2.0, 0.0, 1.0);
	frag_color = vec4(triangle.color.rgb * intensity, 1.0);
}
