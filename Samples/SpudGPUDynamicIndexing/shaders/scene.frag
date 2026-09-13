#version 450
// Required by glslang to permit declaring an unsized (runtime) array of
// opaque descriptors below -- not because the index used to access it here
// needs the nonuniformEXT() qualifier (it doesn't: both indices are
// per-draw push-constant values, uniform across every invocation of one
// draw, which already satisfies Vulkan's "dynamically uniform" requirement
// on its own -- see ../../../README.md).
#extension GL_EXT_nonuniform_qualifier : require

layout(location = 0) in vec2 frag_uv;
layout(location = 0) out vec4 out_color;

// Matches spudgpu_get_bindless_descriptor_set_layout()'s binding 0 (sampled
// images) -- texture2D, not sampler2D, since the sampler is bound separately
// (set 1) per SpudGPU's bindless design (see ../../../README.md).
layout(set = 0, binding = 0) uniform texture2D bindless_images[];

layout(set = 1, binding = 0) uniform sampler samp;

layout(push_constant) uniform PushConstants {
	uint diffuse_index;
	uint material_index;
} pc;

void main() {
	vec3 diffuse = texture(sampler2D(bindless_images[pc.diffuse_index], samp), frag_uv).rgb;
	vec3 mat = texture(sampler2D(bindless_images[pc.material_index], samp), frag_uv).rgb;
	out_color = vec4(diffuse * mat, 1.0);
}
