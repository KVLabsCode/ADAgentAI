import math

def generate_logo():
    # ===========================================
    # STEP 1: Original SVG measurements
    # ===========================================
    orig_viewbox = 16
    
    # BACKSLASH measurements
    orig_top_left_x = 9.218
    orig_top_left_y = 2
    orig_thickness = 2.402
    orig_bottom_right_x = 16
    orig_bottom_right_y = 12.987
    
    orig_length = orig_bottom_right_y - orig_top_left_y  # 10.987
    orig_slope_offset = (orig_bottom_right_x - orig_thickness) - orig_top_left_x  # 4.38
    
    # A PATH ANALYSIS:
    # M4.379 2 h2.512 l4.38 10.987 H8.82 l-.895 -2.308 h-4.58 l-.896 2.307 H0 L4.38 2.001 z
    # m2.755 6.64 L5.635 4.777 L4.137 8.64 z
    
    # Key observations:
    # - A top: (4.379, 2) to (6.891, 2) - top width = 2.512
    # - Right leg goes: l4.38 10.987 - SAME slope as backslash!
    # - Left leg: from (4.379, 2) to (0, 12.987) - also same slope!
    # - Crossbar at y = 10.679 (about 79% down)
    # - Triangle hole: apex at (5.635, 4.777), base from (4.137, 8.64) to (7.134, 8.64)
    
    a_top_width = 2.512
    a_crossbar_y_ratio = (10.679 - 2) / 10.987  # 0.79
    a_crossbar_height = 2.307
    a_triangle_top_y_ratio = (4.777 - 2) / 10.987  # 0.253
    a_triangle_bottom_y_ratio = (8.64 - 2) / 10.987  # 0.604
    a_triangle_base_width = 7.134 - 4.137  # 2.997
    
    print("=== A PATH ANALYSIS ===")
    print(f"A uses SAME slope as backslash: {orig_slope_offset / orig_length:.6f}")
    print(f"Top width: {a_top_width}")
    print(f"Crossbar y ratio: {a_crossbar_y_ratio:.3f} (79% down)")
    print(f"Triangle top y ratio: {a_triangle_top_y_ratio:.3f}")
    print(f"Triangle bottom y ratio: {a_triangle_bottom_y_ratio:.3f}")
    
    # ===========================================
    # STEP 2: Calculate ratios
    # ===========================================
    ratio_thickness = orig_thickness / orig_viewbox
    ratio_length = orig_length / orig_viewbox
    ratio_top_padding = orig_top_left_y / orig_viewbox
    ratio_top_width = a_top_width / orig_viewbox
    slope = orig_slope_offset / orig_length
    
    # ===========================================
    # STEP 3: Scale to canvas with proper fit
    # ===========================================
    canvas_width, canvas_height = 512, 512
    fill_color = "#000000"
    
    # First calculate at unit scale to get proportions
    unit_thickness = ratio_thickness
    unit_length = ratio_length
    unit_top_padding = ratio_top_padding
    unit_slope = slope
    unit_slope_offset = unit_length * slope
    unit_a_top_w = ratio_top_width
    
    # Gaps as ratio of thickness
    # From original SVG: gap between A and backslash = 2.327, thickness = 2.402
    # Gap ratio = 2.327 / 2.402 = 0.969 (almost equal to thickness)
    gap_ratio_a_to_bs = 0.969  # Matches original Anthropic logo spacing
    
    # I-to-D gap: Golden Ratio (φ ≈ 0.618)
    # Rationale:
    # - Curved letters need less optical space (D's curve creates visual "air")
    # - Golden ratio is mathematically elegant, used in design for millennia
    # - Creates visual grouping: A + \D, while reading as unified "AD"
    # - 36% tighter than A-I gap matches typical curve-kerning reduction
    # - Ratio of gaps (0.969:0.618 ≈ 1.57:1) is close to π/2, aesthetically pleasing
    gap_ratio_bs_to_d = 0.618  # Golden ratio - optimal for straight→curve transition
    unit_gap_a_to_bs = unit_thickness * gap_ratio_a_to_bs
    unit_gap_bs_to_d = unit_thickness * gap_ratio_bs_to_d
    
    # D arc bulge ratio - MINIMAL = arc starts right at bottom edge
    d_arc_ratio = 0.0  # Zero - arc starts exactly at bottom left edge
    unit_d_arc_bulge = unit_length * d_arc_ratio
    
    # Calculate total unit width by tracing actual positions
    # Start A at x=0
    # A top right = slope_offset + a_top_w
    # I top left = A top right + gap
    # I bottom right = I top left + thickness + slope_offset
    # D left bottom = I bottom right + gap
    # D arc center = D left bottom + d_arc_bulge (=0)
    # D rightmost = D arc center + outer_radius
    
    unit_outer_radius = unit_length / 2
    
    unit_a_top_right = unit_slope_offset + unit_a_top_w
    unit_i_top_left = unit_a_top_right + unit_gap_a_to_bs
    unit_i_bottom_right = unit_i_top_left + unit_thickness + unit_slope_offset
    unit_d_left_bottom = unit_i_bottom_right + unit_gap_bs_to_d
    unit_arc_cx = unit_d_left_bottom + unit_d_arc_bulge
    unit_rightmost = unit_arc_cx + unit_outer_radius
    
    # A's leftmost at bottom is 0, but we need to check if anything extends left
    # A bottom left = 0 (by definition)
    unit_leftmost = 0
    
    unit_total_width = unit_rightmost - unit_leftmost
    
    # Scale factor to fit in canvas (with some margin)
    margin = 0.05  # 5% margin on each side
    available_width = canvas_width * (1 - 2 * margin)
    scale = available_width / unit_total_width
    
    # Apply scale
    thickness = unit_thickness * scale
    length = unit_length * scale
    top_padding = (canvas_height - length) / 2  # center vertically
    slope_offset = unit_slope_offset * scale
    a_top_w = unit_a_top_w * scale
    
    width = canvas_width
    height = canvas_height
    
    print(f"\n=== SCALED MEASUREMENTS ({width}x{height}) ===")
    print(f"Scale factor: {scale:.3f}")
    print(f"Thickness: {thickness:.3f}")
    print(f"Length: {length:.3f}")
    print(f"Slope: {slope:.6f}")
    print(f"Slope offset: {slope_offset:.3f}")
    
    # Y coordinates
    y_top = top_padding
    y_bottom = top_padding + length
    
    # ===========================================
    # STEP 4: Calculate layout positions
    # ===========================================
    
    # A width at bottom = slope_offset * 2 + top_width
    a_width = slope_offset * 2 + a_top_w
    
    # Gaps (scaled)
    gap_a_to_bs = thickness * gap_ratio_a_to_bs
    gap_bs_to_d = thickness * gap_ratio_bs_to_d
    
    # D arc bulge (0 = arc starts at bottom left)
    d_arc_bulge = length * d_arc_ratio
    
    # Outer radius for D arc
    outer_radius = length / 2
    inner_radius = (length - 2 * thickness) / 2
    
    # Calculate total width and centering
    a_top_right_x = slope_offset + a_top_w  # relative to left_padding
    i_top_left_x = a_top_right_x + gap_a_to_bs
    i_bottom_right_x = i_top_left_x + thickness + slope_offset
    d_left_bottom_x = i_bottom_right_x + gap_bs_to_d
    arc_cx_rel = d_left_bottom_x + d_arc_bulge
    rightmost = arc_cx_rel + outer_radius
    
    total_width = rightmost
    
    # Left padding to center
    left_padding = (width - total_width) / 2
    
    # Backslash width for display
    bs_width = thickness + slope_offset
    d_width = slope_offset + d_arc_bulge
    
    print(f"\n=== LAYOUT ===")
    print(f"A width: {a_width:.3f}")
    print(f"Backslash width: {bs_width:.3f}")
    print(f"D width: {d_width:.3f}")
    print(f"Gap A→I: {gap_a_to_bs:.3f} (ratio: {gap_ratio_a_to_bs})")
    print(f"Gap I→D: {gap_bs_to_d:.3f} (ratio: {gap_ratio_bs_to_d})")
    print(f"Total width: {total_width:.3f}")
    print(f"Left padding: {left_padding:.3f}")
    
    # ===========================================
    # STEP 5: LETTER A (leftmost)
    # ===========================================
    a_left_padding = left_padding
    
    # A apex center (top middle)
    a_apex_x = a_left_padding + slope_offset + (a_top_w / 2)
    
    # Top edge (small flat top like original)
    a_top_left = (a_apex_x - a_top_w / 2, y_top)
    a_top_right = (a_apex_x + a_top_w / 2, y_top)
    
    # Outer legs go down and outward with same slope
    # Left leg goes LEFT as it goes down, right leg goes RIGHT
    a_outer_bottom_left = (a_left_padding, y_bottom)
    a_outer_bottom_right = (a_left_padding + slope_offset * 2 + a_top_w, y_bottom)
    
    # Inner legs (thickness inward from outer)
    a_inner_bottom_left = (a_outer_bottom_left[0] + thickness, y_bottom)
    a_inner_bottom_right = (a_outer_bottom_right[0] - thickness, y_bottom)
    
    # Crossbar position (79% down from top)
    crossbar_y = y_top + length * a_crossbar_y_ratio
    
    # At crossbar_y, where are the inner leg edges?
    # Progress from top to crossbar
    crossbar_progress = (crossbar_y - y_top) / length
    
    # Left inner leg: starts at a_top_left, goes to a_inner_bottom_left
    # x moves LEFT by (slope_offset - thickness_horizontal_component) over full length
    # At crossbar, the left inner edge x:
    left_inner_at_crossbar = a_top_left[0] - crossbar_progress * slope_offset + crossbar_progress * thickness / slope if slope > 0 else a_top_left[0]
    
    # Simpler approach: trace the inner edge
    # Inner left starts at (a_top_left[0] + thickness * slope, y_top + thickness) and goes to a_inner_bottom_left
    # Wait, I need to think about this differently.
    
    # The inner edge of left leg at y = crossbar_y:
    # Left outer edge at crossbar_y: a_top_left[0] - crossbar_progress * slope_offset
    # Left inner edge = left outer edge + thickness (horizontal thickness at that point)
    # But thickness is measured perpendicular to the slope... for simplicity, let's use horizontal thickness
    
    left_outer_at_crossbar = a_top_left[0] - crossbar_progress * slope_offset
    left_inner_at_crossbar = left_outer_at_crossbar + thickness
    
    right_outer_at_crossbar = a_top_right[0] + crossbar_progress * slope_offset
    right_inner_at_crossbar = right_outer_at_crossbar - thickness
    
    crossbar_left_x = left_inner_at_crossbar
    crossbar_right_x = right_inner_at_crossbar
    
    # Triangle hole (the triangular cutout in the A)
    tri_top_y = y_top + length * a_triangle_top_y_ratio
    tri_bottom_y = y_top + length * a_triangle_bottom_y_ratio
    
    # Triangle apex (pointing up, at center)
    tri_apex_x = a_apex_x
    
    # Triangle base width at tri_bottom_y
    tri_progress = (tri_bottom_y - y_top) / length
    # At this y, the inner edges are at:
    tri_left_inner = a_top_left[0] - tri_progress * slope_offset + thickness
    tri_right_inner = a_top_right[0] + tri_progress * slope_offset - thickness
    
    # Use calculated positions or original ratio
    tri_base_half_width = (tri_right_inner - tri_left_inner) / 2
    tri_left_x = tri_apex_x - tri_base_half_width
    tri_right_x = tri_apex_x + tri_base_half_width
    
    # ===========================================
    # STEP 6: BACKSLASH (middle)
    # ===========================================
    # Position after A's TOP RIGHT edge (not bottom width!)
    # The visual gap is between A's right edge and I's left edge at the same y-level
    # Since both have the same slope, this gap is constant at all heights
    
    bs_start_x = a_top_right[0] + gap_a_to_bs  # Start from A's top-right + gap
    
    bs_top_left = (bs_start_x, y_top)
    bs_top_right = (bs_start_x + thickness, y_top)
    bs_bottom_right = (bs_start_x + thickness + slope_offset, y_bottom)
    bs_bottom_left = (bs_start_x + slope_offset, y_bottom)
    
    # ===========================================
    # STEP 7: FLIPPED C / D (rightmost)
    # ===========================================
    # Left edge of C starts after backslash with gap
    c_left_top_x = bs_top_right[0] + gap_bs_to_d
    c_left_bottom_x = bs_bottom_right[0] + gap_bs_to_d
    
    # Arc center x - positioned so D fits in allocated width
    arc_cx = c_left_bottom_x + d_arc_bulge
    arc_cy = (y_top + y_bottom) / 2
    
    # Arm endpoints
    top_arm_outer_left = (c_left_top_x, y_top)
    top_arm_inner_left = (c_left_top_x + thickness * slope, y_top + thickness)
    
    bottom_arm_inner_left = (c_left_top_x + (length - thickness) * slope, y_bottom - thickness)
    bottom_arm_outer_left = (c_left_bottom_x, y_bottom)
    
    top_arm_outer_right = (arc_cx, y_top)
    top_arm_inner_right = (arc_cx, y_top + thickness)
    bottom_arm_inner_right = (arc_cx, y_bottom - thickness)
    bottom_arm_outer_right = (arc_cx, y_bottom)
    
    top_arm_length = arc_cx - c_left_top_x
    bottom_arm_length = arc_cx - c_left_bottom_x
    
    print(f"\n=== D SHAPE (tighter) ===")
    print(f"Arc bulge ratio: {d_arc_ratio}")
    print(f"Top arm length: {top_arm_length:.3f}")
    print(f"Bottom arm length: {bottom_arm_length:.3f}")
    print(f"Difference: {top_arm_length - bottom_arm_length:.3f} (= slope_offset: {slope_offset:.3f})")
    
    # ===========================================
    # STEP 8: Build paths
    # ===========================================
    
    # A PATH (trace like original: top → right leg down → across bottom → up to crossbar → across → down to bottom → left leg up)
    a_path = (
        # Start at top left, go clockwise
        f"M {a_top_left[0]:.3f} {a_top_left[1]:.3f} "
        # To top right
        f"L {a_top_right[0]:.3f} {a_top_right[1]:.3f} "
        # Down right outer leg to bottom
        f"L {a_outer_bottom_right[0]:.3f} {a_outer_bottom_right[1]:.3f} "
        # Left to inner right bottom
        f"L {a_inner_bottom_right[0]:.3f} {a_inner_bottom_right[1]:.3f} "
        # Up to crossbar right
        f"L {crossbar_right_x:.3f} {crossbar_y:.3f} "
        # Across to crossbar left
        f"L {crossbar_left_x:.3f} {crossbar_y:.3f} "
        # Down to inner left bottom
        f"L {a_inner_bottom_left[0]:.3f} {a_inner_bottom_left[1]:.3f} "
        # Left to outer left bottom
        f"L {a_outer_bottom_left[0]:.3f} {a_outer_bottom_left[1]:.3f} "
        # Close (back to top left)
        "Z "
        # Triangle hole (counter-clockwise: apex at top, base at bottom)
        f"M {tri_apex_x:.3f} {tri_top_y:.3f} "
        f"L {tri_left_x:.3f} {tri_bottom_y:.3f} "
        f"L {tri_right_x:.3f} {tri_bottom_y:.3f} "
        "Z"
    )
    
    # BACKSLASH PATH
    backslash_path = (
        f"M {bs_top_left[0]:.3f} {bs_top_left[1]:.3f} "
        f"L {bs_top_right[0]:.3f} {bs_top_right[1]:.3f} "
        f"L {bs_bottom_right[0]:.3f} {bs_bottom_right[1]:.3f} "
        f"L {bs_bottom_left[0]:.3f} {bs_bottom_left[1]:.3f} Z"
    )
    
    # D PATH (flipped C)
    d_path = (
        f"M {top_arm_outer_left[0]:.3f} {top_arm_outer_left[1]:.3f} "
        f"L {top_arm_outer_right[0]:.3f} {top_arm_outer_right[1]:.3f} "
        f"A {outer_radius:.3f} {outer_radius:.3f} 0 0 1 {bottom_arm_outer_right[0]:.3f} {bottom_arm_outer_right[1]:.3f} "
        f"L {bottom_arm_outer_left[0]:.3f} {bottom_arm_outer_left[1]:.3f} "
        f"L {bottom_arm_inner_left[0]:.3f} {bottom_arm_inner_left[1]:.3f} "
        f"L {bottom_arm_inner_right[0]:.3f} {bottom_arm_inner_right[1]:.3f} "
        f"A {inner_radius:.3f} {inner_radius:.3f} 0 0 0 {top_arm_inner_right[0]:.3f} {top_arm_inner_right[1]:.3f} "
        f"L {top_arm_inner_left[0]:.3f} {top_arm_inner_left[1]:.3f} "
        "Z"
    )
    
    # ===========================================
    # STEP 9: Generate SVG
    # ===========================================
    svg_content = f'''<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <path d="{a_path}" fill="{fill_color}" fill-rule="evenodd" />
  <path d="{backslash_path}" fill="{fill_color}" />
  <path d="{d_path}" fill="{fill_color}" />
</svg>'''
    
    with open("logo.svg", "w", encoding="utf-8") as f:
        f.write(svg_content)
    
    print(f"\n=== OUTPUT ===")
    print("Generated: logo.svg")
    print("Letters: A + \\ + D")

if __name__ == "__main__":
    generate_logo()
