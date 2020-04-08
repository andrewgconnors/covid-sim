/**
 * Calculate [vx, vy] to move from one point to another in duration.
 */
export function velocity(fromX: number, fromY: number, toX: number, toY: number, duration: number): [number, number] {
    return [(toX - fromX) / duration, (toY - fromY) / duration];
}