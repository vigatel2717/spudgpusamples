#version 450

layout(location = 0) in vec3 in_position;
layout(location = 1) in vec3 in_normal;

layout(location = 0) out vec3 frag_color;
layout(location = 1) out vec3 frag_normal;

// One CBV per building, matching the fixed per-object descriptor set bound
// inside the bundle -- only the buffer bytes behind this binding change
// frame to frame (see UpdateObjectConstants in ../main.c), not the binding
// itself, which is what lets a bundle recorded once keep working forever.
layout(set = 0, binding = 0) uniform CBV {
	mat4 mvp;
	vec4 color;
} cb;

void main() {
	gl_Position = cb.mvp * vec4(in_position, 1.0);

	// Every building's model matrix is a pure translation (see
	// model_matrices in ../main.c) -- no rotation/scale, so the object-space
	// normal already equals the world-space one, with no separate normal
	// matrix needed.
	frag_normal = in_normal;
	frag_color  = cb.color.rgb;
}
