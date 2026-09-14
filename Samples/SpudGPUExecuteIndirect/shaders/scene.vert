#version 450

layout(location = 0) in vec3 in_position;

// Per-instance (scene_buffer bound at vertex binding slot 1, per_instance =
// true, see ../main.c) -- fetched by the fixed-function input assembler
// using first_instance/StartInstanceLocation, not gl_InstanceIndex. D3D12's
// SV_InstanceID doesn't include StartInstanceLocation the way Vulkan's
// gl_InstanceIndex does, so indexing a storage buffer with gl_InstanceIndex
// isn't portable; the IA's own per-instance vertex fetch is.
layout(location = 1) in vec4 in_offset;
layout(location = 2) in vec4 in_color;

layout(location = 0) out vec4 frag_color;

layout(set = 0, binding = 0) uniform ProjectionBuffer {
	mat4 projection;
} proj;

void main() {
	gl_Position = proj.projection * (vec4(in_position, 1.0) + in_offset);

	float intensity = clamp((4.0 - gl_Position.z) / 2.0, 0.0, 1.0);
	frag_color = vec4(in_color.rgb * intensity, 1.0);
}
