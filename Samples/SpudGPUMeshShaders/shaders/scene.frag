#version 450

layout(location = 0) in vec3 in_position_vs;
layout(location = 1) in vec3 in_normal;
layout(location = 2) in flat uint in_meshlet_index;

layout(location = 0) out vec4 out_color;

layout(set = 1, binding = 0) uniform Globals {
	mat4 world;
	mat4 world_view;
	mat4 world_view_proj;
	uint draw_meshlets;
} globals;

void main() {
	float ambient_intensity = 0.1;
	vec3 light_dir = -normalize(vec3(1.0, -1.0, 1.0));

	vec3 diffuse_color;
	float shininess;
	if (globals.draw_meshlets != 0u) {
		uint mi = in_meshlet_index;
		diffuse_color = vec3(
		    float(mi & 1u),
		    float(mi & 3u) / 4.0,
		    float(mi & 7u) / 8.0);
		shininess = 16.0;
	} else {
		diffuse_color = vec3(0.8);
		shininess = 64.0;
	}

	vec3 normal = normalize(in_normal);
	float cos_angle = clamp(dot(normal, light_dir), 0.0, 1.0);
	vec3 view_dir = -normalize(in_position_vs);
	vec3 half_angle = normalize(light_dir + view_dir);

	float blinn_term = clamp(dot(normal, half_angle), 0.0, 1.0);
	blinn_term = cos_angle != 0.0 ? blinn_term : 0.0;
	blinn_term = pow(blinn_term, shininess);

	vec3 final_color = (cos_angle + blinn_term + ambient_intensity) * diffuse_color;
	out_color = vec4(final_color, 1.0);
}
