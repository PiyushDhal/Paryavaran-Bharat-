def clamp(value: float, lower: float = 0, upper: float = 100) -> float:
    return max(lower, min(upper, value))
