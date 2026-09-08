cmake_minimum_required(VERSION 3.15)
project(SpudGPUSamples LANGUAGES C CXX)

# Pull in spudlib if nobody above us already has (mirrors ApricotFields'
# CMakeLists.txt). When built through the eqdev root aggregator, spudlib is
# already a target by the time this runs and CMAKE_MSVC_RUNTIME_LIBRARY has
# already been force-set there -- see ../CLAUDE.md. When built standalone,
# set CMAKE_MSVC_RUNTIME_LIBRARY yourself before configuring to match
# whatever else you link against.
if(NOT TARGET spudlib)
    add_subdirectory(../spudlib ${CMAKE_CURRENT_BINARY_DIR}/spudlib)
endif()

# Samples only build where SpudGPU has a real backend (Vulkan/D3D12) and a
# window to put it in. Metal is scaffolded/unimplemented -- see
# spudlib/CLAUDE.md -- so there's nothing to run these against on Apple yet.
if(WIN32 OR (UNIX AND NOT APPLE))
    if(WIN32)
        if(NOT SDL3_DIR)
            set(SDL3_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../SDL3-3.4.8/cmake")
        endif()
    endif()
    find_package(SDL3 REQUIRED)

    add_subdirectory(Samples/HelloTriangle)
endif()
